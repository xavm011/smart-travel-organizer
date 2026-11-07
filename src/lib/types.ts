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
  created_at: string;
};
export type BookingDraft = Omit<Booking, "id" | "trip_id" | "created_at">;

export const emptyBooking = (): BookingDraft => ({
  type: "flight",
  title: "",
  start_at: "",
  end_at: null,
  location: "",
  address: "",
  reference: "",
  notes: "",
});
