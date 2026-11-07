import { supabase } from "./supabase";
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

export async function listTrips(): Promise<Trip[]> {
  if (!supabase) return read<Trip>(TRIPS_KEY);
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
