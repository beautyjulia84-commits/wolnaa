'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

type ScanResult = {
  valid: boolean;
  reason?: string;
  customerName?: string;
  eventTitle?: string;
  ticketName?: string;
  checkedInAt?: string;
};

export default function VeranstalterScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [lastScanned, setLastScanned] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch {
      setCamError('Kamerazugriff verweigert.');
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animRef.current);
    (videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach(track => track.stop());
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height);

    if (code?.data && code.data !== lastScanned) {
      setLastScanned(code.data);
      validate(code.data);
      return;
    }

    animRef.current = requestAnimationFrame(tick);
  }

  async function validate(ticketId: string) {
    setScanning(false);

    try {
      const res = await fetch('/api/veranstalter/validate-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      });

      if (res.status === 401) {
        window.location.href = '/veranstalter/login';
        return;
      }
      setResult(await res.json());
    } catch {
      setResult({ valid: false, reason: 'Ticket konnte nicht geprüft werden.' });
    }

    setTimeout(() => {
      setResult(null);
      setLastScanned('');
      setScanning(true);
      requestAnimationFrame(tick);
    }, 4000);
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700, color: '#111' }}>Scanner</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '15px' }}>Nur Tickets deiner eigenen Events werden akzeptiert.</p>
      </div>

      <div style={{ maxWidth: '430px', margin: '0 auto' }}>
        <div style={{ position: 'relative', background: '#000', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4 / 3', border: '1px solid #e5e7eb' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!result && !camError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '180px', height: '180px', border: '3px solid #facc15', borderRadius: '18px', boxShadow: '0 0 0 999px rgba(0,0,0,.35)' }} />
            </div>
          )}

          {result && (
            <div style={{ position: 'absolute', inset: 0, background: result.valid ? 'rgba(22,163,74,.96)' : 'rgba(220,38,38,.96)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
              <div>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 14px' }}>
                  {result.valid ? '✓' : '✕'}
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: '24px' }}>{result.valid ? 'Gültig' : 'Ungültig'}</h2>
                {result.valid ? (
                  <>
                    <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{result.customerName}</p>
                    <p style={{ margin: 0, opacity: .9 }}>{result.eventTitle}</p>
                    {result.ticketName && <p style={{ margin: '6px 0 0', opacity: .8 }}>{result.ticketName}</p>}
                  </>
                ) : (
                  <p style={{ margin: 0 }}>{result.reason}</p>
                )}
              </div>
            </div>
          )}

          {camError && (
            <div style={{ position: 'absolute', inset: 0, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '24px', textAlign: 'center' }}>
              <div>
                <p>{camError}</p>
                <button onClick={startCamera} style={{ marginTop: '12px', background: '#facc15', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 700 }}>Erneut versuchen</button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '14px', color: '#6b7280', fontSize: '13px' }}>
          {scanning ? 'QR-Code in den Rahmen halten' : 'Prüfe Ticket...'}
        </p>
      </div>
    </div>
  );
}
