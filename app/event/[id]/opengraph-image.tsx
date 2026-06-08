import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WOLNAA Event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?slug=eq.${params.id}&select=title,image_url`;
  
  try {
    const res = await fetch(url, {
      headers: { "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    });
    const data = await res.json();
    const event = data?.[0];
    const title = event?.title || "WOLNAA";
    const imageUrl = event?.image_url || "";

    return new ImageResponse(
      <div style={{ width: "1200px", height: "630px", display: "flex", position: "relative", background: "#000" }}>
        {imageUrl && <img src={imageUrl} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", bottom: "60px", left: "80px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ color: "#facc15", fontSize: "28px", fontWeight: 700, letterSpacing: "6px" }}>WOLNAA</div>
          <div style={{ color: "#fff", fontSize: "64px", fontWeight: 900, lineHeight: 1.1 }}>{title}</div>
        </div>
      </div>
    );
  } catch {
    return new ImageResponse(
      <div style={{ width: "1200px", height: "630px", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        <div style={{ color: "#facc15", fontSize: "80px", fontWeight: 900 }}>WOLNAA</div>
      </div>
    );
  }
}
