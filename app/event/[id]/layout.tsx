import type { Metadata } from "next";

async function getEvent(slug: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?slug=eq.${slug}&select=*`;
  const res = await fetch(url, {
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    cache: "no-store",
  });
  const data = await res.json();
  return data?.[0] ?? null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEvent(params.id);

  if (!event) return { title: "WOLNAA – Event nicht gefunden" };

  return {
    title: `${event.title} – WOLNAA`,
    description: event.description?.slice(0, 160) || "Exclusive Events von WOLNAA",
    openGraph: {
      title: `${event.title} – WOLNAA`,
      description: event.description?.slice(0, 160) || "Exclusive Events von WOLNAA",
      images: event.image_url ? [{ url: event.image_url, width: 1200, height: 630 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} – WOLNAA`,
      description: event.description?.slice(0, 160) || "Exclusive Events von WOLNAA",
      images: event.image_url ? [event.image_url] : [],
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
