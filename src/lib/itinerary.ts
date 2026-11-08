import type {
  Booking,
  ItineraryPlan,
  PlanDay,
  PlanItem,
  TravelPace,
  Trip,
} from "./types";

type Spot = { title: string; detail: string; location: string };
const MARRAKECH_SOURCE =
  "https://visitmarrakech.com/en/explore/?attractions=les-incontournables&type=monuments-parcs-musees";
const MARRAKECH_SPOTS: Spot[] = [
  {
    title: "Palais de la Bahia",
    detail: "Architecture et jardins, à réserver selon les horaires du jour.",
    location: "Palais de la Bahia, Marrakech",
  },
  {
    title: "Place Jemaa el-Fna",
    detail:
      "Découverte de la place et de son ambiance, sans réservation prévue.",
    location: "Jemaa el-Fna, Marrakech",
  },
  {
    title: "Jardin Majorelle",
    detail:
      "Balade dans le jardin ; vérifiez les billets et horaires avant de partir.",
    location: "Jardin Majorelle, Marrakech",
  },
  {
    title: "Musée Yves Saint Laurent",
    detail: "Visite culturelle à proximité du Jardin Majorelle.",
    location: "Musée Yves Saint Laurent, Marrakech",
  },
  {
    title: "Médersa Ben Youssef",
    detail: "Découverte du patrimoine de la médina.",
    location: "Médersa Ben Youssef, Marrakech",
  },
  {
    title: "Souks de la médina",
    detail: "Promenade libre dans les rues commerçantes.",
    location: "Souks de Marrakech",
  },
  {
    title: "Jardin de la Ménara",
    detail: "Promenade calme dans les jardins.",
    location: "Jardin de la Ménara, Marrakech",
  },
  {
    title: "Tombeaux saadiens",
    detail: "Visite patrimoniale, sous réserve d’ouverture.",
    location: "Tombeaux saadiens, Marrakech",
  },
  {
    title: "Palais El Badi",
    detail: "Exploration des vestiges du palais.",
    location: "Palais El Badi, Marrakech",
  },
  {
    title: "Le Jardin Secret",
    detail: "Pause et promenade dans un jardin de la médina.",
    location: "Le Jardin Secret, Marrakech",
  },
  {
    title: "Musée de Marrakech",
    detail: "Découverte culturelle dans la médina.",
    location: "Musée de Marrakech",
  },
  {
    title: "Koutoubia et ses jardins",
    detail: "Promenade à l’extérieur autour de la mosquée.",
    location: "Koutoubia, Marrakech",
  },
];

const dayOf = (dateTime: string) => dateTime.slice(0, 10);
const dateAtNoonUTC = (date: string) => new Date(`${date}T12:00:00Z`).getTime();
const timeSlot = (dateTime: string): PlanItem["slot"] => {
  const hour = Number(dateTime.slice(11, 13));
  return hour < 12 ? "matin" : hour < 18 ? "après-midi" : "soir";
};
const UNKNOWN_IDEAS = [
  "Musée ou monument à choisir",
  "Quartier à explorer",
  "Promenade nature à prévoir",
  "Activité culturelle à sélectionner",
  "Marché local à repérer",
];

export const bookingSignature = (bookings: Booking[]) =>
  bookings
    .map((b) =>
      [b.id, b.type, b.title, b.start_at, b.end_at, b.location].join("|"),
    )
    .sort()
    .join(";");

function cityFromText(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/marrakech|marrakesh/i.test(text)) return "Marrakech";
  if (/\b(lisbonne|lisbon)\b/i.test(text)) return "Lisbonne";
  const city = text.split(",")[0].trim();
  if (
    /^(maroc|états-unis|usa|france|portugal|espagne|italie|japon)$/i.test(city)
  )
    return null;
  return city;
}

function tripCity(destination: string): string | null {
  if (/\s(et|and)\s|\s[&/]\s/i.test(destination)) return null;
  return cityFromText(destination);
}

function currentHotel(date: string, hotels: Booking[]) {
  return hotels
    .filter(
      (b) =>
        dayOf(b.start_at) <= date &&
        (b.end_at ? date < dayOf(b.end_at) : date === dayOf(b.start_at)),
    )
    .sort((a, b) => b.start_at.localeCompare(a.start_at))[0];
}

function fixedItems(date: string, bookings: Booking[]): PlanItem[] {
  const items: PlanItem[] = [];
  for (const booking of bookings) {
    if (booking.type === "hotel") {
      if (dayOf(booking.start_at) === date)
        items.push({
          id: `${booking.id}-checkin`,
          slot: "après-midi",
          kind: "booking",
          title: `Installation · ${booking.title}`,
          detail:
            "Réservation confirmée : vérifiez l’heure d’arrivée auprès de l’établissement.",
          location: booking.location,
        });
      if (booking.end_at && dayOf(booking.end_at) === date)
        items.push({
          id: `${booking.id}-checkout`,
          slot: "matin",
          kind: "booking",
          title: `Départ · ${booking.title}`,
          detail: "Vérifiez l’heure de départ auprès de l’établissement.",
          location: booking.location,
        });
    } else if (dayOf(booking.start_at) === date) {
      items.push({
        id: booking.id,
        slot: timeSlot(booking.start_at),
        kind: "booking",
        title: booking.title,
        detail: `${booking.type === "flight" ? "Vol" : "Activité"} réservé${booking.type === "activity" ? "e" : ""}${booking.reference ? ` · réf. ${booking.reference}` : ""}`,
        location: booking.address || booking.location,
      });
    }
  }
  return items;
}

function makeItem(
  date: string,
  slot: PlanItem["slot"],
  kind: PlanItem["kind"],
  title: string,
  detail: string,
  index: number,
  location?: string,
  source_url?: string,
): PlanItem {
  return {
    id: `${date}-${slot}-${kind}-${index}`,
    slot,
    kind,
    title,
    detail,
    location,
    source_url,
  };
}

export function generateItinerary(
  trip: Trip,
  bookings: Booking[],
  pace: TravelPace,
): ItineraryPlan {
  const start = dateAtNoonUTC(trip.start_date);
  const end = dateAtNoonUTC(trip.end_date);
  const total = Math.floor((end - start) / 86400000) + 1;
  if (!Number.isFinite(total) || total < 1 || total > 120)
    throw new Error("La génération accepte les voyages de 1 à 120 jours.");
  const hotels = bookings.filter((b) => b.type === "hotel");
  const fallbackCity = tripCity(trip.destination);
  let spotIndex = 0;
  const days: PlanDay[] = [];

  for (let index = 0; index < total; index++) {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    const hotel = currentHotel(date, hotels);
    const sameDayBooking = bookings.find(
      (b) => b.type === "activity" && dayOf(b.start_at) === date && b.location,
    );
    const city =
      cityFromText(hotel?.location || "") ||
      cityFromText(sameDayBooking?.location || "") ||
      fallbackCity;
    const fixed = fixedItems(date, bookings);
    const flightDay = bookings.some(
      (b) => b.type === "flight" && dayOf(b.start_at) === date,
    );
    const checkoutWithoutStay =
      hotels.some((b) => b.end_at && dayOf(b.end_at) === date) && !hotel;
    const travelDay =
      index === 0 || index === total - 1 || flightDay || checkoutWithoutStay;
    const items: PlanItem[] = [...fixed];
    const used = (slot: PlanItem["slot"]) =>
      items.some(
        (item) =>
          item.slot === slot &&
          item.kind === "booking" &&
          item.title &&
          !item.title.startsWith("Installation"),
      );
    const add = (
      slot: PlanItem["slot"],
      kind: PlanItem["kind"],
      title: string,
      detail: string,
      location?: string,
      source?: string,
    ) =>
      items.push(
        makeItem(
          date,
          slot,
          kind,
          title,
          detail,
          items.length,
          location,
          source,
        ),
      );
    const addVisit = (slot: PlanItem["slot"]) => {
      if (used(slot)) return;
      if (city === "Marrakech") {
        const spot = MARRAKECH_SPOTS[spotIndex++ % MARRAKECH_SPOTS.length];
        add(
          slot,
          "visit",
          spot.title,
          spot.detail,
          spot.location,
          MARRAKECH_SOURCE,
        );
      } else if (city) {
        add(
          slot,
          "todo",
          `Choisir une visite à ${city}`,
          "Ville connue, attraction précise à choisir avant le départ.",
        );
      } else {
        add(
          slot,
          "todo",
          UNKNOWN_IDEAS[(index + spotIndex++) % UNKNOWN_IDEAS.length],
          "Ajoutez la prochaine ville ou une réservation, puis régénérez l’itinéraire.",
        );
      }
    };

    if (travelDay) {
      if (city === "Marrakech")
        addVisit(index === 0 ? "matin" : "après-midi");
      if (!used("matin") && !items.some((item) => item.slot === "matin"))
        add(
          "matin",
          "rest",
          index === 0 ? "Départ en douceur" : "Temps pour le trajet",
          "Gardez une marge pour les déplacements et les imprévus.",
        );
      if (
        !used("après-midi") &&
        !items.some((item) => item.slot === "après-midi")
      )
        add(
          "après-midi",
          city ? "rest" : "todo",
          city ? "Installation et pause" : "Prochaine étape à préciser",
          city
            ? "Profitez d’un temps libre après le trajet."
            : "La destination de cette journée n’est pas encore connue.",
        );
    } else {
      const visitCount =
        pace === "active"
          ? 2
          : pace === "balanced"
            ? 1 + (index % 2)
            : index % 2
              ? 1
              : 0;
      if (visitCount) addVisit("matin");
      else if (!used("matin"))
        add(
          "matin",
          "rest",
          "Matinée tranquille",
          "Petit-déjeuner à votre rythme et temps libre.",
        );
      if (visitCount > 1) addVisit("après-midi");
      else if (!used("après-midi"))
        add(
          "après-midi",
          "rest",
          "Pause et temps libre",
          city
            ? `Repos ou promenade libre à ${city}.`
            : "Repos avant la prochaine étape.",
        );
    }
    if (!used("soir"))
      add(
        "soir",
        "meal",
        pace === "active" ? "Dîner et soirée libres" : "Dîner sans se presser",
        "Choisissez selon votre énergie et vos envies du jour.",
      );
    const slotOrder = { matin: 0, "après-midi": 1, soir: 2 };
    items.sort(
      (a, b) =>
        slotOrder[a.slot] - slotOrder[b.slot] ||
        (a.kind === "booking" ? -1 : 1),
    );
    days.push({ date, city, items });
  }
  return {
    trip_id: trip.id,
    pace,
    days,
    booking_signature: bookingSignature(bookings),
    generated_at: new Date().toISOString(),
  };
}
