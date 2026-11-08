import type { Booking, PlanDay, PlanItem } from "./types";

type Point = { label: string; latitude?: number; longitude?: number };
export type TravelLeg = {
  from: string;
  to: string;
  walkingMinutes: number | null;
  taxiMinutes: number | null;
  walkingUrl: string;
  taxiUrl: string;
};

// Approximate place centres for Marrakech. Sources: OpenStreetMap data displayed
// by Mapcarta (https://mapcarta.com/). These are not road routes.
const places: Record<string, [number, number]> = {
  "palais de la bahia": [31.62159, -7.98223],
  "place jemaa el-fna": [31.62582, -7.98924],
  "jardin majorelle": [31.64137, -8.00292],
  "musée yves saint laurent": [31.64255, -8.00327],
  "médersa ben youssef": [31.63188, -7.98711],
  "souks de la médina": [31.62773, -7.98867],
  "jardin de la ménara": [31.61334, -8.0216],
  "tombeaux saadiens": [31.6173, -7.9887],
  "palais el badi": [31.61833, -7.98583],
  "le jardin secret": [31.63087, -7.98993],
  "musée de marrakech": [31.6312, -7.9868],
  "koutoubia et ses jardins": [31.62419, -7.99358],
  "iberostar waves club palmeraie marrakech all inclusive": [
    31.66262, -7.89859,
  ],
  "cesar resort & spa": [31.58102, -7.98316],
};

const normalize = (text: string) => text.trim().toLocaleLowerCase("fr-FR");
const dayOf = (dateTime: string) => dateTime.slice(0, 10);

function point(label: string, key: string): Point {
  const coordinates = places[normalize(key)];
  return coordinates
    ? { label, latitude: coordinates[0], longitude: coordinates[1] }
    : { label };
}

function itemPoint(item: PlanItem): Point | null {
  if (!item.location) return null;
  const hotelName = item.title.match(/^(?:Installation|Départ) · (.+)$/)?.[1];
  if (hotelName) return point(`${hotelName}, ${item.location}`, hotelName);
  if (item.kind === "visit") return point(item.location, item.title);
  // A city alone is not a precise starting point for a route estimate.
  if (normalize(item.location) === "marrakech") return null;
  return point(item.location, item.title);
}

function startingHotel(date: string, bookings: Booking[]): Point | null {
  const hotels = bookings.filter((booking) => booking.type === "hotel");
  const previousStay = hotels
    .filter(
      (booking) =>
        dayOf(booking.start_at) < date &&
        (!booking.end_at || dayOf(booking.end_at) >= date),
    )
    .sort((a, b) => b.start_at.localeCompare(a.start_at))[0];
  if (!previousStay) return null;
  return point(
    previousStay.address || `${previousStay.title}, ${previousStay.location}`,
    previousStay.title,
  );
}

function distanceKm(a: Point, b: Point): number | null {
  if (
    a.latitude === undefined ||
    a.longitude === undefined ||
    b.latitude === undefined ||
    b.longitude === undefined
  )
    return null;
  const rad = Math.PI / 180;
  const deltaLatitude = (b.latitude - a.latitude) * rad;
  const deltaLongitude = (b.longitude - a.longitude) * rad;
  const angle =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
}

const roundFive = (minutes: number) => Math.max(5, Math.ceil(minutes / 5) * 5);
export const formatDuration = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;

export function directionsUrl(
  from: string,
  to: string,
  mode: "walking" | "driving",
) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${mode}`;
}

function makeLeg(from: Point, to: Point): TravelLeg | null {
  if (normalize(from.label) === normalize(to.label)) return null;
  const kilometres = distanceKm(from, to);
  if (kilometres !== null && kilometres < 0.08) return null;
  const estimated = kilometres !== null && kilometres <= 30;
  return {
    from: from.label,
    to: to.label,
    walkingMinutes: estimated
      ? roundFive(((kilometres! * 1.35) / 4.5) * 60)
      : null,
    taxiMinutes: estimated
      ? roundFive(((kilometres! * 1.45) / 25) * 60 + 5)
      : null,
    walkingUrl: directionsUrl(from.label, to.label, "walking"),
    taxiUrl: directionsUrl(from.label, to.label, "driving"),
  };
}

export function travelLegsForDay(
  day: PlanDay,
  bookings: Booking[],
): (TravelLeg | null)[] {
  let origin = startingHotel(day.date, bookings);
  return day.items.map((item) => {
    const destination = itemPoint(item);
    if (!destination) return null;
    const leg = origin ? makeLeg(origin, destination) : null;
    origin = destination;
    return leg;
  });
}
