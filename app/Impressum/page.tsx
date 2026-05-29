import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function ImpressumPage() {
  const { data } = await supabase
    .from("legal")
    .select("content")
    .eq("key", "impressum")
    .single();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", fontFamily: "sans-serif", color: "#fff", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Impressum</h1>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#a1a1aa" }}>
        {data?.content || "Kein Inhalt vorhanden."}
      </div>
    </main>
  );
}
