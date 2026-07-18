"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";

type ScanResult = {
  valid: boolean;
  reason?: string;
  customerName?: string;
  eventTitle?: string;
  amount?: number;
  checkedInAt?: string;
};

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch {
      setError("Kamerazugriff verweigert. Bitte Kamera-Berechtigung erteilen.");
    }
  }

  function stopCamera() {
    cancelAnimationFrame(animRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data && code.data !== lastScanned) {
      setLastScanned(code.data);
      validateTicket(code.data);
      return; // Pause scanning while validating
    }

    animRef.current = requestAnimationFrame(tick);
  }

  async function validateTicket(ticketId: string) {
    setScanning(false);
    setResult(null);

    const adminPw = localStorage.getItem("wolnaa-admin-pw") ?? "";

    try {
      const res = await fetch("/api/validate-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminPw,
        },
        body: JSON.stringify({ ticketId }),
      });

      const data: ScanResult = await res.json();
      setResult(data);

      // Nach 4 Sekunden wieder scannen
      setTimeout(() => {
        setResult(null);
        setLastScanned("");
        setScanning(true);
        requestAnimationFrame(tick);
      }, 4000);
    } catch {
      setResult({ valid: false, reason: "Netzwerkfehler." });
      setTimeout(() => {
        setResult(null);
        setLastScanned("");
        setScanning(true);
        requestAnimationFrame(tick);
      }, 4000);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <Link href="/admin" className="text-[#d6b36a] font-bold text-sm">← Dashboard</Link>
        <h1 className="font-black text-lg">Check-In Scanner</h1>
        <div className={`w-2.5 h-2.5 rounded-full ${scanning ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
      </div>

      {/* Camera View */}
      <div className="relative flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan Frame */}
        {!result && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corners */}
              {[
                "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
                "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
                "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
                "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
              ].map((cls, i) => (
                <div key={i} className={`absolute w-10 h-10 border-[#d6b36a] ${cls}`} />
              ))}
              {/* Scan line */}
              {scanning && (
                <div className="absolute left-4 right-4 h-0.5 bg-[#d6b36a]/70 top-1/2 animate-bounce" />
              )}
            </div>
            <p className="absolute bottom-24 text-zinc-400 text-sm">QR-Code in den Rahmen halten</p>
          </div>
        )}

        {/* Result Overlay */}
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center p-8 ${
            result.valid ? "bg-green-950/95" : "bg-red-950/95"
          } backdrop-blur-sm`}>
            <div className="text-center max-w-xs w-full">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl ${
                result.valid ? "bg-green-400/20 border-2 border-green-400" : "bg-red-400/20 border-2 border-red-400"
              }`}>
                {result.valid ? "✓" : "✕"}
              </div>

              <h2 className={`text-3xl font-black mb-2 ${result.valid ? "text-green-400" : "text-red-400"}`}>
                {result.valid ? "Gültig!" : "Ungültig!"}
              </h2>

              {result.valid ? (
                <>
                  <p className="text-white text-xl font-bold mb-1">{result.customerName}</p>
                  <p className="text-zinc-400 text-sm mb-2">{result.eventTitle}</p>
                  <p className="text-green-400 font-bold">{result.amount?.toFixed(2)} €</p>
                </>
              ) : (
                <>
                  <p className="text-zinc-300 mb-2">{result.reason}</p>
                  {result.checkedInAt && (
                    <p className="text-zinc-500 text-sm">
                      Gescannt: {new Date(result.checkedInAt).toLocaleString("de-DE")}
                    </p>
                  )}
                  {result.customerName && (
                    <p className="text-zinc-400 text-sm mt-1">{result.customerName}</p>
                  )}
                </>
              )}

              <p className="text-zinc-600 text-xs mt-6">Scanner startet automatisch neu...</p>
            </div>
          </div>
        )}

        {/* Camera Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/90">
            <div className="text-center">
              <p className="text-5xl mb-4">📷</p>
              <p className="text-red-400 font-bold mb-2">Kein Kamerazugriff</p>
              <p className="text-zinc-400 text-sm">{error}</p>
              <button onClick={startCamera} className="mt-6 rounded-2xl bg-[#d6b36a] text-black font-bold px-6 py-3">
                Erneut versuchen
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
