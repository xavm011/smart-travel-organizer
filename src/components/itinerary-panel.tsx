"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ExternalLink,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import { EventThumbnail } from "@/components/event-thumbnail";
import {
  attractionPhoto,
  bookingAttractionUrl,
  marrakechBookingUrl,
} from "@/lib/attraction-media";
import type {
  Booking,
  ItineraryPlan,
  PlanItem,
  TravelPace,
  Trip,
} from "@/lib/types";

const paceNames: Record<TravelPace, string> = {
  rest: "Repos",
  balanced: "Équilibré",
  active: "Actif",
};
const paceDescriptions: Record<TravelPace, string> = {
  rest: "Du temps pour souffler, avec quelques découvertes légères.",
  balanced: "Des visites chaque jour, avec une vraie pause entre deux.",
  active: "Deux visites par jour lorsque les trajets le permettent.",
};
const kindNames: Record<PlanItem["kind"], string> = {
  booking: "Réservation",
  visit: "À découvrir",
  rest: "Pause",
  meal: "Temps libre",
  todo: "À préciser",
};
const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
const shortDay = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
const mapsUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
const thumbnailVariant = (item: PlanItem) =>
  item.kind !== "booking"
    ? item.kind
    : item.title.startsWith("Installation") || item.title.startsWith("Départ")
      ? "hotel"
      : item.detail.startsWith("Vol")
        ? "flight"
        : "activity";

export function ItineraryPanel({
  plan,
  changed,
  onGenerate,
}: {
  plan: ItineraryPlan | null;
  changed: boolean;
  onGenerate: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  if (!plan)
    return (
      <div className="plan-empty">
        <span className="plan-empty-icon">
          <Sparkles size={29} />
        </span>
        <div className="eyebrow">VOTRE PROGRAMME SUR MESURE</div>
        <h3>Un voyage à votre rythme.</h3>
        <p>
          Choisissez votre envie du moment. Nous organiserons chaque journée
          autour de vos réservations, de visites et de pauses.
        </p>
        <button className="primary" onClick={onGenerate}>
          <Sparkles size={17} /> Créer un itinéraire
        </button>
      </div>
    );

  const day = plan.days[Math.min(selectedIndex, plan.days.length - 1)];
  const missing = plan.days.filter((d) => !d.city).length;
  const visits = plan.days.reduce(
    (n, d) => n + d.items.filter((item) => item.kind === "visit").length,
    0,
  );
  return (
    <div className="plan-view">
      <div className="plan-summary">
        <div>
          <div className="eyebrow">PROGRAMME PERSONNALISÉ</div>
          <h3>{plan.days.length} jours, à votre rythme.</h3>
          <p>
            Rythme {paceNames[plan.pace].toLowerCase()} · {visits} découvertes
            proposées · réservations incluses
          </p>
        </div>
        <button className="secondary" onClick={onGenerate}>
          <Sparkles size={16} /> Changer le rythme
        </button>
      </div>
      {changed && (
        <div className="plan-alert">
          <CalendarDays size={17} /> Vos réservations ont changé depuis la
          création du programme. Régénérez-le pour les intégrer.
        </div>
      )}
      {missing > 0 && (
        <div className="plan-alert muted">
          <MapPin size={17} /> {missing}{" "}
          {missing === 1 ? "journée reste" : "journées restent"} sans ville
          précise. Ajoutez vos prochaines réservations, puis régénérez le
          programme pour obtenir des idées locales.
        </div>
      )}
      {plan.days.some((item) => item.city === "Marrakech") && (
        <a
          className="booking-discovery"
          href={marrakechBookingUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Sparkles size={18} /> Explorer les attractions de Marrakech sur
          Booking.com <ExternalLink size={14} />
        </a>
      )}
      <div className="day-strip" aria-label="Choisir une journée">
        {plan.days.map((item, index) => (
          <button
            key={item.date}
            className={index === selectedIndex ? "selected" : ""}
            onClick={() => setSelectedIndex(index)}
          >
            <span>JOUR {index + 1}</span>
            <strong>{shortDay(item.date)}</strong>
            <small>{item.city || "À préciser"}</small>
          </button>
        ))}
      </div>
      <div className="day-heading">
        <div>
          <div className="eyebrow">
            JOUR {selectedIndex + 1} SUR {plan.days.length}
          </div>
          <h4>{dayLabel(day.date)}</h4>
          <p>
            <MapPin size={14} /> {day.city || "Destination à préciser"}
          </p>
        </div>
        <div className="day-arrows">
          <button
            aria-label="Jour précédent"
            disabled={selectedIndex === 0}
            onClick={() => setSelectedIndex(selectedIndex - 1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            aria-label="Jour suivant"
            disabled={selectedIndex === plan.days.length - 1}
            onClick={() => setSelectedIndex(selectedIndex + 1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div className="day-items">
        {day.items.map((item) => (
          <div className={`day-item ${item.kind}`} key={item.id}>
            <div className="day-item-slot">
              <span>{item.slot}</span>
              <i />
            </div>
            <EventThumbnail
              title={item.title}
              variant={thumbnailVariant(item)}
            />
            <div className="day-item-content">
              <span className="day-item-kind">{kindNames[item.kind]}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {item.location && (
                <span className="day-item-place">
                  <MapPin size={13} /> {item.location}
                </span>
              )}
              {(item.location ||
                item.source_url ||
                bookingAttractionUrl(item.title)) && (
                <div className="day-item-links">
                  {item.location && (
                    <a
                      href={mapsUrl(item.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Carte <ExternalLink size={12} />
                    </a>
                  )}
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Source touristique <ExternalLink size={12} />
                    </a>
                  )}
                  {bookingAttractionUrl(item.title) && (
                    <a
                      href={bookingAttractionUrl(item.title)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Activités sur Booking.com <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
              {attractionPhoto(item.title) && (
                <div className="photo-credit">
                  Photo :{" "}
                  <a
                    href={attractionPhoto(item.title)!.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {attractionPhoto(item.title)!.author}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={attractionPhoto(item.title)!.license_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {attractionPhoto(item.title)!.license}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="plan-disclaimer">
        Programme suggéré. Vérifiez les horaires, billets et trajets avant de
        partir ; aucune visite proposée n’est réservée automatiquement.
      </div>
    </div>
  );
}

export function ItineraryModal({
  trip,
  bookings,
  existing,
  busy,
  error,
  onClose,
  onCreate,
}: {
  trip: Trip;
  bookings: Booking[];
  existing: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onCreate: (pace: TravelPace) => void;
}) {
  const [pace, setPace] = useState<TravelPace>("balanced");
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal plan-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Créer un itinéraire"
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">VOTRE VOYAGE, VOTRE RYTHME</div>
            <h2>
              {existing ? "Recréer votre itinéraire" : "Créer un itinéraire"}
            </h2>
            <p>
              {trip.destination} · {bookings.length}{" "}
              {bookings.length === 1 ? "réservation" : "réservations"} à
              intégrer
            </p>
          </div>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        <div className="modal-body">
          <div className="pace-intro">
            Quelle énergie voulez-vous donner à ce voyage ?
          </div>
          <div className="pace-options">
            {(["rest", "balanced", "active"] as TravelPace[]).map((choice) => (
              <button
                key={choice}
                className={pace === choice ? "selected" : ""}
                onClick={() => setPace(choice)}
              >
                <span className="pace-check">
                  {pace === choice && <Check size={14} />}
                </span>
                <strong>{paceNames[choice]}</strong>
                <small>{paceDescriptions[choice]}</small>
              </button>
            ))}
          </div>
          <div className="notice info">
            Le programme couvre chaque jour du séjour. Les activités restent des
            suggestions ; vos réservations sont conservées.
          </div>
          {existing && (
            <div className="notice info">
              Le programme actuel sera remplacé par le nouveau rythme.
            </div>
          )}
          {error && <div className="notice error">{error}</div>}
          <div className="modal-footer">
            <button className="secondary" onClick={onClose}>
              Annuler
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => onCreate(pace)}
            >
              {busy ? "Création…" : "Créer mon programme"}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
