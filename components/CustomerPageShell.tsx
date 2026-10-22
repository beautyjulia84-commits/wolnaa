import Link from 'next/link';
import type {ReactNode} from 'react';

export default function CustomerPageShell({children}:{children:ReactNode}) {
  return <main className="wolnaa-info wolnaa-customer-page">
    <header className="wolnaa-customer-header">
      <Link href="/" aria-label="Wolnaa Startseite"><img src="/wolnaa-logo.png" alt="WOLNAA" width={140} height={70} /></Link>
      <Link href="/#events">Zum Ticketshop <span aria-hidden="true">↗</span></Link>
    </header>
    <div className="wolnaa-customer-card">{children}</div>
    <footer className="wolnaa-customer-footer"><a href="mailto:kontakt@wolnaa.de">Hilfe & Kontakt</a><Link href="/?cookies=1">Cookie-Einstellungen</Link></footer>
  </main>;
}
