import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: event } = await sb.from("events").select("*").eq("slug", params.id).single();

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
