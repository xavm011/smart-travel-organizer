export type BookingType = "flight" | "hotel" | "activity";
export type Trip = {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_at: string;
};
export type Booking = {
  id: string;
  trip_id: string;
  type: BookingType;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string;
  address: string;
  reference: string;
  notes: string;
  image_data?: string;
  created_at: string;
};
export type BookingDraft = Omit<Booking, "id" | "trip_id" | "created_at">;

export type TravelPace = "rest" | "balanced" | "active";
export type PlanItem = {
  id: string;
  slot: "matin" | "après-midi" | "soir";
  kind: "booking" | "visit" | "rest" | "meal" | "todo";
  title: string;
  detail: string;
  location?: string;
  source_url?: string;
};
export type PlanDay = {
  date: string;
  city: string | null;
  items: PlanItem[];
};
export type ItineraryPlan = {
  trip_id: string;
  pace: TravelPace;
  days: PlanDay[];
  booking_signature: string;
  generated_at: string;
};

export const emptyBooking = (): BookingDraft => ({
  type: "flight",
  title: "",
  start_at: "",
  end_at: null,
  location: "",
  address: "",
  reference: "",
  notes: "",
  image_data: "",
});
