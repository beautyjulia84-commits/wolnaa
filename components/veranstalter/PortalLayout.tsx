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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/veranstalter/login' || pathname === '/veranstalter/passwort-festlegen') { setReady(true); return; }

    let cancelled = false;

    async function checkAccess() {
      try {
        const res = await fetch('/api/veranstalter/data');
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.veranstalter) {
          localStorage.removeItem('veranstalter_id');
          localStorage.removeItem('veranstalter_name');
          document.cookie = 'veranstalter_id=;max-age=0;path=/';
          router.replace('/veranstalter/login');
          return;
        }

        if (cancelled) return;
        localStorage.setItem('veranstalter_name', data.veranstalter?.firmenname || '');
        setFirmenname(data.veranstalter?.firmenname || 'Veranstalter');
        setReady(true);
      } catch {
        if (!cancelled) router.replace('/veranstalter/login');
      }
    }

    checkAccess();

    return () => { cancelled = true; };
  }, [pathname]);

  if (!ready) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#f9fafb'}}>
      <p style={{color:'#666'}}>🎟 Laden...</p>
    </div>
  );

  if (pathname === '/veranstalter/login' || pathname === '/veranstalter/passwort-festlegen') return <>{children}</>;

  const links = [
    { href:'/veranstalter/dashboard', label:'Dashboard' },
    { href:'/veranstalter/events', label:'Events' },
    { href:'/veranstalter/scanner', label:'Scanner' },
    { href:'/veranstalter/einstellungen', label:'Einstellungen' },
  ];

  const logout = async () => {
    await fetch('/api/veranstalter/logout', { method: 'POST' });
    localStorage.removeItem('veranstalter_id');
    localStorage.removeItem('veranstalter_name');
    document.cookie='veranstalter_id=;max-age=0;path=/';
    router.push('/veranstalter/login');
  };

  return (
    <div style={{minHeight:'100vh',background:'#fff',overflowX:'hidden',color:'#18181b'}}>
      <header style={{background:'rgba(255,255,255,.96)',borderBottom:'1px solid #e5e7eb',padding:'0 16px',position:'sticky',top:0,zIndex:40,backdropFilter:'blur(14px)'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',height:'64px'}}>
          <Link href="/veranstalter/dashboard" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',minWidth:0}}>
            <img src="/wolnaa-logo-gold-header.png" alt="Wolnaa" style={{height:'28px',width:'auto',display:'block',flexShrink:0}} />
            <div style={{minWidth:0}}>
              <p style={{margin:0,color:'#18181b',fontSize:'13px',fontWeight:700}}>Veranstalter</p>
              <p style={{margin:'2px 0 0',color:'#71717a',fontSize:'11px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'180px'}}>{firmenname}</p>
            </div>
          </Link>
          <div style={{position:'relative',flexShrink:0}}>
            <button
              type="button"
              aria-label="Veranstalter-Menü öffnen"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(open => !open)}
              style={{width:'40px',height:'40px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'5px',border:'1px solid #e5e7eb',borderRadius:'12px',background:'#fff',color:'#18181b',cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}
            >
              <span style={{width:'20px',height:'2px',borderRadius:'999px',background:'currentColor'}} />
              <span style={{width:'20px',height:'2px',borderRadius:'999px',background:'currentColor'}} />
              <span style={{width:'20px',height:'2px',borderRadius:'999px',background:'currentColor'}} />
            </button>
            {menuOpen && (
              <div style={{position:'absolute',right:0,top:'48px',width:'224px',background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'8px',boxShadow:'0 18px 40px rgba(0,0,0,.14)',overflow:'hidden'}}>
                {links.map(l => (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{display:'block',color:pathname===l.href?'#000':'#3f3f46',textDecoration:'none',padding:'12px 16px',borderRadius:'12px',fontSize:'14px',fontWeight:600,background:pathname===l.href?'#facc15':'transparent'}}>
                    {l.label}
                  </Link>
                ))}
                <div style={{borderTop:'1px solid #e5e7eb',margin:'8px 0'}} />
                <Link href="/" onClick={() => setMenuOpen(false)} style={{display:'block',color:'#52525b',textDecoration:'none',padding:'12px 16px',borderRadius:'12px',fontSize:'14px',fontWeight:500}}>Zur Website</Link>
                <button onClick={logout} style={{display:'block',width:'100%',background:'transparent',border:0,color:'#dc2626',textAlign:'left',padding:'12px 16px',borderRadius:'12px',fontSize:'14px',fontWeight:500,cursor:'pointer'}}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'28px 16px 40px',overflowX:'hidden'}}>{children}</main>
    </div>
  );
}

export default function VeranstalterPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><p>Laden...</p></div>}>
      <VeranstalterLayoutInner>{children}</VeranstalterLayoutInner>
    </Suspense>
  );
}
