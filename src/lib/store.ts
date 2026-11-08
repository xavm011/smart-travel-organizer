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

function seedMarrakechTrip() {
  const existing = read<Trip>(TRIPS_KEY);
  if (existing.length) return existing;

  const trip: Trip = {
    id: MARRAKECH_TRIP_ID,
    destination: "Marrakech",
    start_date: "2026-11-10",
    end_date: "2026-11-17",
    created_at: new Date().toISOString(),
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
  ];
  const plan = generateItinerary(trip, bookings, "balanced");
  write(TRIPS_KEY, [trip]);
  write(BOOKINGS_KEY, bookings);
  write(ITINERARIES_KEY, [plan]);
  return [trip];
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
