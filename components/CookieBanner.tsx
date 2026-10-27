'use client';
import {useEffect,useRef,useState} from 'react';

export default function CookieBanner({lang}:{lang:'de'|'ru'}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [visible,setVisible]=useState(false);
  const [optional,setOptional]=useState(false);
  const de=lang==='de';
  useEffect(()=>{
    const open=()=>{setOptional(localStorage.getItem('wolnaa-cookie-consent')==='all');setVisible(true);};
    if(!localStorage.getItem('wolnaa-cookie-consent') || (localStorage.getItem('wolnaa-cookie-consent')==='all' && localStorage.getItem('wolnaa-meta-consent-version')!=='2') || new URLSearchParams(window.location.search).get('cookies')==='1') open();
    window.addEventListener('wolnaa-open-cookie-settings',open);
    return ()=>window.removeEventListener('wolnaa-open-cookie-settings',open);
  },[]);
  useEffect(()=>{
    if(!visible) {dialog.current?.close();return;}
    dialog.current?.showModal();
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;};
  },[visible]);
  function save(all:boolean) {
    const wasAll=localStorage.getItem('wolnaa-cookie-consent')==='all';
    localStorage.setItem('wolnaa-cookie-consent',all?'all':'necessary');
    localStorage.setItem('wolnaa-meta-consent-version','2');
    document.cookie=`wolnaa-meta-consent=${all?'2':''}; Path=/; SameSite=Lax; Secure; Max-Age=${all?15552000:0}`;
    window.dispatchEvent(new Event('wolnaa-consent-change'));
    setVisible(false);
    if(wasAll&&!all) window.location.reload();
  }
  return <dialog ref={dialog} className="wolnaa-cookie-dialog" aria-labelledby="cookie-heading" onCancel={()=>setVisible(false)} onClose={()=>setVisible(false)}>
    <div className="cookie-dialog-heading"><h2 id="cookie-heading">{de?'Cookies & Einstellungen':'Cookie и настройки'}</h2><button aria-label={de?'Schließen':'Закрыть'} onClick={()=>setVisible(false)}>×</button></div>
    <p>{de?'Notwendige Cookies ermöglichen Anmeldung und Ticketbuchung. Optionale Statistik und Werbetracking aktivieren wir nur mit deiner Zustimmung.':'Необходимые cookie обеспечивают вход и покупку билетов. Статистика и рекламное отслеживание включаются только с вашего согласия.'} <a href="/datenschutz">{de?'Datenschutz':'Защита данных'}</a></p>
    <div className="cookie-option"><span className="cookie-toggle enabled" aria-hidden="true"/><div><strong>{de?'Notwendig':'Необходимые'}</strong><p>{de?'Anmeldung, Buchung und Sicherheit. Immer aktiv.':'Вход, покупка и безопасность. Всегда активны.'}</p></div></div>
    <label className="cookie-option"><input type="checkbox" checked={optional} onChange={e=>setOptional(e.target.checked)}/><span className={`cookie-toggle ${optional?'enabled':''}`} aria-hidden="true"/><div><strong>{de?'Statistik & Marketing':'Статистика и маркетинг'}</strong><p>{de?'Meta (Facebook/Instagram), TikTok und Zuordnung der Ticketkäufe. Bei Meta werden nach Zustimmung auch bestätigte Käufe mit Betrag, Ticketanzahl und Browser-/Werbekennung gemeldet. Freiwillig.':'Meta (Facebook/Instagram), TikTok и источник покупки билетов. С согласия в Meta передаются подтверждённые покупки: сумма, количество билетов и рекламный идентификатор браузера. Добровольно.'}</p></div></label>
    <div className="cookie-actions"><button className="wolnaa-gold-button" onClick={()=>save(true)}>{de?'Alle akzeptieren':'Принять все'}</button><button onClick={()=>save(false)}>{de?'Nur notwendige':'Только необходимые'}</button><button onClick={()=>save(optional)}>{de?'Auswahl speichern':'Сохранить выбор'}</button></div>
  </dialog>;
}
