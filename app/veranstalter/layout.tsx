'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function VeranstalterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [veranstalter, setVeranstalter] = useState<any>(null);

  useEffect(() => {
    if (pathname === '/veranstalter/login') { setLoading(false); return; }
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/veranstalter/login'); return; }
      const { data } = await supabase.from('veranstalter').select('*').eq('user_id', user.id).single();
      if (!data || !data.aktiv) { await supabase.auth.signOut(); router.push('/veranstalter/login?error=kein_zugang'); return; }
      setVeranstalter(data);
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
  const supabase = createClientComponentClient();
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
