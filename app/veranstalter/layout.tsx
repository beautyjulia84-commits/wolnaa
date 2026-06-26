'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

function VeranstalterLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [veranstalter, setVeranstalter] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === '/veranstalter/login') { setChecked(true); return; }
    
    // Try all sources for vid
    const cookieVid = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('veranstalter_id='))?.split('=')[1];
    const localVid = localStorage.getItem('veranstalter_id');
    const urlVid = new URLSearchParams(window.location.search).get('vid');
    const vid = cookieVid || urlVid || localVid;
    
    if (!vid) { router.push('/veranstalter/login'); return; }
    
    fetch('/api/veranstalter/data?vid=' + vid)
      .then(r => r.json())
      .then(json => {
        if (json.veranstalter) {
          localStorage.setItem('veranstalter_id', vid);
          setVeranstalter(json.veranstalter);
          setChecked(true);
        } else {
          router.push('/veranstalter/login');
        }
      })
      .catch(() => router.push('/veranstalter/login'));
  }, [pathname]);

  if (pathname === '/veranstalter/login') return <>{children}</>;
  if (!checked) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#f9fafb'}}>
      <div style={{textAlign:'center'}}><p style={{fontSize:'28px'}}>🎟</p><p style={{color:'#666'}}>Laden...</p></div>
    </div>
  );
  if (!veranstalter) return <>{children}</>;

  const links = [
    { href:'/veranstalter/dashboard', label:'Dashboard', icon:'📊' },
    { href:'/veranstalter/events', label:'Meine Events', icon:'🎪' },
    { href:'/veranstalter/einstellungen', label:'Einstellungen', icon:'⚙️' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb'}}>
      <nav style={{background:'#111827',padding:'0 24px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'64px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'32px'}}>
            <span style={{color:'#fff',fontWeight:'700',fontSize:'18px'}}>🎟 Wolnaa</span>
            <div style={{display:'flex',gap:'4px'}}>
              {links.map(l => (
                <Link key={l.href} href={l.href} style={{color:pathname===l.href?'#fff':'#9ca3af',textDecoration:'none',padding:'8px 14px',borderRadius:'8px',fontSize:'14px',fontWeight:pathname===l.href?'500':'400',background:pathname===l.href?'#1f2937':'transparent',display:'flex',alignItems:'center',gap:'6px'}}>
                  <span>{l.icon}</span>{l.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <div style={{textAlign:'right'}}>
              <p style={{color:'#fff',fontSize:'14px',fontWeight:'500',margin:0}}>{veranstalter?.firmenname}</p>
              <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>Veranstalter-Portal</p>
            </div>
            <button onClick={() => { localStorage.removeItem('veranstalter_id'); document.cookie='veranstalter_id=;max-age=0;path=/'; router.push('/veranstalter/login'); }}
              style={{background:'none',border:'1px solid #374151',color:'#9ca3af',padding:'7px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>Logout</button>
          </div>
        </div>
      </nav>
      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'32px 24px'}}>{children}</main>
    </div>
  );
}

export default function VeranstalterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#f9fafb'}}><p>Laden...</p></div>}>
      <VeranstalterLayoutInner>{children}</VeranstalterLayoutInner>
    </Suspense>
  );
}
