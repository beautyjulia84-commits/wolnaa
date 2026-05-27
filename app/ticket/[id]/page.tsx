 "use client";

import QRCode from "qrcode";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TicketPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    if (!ticketId) return;

    QRCode.toDataURL(ticketId).then((url) => {
      setQrCode(url);
    });
  }, [ticketId]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-[36px] border border-yellow-400/30 bg-zinc-950 p-8 text-center">
        <p className="text-yellow-400 uppercase tracking-[4px] text-sm mb-4">
          WOLNAA Ticket
        </p>

        <h1 className="text-4xl font-black mb-6">
          Dein QR Ticket
        </h1>

        {qrCode && (
          <div className="bg-white rounded-3xl p-6 inline-block mb-6">
            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
          </div>
        )}

        <p className="text-zinc-400 mb-2">Ticketnummer</p>
        <p className="text-yellow-400 text-xl font-bold break-all">
          {ticketId}
        </p>

        <p className="text-zinc-500 text-sm mt-8">
          Dieses Ticket wird später am Eingang gescannt.
        </p>

        <a
          href="/"
          className="inline-block mt-8 bg-yellow-400 text-black px-8 py-4 rounded-2xl font-bold"
        >
          Zur Startseite
        </a>
      </div>
    </main>
  );
}
