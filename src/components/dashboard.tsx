"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  FileUp,
  Hotel,
  MapPin,
  Menu,
  Plane,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cloudEnabled, supabase } from "@/lib/supabase";
import { ItineraryModal, ItineraryPanel } from "@/components/itinerary-panel";
import { EventThumbnail } from "@/components/event-thumbnail";
import { bookingSignature, generateItinerary } from "@/lib/itinerary";
import {
  createBooking,
  createTrip,
  deleteBooking,
  deleteTrip,
  getItinerary,
  listBookings,
  listTrips,
  saveItinerary,
} from "@/lib/store";
import {
  emptyBooking,
  type Booking,
  type BookingDraft,
  type BookingType,
  type ItineraryPlan,
  type TravelPace,
  type Trip,
} from "@/lib/types";

const dateFmt = (s: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(
    "fr-FR",
    options || { day: "numeric", month: "short", year: "numeric" },
  ).format(new Date(s));
const dateRange = (t: Trip) =>
  `${dateFmt(`${t.start_date}T12:00:00`, { day: "numeric", month: "short" })} — ${dateFmt(`${t.end_date}T12:00:00`, { day: "numeric", month: "short", year: "numeric" })}`;
const bookingLabel: Record<BookingType, string> = {
  flight: "Vol",
  hotel: "Hôtel",
  activity: "Activité",
};
const hasUnknownHotelTime = (booking: Booking) =>
  booking.type === "hotel" &&
  /T00:00(?::00)?$/.test(booking.start_at) &&
  (!booking.end_at || /T00:00(?::00)?$/.test(booking.end_at));
const BookingIcon = ({ type }: { type: BookingType }) =>
  type === "flight" ? (
    <Plane size={19} />
  ) : type === "hotel" ? (
    <Hotel size={19} />
  ) : (
    <Compass size={19} />
  );
const mapLink = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const SELECTED_TRIP_KEY = "sto_selected_trip_v1";
const preferredTrip = (rows: Trip[], current: string | null) => {
  const remembered = localStorage.getItem(SELECTED_TRIP_KEY);
  return (
    rows.find((t) => t.id === current)?.id ||
    rows.find((t) => t.id === remembered)?.id ||
    rows[0]?.id ||
    null
  );
};

export default function Dashboard() {
  const [ready, setReady] = useState(!cloudEnabled);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [modal, setModal] = useState<"trip" | "booking" | "import" | null>(
    null,
  );
  const [view, setView] = useState<"timeline" | "next" | "itinerary">(
    "timeline",
  );
  const [itinerary, setItinerary] = useState<ItineraryPlan | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [now, setNow] = useState(0);

  const refreshTrips = useCallback(async () => {
    const rows = await listTrips();
    setTrips(rows);
    setSelectedId((current) => preferredTrip(rows, current));
  }, []);
  const refreshBookings = useCallback(
    async (id: string) => setBookings(await listBookings(id)),
    [],
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserEmail(session?.user.email || null),
    );
    return () => listener.subscription.unsubscribe();
  }, [refreshTrips]);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (cloudEnabled && (!ready || !userEmail)) return;
    let cancelled = false;
    listTrips()
      .then((rows) => {
        if (cancelled) return;
        setTrips(rows);
        setSelectedId((current) => preferredTrip(rows, current));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, userEmail]);
  useEffect(() => {
    if (selectedId) localStorage.setItem(SELECTED_TRIP_KEY, selectedId);
  }, [selectedId]);
  useEffect(() => {
    let cancelled = false;
    if (selectedId)
      getItinerary(selectedId)
        .then((plan) => {
          if (!cancelled) setItinerary(plan);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    else
      queueMicrotask(() => {
        if (!cancelled) setItinerary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);
  useEffect(() => {
    let cancelled = false;
    if (selectedId)
      listBookings(selectedId)
        .then((rows) => {
          if (!cancelled) setBookings(rows);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    else
      queueMicrotask(() => {
        if (!cancelled) setBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = trips.find((t) => t.id === selectedId);
  const sorted = useMemo(
    () => [...bookings].sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [bookings],
  );
  const upcoming = sorted.filter((b) => {
    const start = hasUnknownHotelTime(b)
      ? new Date(`${b.start_at.slice(0, 10)}T23:59:59`).getTime()
      : new Date(b.start_at).getTime();
    return start >= now - 60 * 60 * 1000;
  });
  const next = upcoming[0];
  const activeTrips = trips.filter(
    (t) => new Date(`${t.end_date}T23:59:59`).getTime() >= now,
  );

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setMagicSent(true);
  }
  async function removeTrip() {
    if (
      !selected ||
      !confirm(
        `Supprimer « ${selected.destination} » et toutes ses réservations ?`,
      )
    )
      return;
    try {
      await deleteTrip(selected.id);
      await refreshTrips();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function removeBooking(id: string) {
    if (!confirm("Supprimer cette réservation ?")) return;
    try {
      await deleteBooking(id);
      if (selectedId) await refreshBookings(selectedId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function createPlan(pace: TravelPace) {
    if (!selected) return;
    setPlanError("");
    setPlanBusy(true);
    try {
      const plan = generateItinerary(selected, bookings, pace);
      await saveItinerary(plan);
      setItinerary(plan);
      setView("itinerary");
      setPlanModal(false);
    } catch (e) {
      setPlanError((e as Error).message);
    } finally {
      setPlanBusy(false);
    }
  }

  if (!ready)
    return (
      <div className="loading">
        <span className="brand-mark">✳</span> Chargement…
      </div>
    );
  if (cloudEnabled && !userEmail)
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="brand">
            <span className="brand-mark">✳</span>
            <strong>
              smart travel<span>.</span>
            </strong>
          </div>
          <div className="auth-art">
            <Plane size={54} strokeWidth={1.2} />
          </div>
          <div className="eyebrow">VOTRE ESPACE VOYAGE</div>
          <h1>
            Tout votre voyage.
            <br />
            <em>En un seul endroit.</em>
          </h1>
          <p>
            Itinéraire, réservations et prochaines étapes, organisés pour partir
            l’esprit libre.
          </p>
          <form onSubmit={signIn}>
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="primary full" disabled={busy}>
              {busy ? "Envoi…" : "Recevoir mon lien de connexion"}
              <ArrowRight size={17} />
            </button>
          </form>
          {magicSent && (
            <div className="notice success">
              <Check size={16} /> Vérifiez votre boîte mail pour vous connecter.
            </div>
          )}
          {error && <div className="notice error">{error}</div>}
          <small>
            Aucun mot de passe à retenir. Vos voyages restent privés.
          </small>
        </div>
      </main>
    );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">✳</span>
          <strong>
            smart travel<span>.</span>
          </strong>
        </div>
        <div className="sidebar-section-label">ESPACE DE VOYAGE</div>
        <button
          className="nav-item active"
          onClick={() => {
            setMobileNav(false);
            setView("timeline");
          }}
        >
          <Compass size={18} /> Vue d’ensemble
        </button>
        <div className="sidebar-heading">
          <span>MES VOYAGES</span>
          <button
            className="icon-btn"
            aria-label="Créer un voyage"
            onClick={() => setModal("trip")}
          >
            <Plus size={17} />
          </button>
        </div>
        <div className="trip-nav">
          {trips.map((t) => (
            <button
              key={t.id}
              className={`trip-nav-item ${selectedId === t.id ? "selected" : ""}`}
              onClick={() => {
                setSelectedId(t.id);
                setMobileNav(false);
              }}
            >
              <span className="trip-dot" /> <span>{t.destination}</span>
            </button>
          ))}
          {!trips.length && (
            <span className="sidebar-empty">
              Votre premier voyage apparaîtra ici.
            </span>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="mode-chip">
            <span className="status-dot" />
            {cloudEnabled ? "Espace synchronisé" : "Mode local · cet appareil"}
          </div>
          {cloudEnabled ? (
            <button
              className="account"
              onClick={() => supabase?.auth.signOut()}
            >
              <span className="avatar">{userEmail?.[0].toUpperCase()}</span>
              <span>
                <strong>{userEmail?.split("@")[0]}</strong>
                <small>Se déconnecter</small>
              </span>
              <ChevronDown size={15} />
            </button>
          ) : (
            <div className="local-note">
              Vos données restent dans ce navigateur.
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            aria-label="Menu"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Espace de voyage <span>/</span>{" "}
            <strong>{selected?.destination || "Vue d’ensemble"}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              {now ? dateFmt(new Date(now).toISOString()) : ""}
            </span>
            <span className="avatar top-avatar">
              {cloudEnabled ? userEmail?.[0].toUpperCase() : "S"}
            </span>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="notice error dismiss">
              {error}
              <button onClick={() => setError("")} aria-label="Fermer">
                <X size={16} />
              </button>
            </div>
          )}
          <div className="page-intro">
            <div>
              <div className="eyebrow">VOTRE CARNET DE VOYAGE</div>
              <h1>
                Voyagez l’esprit <em>léger.</em>
              </h1>
              <p>
                Toutes vos informations importantes, là où vous en avez besoin.
              </p>
            </div>
            <button className="primary" onClick={() => setModal("trip")}>
              <Plus size={18} /> Nouveau voyage
            </button>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="stat-icon lavender">
                <Plane size={19} />
              </span>
              <div>
                <strong>
                  {activeTrips.length.toString().padStart(2, "0")}
                </strong>
                <span>Voyages à venir</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon peach">
                <CalendarDays size={19} />
              </span>
              <div>
                <strong>{bookings.length.toString().padStart(2, "0")}</strong>
                <span>Réservations pour ce voyage</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon mint">
                <Clock3 size={19} />
              </span>
              <div>
                <strong>
                  {next
                    ? dateFmt(next.start_at, { day: "numeric", month: "short" })
                    : "—"}
                </strong>
                <span>Prochaine étape</span>
              </div>
            </div>
          </div>
          {!selected ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <span className="orbit one" />
                <span className="orbit two" />
                <Plane size={54} strokeWidth={1.2} />
              </div>
              <div className="eyebrow">LE DÉBUT DE L’AVENTURE</div>
              <h2>Votre prochain voyage commence ici.</h2>
              <p>
                Créez un voyage, ajoutez vos réservations et retrouvez chaque
                étape au même endroit.
              </p>
              <button className="primary" onClick={() => setModal("trip")}>
                <Plus size={17} /> Créer mon premier voyage
              </button>
            </div>
          ) : (
            <>
              <div className="section-title">
                <div>
                  <div className="eyebrow">VOTRE VOYAGE ACTUEL</div>
                  <h2>{selected.destination}</h2>
                  <p>
                    <CalendarDays size={15} /> {dateRange(selected)}{" "}
                    <span className="middot">·</span>{" "}
                    {Math.max(
                      1,
                      Math.round(
                        (new Date(selected.end_date).getTime() -
                          new Date(selected.start_date).getTime()) /
                          86400000,
                      ) + 1,
                    )}{" "}
                    jours
                  </p>
                </div>
                <div className="section-actions">
                  <button className="text-danger" onClick={removeTrip}>
                    <Trash2 size={15} /> Supprimer
                  </button>
                </div>
              </div>
              <div className="trip-panel">
                <div className="trip-panel-head">
                  <div className="tabs">
                    <button
                      className={view === "timeline" ? "active" : ""}
                      onClick={() => setView("timeline")}
                    >
                      Chronologie
                    </button>
                    <button
                      className={view === "next" ? "active" : ""}
                      onClick={() => setView("next")}
                    >
                      Prochaines étapes <span>{upcoming.length}</span>
                    </button>
                    <button
                      className={view === "itinerary" ? "active" : ""}
                      onClick={() => setView("itinerary")}
                    >
                      Itinéraire
                    </button>
                  </div>
                  <div className="panel-actions">
                    <button
                      className="secondary plan-trigger"
                      onClick={() => {
                        setPlanError("");
                        setPlanModal(true);
                      }}
                    >
                      <Sparkles size={17} /> Créer un itinéraire
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setModal("import")}
                    >
                      <FileUp size={17} /> Importer
                    </button>
                    <button
                      className="primary small"
                      onClick={() => setModal("booking")}
                    >
                      <Plus size={17} /> Réservation
                    </button>
                  </div>
                </div>
                {view === "itinerary" ? (
                  <ItineraryPanel
                    key={`${selected.id}-${itinerary?.generated_at || "empty"}`}
                    plan={itinerary?.trip_id === selected.id ? itinerary : null}
                    bookings={bookings.filter(
                      (booking) => booking.trip_id === selected.id,
                    )}
                    changed={
                      !!itinerary &&
                      itinerary.trip_id === selected.id &&
                      bookingSignature(bookings) !== itinerary.booking_signature
                    }
                    onGenerate={() => {
                      setPlanError("");
                      setPlanModal(true);
                    }}
                  />
                ) : sorted.length === 0 ? (
                  <div className="bookings-empty">
                    <div className="bookings-empty-icon">
                      <CalendarDays size={27} />
                    </div>
                    <h3>Un itinéraire qui n’attend que vous.</h3>
                    <p>
                      Ajoutez un vol, un hôtel ou une activité pour construire
                      votre chronologie.
                    </p>
                    <div>
                      <button
                        className="primary small"
                        onClick={() => setModal("booking")}
                      >
                        <Plus size={16} /> Ajouter une réservation
                      </button>
                      <button
                        className="link-btn"
                        onClick={() => setModal("import")}
                      >
                        Importer une confirmation <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                ) : view === "next" && !upcoming.length ? (
                  <div className="bookings-empty">
                    <h3>Tout est à jour.</h3>
                    <p>Aucune étape à venir pour ce voyage.</p>
                  </div>
                ) : (
                  <div className="timeline">
                    {(view === "next" ? upcoming : sorted).map((b, i) => (
                      <div className="timeline-row" key={b.id}>
                        <div className="timeline-date">
                          <strong>
                            {dateFmt(b.start_at, { day: "2-digit" })}
                          </strong>
                          <span>
                            {dateFmt(b.start_at, {
                              month: "short",
                            }).toUpperCase()}
                          </span>
                        </div>
                        <div className="timeline-track">
                          <span className={`timeline-icon ${b.type}`}>
                            <BookingIcon type={b.type} />
                          </span>
                          {i <
                            (view === "next" ? upcoming : sorted).length -
                              1 && <span className="timeline-line" />}
                        </div>
                        <div className="booking-card">
                          <EventThumbnail title={b.title} variant={b.type} />
                          <div className="booking-main">
                            <span className="booking-type">
                              {bookingLabel[b.type]}
                            </span>
                            <h3>{b.title}</h3>
                            <div className="booking-meta">
                              <span>
                                {hasUnknownHotelTime(b) ? (
                                  <>
                                    <CalendarDays size={14} />{" "}
                                    {dateFmt(b.start_at, {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                    {b.end_at
                                      ? ` → ${dateFmt(b.end_at, { day: "numeric", month: "short" })}`
                                      : ""}
                                  </>
                                ) : (
                                  <>
                                    <Clock3 size={14} />{" "}
                                    {dateFmt(b.start_at, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {b.end_at
                                      ? ` → ${dateFmt(b.end_at, { hour: "2-digit", minute: "2-digit" })}`
                                      : ""}
                                  </>
                                )}
                              </span>
                              {(b.location || b.address) && (
                                <span>
                                  <MapPin size={14} /> {b.location || b.address}
                                </span>
                              )}
                            </div>
                            {b.reference && (
                              <div className="reference">
                                Réf. {b.reference}
                              </div>
                            )}
                            {b.notes && (
                              <p className="booking-notes">{b.notes}</p>
                            )}
                          </div>
                          <div className="booking-side">
                            {(b.address || b.location) && (
                              <a
                                href={mapLink(
                                  b.address || `${b.title}, ${b.location}`,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="map-link"
                              >
                                Voir la carte <ArrowRight size={14} />
                              </a>
                            )}
                            <button
                              aria-label={`Supprimer ${b.title}`}
                              className="icon-btn delete-booking"
                              onClick={() => removeBooking(b.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="tip-card">
                <span className="tip-icon">
                  <Sparkles size={20} />
                </span>
                <div>
                  <strong>Gagnez du temps avec l’import</strong>
                  <p>
                    Collez un email de confirmation ou ajoutez un PDF. Vérifiez
                    les informations avant de les enregistrer.
                  </p>
                </div>
                <button onClick={() => setModal("import")}>
                  Essayer <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      {modal === "trip" && (
        <TripModal
          onClose={() => setModal(null)}
          onSave={async (destination, start, end) => {
            const t = await createTrip(destination, start, end);
            await refreshTrips();
            setSelectedId(t.id);
            setModal(null);
          }}
        />
      )}
      {modal === "booking" && selectedId && (
        <BookingModal
          onClose={() => setModal(null)}
          onSave={async (draft) => {
            await createBooking(selectedId, draft);
            await refreshBookings(selectedId);
            setModal(null);
          }}
        />
      )}
      {modal === "import" && selectedId && (
        <ImportModal
          onClose={() => setModal(null)}
          onSave={async (draft) => {
            await createBooking(selectedId, draft);
            await refreshBookings(selectedId);
            setModal(null);
          }}
        />
      )}
      {planModal && selected && (
        <ItineraryModal
          trip={selected}
          bookings={bookings}
          existing={itinerary?.trip_id === selected.id}
          busy={planBusy}
          error={planError}
          onClose={() => setPlanModal(false)}
          onCreate={createPlan}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">SMART TRAVEL ORGANIZER</div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function TripModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (destination: string, start: string, end: string) => Promise<void>;
}) {
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (end < start) {
      setError("La date de retour doit suivre la date de départ.");
      return;
    }
    setBusy(true);
    try {
      await onSave(destination.trim(), start, end);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Nouveau voyage"
      subtitle="Une destination, des dates, et c’est parti."
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-body">
        <label>
          Destination
          <input
            autoFocus
            required
            maxLength={120}
            placeholder="Ex. Lisbonne, Portugal"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Départ
            <input
              required
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Retour
            <input
              required
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {error && <div className="notice error">{error}</div>}
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Création…" : "Créer le voyage"}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function BookingFields({
  draft,
  setDraft,
}: {
  draft: BookingDraft;
  setDraft: (draft: BookingDraft) => void;
}) {
  const update = (part: Partial<BookingDraft>) =>
    setDraft({ ...draft, ...part });
  return (
    <div className="fields">
      <div className="type-choices">
        {(["flight", "hotel", "activity"] as BookingType[]).map((type) => (
          <button
            type="button"
            key={type}
            className={draft.type === type ? "chosen" : ""}
            onClick={() => update({ type })}
          >
            <BookingIcon type={type} />
            {bookingLabel[type]}
          </button>
        ))}
      </div>
      <label>
        Titre
        <input
          required
          maxLength={120}
          placeholder="Ex. Vol Paris → Lisbonne"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </label>
      <div className="form-grid">
        <label>
          Début
          <input
            required
            type="datetime-local"
            value={draft.start_at}
            onChange={(e) => update({ start_at: e.target.value })}
          />
        </label>
        <label>
          Fin <span className="optional">(facultatif)</span>
          <input
            type="datetime-local"
            min={draft.start_at}
            value={draft.end_at || ""}
            onChange={(e) => update({ end_at: e.target.value || null })}
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Lieu
          <input
            maxLength={180}
            placeholder="Ex. Aéroport Paris-CDG"
            value={draft.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </label>
        <label>
          Référence
          <input
            maxLength={80}
            placeholder="Ex. AB12CD"
            value={draft.reference}
            onChange={(e) => update({ reference: e.target.value })}
          />
        </label>
      </div>
      <label>
        Adresse pour la carte <span className="optional">(facultatif)</span>
        <input
          maxLength={240}
          placeholder="Rue, ville, pays"
          value={draft.address}
          onChange={(e) => update({ address: e.target.value })}
        />
      </label>
      <label>
        Notes <span className="optional">(facultatif)</span>
        <textarea
          rows={2}
          maxLength={1000}
          placeholder="Informations utiles…"
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
function BookingModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (draft: BookingDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(emptyBooking());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (draft.end_at && draft.end_at < draft.start_at) {
      setError("La fin doit suivre le début.");
      return;
    }
    setBusy(true);
    try {
      await onSave({ ...draft, title: draft.title.trim() });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Ajouter une réservation"
      subtitle="Gardez l’essentiel à portée de main."
      onClose={onClose}
    >
      <form className="modal-body" onSubmit={submit}>
        <BookingFields draft={draft} setDraft={setDraft} />
        {error && <div className="notice error">{error}</div>}
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
            <Check size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ImportModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (draft: BookingDraft) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [mode, setMode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function extract() {
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      if (text.trim()) form.append("text", text.trim());
      if (file) form.append("file", file);
      const token = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      const response = await fetch("/api/extract", {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import impossible.");
      setDraft(data.draft);
      setMode(data.mode);
      setNotice(data.notice || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (draft.end_at && draft.end_at < draft.start_at) {
      setError("La fin doit suivre le début.");
      return;
    }
    setBusy(true);
    try {
      await onSave(draft);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={draft ? "Vérifiez les informations" : "Importer une confirmation"}
      subtitle={
        draft
          ? "Corrigez les champs avant d’enregistrer."
          : "Collez un email ou ajoutez un PDF contenant du texte."
      }
      onClose={onClose}
    >
      {!draft ? (
        <div className="modal-body">
          <label>
            Texte de confirmation
            <textarea
              className="import-textarea"
              rows={7}
              placeholder="Collez ici votre email de confirmation…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="or-divider">OU</div>
          <label className="upload-zone">
            <FileUp size={24} />
            <strong>{file ? file.name : "Choisir un PDF"}</strong>
            <span>PDF avec texte sélectionnable · 5 Mo maximum</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <p className="privacy-note">
            Le document sert uniquement à l’extraction. Il n’est pas conservé
            par l’application. Si l’IA est activée, le texte extrait lui est
            transmis.
          </p>
          {error && <div className="notice error">{error}</div>}
          <div className="modal-footer">
            <button className="secondary" onClick={onClose}>
              Annuler
            </button>
            <button
              className="primary"
              disabled={busy || (!text.trim() && !file)}
              onClick={extract}
            >
              {busy ? "Analyse…" : "Extraire les informations"}
              <Sparkles size={17} />
            </button>
          </div>
        </div>
      ) : (
        <form className="modal-body" onSubmit={save}>
          <div className="notice info">
            {mode === "ai"
              ? "Extraction IA terminée."
              : "Extraction simple terminée."}{" "}
            Vérifiez dates, horaires et références. {notice}
          </div>
          <BookingFields draft={draft} setDraft={setDraft} />
          {error && <div className="notice error">{error}</div>}
          <div className="modal-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => setDraft(null)}
            >
              Retour
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Enregistrement…" : "Confirmer et enregistrer"}
              <Check size={17} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
