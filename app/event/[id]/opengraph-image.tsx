import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WOLNAA Event";
export const size = { width: 1200, height: 630 };

export default async function Image({ params }: { params: { id: string } }) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?slug=eq.${params.id}&select=title,image_url`;
  const res = await fetch(url, {
    headers: {
      "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  });
  const data = await res.json();
  const event = data?.[0];

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      {event?.image_url && <img src={event.image_url} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />}
      <div style={{ position: "absolute", bottom: 40, left: 60, color: "#facc15", fontSize: 60, fontWeight: 900 }}>{event?.title || "WOLNAA"}</div>
    </div>
  );
}
