import Image from "next/image";
import {
  Clock3,
  Compass,
  Hotel,
  MapPin,
  Moon,
  Plane,
  Sparkles,
} from "lucide-react";
import { attractionPhoto } from "@/lib/attraction-media";

type Variant =
  | "hotel"
  | "flight"
  | "activity"
  | "visit"
  | "rest"
  | "meal"
  | "todo";

const icons = {
  hotel: Hotel,
  flight: Plane,
  activity: Compass,
  visit: Compass,
  rest: Moon,
  meal: Clock3,
  todo: MapPin,
};

export function EventThumbnail({
  title,
  variant,
}: {
  title: string;
  variant: Variant;
}) {
  const photo = variant === "visit" ? attractionPhoto(title) : undefined;
  const Icon = icons[variant] || Sparkles;
  return (
    <span
      className={`event-thumbnail ${variant}`}
      role="img"
      aria-label={photo ? `Photo : ${title}` : `Illustration : ${variant}`}
    >
      {photo ? (
        <Image src={photo.file} alt="" width={112} height={112} sizes="112px" />
      ) : (
        <Icon size={28} strokeWidth={1.4} />
      )}
    </span>
  );
}
