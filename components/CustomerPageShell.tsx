import SiteHeader from "./SiteHeader";
import Link from 'next/link';
import type {ReactNode} from 'react';

export default function CustomerPageShell({children}:{children:ReactNode}) {
  return <main className="wolnaa-info wolnaa-customer-page">
    <SiteHeader />
    <div className="wolnaa-customer-card">{children}</div>
    <footer className="wolnaa-customer-footer"><a href="mailto:kontakt@wolnaa.de">Hilfe & Kontakt</a><Link href="/?cookies=1">Cookie-Einstellungen</Link></footer>
  </main>;
}
