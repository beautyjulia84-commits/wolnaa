import { withEventSchedules, saveEventSchedule } from '@/lib/event-schedules';
import { validateSchedule } from '@/lib/event-timing';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";

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
  eventEndsAt?: string;
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
    // Keep the legacy column in its original wall-time encoding. The canonical
    // Berlin instant is stored with the schedule; retries cannot double-shift it.
    online_sale_ends_at: event.onlineSaleEndsAt ? event.onlineSaleEndsAt + ':00.000Z' : null,
    location: event.location ?? "",
    address: event.address ?? "",
    image_url: event.imageUrl ?? "",
    price: event.price ?? "",
    description: event.description ?? "",
    tickets: event.tickets ?? [],
    lounges: event.lounges ?? false,
    lounge_list: event.loungeList ?? [],
    discount_codes: event.discountCodes ?? [],
    veranstalter_id: null,
    stripe_account_id: null,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .is("veranstalter_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { events: await withEventSchedules(supabase, data ?? []) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { event } = await req.json();
  if (!event?.title?.trim()) {
    return NextResponse.json({ error: "Eventname fehlt." }, { status: 400 });
  }

  let schedule;
  try { schedule = validateSchedule(event); } catch (e) { return NextResponse.json({error:(e as Error).message},{status:400}); }
  const { data, error } = await supabase
    .from("events")
    .insert(eventToRow(event))
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try { await saveEventSchedule(supabase,data.id,schedule); } catch(e) { return NextResponse.json({error:(e as Error).message},{status:500}); }
  return NextResponse.json({ success: true, id: data?.id });
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { event } = await req.json();
  if (!event?.id) {
    return NextResponse.json({ error: "Event-ID fehlt." }, { status: 400 });
  }
  if (!event?.title?.trim()) {
    return NextResponse.json({ error: "Eventname fehlt." }, { status: 400 });
  }

  let schedule;
  try { schedule = validateSchedule(event); } catch (e) { return NextResponse.json({error:(e as Error).message},{status:400}); }
  const { data, error } = await supabase
    .from("events")
    .update(eventToRow(event))
    .eq("id", event.id)
    .is("veranstalter_id", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Event nicht gefunden oder kein Admin-Event." }, { status: 404 });
  }

  try { await saveEventSchedule(supabase,event.id,schedule); } catch(e) { return NextResponse.json({error:(e as Error).message},{status:500}); }
  return NextResponse.json({ success: true });
}
