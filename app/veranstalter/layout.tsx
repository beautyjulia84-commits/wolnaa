'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

function VeranstalterLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [firmenname, setFirmenname] = useState('');

  useEffect(() => {
    if (pathname === '/veranstalter/login') { setReady(true); return; }
    
    const vid = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('veranstalter_id='))?.split('=')[1]
      || localStorage.getItem('veranstalter_id');
    
    if (!vid) { router.replace('/veranstalter/login'); return; }
    
    setFirmenname(localStorage.getItem('veranstalter_name') || 'Veranstalter');
    setReady(true);
  }, [pathname]);

  if (!ready) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#f9fafb'}}>
      <p style={{color:'#666'}}>🎟 Laden...</p>
    </div>
  );

  if (pathname === '/veranstalter/login') return <>{children}</>;

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
                <Link key={l.href} href={l.href} style={{color:pathname===l.href?'#fff':'#9ca3af',textDecoration:'none',padding:'8px 14px',borderRadius:'8px',fontSize:'14px',background:pathname===l.href?'#1f2937':'transparent',display:'flex',alignItems:'center',gap:'6px'}}>
                  <span>{l.icon}</span>{l.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <p style={{color:'#fff',fontSize:'14px',margin:0}}>{firmenname}</p>
            <button onClick={() => {
              localStorage.removeItem('veranstalter_id');
              localStorage.removeItem('veranstalter_name');
              document.cookie='veranstalter_id=;max-age=0;path=/';
              router.push('/veranstalter/login');
            }} style={{background:'none',border:'1px solid #374151',color:'#9ca3af',padding:'7px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>Logout</button>
          </div>
        </div>
      </nav>
      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'32px 24px'}}>{children}</main>
    </div>
  );
}

export default function VeranstalterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><p>Laden...</p></div>}>
      <VeranstalterLayoutInner>{children}</VeranstalterLayoutInner>
    </Suspense>
  );
}
