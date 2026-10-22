export default function EventIcon({kind}:{kind:'calendar'|'clock'|'pin'}) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-[#00e5eb]">
    {kind==='calendar' ? <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></> : kind==='clock' ? <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></> : <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
  </svg>;
}
