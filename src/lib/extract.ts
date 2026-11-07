import type { BookingDraft, BookingType } from "./types";

const datePattern =
  /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?\b/;
const frDate =
  /\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})(?:\s+(\d{1,2})[h:](\d{2}))?\b/;
const matchDate = (text: string) => {
  const iso = text.match(datePattern);
  if (iso)
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}T${(iso[4] || "09").padStart(2, "0")}:${iso[5] || "00"}`;
  const fr = text.match(frDate);
  if (fr)
    return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}T${(fr[4] || "09").padStart(2, "0")}:${fr[5] || "00"}`;
  return "";
};
export function extractBasic(text: string): BookingDraft {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lower = text.toLowerCase();
  const type: BookingType =
    /\b(vol|flight|airline|airways|aéroport|airport)\b/.test(lower)
      ? "flight"
      : /\b(hôtel|hotel|hébergement|accommodation|check-in)\b/.test(lower)
        ? "hotel"
        : "activity";
  const ref = text.match(
    /(?:référence|reference|confirmation|booking(?:\s+(?:no|number))?|dossier|pnr)\s*(?:n[o°.]|#|:|-)?\s*([A-Z0-9-]{5,20})/i,
  );
  const location =
    lines
      .find((line) =>
        /^(?:lieu|location|adresse|address|airport|aéroport)\s*:/i.test(line),
      )
      ?.replace(/^[^:]+:\s*/, "") || "";
  return {
    type,
    title: (lines[0] || "Réservation importée").slice(0, 120),
    start_at: matchDate(text),
    end_at: null,
    location,
    address: "",
    reference: ref?.[1] || "",
    notes: "",
  };
}
