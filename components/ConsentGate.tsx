'use client';
import { useEffect, useState, type ReactNode } from 'react';
export default function ConsentGate({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const update = () => setAllowed(localStorage.getItem('wolnaa-cookie-consent') === 'all');
    update();
    window.addEventListener('wolnaa-consent-change', update);
    return () => window.removeEventListener('wolnaa-consent-change', update);
  }, []);
  return allowed ? children : null;
}
