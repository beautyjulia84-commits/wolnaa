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
    
    localStorage.setItem('veranstalter_id', vid);
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
    { href:'/veranstalter/events', label:'Events', icon:'🎪' },
    { href:'/veranstalter/scanner', label:'Scanner', icon:'▣' },
    { href:'/veranstalter/einstellungen', label:'Einstellungen', icon:'⚙️' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',overflowX:'hidden'}}>
      <nav style={{background:'#000',padding:'0 16px',overflowX:'hidden'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'64px',flexWrap:'nowrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'16px',flexShrink:0}}>
            <Link href="/veranstalter/dashboard" style={{display:'flex',alignItems:'center',textDecoration:'none',flexShrink:0}}>
              <img src="/wolnaa-logo.png" alt="Wolnaa" style={{height:'34px',width:'auto',display:'block'}} />
            </Link>
            <div style={{display:'flex',gap:'2px'}}>
              {links.map(l => (
                <Link key={l.href} href={l.href} style={{color:pathname===l.href?'#fff':'#cbd5e1',textDecoration:'none',padding:'6px 10px',borderRadius:'8px',fontSize:'13px',background:pathname===l.href?'#1f2937':'transparent',whiteSpace:'nowrap'}}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <p style={{color:'#9ca3af',fontSize:'13px',margin:0,whiteSpace:'nowrap'}}>{firmenname}</p>
            <button onClick={async () => {
              await fetch('/api/veranstalter/logout', { method: 'POST' });
              localStorage.removeItem('veranstalter_id');
              localStorage.removeItem('veranstalter_name');
              document.cookie='veranstalter_id=;max-age=0;path=/';
              router.push('/veranstalter/login');
            }} style={{background:'none',border:'1px solid #374151',color:'#9ca3af',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',whiteSpace:'nowrap'}}>Logout</button>
          </div>
        </div>
      </nav>
      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'24px 16px',overflowX:'hidden'}}>{children}</main>
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
