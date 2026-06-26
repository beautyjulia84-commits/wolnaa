'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

function VeranstalterLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [loading, setLoading] = useState(true);
  const [veranstalter, setVeranstalter] = useState<any>(null);

  useEffect(() => {
    if (pathname === '/veranstalter/login') { setLoading(false); return; }
    const check = async () => {
      // Try cookie first, then searchParams, then localStorage
      const cookieVid = document.cookie.split(';').find(c => c.trim().startsWith('veranstalter_id='))?.split('=')[1];
      const vid = cookieVid || searchParams.get('vid') || localStorage.getItem('veranstalter_id');
      if (!vid) { router.push('/veranstalter/login'); return; }
      console.log('VID:', vid);
      const res = await fetch('/api/veranstalter/data?vid=' + vid);
      const json = await res.json();
      console.log('JSON:', JSON.stringify(json));
      if (!json.veranstalter) { router.push('/veranstalter/login'); return; }
      localStorage.setItem('veranstalter_id', vid);
      setVeranstalter(json.veranstalter);
      setLoading(false);
    };
    check();
  }, [pathname]);

  if (pathname === '/veranstalter/login') return <>{children}</>;
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#f9fafb' }}>
      <div style={{ textAlign:'center' }}><p style={{ fontSize:'28px' }}>🎟</p><p style={{ color:'#666' }}>Laden...</p></div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb' }}>
      <Nav veranstalter={veranstalter} pathname={pathname} />
      <main style={{ maxWidth:'1100px', margin:'0 auto', padding:'32px 24px' }}>{children}</main>
    </div>
  );
}

function Nav({ veranstalter, pathname }: { veranstalter: any; pathname: string }) {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const logout = async () => { await supabase.auth.signOut(); router.push('/veranstalter/login'); };
  const links = [
    { href:'/veranstalter/dashboard', label:'Dashboard', icon:'📊' },
    { href:'/veranstalter/events', label:'Meine Events', icon:'🎪' },
    { href:'/veranstalter/einstellungen', label:'Einstellungen', icon:'⚙️' },
  ];
  return (
    <nav style={{ background:'#111827', padding:'0 24px' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', height:'64px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'32px' }}>
          <span style={{ color:'#fff', fontWeight:'700', fontSize:'18px' }}>🎟 Wolnaa</span>
          <div style={{ display:'flex', gap:'4px' }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} style={{ color: pathname===l.href ? '#fff':'#9ca3af', textDecoration:'none', padding:'8px 14px', borderRadius:'8px', fontSize:'14px', fontWeight: pathname===l.href ? '500':'400', background: pathname===l.href ? '#1f2937':'transparent', display:'flex', alignItems:'center', gap:'6px' }}>
                <span>{l.icon}</span>{l.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ color:'#fff', fontSize:'14px', fontWeight:'500', margin:0 }}>{veranstalter?.firmenname}</p>
            <p style={{ color:'#6b7280', fontSize:'12px', margin:0 }}>Veranstalter-Portal</p>
          </div>
          <button onClick={logout} style={{ background:'none', border:'1px solid #374151', color:'#9ca3af', padding:'7px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

export default function VeranstalterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#f9fafb'}}><p>Laden...</p></div>}>
      <VeranstalterLayoutInner>{children}</VeranstalterLayoutInner>
    </Suspense>
  );
}
