'use client';
import {useEffect,useState} from 'react';
export function useEventClock() {
  const [now,setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now()); tick();
    const timer = window.setInterval(tick,1000);
    window.addEventListener('focus',tick);
    document.addEventListener('visibilitychange',tick);
    return () => { clearInterval(timer); window.removeEventListener('focus',tick); document.removeEventListener('visibilitychange',tick); };
  },[]);
  return now;
}
