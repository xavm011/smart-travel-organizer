import { supabase } from "./supabase";
import { generateItinerary } from "./itinerary";
import type { Booking, BookingDraft, ItineraryPlan, Trip } from "./types";

const TRIPS_KEY = "sto_trips_v1";
const BOOKINGS_KEY = "sto_bookings_v1";
const ITINERARIES_KEY = "sto_itineraries_v1";
const read = <T>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
};
const write = <T>(key: string, rows: T[]) =>
  localStorage.setItem(key, JSON.stringify(rows));

const MARRAKECH_TRIP_ID = "demo-marrakech-2026";
const REQUIRED_DEMO_BOOKING_IDS = [
  "demo-iberostar-palmeraie",
  "demo-cesar-resort",
  "demo-sentral-alea-miami",
  "demo-itc-conference-miami",
  "demo-tony-hotel-south-beach",
];

function seedMarrakechTrip() {
  const existing = read<Trip>(TRIPS_KEY);
  const demoTrip = existing.find((trip) => trip.id === MARRAKECH_TRIP_ID);
  if (existing.length && !demoTrip) return existing;

  const trip: Trip = {
    id: MARRAKECH_TRIP_ID,
    destination: "Maroc et États-Unis",
    start_date: "2026-11-10",
    end_date: "2026-11-26",
    created_at: demoTrip?.created_at || new Date().toISOString(),
  };
  const bookings: Booking[] = [
    {
      id: "demo-iberostar-palmeraie",
      trip_id: trip.id,
      type: "hotel",
      title: "Iberostar Waves Club Palmeraie Marrakech All Inclusive",
      start_at: "2026-11-10T15:00:00",
      end_at: "2026-11-14T11:00:00",
      location: "Marrakech",
      address: "Commune Rurale Alouidane, Marrakech",
      reference: "",
      notes: "Confirmation à vérifier avant le départ.",
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-cesar-resort",
      trip_id: trip.id,
      type: "hotel",
      title: "Cesar Resort & Spa",
      start_at: "2026-11-14T15:00:00",
      end_at: "2026-11-17T11:00:00",
      location: "Marrakech",
      address: "Route de l'Ourika, Zone Touristique de l'Agdal, Marrakech",
      reference: "",
      notes: "Confirmation à vérifier avant le départ.",
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-sentral-alea-miami",
      trip_id: trip.id,
      type: "hotel",
      title: "Sentral Alea Miami",
      start_at: "2026-11-19T15:00:00",
      end_at: "2026-11-23T11:00:00",
      location: "Miami",
      address: "230 NE 4th St, Miami, FL 33132",
      reference: "",
      notes: "Séjour du 19 au 23 novembre 2026.",
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-itc-conference-miami",
      trip_id: trip.id,
      type: "activity",
      title: "Into The Cryptoverse Conference",
      start_at: "2026-11-20T09:00:00",
      end_at: "2026-11-22T18:00:00",
      location: "Miami",
      address: "JW Marriott Marquis Miami, 255 Biscayne Boulevard Way, Miami, FL 33131",
      reference: "",
      notes: "Conférence ITC du 20 au 22 novembre 2026.",
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-tony-hotel-south-beach",
      trip_id: trip.id,
      type: "hotel",
      title: "Tony Hotel South Beach",
      start_at: "2026-11-23T15:00:00",
      end_at: "2026-11-26T11:00:00",
      location: "Miami Beach",
      address: "801 Collins Ave, Miami Beach, FL 33139",
      reference: "",
      notes: "Séjour du 23 au 26 novembre 2026.",
      created_at: new Date().toISOString(),
    },
  ];

  const storedBookings = read<Booking>(BOOKINGS_KEY);
  const alreadyCurrent =
    demoTrip?.destination === trip.destination &&
    demoTrip.end_date === trip.end_date &&
    REQUIRED_DEMO_BOOKING_IDS.every((id) =>
      storedBookings.some((booking) => booking.id === id),
    );
  if (alreadyCurrent) return existing;

  const demoBookingIds = new Set(REQUIRED_DEMO_BOOKING_IDS);
  const mergedBookings = [
    ...storedBookings.filter(
      (booking) =>
        booking.trip_id !== trip.id || !demoBookingIds.has(booking.id),
    ),
    ...bookings,
  ];
  const plan = generateItinerary(
    trip,
    mergedBookings.filter((booking) => booking.trip_id === trip.id),
    "balanced",
  );
  const trips = [...existing.filter((row) => row.id !== trip.id), trip];
  write(TRIPS_KEY, trips);
  write(BOOKINGS_KEY, mergedBookings);
  write(ITINERARIES_KEY, [
    ...read<ItineraryPlan>(ITINERARIES_KEY).filter(
      (row) => row.trip_id !== trip.id,
    ),
    plan,
  ]);
  return trips;
}

export async function listTrips(): Promise<Trip[]> {
  if (!supabase) return seedMarrakechTrip();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date");
  if (error) throw error;
  return data as Trip[];
}
export async function createTrip(
  destination: string,
  start_date: string,
  end_date: string,
): Promise<Trip> {
  if (!supabase) {
    const trip = {
      id: crypto.randomUUID(),
      destination,
      start_date,
      end_date,
      created_at: new Date().toISOString(),
    };
    write(TRIPS_KEY, [...read<Trip>(TRIPS_KEY), trip]);
    return trip;
  }
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) throw new Error("Connexion requise.");
  const { data, error } = await supabase
    .from("trips")
    .insert({ user_id: userData.user.id, destination, start_date, end_date })
    .select()
    .single();
  if (error) throw error;
  return data as Trip;
}
export async function deleteTrip(id: string) {
  if (!supabase) {
    write(
      TRIPS_KEY,
      read<Trip>(TRIPS_KEY).filter((t) => t.id !== id),
    );
    write(
      BOOKINGS_KEY,
      read<Booking>(BOOKINGS_KEY).filter((b) => b.trip_id !== id),
    );
    write(
      ITINERARIES_KEY,
      read<ItineraryPlan>(ITINERARIES_KEY).filter((p) => p.trip_id !== id),
    );
    return;
  }
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}
export async function listBookings(tripId: string): Promise<Booking[]> {
  if (!supabase)
    return read<Booking>(BOOKINGS_KEY).filter((b) => b.trip_id === tripId);
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("trip_id", tripId)
    .order("start_at");
  if (error) throw error;
  return data as Booking[];
}
export async function createBooking(
  tripId: string,
  draft: BookingDraft,
): Promise<Booking> {
  if (!supabase) {
    const booking = {
      ...draft,
      id: crypto.randomUUID(),
      trip_id: tripId,
      created_at: new Date().toISOString(),
    };
    write(BOOKINGS_KEY, [...read<Booking>(BOOKINGS_KEY), booking]);
    return booking;
  }
  const { data, error } = await supabase
    .from("bookings")
    .insert({ trip_id: tripId, ...draft })
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}
export async function deleteBooking(id: string) {
  if (!supabase) {
    write(
      BOOKINGS_KEY,
      read<Booking>(BOOKINGS_KEY).filter((b) => b.id !== id),
    );
    return;
  }
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

export async function getItinerary(
  tripId: string,
): Promise<ItineraryPlan | null> {
  if (!supabase)
    return (
      read<ItineraryPlan>(ITINERARIES_KEY).find((p) => p.trip_id === tripId) ||
      null
    );
  const { data, error } = await supabase
    .from("itineraries")
    .select("trip_id, pace, days, booking_signature, generated_at")
    .eq("trip_id", tripId)
    .maybeSingle();
  if (error) throw error;
  return data as ItineraryPlan | null;
}

export async function saveItinerary(plan: ItineraryPlan): Promise<void> {
  if (!supabase) {
    write(ITINERARIES_KEY, [
      ...read<ItineraryPlan>(ITINERARIES_KEY).filter(
        (p) => p.trip_id !== plan.trip_id,
      ),
      plan,
    ]);
    return;
  }
  const { error } = await supabase
    .from("itineraries")
    .upsert(plan, { onConflict: "trip_id" });
  if (error) throw error;
}
