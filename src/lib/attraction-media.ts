import credits from "../../public/attractions/credits.json";

export const marrakechBookingUrl =
  "https://www.booking.com/things-to-do/city/ma/marrakech.fr.html";

const photoKeys: Record<string, string> = {
  "Palais de la Bahia": "bahia",
  "Place Jemaa el-Fna": "jemaa",
  "Jardin Majorelle": "majorelle",
  "Musée Yves Saint Laurent": "ysl",
  "Médersa Ben Youssef": "benyoussef",
  "Souks de la médina": "souks",
  "Jardin de la Ménara": "menara",
  "Tombeaux saadiens": "saadian",
  "Palais El Badi": "elbadi",
  "Le Jardin Secret": "secret",
  "Musée de Marrakech": "museum",
  "Koutoubia et ses jardins": "koutoubia",
};

const bookingPages: Record<string, string> = {
  "Palais de la Bahia":
    "https://www.booking.com/things-to-do/poi/ma/bahia-palace.fr.html",
  "Jardin Majorelle":
    "https://www.booking.com/things-to-do/poi/ma/majorelle-gardens.html",
  "Musée Yves Saint Laurent":
    "https://www.booking.com/things-to-do/poi/ma/yves-saint-laurent-museum.fr.html",
  "Médersa Ben Youssef":
    "https://www.booking.com/things-to-do/poi/ma/medersa-ben-youssef.fr.html",
  "Palais El Badi":
    "https://www.booking.com/things-to-do/poi/ma/el-badii-palace.en-gb.html",
};

export function attractionPhoto(title: string) {
  const key = photoKeys[title];
  return key
    ? credits.find((credit) => credit.file === `/attractions/${key}.jpg`)
    : undefined;
}

export function bookingAttractionUrl(title: string) {
  return photoKeys[title] ? bookingPages[title] || marrakechBookingUrl : null;
}
