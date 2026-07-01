import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AdminEvent = {
  id?: string;
  title?: string;
  city?: string;
  date?: string;
  time?: string;
  onlineSaleEndsAt?: string;
  location?: string;
  address?: string;
  imageUrl?: string;
  price?: string;
  description?: string;
  tickets?: unknown[];
  lounges?: boolean;
  loungeList?: unknown[];
  discountCodes?: unknown[];
};

function isAdmin(req: NextRequest) {
  const cookieToken = req.cookies.get("wolnaa-admin-token")?.value;
  const headerToken = req.headers.get("x-admin-token");
  return cookieToken === process.env.ADMIN_PASSWORD || headerToken === process.env.ADMIN_PASSWORD;
}

function slugify(title: string) {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
}

function eventToRow(event: AdminEvent) {
  const title = event.title?.trim() ?? "";

  return {
    title,
    slug: slugify(title),
    city: event.city ?? "",
    date: event.date ?? "",
    time: event.time ?? "",
    online_sale_ends_at: event.onlineSaleEndsAt ? new Date(event.onlineSaleEndsAt).toISOString() : null,
    location: event.location ?? "",
    address: event.address ?? "",
    image_url: event.imageUrl ?? "",
    price: event.price ?? "",
    description: event.description ?? "",
    tickets: event.tickets ?? [],
    lounges: event.lounges ?? false,
    lounge_list: event.loungeList ?? [],
    discount_codes: event.discountCodes ?? [],
  };
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { event } = await req.json();
  if (!event?.title?.trim()) {
    return NextResponse.json({ error: "Eventname fehlt." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert(eventToRow(event))
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id });
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { event } = await req.json();
  if (!event?.id) {
    return NextResponse.json({ error: "Event-ID fehlt." }, { status: 400 });
  }
  if (!event?.title?.trim()) {
    return NextResponse.json({ error: "Eventname fehlt." }, { status: 400 });
  }

  const { error } = await supabase
    .from("events")
    .update(eventToRow(event))
    .eq("id", event.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
