import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ImagePlus,
  Info,
  Printer,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { SEO } from "../components/SEO";
import {
  intakeQuestions,
  serviceExtras,
} from "../data/content";
import { useServices } from "../hooks/useServices";
import { analytics } from "../lib/analytics";
import {
  bookingSchema,
  calculateBookingTotals,
  compatibleExtras,
  currency,
  isPolicyConsentCurrent,
  policyBundleVersion,
  policyConsentSnapshots,
  resolveExtraSelection,
  sanitizeIntakeResponses,
  validateImageFile,
  type BookingFormData,
} from "../lib/booking";
import {
  defaultSettings,
  endTime,
  getAvailableSlots,
  getSalonSessionAvailability,
  salonSessionForTime,
} from "../lib/availability";
import { publicBookingConfiguration } from "../repositories/bookingConfigurationRepository";
import { availabilityRepository } from "../repositories/availabilityRepository";
import { bookingDraftRepository } from "../repositories/bookingSessionRepository";
import {
  BookingAuthenticationError,
  firebaseEnabled,
} from "../lib/firebase";
import { firebaseBookingAvailabilityRepository } from "../repositories/bookingAvailabilityRepository";
import { bookingOperationsRepository } from "../repositories/bookingRepository";
import {
  BookingCapacityError,
} from "../repositories/firebaseBookingRepository";
import { MAX_BOOKABLE_DURATION_MINUTES } from "../lib/bookingCapacity";
import type {
  Booking,
  BookingDraft,
  BookingPolicy,
  BusinessSettings,
  PaymentMode,
  PaymentStatus,
  Service,
  ServiceCategory,
  ServiceExtra,
  SalonAvailabilityResult,
  SalonMonthAvailabilityDay,
} from "../types";

const steps = [
  "Category",
  "Service",
  "Schedule",
  "Details",
  "Summary",
  "Payment",
] as const;
const PHOTO_UPLOADS_ENABLED =
  import.meta.env.VITE_ENABLE_CLIENT_PHOTO_UPLOADS === "true";
const PAYSTACK_ENABLED = import.meta.env.VITE_ENABLE_PAYSTACK === "true";
type LiveAvailabilityStatus = "idle" | "loading" | "ready" | "error";
const AVAILABILITY_UNAVAILABLE_MESSAGE =
  "Live availability could not be verified from Firestore. Please retry.";
const emptyDetails: BookingFormData = {
  fullName: "",
  phone: "",
  email: "",
  preferredContact: "",
  concern: "",
  hopes: "",
  concernDuration: "",
  priorProfessionalTreatment: "",
  productsTreatments: "",
  note: "",
};

function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error" | "warm";
}) {
  const colors =
    tone === "error"
      ? "bg-[#fff0ec] text-[#7d3028]"
      : tone === "warm"
        ? "bg-[#fff0df] text-[#713f1b]"
        : "bg-[var(--forest-50)] text-[var(--forest-950)]";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-[12px] p-4 text-sm leading-6 ${colors}`}
    >
      <Info className="mt-0.5 shrink-0" size={18} /> <div>{children}</div>
    </div>
  );
}

function PolicyGate({
  policies,
  version,
  onAccept,
}: {
  policies: BookingPolicy[];
  version: string;
  onAccept: (record: NonNullable<BookingDraft["policyConsent"]>) => void;
}) {
  const [accepted, setAccepted] = useState(false);
  return (
    <section className="booking-policy-stage section-space">
      <div className="container-shell grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <span className="status">
            Current booking policies · {policies.length}
          </span>
          <h1 className="page-title mt-6">Before we reserve clinic time</h1>
          <p className="lede mt-5">
            Please review the current appointment policies. You must accept
            every policy shown here before continuing to service selection.
          </p>
          <div
            className="policy-scroll mt-8 max-h-[520px] overflow-y-auto rounded-[14px] border border-[var(--line)] bg-white px-5 md:px-7"
            tabIndex={0}
            aria-label="Booking policy summaries"
          >
            {policies.map((policy) => (
                <article
                  className="border-b border-[var(--line)] py-6 last:border-0"
                  key={policy.id}
                >
                  <h2 className="font-bold text-[var(--forest-950)]">
                    {policy.title}
                  </h2>
                  <p className="mt-2 max-w-[70ch] text-sm leading-6 text-[var(--muted)]">
                    {policy.summary}
                  </p>
                </article>
              ))}
          </div>
        </div>
        <aside className="h-fit rounded-[14px] bg-[var(--forest-950)] p-6 text-white lg:sticky lg:top-24">
          <ShieldCheck size={28} />
          <h2 className="mt-5 font-display text-3xl">Your acknowledgement</h2>
          <p className="mt-3 text-sm leading-6 text-[#dce9df]">
            Consent records the policy version, time and this anonymous booking
            session. It does not create an account.
          </p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[12px] bg-white/10 p-4 text-sm leading-6">
            <input
              data-testid="policy-consent"
              className="mt-1 size-5 accent-[var(--warm)]"
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              I have read and agree to the booking, cancellation, payment,
              preparation and privacy policies shown here.
            </span>
          </label>
          <button
            className="btn mt-5 w-full bg-white text-[var(--forest-950)] hover:bg-[var(--forest-50)]"
            disabled={!accepted}
            onClick={() =>
              onAccept({
                accepted: true,
                version,
                acceptedAt: new Date().toISOString(),
                sessionId: bookingDraftRepository.load().sessionId,
                policies: policyConsentSnapshots(policies),
              })
            }
          >
            Start booking <ChevronRight size={17} />
          </button>
          <Link
            to="/terms"
            className="mt-5 inline-block text-sm font-bold underline underline-offset-4"
          >
            Open all website terms
          </Link>
        </aside>
      </div>
    </section>
  );
}

function Stepper({
  step,
  onStep,
}: {
  step: number;
  onStep: (step: number) => void;
}) {
  return (
    <div className="mb-8">
      <p className="mb-4 font-bold text-[var(--forest-950)] md:hidden">
        Step {step + 1} of {steps.length} — {steps[step]}
      </p>
      <ol className="booking-stepper" aria-label="Booking progress">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              aria-current={step === index ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${label}`}
              disabled={index > step}
              onClick={() => index < step && onStep(index)}
            >
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <strong>{label}</strong>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BookingSummary({
  service,
  extras,
  date,
  time,
  settings,
  mode,
  compact = false,
}: {
  service?: Service;
  extras: ServiceExtra[];
  date: string;
  time: string;
  settings: BusinessSettings;
  mode: PaymentMode;
  compact?: boolean;
}) {
  const totals = service
    ? calculateBookingTotals(service, extras, mode, settings.payment)
    : null;
  const rows = [
    [
      "Category",
      service
        ? service.category === "salon"
          ? "Salon"
          : "Trichology"
        : "Not chosen",
    ],
    ["Service", service?.name || "Not chosen"],
    [
      "Extras",
      extras.length ? extras.map((item) => item.name).join(", ") : "None",
    ],
    ["Date", date ? format(parseISO(date), "d MMM yyyy") : "Not chosen"],
    [
      "Time",
      service && time && date
        ? `${time}–${bookingEndTime(service, time, date, totals?.totalDuration || service.duration)}`
        : "Not chosen",
    ],
    ["Duration", totals ? `${totals.totalDuration} min` : "—"],
    ["Subtotal", totals ? currency(totals.subtotal) : "—"],
    ["Due now", totals ? currency(totals.amountDueNow) : "—"],
  ];
  const body = (
    <>
      <dl className="rule-list mt-4 text-sm">
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[88px_1fr] gap-3 py-3" key={label}>
            <dt className="text-[var(--muted)]">{label}</dt>
            <dd className="text-right font-semibold text-[var(--forest-950)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        <strong className="text-[var(--forest-950)]">Clinic:</strong>{" "}
        {settings.address}
      </p>
    </>
  );
  if (compact)
    return (
      <details className="surface mb-5 p-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
          Booking summary <ChevronDown size={18} />
        </summary>
        {body}
      </details>
    );
  return (
    <aside className="booking-summary hidden h-fit rounded-[14px] bg-[var(--forest-50)] p-6 lg:sticky lg:top-24 lg:block">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-[var(--forest-950)]">
          Your booking
        </h2>
        <span className="status">Guest</span>
      </div>
      {body}
    </aside>
  );
}

function CategoryStep({
  value,
  onChange,
}: {
  value?: ServiceCategory;
  onChange: (value: ServiceCategory) => void;
}) {
  return (
    <div>
      <h2 className="booking-title">What kind of care are you booking?</h2>
      <p className="booking-copy">
        Choose the category that best fits your intended appointment. You can
        change this later.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          [
            "salon",
            "Salon",
            "Natural-hair maintenance and restorative treatment appointments.",
          ],
          [
            "trichology",
            "Trichology",
            "Consultation-led hair and scalp assessment or care.",
          ],
        ].map(([id, title, copy]) => (
          <button
            type="button"
            data-testid={`category-${id}`}
            onClick={() => onChange(id as ServiceCategory)}
            aria-pressed={value === id}
            className={`selection-panel text-left ${value === id ? "is-selected" : ""}`}
            key={id}
          >
            <span className="text-xl font-bold text-[var(--forest-950)]">
              {title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
              {copy}
            </span>
            {value === id && (
              <span className="status mt-5">
                <Check size={14} /> Selected
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ServiceStep({
  category,
  services,
  value,
  onChange,
  extras,
  selectedExtraIds,
  onExtraToggle,
}: {
  category?: ServiceCategory;
  services: Service[];
  value?: string;
  onChange: (service: Service) => void;
  extras: ServiceExtra[];
  selectedExtraIds: string[];
  onExtraToggle: (id: string) => void;
}) {
  const [details, setDetails] = useState<string>();
  const filtered = services
    .filter(
      (service) =>
        service.active &&
        !service.archived &&
        service.category === category,
    )
    .sort((a, b) => a.order - b.order);
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="booking-title">Choose your main service</h2>
          <p className="booking-copy">
            One main service sets the base duration, preparation and available
            extras.
          </p>
        </div>
        {category === "trichology" && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const consultation = services.find(
                (item) => item.id === "svc-consult",
              );
              if (consultation) onChange(consultation);
            }}
          >
            I’m not sure
          </button>
        )}
      </div>
      <div className="mt-8 grid gap-4">
        {filtered.length ? (
          filtered.map((service) => (
            <article
              className={`selection-panel ${value === service.id ? "is-selected" : ""}`}
              key={service.id}
            >
              <button
                type="button"
                className="w-full text-left"
                aria-pressed={value === service.id}
                onClick={() => onChange(service)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="status capitalize">
                      {service.category}
                    </span>
                    {service.featured && (
                      <span className="status ml-2 placeholder-badge">
                        Featured
                      </span>
                    )}
                    {service.category === "salon" && service.placeholder && (
                      <span className="status ml-2 placeholder-badge">
                        Demo service
                      </span>
                    )}
                    <h3 className="mt-3 text-lg font-bold text-[var(--forest-950)]">
                      {service.name}
                    </h3>
                  </div>
                  <strong className="text-[var(--forest-950)]">
                    {currency(service.price)}
                  </strong>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {service.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[var(--forest-800)]">
                  <span>{service.duration} minutes</span>
                  <span>
                    {service.consultationRequired
                      ? "Consultation required"
                      : "No prior consultation required"}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className="mt-4 text-sm font-bold text-[var(--forest-800)] underline underline-offset-4"
                onClick={() =>
                  setDetails(details === service.id ? undefined : service.id)
                }
              >
                {details === service.id ? "Hide details" : "More details"}
              </button>
              {details === service.id && (
                <div className="mt-4 border-t border-[var(--line)] pt-4 text-sm leading-6 text-[var(--muted)]">
                  <p>{service.description}</p>
                  <p className="mt-3">
                    <strong className="text-[var(--forest-950)]">
                      Preparation:
                    </strong>{" "}
                    {service.preparation}
                  </p>
                </div>
              )}
            </article>
          ))
        ) : (
          <Notice tone="error">
            No active services are available in this category. Go back and
            choose another category or contact the clinic.
          </Notice>
        )}
      </div>
      {value && (
        <ExtrasStep
          available={extras}
          selectedIds={selectedExtraIds}
          onToggle={onExtraToggle}
        />
      )}
    </div>
  );
}

function ExtrasStep({
  available,
  selectedIds,
  onToggle,
}: {
  available: ServiceExtra[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <section
      className="mt-10 border-t border-[var(--line)] pt-8"
      aria-labelledby="optional-extras-title"
    >
      <h2
        id="optional-extras-title"
        className="font-display text-3xl text-[var(--forest-950)]"
      >
        Optional extras
      </h2>
      <p className="booking-copy">
        Add any useful options while choosing your service. Each selection
        updates the appointment time and price; you can continue without one.
      </p>
      {available.length ? (
        <div className="mt-8 grid gap-4">
          {available.map((extra) => (
            <label
              className={`selection-panel flex cursor-pointer items-start gap-4 ${selectedIds.includes(extra.id) ? "is-selected" : ""}`}
              key={extra.id}
            >
              <input
                type="checkbox"
                className="mt-1 size-5 accent-[var(--forest-800)]"
                checked={selectedIds.includes(extra.id)}
                onChange={() => onToggle(extra.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap justify-between gap-3 font-bold text-[var(--forest-950)]">
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{extra.name}</span>
                    {extra.placeholder && (
                      <span className="status placeholder-badge">
                        Demo extra
                      </span>
                    )}
                  </span>
                  <span>+{currency(extra.price)}</span>
                </span>
                <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                  {extra.description}
                </span>
                <span className="mt-3 block text-xs font-bold text-[var(--forest-700)]">
                  Adds {extra.duration} minutes
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <Notice>
          This service has no optional extras. You can continue to scheduling.
        </Notice>
      )}
    </section>
  );
}

function ScheduleStep({
  service,
  extras,
  settings,
  bookings,
  date,
  time,
  liveSlots,
  liveSalonSessions,
  liveStatus = "idle",
  liveError = "",
  liveRetryable = true,
  onRetry,
  onDate,
  onTime,
}: {
  service: Service;
  extras: ServiceExtra[];
  settings: BusinessSettings;
  bookings: Booking[];
  date: string;
  time: string;
  liveSlots?: string[] | null;
  liveSalonSessions?: SalonAvailabilityResult["sessions"];
  liveStatus?: LiveAvailabilityStatus;
  liveError?: string;
  liveRetryable?: boolean;
  onRetry: () => void;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
}) {
  const totalDuration =
    service.duration + extras.reduce((sum, extra) => sum + extra.duration, 0);
  if (service.category === "salon")
    return (
      <SalonScheduleStep
        settings={settings}
        bookings={bookings}
        date={date}
        time={time}
        liveSessions={liveSalonSessions}
        liveLoading={liveStatus === "loading"}
        liveError={liveError}
        liveRetryable={liveRetryable}
        onRetry={onRetry}
        onDate={onDate}
        onTime={onTime}
      />
    );
  const dates = Array.from({ length: 21 }, (_, index) =>
    addDays(startOfDay(new Date()), index + 1),
  );
  const slots =
    liveSlots !== undefined
      ? liveSlots || []
      : date
        ? getAvailableSlots(
            parseISO(date),
            totalDuration,
            settings,
            bookings,
          )
        : [];
  return (
    <div>
      <h2 className="booking-title">Choose a date and start time</h2>
      <p className="booking-copy">
        Times account for the full {totalDuration}-minute appointment plus the
        clinic buffer. Sunday and closure dates cannot be selected.
      </p>
      <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_.9fr]">
        <section>
          <h3 className="font-bold text-[var(--forest-950)]">
            Available dates
          </h3>
          <div
            className="calendar-grid mt-4"
            role="grid"
            aria-label="Available appointment dates"
          >
            {dates.map((day) => {
              const value = format(day, "yyyy-MM-dd");
              const blocked =
                settings.closedDays.includes(day.getDay()) ||
                settings.blockedPeriods.some(
                  (period) => period.date === value && !period.start,
                );
              return (
                <button
                  role="gridcell"
                  type="button"
                  key={value}
                  disabled={blocked || isBefore(day, startOfDay(new Date()))}
                  aria-selected={date === value}
                  onClick={() => onDate(value)}
                  className={date === value ? "is-selected" : ""}
                >
                  <span>{format(day, "EEE")}</span>
                  <strong>{format(day, "d")}</strong>
                  <small>{format(day, "MMM")}</small>
                </button>
              );
            })}
          </div>
        </section>
        <section aria-live="polite">
          <h3 className="font-bold text-[var(--forest-950)]">
            {date
              ? format(parseISO(date), "EEEE, d MMMM")
              : "Select a date first"}
          </h3>
          {date && liveError ? (
            <div className="mt-4">
              <Notice tone="error">
                {liveError}{" "}
                {liveRetryable && (
                  <button
                    type="button"
                    className="font-bold underline underline-offset-4"
                    onClick={onRetry}
                  >
                    Retry
                  </button>
                )}
              </Notice>
            </div>
          ) : date && liveSlots === null ? (
            <div
              className="mt-4 rounded-[12px] border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]"
              role="status"
            >
              Checking live availability…
            </div>
          ) : date ? (
            slots.length ? (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    className={`time-slot ${time === slot ? "is-selected" : ""}`}
                    type="button"
                    key={slot}
                    onClick={() => onTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <Notice tone="error">
                No spaces left for this date. Choose another available day.
              </Notice>
            )
          ) : (
            <div className="mt-4 rounded-[12px] border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
              Available start times will appear here.
            </div>
          )}
          {date && time && (
            <Notice>
              <strong>
                {time}–{endTime(time, parseISO(date), totalDuration)}
              </strong>{" "}
              · {totalDuration} minutes at {settings.address}
            </Notice>
          )}
        </section>
      </div>
    </div>
  );
}

function SalonScheduleStep({
  settings,
  bookings,
  date,
  time,
  liveSessions,
  liveLoading,
  liveError,
  liveRetryable,
  onRetry,
  onDate,
  onTime,
}: {
  settings: BusinessSettings;
  bookings: Booking[];
  date: string;
  time: string;
  liveSessions?: SalonAvailabilityResult["sessions"];
  liveLoading: boolean;
  liveError: string;
  liveRetryable: boolean;
  onRetry: () => void;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
}) {
  const firstBookableDay = addDays(startOfDay(new Date()), 1);
  const lastBookableDay = addDays(
    startOfDay(new Date()),
    settings.maximumAdvanceDays,
  );
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(date ? parseISO(date) : firstBookableDay),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [monthCapacity, setMonthCapacity] = useState<
    Record<string, SalonMonthAvailabilityDay> | null
  >(null);
  const [monthCapacityError, setMonthCapacityError] = useState("");
  const [monthCapacityRetryable, setMonthCapacityRetryable] = useState(true);
  const [monthCapacityAttempt, setMonthCapacityAttempt] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth)),
    end: endOfWeek(endOfMonth(visibleMonth)),
  });
  const selectedSessions = date
    ? getSalonSessionAvailability(
        parseISO(date),
        settings,
        bookings,
        new Date(),
      ).map((session) => {
        const remote = liveSessions?.find(
          (candidate) => candidate.startTime === session.startTime,
        );
        if (!liveSessions) return session;
        const remaining = remote?.remaining || 0;
        return {
          ...session,
          remaining,
          available: session.available && remote?.available === true && remaining > 0,
        };
      })
    : [];
  const selectedSession = salonSessionForTime(time);
  const canMoveBack = isBefore(
    startOfMonth(firstBookableDay),
    startOfMonth(visibleMonth),
  );
  const canMoveForward = isBefore(
    startOfMonth(visibleMonth),
    startOfMonth(lastBookableDay),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pickerOpen && !dialog.open) dialog.showModal();
    if (!pickerOpen && dialog.open) dialog.close();
  }, [pickerOpen]);

  useEffect(() => {
    if (!firebaseEnabled || !firebaseBookingAvailabilityRepository) {
      setMonthCapacity(null);
      setMonthCapacityError("");
      return;
    }
    let active = true;
    setMonthCapacity(null);
    setMonthCapacityError("");
    firebaseBookingAvailabilityRepository
      .getSalonMonthAvailability(format(visibleMonth, "yyyy-MM"))
      .then((capacity) => {
        if (active) setMonthCapacity(capacity);
      })
      .catch((error) => {
        if (!active) return;
        setMonthCapacityRetryable(!(error instanceof BookingAuthenticationError));
        setMonthCapacityError(
          error instanceof Error
            ? error.message
            : "Calendar availability could not be loaded.",
        );
      });
    return () => {
      active = false;
    };
  }, [monthCapacityAttempt, visibleMonth]);

  const closePicker = () => setPickerOpen(false);

  return (
    <div>
      <h2 className="booking-title">Choose a Salon session</h2>
      <p className="booking-copy">
        Each Salon day has three shared sessions with three spaces each. Choose
        a date to see the live capacity for morning, afternoon and evening.
      </p>

      <section className="salon-calendar mt-8" aria-labelledby="salon-calendar-title">
        <div className="salon-calendar-header">
          <button
            type="button"
            className="icon-button"
            aria-label="Show previous month"
            disabled={!canMoveBack}
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
          >
            <ChevronLeft size={19} />
          </button>
          <h3 id="salon-calendar-title" className="font-display text-2xl text-[var(--forest-950)]">
            {format(visibleMonth, "MMMM yyyy")}
          </h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Show next month"
            disabled={!canMoveForward}
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          >
            <ChevronRight size={19} />
          </button>
        </div>

        <div className="salon-calendar-weekdays" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index}>{format(addDays(startOfWeek(new Date()), index), "EEE")}</span>
          ))}
        </div>
        <div className="salon-calendar-grid" role="grid" aria-label={`Salon availability for ${format(visibleMonth, "MMMM yyyy")}`}>
          {calendarDays.map((day) => {
            const value = format(day, "yyyy-MM-dd");
            const sessions = getSalonSessionAvailability(
              day,
              settings,
              bookings,
              new Date(),
            );
            const localRemaining = sessions.reduce(
              (sum, session) => sum + (session.available ? session.remaining : 0),
              0,
            );
            const localFullDayBlock = settings.blockedPeriods.find(
              (block) => block.date === value && !block.start && !block.end,
            );
            const remoteDay = monthCapacity?.[value];
            const remaining = firebaseEnabled
              ? remoteDay?.remaining ?? 0
              : value === date && liveSessions
                ? liveSessions.reduce(
                    (sum, session) =>
                      sum + (session.available ? session.remaining : 0),
                    0,
                  )
                : localRemaining;
            const inVisibleMonth = isSameMonth(day, visibleMonth);
            const capacityVerified = !firebaseEnabled || monthCapacity !== null;
            const status: SalonMonthAvailabilityDay["status"] = firebaseEnabled
              ? remoteDay?.status ?? "unavailable"
              : localFullDayBlock
                ? "blocked"
                : remaining > 0
                  ? "available"
                  : sessions.some((session) => session.remaining > 0)
                    ? "unavailable"
                    : "booked";
            const blockReason = firebaseEnabled
              ? remoteDay?.reason
              : localFullDayBlock?.reason;
            const availabilityText = !capacityVerified
              ? "Checking availability"
              : status === "blocked"
                ? blockReason || "Unavailable"
                : status === "booked"
                  ? "Booked"
                  : status === "available"
                    ? `${remaining} ${remaining === 1 ? "space" : "spaces"} left`
                    : "Unavailable";
            const disabled =
              !inVisibleMonth || !capacityVerified || status !== "available";
            const label = capacityVerified
              ? `${format(day, "EEEE, d MMMM yyyy")}: ${availabilityText}`
              : `${format(day, "EEEE, d MMMM yyyy")}: checking availability`;
            return (
              <button
                role="gridcell"
                type="button"
                key={value}
                disabled={disabled}
                aria-label={label}
                aria-selected={date === value}
                title={status === "blocked" ? blockReason : undefined}
                className={`${date === value ? "is-selected" : ""} ${!inVisibleMonth ? "is-outside" : ""}`}
                onClick={() => {
                  onDate(value);
                  setPickerOpen(true);
                }}
              >
                <strong>{format(day, "d")}</strong>
                {inVisibleMonth && (
                  <small>
                    <span className="salon-space-wide salon-calendar-status">
                      {availabilityText}
                    </span>
                    <span className="salon-space-compact salon-calendar-status">
                      {!capacityVerified
                        ? "…"
                        : status === "available"
                          ? `${remaining} left`
                          : status === "unavailable"
                            ? "—"
                            : availabilityText}
                    </span>
                  </small>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {monthCapacityError && (
        <div className="mt-4">
          <Notice tone="error">
            {monthCapacityError}{" "}
            {monthCapacityRetryable && (
              <button
                type="button"
                className="font-bold underline underline-offset-4"
                onClick={() =>
                  setMonthCapacityAttempt((current) => current + 1)
                }
              >
                Retry calendar
              </button>
            )}
          </Notice>
        </div>
      )}

      {date && (
        <div className="salon-selection-summary mt-5" aria-live="polite">
          <div>
            <span className="text-xs font-bold uppercase tracking-[.12em] text-[var(--forest-700)]">
              {selectedSession ? "Selected session" : "Date selected"}
            </span>
            <p className="mt-1 font-bold text-[var(--forest-950)]">
              {format(parseISO(date), "EEEE, d MMMM yyyy")}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selectedSession
                ? `${selectedSession.label}, ${formatSessionRange(selectedSession.startTime, selectedSession.endTime)}`
                : "Choose one available session to continue."}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setPickerOpen(true)}>
            {selectedSession ? "Change session" : "Choose session"}
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="salon-session-dialog"
        aria-labelledby="salon-session-title"
        onClose={closePicker}
        onCancel={closePicker}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePicker();
        }}
      >
        <div className="salon-session-panel">
          <div className="flex items-start justify-between gap-5">
            <div>
              <span className="status">Salon availability</span>
              <h3 id="salon-session-title" className="mt-3 font-display text-3xl text-[var(--forest-950)]">
                Choose a session
              </h3>
              {date && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {format(parseISO(date), "EEEE, d MMMM yyyy")}
                </p>
              )}
            </div>
            <button type="button" className="icon-button" aria-label="Close session picker" onClick={closePicker}>
              <X size={19} />
            </button>
          </div>
          <div className="mt-6 grid gap-3">
            {selectedSessions.map((session) => (
              <button
                type="button"
                className={`salon-session-option ${time === session.startTime ? "is-selected" : ""}`}
                key={session.id}
                disabled={liveLoading || Boolean(liveError) || !session.available}
                aria-pressed={time === session.startTime}
                onClick={() => {
                  onTime(session.startTime);
                  closePicker();
                }}
              >
                <span>
                  <strong>{session.label}</strong>
                  <small>{formatSessionRange(session.startTime, session.endTime)}</small>
                </span>
                <span className="salon-session-capacity">
                  <Users size={16} aria-hidden="true" />
                  {liveError
                    ? "Availability unavailable"
                    : liveLoading
                    ? "Checking availability…"
                    : session.remaining === 0
                    ? "Fully booked"
                    : `${session.remaining} ${session.remaining === 1 ? "space" : "spaces"} left${session.available ? "" : " · Unavailable"}`}
                </span>
              </button>
            ))}
          </div>
          {liveError && (
            <div className="mt-4">
              <Notice tone="error">
                {liveError}{" "}
                {liveRetryable && (
                  <button
                    type="button"
                    className="font-bold underline underline-offset-4"
                    onClick={onRetry}
                  >
                    Retry
                  </button>
                )}
              </Notice>
            </div>
          )}
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Capacity updates when bookings, cancellations and operational blocks change.
          </p>
        </div>
      </dialog>
    </div>
  );
}

function formatSessionRange(start: string, end: string) {
  const formatClock = (value: string) => {
    const parsed = parseISO(`2000-01-01T${value}:00`);
    const marker = format(parsed, "a") === "AM" ? "a.m." : "p.m.";
    return `${format(parsed, "h:mm")} ${marker}`;
  };
  return `${formatClock(start)}–${formatClock(end)}`;
}

function bookingEndTime(
  service: Service,
  time: string,
  date: string,
  duration: number,
) {
  if (service.category === "salon")
    return salonSessionForTime(time)?.endTime || time;
  return endTime(time, parseISO(date), duration);
}

function IntakeFields({
  service,
  questions: allQuestions,
  values,
  onChange,
}: {
  service: Service;
  questions: typeof intakeQuestions;
  values: Record<string, string | string[] | boolean>;
  onChange: (id: string, value: string | string[] | boolean) => void;
}) {
  const questions = allQuestions
    .filter(
      (question) =>
        question.active && question.schemaId === service.intakeSchemaId,
    )
    .filter(
      (question) =>
        !question.condition ||
        values[question.condition.questionId] === question.condition.equals,
    )
    .sort((a, b) => a.order - b.order);
  return (
    <fieldset className="mt-8 border-t border-[var(--line)] pt-7">
      <legend className="font-bold text-[var(--forest-950)]">
        Questions for this service
      </legend>
      <div className="mt-5 grid gap-5">
        {questions.map((question) => (
          <div className="field" key={question.id}>
            <label
              id={`${question.id}-label`}
              htmlFor={
                question.type === "multi-choice" ? undefined : question.id
              }
            >
              {question.label} (optional)
            </label>
            {question.helpText && (
              <p className="text-xs leading-5 text-[var(--muted)]">
                {question.helpText}
              </p>
            )}
            {question.type === "multi-choice" ? (
              <div
                className="grid gap-2"
                role="group"
                aria-labelledby={`${question.id}-label`}
                aria-required="false"
              >
                {(question.options || []).map((option) => {
                  const selected = Array.isArray(values[question.id])
                    ? (values[question.id] as string[])
                    : [];
                  return (
                    <label
                      className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--line)] px-4 text-sm"
                      key={option}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={(event) =>
                          onChange(
                            question.id,
                            event.target.checked
                              ? [...selected, option]
                              : selected.filter((value) => value !== option),
                          )
                        }
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            ) : question.type === "checkbox" ? (
              <label className="flex min-h-11 items-center gap-3 rounded-[12px] border border-[var(--line)] px-4 text-sm">
                <input
                  id={question.id}
                  type="checkbox"
                  checked={Boolean(values[question.id])}
                  onChange={(event) =>
                    onChange(question.id, event.target.checked)
                  }
                />
                {question.helpText || "Yes, I confirm"}
              </label>
            ) : question.type === "long-text" ? (
              <textarea
                id={question.id}
                value={String(values[question.id] || "")}
                onChange={(event) => onChange(question.id, event.target.value)}
              />
            ) : question.type === "single-choice" ||
              question.type === "yes-no" ? (
              <select
                id={question.id}
                value={String(values[question.id] || "")}
                onChange={(event) => onChange(question.id, event.target.value)}
              >
                <option value="">Choose one</option>
                {(question.type === "yes-no"
                  ? ["Yes", "No"]
                  : question.options || []
                ).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                id={question.id}
                type={question.type === "date" ? "date" : "text"}
                value={String(values[question.id] || "")}
                onChange={(event) => onChange(question.id, event.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function DetailsStep({
  service,
  questions,
  details,
  responses,
  onDetails,
  onResponse,
  photo,
  onPhoto,
}: {
  service: Service;
  questions: typeof intakeQuestions;
  details: BookingFormData;
  responses: Record<string, string | string[] | boolean>;
  onDetails: (value: BookingFormData) => void;
  onResponse: (id: string, value: string | string[] | boolean) => void;
  photo?: { file: File; url: string; consent: boolean; error?: string };
  onPhoto: (value?: {
    file: File;
    url: string;
    consent: boolean;
    error?: string;
  }) => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = (key: keyof BookingFormData, value: string) =>
    onDetails({ ...details, [key]: value });
  const errorFor = (key: keyof BookingFormData) => {
    if (!touched[key]) return "";
    const result = bookingSchema.safeParse(details);
    return result.success
      ? ""
      : result.error.issues.find((issue) => issue.path[0] === key)?.message ||
          "";
  };
  const touch = (key: keyof BookingFormData) =>
    setTouched((current) => ({ ...current, [key]: true }));
  return (
    <div>
      <h2 className="booking-title">Tell us about you and your appointment</h2>
      <p className="booking-copy">
        Full name, phone and email are required. Everything else is optional
        and helps the clinic prepare; it is not used to diagnose you online.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="field">
          <label htmlFor="fullName">Full name *</label>
          <input
            id="fullName"
            autoComplete="name"
            required
            aria-invalid={Boolean(errorFor("fullName"))}
            aria-describedby={
              errorFor("fullName") ? "fullName-error" : undefined
            }
            value={details.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            onBlur={() => touch("fullName")}
          />
          {errorFor("fullName") && (
            <span id="fullName-error" className="field-error">
              {errorFor("fullName")}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="phone">Phone *</label>
          <input
            id="phone"
            autoComplete="tel"
            required
            aria-invalid={Boolean(errorFor("phone"))}
            aria-describedby={errorFor("phone") ? "phone-error" : undefined}
            value={details.phone}
            onChange={(e) => set("phone", e.target.value)}
            onBlur={() => touch("phone")}
          />
          {errorFor("phone") && (
            <span id="phone-error" className="field-error">
              {errorFor("phone")}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errorFor("email"))}
            aria-describedby={errorFor("email") ? "email-error" : undefined}
            value={details.email}
            onChange={(e) => set("email", e.target.value)}
            onBlur={() => touch("email")}
          />
          {errorFor("email") && (
            <span id="email-error" className="field-error">
              {errorFor("email")}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="contact-method">Preferred contact (optional)</label>
          <select
            id="contact-method"
            value={details.preferredContact}
            onChange={(e) => set("preferredContact", e.target.value)}
          >
            <option value="">No preference</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="concern">Main hair or scalp concern (optional)</label>
          <textarea
            id="concern"
            value={details.concern}
            onChange={(e) => set("concern", e.target.value)}
          />
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="hopes">
            What do you hope to get from this appointment? (optional)
          </label>
          <textarea
            id="hopes"
            value={details.hopes}
            onChange={(e) => set("hopes", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="concern-duration">
            How long has this been a concern? (optional)
          </label>
          <select
            id="concern-duration"
            value={details.concernDuration}
            onChange={(e) => set("concernDuration", e.target.value)}
          >
            <option value="">Choose one</option>
            <option>Less than 3 months</option>
            <option>3–12 months</option>
            <option>More than 1 year</option>
            <option>Not applicable</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="prior-treatment">
            Previous professional treatment? (optional)
          </label>
          <select
            id="prior-treatment"
            value={details.priorProfessionalTreatment}
            onChange={(e) => set("priorProfessionalTreatment", e.target.value)}
          >
            <option value="">Choose one</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="products">
            Current products, medication or treatments (optional)
          </label>
          <textarea
            id="products"
            value={details.productsTreatments}
            onChange={(e) => set("productsTreatments", e.target.value)}
          />
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="note">
            Anything else the clinic should know? (optional)
          </label>
          <textarea
            id="note"
            value={details.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
      </div>
      <IntakeFields
        service={service}
        questions={questions}
        values={responses}
        onChange={onResponse}
      />
      {service.photoUploadEnabled && (
        <section className="mt-8 border-t border-[var(--line)] pt-7">
          <h3 className="font-bold text-[var(--forest-950)]">
            Optional preparation photo
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            A photo is optional, private and for appointment preparation only.
            It is never a public result and cannot provide an online diagnosis.
          </p>
          {photo ? (
            <div className="mt-5 flex items-start gap-4">
              <img
                className="size-24 rounded-[12px] object-cover"
                src={photo.url}
                alt="Selected appointment preparation preview"
              />
              <div>
                <p className="text-sm font-bold">{photo.file.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo.url);
                    onPhoto(undefined);
                  }}
                  className="mt-2 text-sm font-bold text-[var(--danger)]"
                >
                  Remove photo
                </button>
              </div>
            </div>
          ) : (
            <label className="mt-5 flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-[12px] border border-dashed border-[var(--forest-700)] bg-[var(--forest-50)] p-5 text-sm font-bold text-[var(--forest-900)]">
              <ImagePlus size={20} />
              Choose JPG, PNG or WebP
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const error = validateImageFile(file);
                  onPhoto({
                    file,
                    url: URL.createObjectURL(file),
                    consent: false,
                    error,
                  });
                }}
              />
            </label>
          )}
          {photo?.error && <p className="field-error mt-2">{photo.error}</p>}
          {photo && !photo.error && (
            <label className="mt-4 flex items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={photo.consent}
                onChange={(e) =>
                  onPhoto({ ...photo, consent: e.target.checked })
                }
              />
              I consent to this private photo being used only to prepare for
              this appointment.
            </label>
          )}
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            {PHOTO_UPLOADS_ENABLED
              ? "Secure upload mode requires Firebase Storage rules and short-lived access."
              : "Demo preview only. This file is not uploaded or saved."}
          </p>
        </section>
      )}
    </div>
  );
}

function SummaryStep({
  service,
  extras,
  details,
  date,
  time,
  settings,
  consent,
  edit,
}: {
  service: Service;
  extras: ServiceExtra[];
  details: BookingFormData;
  date: string;
  time: string;
  settings: BusinessSettings;
  consent: NonNullable<BookingDraft["policyConsent"]>;
  edit: (step: number) => void;
}) {
  const totals = calculateBookingTotals(
    service,
    extras,
    settings.payment.defaultMode,
    settings.payment,
  );
  const groups = [
    [
      "Care",
      `${service.category === "salon" ? "Salon" : "Trichology"} · ${service.name}`,
      0,
    ],
    [
      "Extras",
      extras.length ? extras.map((item) => item.name).join(", ") : "None",
      1,
    ],
    [
      "Schedule",
      `${format(parseISO(date), "EEEE, d MMMM yyyy")} · ${time}–${bookingEndTime(service, time, date, totals.totalDuration)}`,
      2,
    ],
    ["Guest", `${details.fullName} · ${details.email} · ${details.phone}`, 3],
  ] as const;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="booking-title">Review before payment</h2>
          <p className="booking-copy">
            Draft reference:{" "}
            <strong>{consent.sessionId.slice(0, 8).toUpperCase()}</strong>. This
            summary is not yet confirmed.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.print()}
        >
          <Printer size={17} />
          Print / PDF
        </button>
      </div>
      <div className="rule-list mt-8">
        {groups.map(([label, value, target]) => (
          <div
            className="grid gap-3 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center"
            key={label}
          >
            <strong className="text-sm text-[var(--forest-950)]">
              {label}
            </strong>
            <span className="text-sm leading-6 text-[var(--muted)]">
              {value}
            </span>
            <button
              type="button"
              className="text-left text-sm font-bold text-[var(--forest-800)] underline underline-offset-4"
              onClick={() => edit(target)}
            >
              Edit {label.toLowerCase()}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-3 rounded-[14px] bg-[var(--forest-50)] p-5 text-sm">
        <p className="flex justify-between">
          <span>Total duration</span>
          <strong>{totals.totalDuration} min</strong>
        </p>
        <p className="flex justify-between">
          <span>Subtotal</span>
          <strong>{currency(totals.subtotal)}</strong>
        </p>
        <p className="flex justify-between">
          <span>
            {settings.payment.defaultMode === "full"
              ? "Default full payment due"
              : settings.payment.defaultMode === "deposit_percentage"
                ? `Default ${settings.payment.depositPercentage}% deposit due`
                : settings.payment.defaultMode === "deposit_fixed"
                  ? "Default fixed deposit due"
                  : settings.payment.defaultMode === "clinic"
                    ? "Default due online"
                    : "Online payment unavailable"}
          </span>
          <strong>{currency(totals.amountDueNow)}</strong>
        </p>
        <p className="border-t border-[var(--line)] pt-3">
          <strong>Clinic:</strong> {settings.address}
        </p>
        <p>
          <strong>Policy:</strong> {consent.version}, accepted{" "}
          {format(parseISO(consent.acceptedAt), "d MMM yyyy, HH:mm")}
        </p>
        <p>
          <strong>Preparation:</strong> {service.preparation}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-quiet mt-5"
        onClick={() => {
          const content = `Booking summary — not yet confirmed\n${service.name}\n${date} ${time}\n${details.fullName}\n${currency(totals.subtotal)}\n${settings.address}`;
          const url = URL.createObjectURL(
            new Blob([content], { type: "text/plain" }),
          );
          const link = document.createElement("a");
          link.href = url;
          link.download = "tamlois-booking-summary.txt";
          link.click();
          URL.revokeObjectURL(url);
        }}
      >
        <Download size={17} />
        Download summary
      </button>
    </div>
  );
}

function PaymentStep({
  service,
  extras,
  settings,
  mode,
  onMode,
  state,
  error,
  onPay,
  onClinic,
}: {
  service: Service;
  extras: ServiceExtra[];
  settings: BusinessSettings;
  mode: PaymentMode;
  onMode: (mode: PaymentMode) => void;
  state: PaymentStatus;
  error: string;
  onPay: (fail?: boolean) => void;
  onClinic: () => void;
}) {
  const totals = calculateBookingTotals(
    service,
    extras,
    mode,
    settings.payment,
  );
  const modes: PaymentMode[] = firebaseEnabled
    ? ["clinic"]
    : settings.payment.enabledModes.filter((item) => item !== "disabled");
  const labels: Record<PaymentMode, string> = {
    full: "Pay in full",
    deposit_percentage: `${settings.payment.depositPercentage}% deposit`,
    deposit_fixed: `Fixed deposit ${currency(settings.payment.fixedDepositAmount)}`,
    clinic: "Pay at clinic",
    disabled: "Payments unavailable",
  };
  return (
    <div>
      <h2 className="booking-title">Choose how to pay</h2>
      <p className="booking-copy">
        No online payment is taken. Availability is checked again atomically when you confirm.
      </p>
      {settings.payment.defaultMode === "disabled" || modes.length === 0 ? (
        <Notice tone="error">
          Online booking is temporarily unavailable. Contact the clinic to
          request an appointment.
        </Notice>
      ) : (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {modes.map((item) => (
              <label
                className={`selection-panel cursor-pointer ${mode === item ? "is-selected" : ""}`}
                key={item}
              >
                <input
                  type="radio"
                  className="mr-3 accent-[var(--forest-800)]"
                  name="payment-mode"
                  checked={mode === item}
                  onChange={() => onMode(item)}
                />{" "}
                <strong>{labels[item]}</strong>
              </label>
            ))}
          </div>
          <div className="mt-7 rounded-[14px] bg-[var(--forest-950)] p-6 text-white">
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <dt>Appointment subtotal</dt>
                <dd className="font-bold">{currency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-3 text-base">
                <dt>Due now</dt>
                <dd className="font-bold">{currency(totals.amountDueNow)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>
                  Balance due{" "}
                  {settings.payment.balanceDue === "at-clinic"
                    ? "at the clinic"
                    : "before appointment"}
                </dt>
                <dd>{currency(totals.balanceDue)}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-5 text-[#dce9df]">
              Placeholder cancellation and refund terms apply. Review the policy
              version shown in your summary.
            </p>
          </div>
          {error && (
            <div className="mt-5">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          {["initialised", "processing"].includes(state) && (
            <p className="mt-5 font-bold" role="status">
              {state === "initialised"
                ? "Initialising secure payment…"
                : "Processing demo payment…"}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {mode === "clinic" ? (
              <button
                className="btn btn-primary"
                type="button"
                disabled={state === "processing"}
                onClick={onClinic}
              >
                Confirm booking request
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={state === "processing"}
                type="button"
                onClick={() => onPay(false)}
              >
                {state === "failed"
                  ? "Retry payment"
                  : `Pay ${currency(totals.amountDueNow)}`}
              </button>
            )}
            {!PAYSTACK_ENABLED && mode !== "clinic" && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => onPay(true)}
              >
                Test failed payment
              </button>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
            {PAYSTACK_ENABLED
              ? "Real payment requires trusted server-side Paystack verification and is currently disabled."
              : mode === "clinic"
                ? "Pay at the clinic. No card details are collected."
                : "Demo payment. No card details or real money are collected."}
          </p>
        </>
      )}
    </div>
  );
}

export default function BookingPage() {
  const { services, loading, error: serviceError } = useServices();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft>(() =>
    bookingDraftRepository.load(),
  );
  const [settings, setSettings] = useState(defaultSettings);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [extrasCatalog, setExtrasCatalog] = useState(serviceExtras);
  const [questionsCatalog, setQuestionsCatalog] = useState(intakeQuestions);
  const [policiesCatalog, setPoliciesCatalog] = useState<BookingPolicy[]>([]);
  const [configurationState, setConfigurationState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [notice, setNotice] = useState("");
  const [validation, setValidation] = useState("");
  const [photo, setPhoto] = useState<{
    file: File;
    url: string;
    consent: boolean;
    error?: string;
  }>();
  const [paymentState, setPaymentState] =
    useState<PaymentStatus>("not-started");
  const [liveAvailability, setLiveAvailability] = useState<{
    slots: string[];
    sessions?: SalonAvailabilityResult["sessions"];
  } | null>(null);
  const [liveAvailabilityStatus, setLiveAvailabilityStatus] =
    useState<LiveAvailabilityStatus>("idle");
  const [liveAvailabilityError, setLiveAvailabilityError] = useState("");
  const [liveAvailabilityRetryable, setLiveAvailabilityRetryable] =
    useState(true);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const deepLinkId = search.get("service") || undefined;
  const deepLinkCategory =
    search.get("category") === "trichology" ||
    search.get("category") === "salon"
      ? (search.get("category") as ServiceCategory)
      : undefined;
  const appliedDeepLink = useRef("");
  const activePolicyVersion = policiesCatalog.length
    ? policyBundleVersion(policiesCatalog)
    : "";
  const service = services.find(
    (item) => item.id === draft.serviceId && item.active,
  );
  const availableExtras = service
    ? compatibleExtras(service.id, extrasCatalog)
    : [];
  const selectedExtras = extrasCatalog.filter((extra) =>
    draft.extraIds.includes(extra.id),
  );
  const paymentMode = firebaseEnabled
    ? "clinic"
    : draft.paymentMode || settings.payment.defaultMode;
  const details = { ...emptyDetails, ...draft.details } as BookingFormData;

  const updateDraft = (patch: Partial<BookingDraft>) =>
    setDraft((current) =>
      bookingDraftRepository.save({ ...current, ...patch }),
    );
  useEffect(() => {
    Promise.all([
      availabilityRepository.getPublic(),
      firebaseEnabled
        ? Promise.resolve([] as Booking[])
        : bookingOperationsRepository.list(),
      publicBookingConfiguration.extras(),
      publicBookingConfiguration.questions(),
      publicBookingConfiguration.policies(),
    ])
      .then(
        ([
          nextSettings,
          nextBookings,
          nextExtras,
          nextQuestions,
          nextPolicies,
        ]) => {
          setSettings(nextSettings);
          setBookings(nextBookings);
          setExtrasCatalog(firebaseEnabled ? nextExtras : nextExtras.length ? nextExtras : serviceExtras);
          setQuestionsCatalog(nextQuestions);
          setPoliciesCatalog(nextPolicies);
          setConfigurationState("ready");
        },
      )
      .catch(() => setConfigurationState("error"));
    analytics.track("booking_started");
  }, []);
  useEffect(() => {
    const key = `${deepLinkId || ""}:${deepLinkCategory || ""}`;
    if (key === ":" || appliedDeepLink.current === key || !services.length)
      return;
    const linked = deepLinkId
      ? services.find((item) => item.id === deepLinkId && item.active)
      : undefined;
    if (deepLinkId && !linked) return;
    appliedDeepLink.current = key;
    updateDraft({
      category: linked?.category || deepLinkCategory,
      serviceId: linked?.id,
      extraIds: [],
      date: "",
      time: "",
      intakeResponses: {},
      step: linked || deepLinkCategory ? 1 : 0,
    });
  }, [deepLinkCategory, deepLinkId, services.length]);
  useEffect(() => {
    if (!firebaseEnabled || !service || !draft.date) {
      setLiveAvailability(null);
      setLiveAvailabilityStatus("idle");
      setLiveAvailabilityError("");
      setLiveAvailabilityRetryable(true);
      return;
    }
    if (!firebaseBookingAvailabilityRepository) {
      setLiveAvailability(null);
      setLiveAvailabilityStatus("error");
      setLiveAvailabilityError(AVAILABILITY_UNAVAILABLE_MESSAGE);
      setLiveAvailabilityRetryable(true);
      return;
    }
    let active = true;
    setLiveAvailability(null);
    setLiveAvailabilityStatus("loading");
    setLiveAvailabilityError("");
    setLiveAvailabilityRetryable(true);
    const request = {
        serviceId: service.id,
        extraIds: draft.extraIds,
        date: draft.date,
      };
    const availabilityRequest =
      service.category === "salon"
        ? firebaseBookingAvailabilityRepository.getSalonSessionAvailability(request)
        : firebaseBookingAvailabilityRepository.getTrichologyAvailability(request);
    availabilityRequest
      .then((availability) => {
        if (!active) return;
        setLiveAvailability({
          slots:
            "slots" in availability
              ? availability.slots
              : availability.sessions
                  .filter((session) => session.available)
                  .map((session) => session.startTime),
          sessions:
            "sessions" in availability ? availability.sessions : undefined,
        });
        setLiveAvailabilityStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setLiveAvailability(null);
        setLiveAvailabilityStatus("error");
        setLiveAvailabilityRetryable(
          !(error instanceof BookingAuthenticationError),
        );
        setLiveAvailabilityError(
          error instanceof Error
            ? error.message
            : AVAILABILITY_UNAVAILABLE_MESSAGE,
        );
      });
    return () => {
      active = false;
    };
  }, [availabilityAttempt, draft.date, draft.extraIds, service]);

  if (configurationState === "loading")
    return (
      <div className="container-shell section-space" role="status">
        Loading current booking policies and services…
      </div>
    );
  if (configurationState === "error")
    return (
      <div className="container-shell section-space">
        <Notice tone="error">
          Booking configuration could not be loaded. No consent or booking can
          be accepted until the current policy set is available. Reload to
          retry.
        </Notice>
      </div>
    );
  if (!policiesCatalog.length)
    return (
      <div className="container-shell section-space">
        <SEO
          title="Booking temporarily unavailable"
          description="Booking will reopen when the clinic publishes its appointment policies."
        />
        <Notice tone="warm">
          <div>
            <strong className="block text-[var(--forest-950)]">
              Booking policies have not been published yet.
            </strong>
            <p className="mt-1">
              Booking is paused until the clinic administrator creates the
              first policy. Please check back later or contact Tamlois.
            </p>
          </div>
        </Notice>
      </div>
    );
  if (
    !isPolicyConsentCurrent(policiesCatalog, draft.policyConsent)
  )
    return (
      <>
        <SEO
          title="Booking policies"
          description="Review booking policies before reserving a Tamlois appointment."
        />
        <PolicyGate
          policies={policiesCatalog}
          version={activePolicyVersion}
          onAccept={(policyConsent) => {
            const linked = services.find(
              (item) => item.id === deepLinkId && item.active,
            );
            updateDraft({
              policyConsent,
              category: linked?.category || deepLinkCategory || draft.category,
              serviceId:
                linked?.id || (deepLinkCategory ? undefined : draft.serviceId),
              step: linked || deepLinkCategory ? 1 : draft.step,
            });
          }}
        />
      </>
    );

  function changeCategory(category: ServiceCategory) {
    if (draft.category !== category && draft.serviceId)
      setNotice(
        "Changing category cleared the service, extras and schedule because they may no longer be valid.",
      );
    updateDraft({
      category,
      serviceId: undefined,
      extraIds: [],
      date: "",
      time: "",
    });
  }
  function changeService(next: Service) {
    if (draft.serviceId === next.id) return;
    if (draft.serviceId && draft.serviceId !== next.id)
      setNotice(
        "Changing service cleared extras and schedule so price, duration and availability stay accurate.",
      );
    updateDraft({
      serviceId: next.id,
      extraIds: [],
      date: "",
      time: "",
    });
  }
  function toggleExtra(id: string) {
    const next = resolveExtraSelection(id, draft.extraIds, availableExtras);
    if (next.length <= draft.extraIds.length && !draft.extraIds.includes(id))
      setNotice("An incompatible extra was removed.");
    if ((draft.date || draft.time) && next.join() !== draft.extraIds.join())
      setNotice(
        "Extras changed the duration, so the previous schedule was cleared.",
      );
    updateDraft({
      extraIds: next,
      date: "",
      time: "",
    });
  }
  function validateStep() {
    if (draft.step === 0 && !draft.category)
      return "Choose Salon or Trichology to continue.";
    if (draft.step === 1 && !service)
      return "Choose one main service to continue.";
    if (draft.step === 2 && (!draft.date || !draft.time))
      return "Choose an available date and start time.";
    if (
      service &&
      service.duration +
        selectedExtras.reduce((sum, extra) => sum + extra.duration, 0) >
        MAX_BOOKABLE_DURATION_MINUTES
    )
      return "This service and extras exceed the four-hour online booking limit. Contact the clinic for help.";
    if (draft.step === 3) {
      const parsed = bookingSchema.safeParse(details);
      if (!parsed.success) return parsed.error.issues[0].message;
      if (photo && (photo.error || !photo.consent))
        return (
          photo.error || "Consent to private photo use or remove the photo."
        );
    }
    return "";
  }
  async function next() {
    const message = validateStep();
    setValidation(message);
    if (message) return;
    if (draft.step === 2 && service && draft.date && draft.time) {
      const duration =
        service.duration +
        selectedExtras.reduce((sum, extra) => sum + extra.duration, 0);
      const currentSlots = firebaseEnabled
        ? liveAvailabilityStatus === "ready"
          ? liveAvailability?.slots ?? []
          : []
        : service.category === "salon"
          ? getSalonSessionAvailability(
              parseISO(draft.date),
              settings,
              bookings,
            )
              .filter((session) => session.available)
              .map((session) => session.startTime)
          : getAvailableSlots(
              parseISO(draft.date),
              duration,
              settings,
              bookings,
            );
      if (!currentSlots.includes(draft.time)) {
        setValidation("That time is no longer available. Choose another slot.");
        updateDraft({ time: "" });
        return;
      }
      updateDraft({ step: 3 });
      return;
    }
    updateDraft({ step: Math.min(5, draft.step + 1) });
  }

  async function completeBooking() {
    if (submittingBooking) return;
    if (
      !service ||
      !draft.date ||
      !draft.time ||
      !draft.policyConsent ||
      !draft.policyConsent.policies.length
    )
      return;
    const parsed = bookingSchema.safeParse(details);
    if (!parsed.success) {
      setValidation(parsed.error.issues[0].message);
      updateDraft({ step: 3 });
      return;
    }
    setSubmittingBooking(true);
    setPaymentState("processing");
    setValidation("");
    try {
      const currentPolicies = await publicBookingConfiguration.policies();
      if (!isPolicyConsentCurrent(currentPolicies, draft.policyConsent)) {
        setPoliciesCatalog(currentPolicies);
        updateDraft({ policyConsent: undefined });
        setPaymentState("not-started");
        setValidation(
          currentPolicies.length
            ? "The booking policies changed. Review and accept the current policies before submitting."
            : "Booking is paused because no booking policies are currently available.",
        );
        return;
      }
      const savedBooking = await bookingOperationsRepository.createBooking({
        bookingId: draft.bookingId,
        bookingReference: draft.bookingReference,
        service,
        extras: selectedExtras,
        date: draft.date,
        startTime: draft.time,
        details: parsed.data,
        intakeResponses: draft.intakeResponses,
        policyConsentRecord: draft.policyConsent,
        addressSnapshot: settings.address,
      });
      if (!firebaseEnabled)
        localStorage.setItem(
          "tamlois-last-booking",
          JSON.stringify(savedBooking),
        );
      bookingDraftRepository.clear();
      analytics.track("booking_submitted", {
        service: service.id,
        payment: savedBooking.paymentStatus,
      });
      navigate(`/booking/confirmation?booking=${savedBooking.id}`, {
        state: { booking: savedBooking },
      });
    } catch (error) {
      setPaymentState("failed");
      if (
        error instanceof BookingCapacityError &&
        error.code === "POLICY_CHANGED"
      ) {
        const currentPolicies = await publicBookingConfiguration.policies();
        setPoliciesCatalog(currentPolicies);
        updateDraft({ policyConsent: undefined });
        setPaymentState("not-started");
        setValidation(error.message);
      } else if (
        error instanceof BookingCapacityError &&
        ["SESSION_FULL", "SLOT_UNAVAILABLE", "BLOCKED"].includes(error.code)
      ) {
        setValidation(error.message);
        updateDraft({ step: 2, time: "" });
        setAvailabilityAttempt((current) => current + 1);
      } else {
        setValidation(
          error instanceof Error
            ? error.message
            : "Booking could not be submitted. Please retry.",
        );
      }
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function pay(fail = false) {
    setValidation("");
    if (firebaseEnabled)
      return setValidation(
        "Online payment is disabled. Choose pay at clinic to submit the booking request.",
      );
    setPaymentState("initialised");
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    setPaymentState("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    if (fail) {
      setPaymentState("failed");
      setValidation(
        "The demo payment failed. Retry or choose pay at clinic.",
      );
      return;
    }
    try {
      await completeBooking();
    } catch (error) {
      setPaymentState("failed");
      setValidation(
        error instanceof Error
          ? error.message
          : "Payment could not be verified.",
      );
    }
  }

  const canContinue =
    draft.step < 5 &&
    !validateStep() &&
    !(
      firebaseEnabled &&
      draft.step === 2 &&
      liveAvailabilityStatus !== "ready"
    );
  return (
    <>
      <SEO
        title="Book an appointment"
        description="Complete a policy-first guest booking for Tamlois salon or trichology care."
      />
      <section className="booking-shell page-hero">
        <div className="container-shell">
          {/* <span className="status">Guest booking · no account needed</span> */}
          <h1 className="page-title mt-6">Reserve time for your care</h1>
          <p className="lede mt-5">
            Choose a category, service and extras, then select live
            availability. No customer account is required.
          </p>
        </div>
      </section>
      <section className="pb-[clamp(4rem,8vw,7rem)] pt-8">
        <div className="container-shell">
          <Stepper
            step={draft.step}
            onStep={(step) => {
              setValidation("");
              updateDraft({ step });
            }}
          />
          {notice && (
            <div className="mb-5">
              <Notice tone="warm">
                {notice}{" "}
                <button
                  className="ml-2 font-bold underline"
                  onClick={() => setNotice("")}
                >
                  Dismiss
                </button>
              </Notice>
            </div>
          )}
          <BookingSummary
            compact
            service={service}
            extras={selectedExtras}
            date={draft.date}
            time={draft.time}
            settings={settings}
            mode={paymentMode}
          />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <main className="surface min-w-0 p-5 md:p-8" aria-live="polite">
              {loading ? (
                <div role="status" className="grid gap-4">
                  <div className="h-10 animate-pulse rounded bg-[var(--forest-100)]" />
                  <div className="h-28 animate-pulse rounded bg-[var(--forest-50)]" />
                </div>
              ) : serviceError ? (
                <Notice tone="error">
                  {serviceError} Reload the page to retry.
                </Notice>
              ) : (
                <>
                  {draft.step === 0 && (
                    <CategoryStep
                      value={draft.category}
                      onChange={changeCategory}
                    />
                  )}
                  {draft.step === 1 && (
                    <ServiceStep
                      category={draft.category}
                      services={services}
                      value={draft.serviceId}
                      onChange={changeService}
                      extras={availableExtras}
                      selectedExtraIds={draft.extraIds}
                      onExtraToggle={toggleExtra}
                    />
                  )}
                  {draft.step === 2 && service && (
                    <ScheduleStep
                      service={service}
                      extras={selectedExtras}
                      settings={settings}
                      bookings={bookings}
                      date={draft.date}
                      time={draft.time}
                      liveSlots={
                        firebaseEnabled && liveAvailabilityStatus === "loading"
                          ? null
                          : firebaseEnabled && liveAvailabilityStatus === "ready"
                            ? liveAvailability?.slots || []
                            : undefined
                      }
                      liveSalonSessions={liveAvailability?.sessions}
                      liveStatus={liveAvailabilityStatus}
                      liveError={liveAvailabilityError}
                      liveRetryable={liveAvailabilityRetryable}
                      onRetry={() =>
                        setAvailabilityAttempt((current) => current + 1)
                      }
                      onDate={(date) => {
                        setValidation("");
                        setLiveAvailability(null);
                        setLiveAvailabilityStatus(
                          firebaseEnabled ? "loading" : "idle",
                        );
                        setLiveAvailabilityError("");
                        updateDraft({ date, time: "" });
                      }}
                      onTime={(time) => updateDraft({ time })}
                    />
                  )}
                  {draft.step === 3 && service && (
                    <DetailsStep
                      service={service}
                      questions={questionsCatalog}
                      details={details}
                      responses={draft.intakeResponses}
                      onDetails={(value) => updateDraft({ details: value })}
                      onResponse={(id, value) => {
                        const next = { ...draft.intakeResponses, [id]: value };
                        updateDraft({
                          intakeResponses: sanitizeIntakeResponses(
                            questionsCatalog,
                            next,
                          ),
                        });
                      }}
                      photo={photo}
                      onPhoto={setPhoto}
                    />
                  )}
                  {draft.step === 4 && service && draft.date && draft.time && (
                    <SummaryStep
                      service={service}
                      extras={selectedExtras}
                      details={details}
                      date={draft.date}
                      time={draft.time}
                      settings={settings}
                      consent={draft.policyConsent!}
                      edit={(step) => updateDraft({ step })}
                    />
                  )}
                  {draft.step === 5 && service && (
                    <PaymentStep
                      service={service}
                      extras={selectedExtras}
                      settings={settings}
                      mode={paymentMode}
                      onMode={(paymentMode) => updateDraft({ paymentMode })}
                      state={paymentState}
                      error={validation}
                      onPay={pay}
                      onClinic={() =>
                        completeBooking().catch((error) =>
                          setValidation(
                            error instanceof Error
                              ? error.message
                              : "Booking could not be submitted.",
                          ),
                        )
                      }
                    />
                  )}
                  {validation && draft.step !== 5 && (
                    <div className="mt-6">
                      <Notice tone="error">{validation}</Notice>
                    </div>
                  )}
                  {draft.step < 5 && (
                    <div className="no-print mt-9 flex items-center justify-between border-t border-[var(--line)] pt-6">
                      {draft.step > 0 ? (
                        <button
                          type="button"
                          className="btn btn-quiet"
                          onClick={() => {
                            setValidation("");
                            updateDraft({ step: draft.step - 1 });
                          }}
                        >
                          <ChevronLeft size={17} />
                          Back
                        </button>
                      ) : (
                        <span />
                      )}
                      {draft.step < 5 && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!canContinue}
                          onClick={next}
                        >
                          {draft.step === 4
                            ? "Continue to payment"
                            : "Continue"}
                          <ChevronRight size={17} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </main>
            <BookingSummary
              service={service}
              extras={selectedExtras}
              date={draft.date}
              time={draft.time}
              settings={settings}
              mode={paymentMode}
            />
          </div>
          <button
            className="no-print mt-7 text-sm font-bold text-[var(--danger)] underline underline-offset-4"
            onClick={() => {
              bookingDraftRepository.clear();
              setDraft(bookingDraftRepository.fresh());
              setPhoto(undefined);
              setValidation("");
            }}
          >
            Start over and clear draft
          </button>
        </div>
      </section>
    </>
  );
}

function calendarHref(booking: Booking) {
  const start = `${booking.date.replaceAll("-", "")}T${booking.startTime.replace(":", "")}00`;
  const end = `${booking.date.replaceAll("-", "")}T${booking.endTime.replace(":", "")}00`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${booking.serviceName} at Tamlois`,
    `LOCATION:${booking.addressSnapshot}`,
    `DESCRIPTION:Booking ${booking.reference}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export function BookingConfirmationPage() {
  const location = useLocation();
  const [search] = useSearchParams();
  const stateBooking = (location.state as { booking?: Booking } | null)?.booking;
  const [booking, setBooking] = useState<Booking | null>(() => {
    if (stateBooking) return stateBooking;
    if (firebaseEnabled) return null;
    const raw = localStorage.getItem("tamlois-last-booking");
    return raw ? (JSON.parse(raw) as Booking) : null;
  });
  const [loadingBooking, setLoadingBooking] = useState(
    firebaseEnabled && !stateBooking && Boolean(search.get("booking")),
  );
  useEffect(() => {
    const id = search.get("booking");
    if (!firebaseEnabled || booking || !id) return;
    bookingOperationsRepository
      .get(id)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoadingBooking(false));
  }, [booking, search]);
  if (loadingBooking)
    return (
      <div className="container-shell section-space" role="status">
        Loading your booking confirmation…
      </div>
    );
  if (!booking)
    return (
      <>
        <SEO
          title="Booking confirmation"
          description="Your Tamlois booking summary."
        />
        <section className="section-space">
          <div className="container-shell max-w-3xl">
            <div className="surface p-8 text-center">
              <h1 className="font-display text-4xl">
                No booking summary found
              </h1>
              <p className="mt-4 text-[var(--muted)]">
                Complete the guest booking journey to create a confirmation.
              </p>
              <Link to="/booking" className="btn btn-primary mt-6">
                Start booking
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  const confirmed = booking.status === "confirmed";
  return (
    <>
      <SEO
        title="Booking confirmation"
        description="Your Tamlois booking summary and payment receipt."
      />
      <section className="confirmation-stage section-space">
        <div className="container-shell max-w-4xl">
          <div className="surface overflow-hidden">
            <div className="bg-[var(--forest-950)] p-7 text-white md:p-10">
              <span className="grid size-12 place-items-center rounded-full bg-white text-[var(--forest-950)]">
                <Check />
              </span>
              <h1 className="mt-7 font-display text-[clamp(2.6rem,6vw,4.7rem)] leading-none">
                {confirmed
                  ? "Booking confirmed"
                  : "Booking request received"}
              </h1>
              <p className="mt-5 max-w-2xl leading-7 text-[#dce9df]">
                Reference{" "}
                <strong className="text-white">{booking.reference}</strong>.{" "}
                {firebaseEnabled
                  ? "Updates will use the configured notification service."
                  : "Demo only: no email or clinic notification was sent."}
              </p>
            </div>
            <div className="p-7 md:p-10">
              <dl className="rule-list">
                {[
                  ["Status", booking.status],
                  ["Payment", booking.paymentStatus],
                  ["Paid now", currency(booking.amountDueNow)],
                  ["Balance", currency(booking.balanceDue)],
                  ["Service", booking.serviceName],
                  [
                    "Extras",
                    booking.extras.length
                      ? booking.extras.map((item) => item.name).join(", ")
                      : "None",
                  ],
                  ["Date", format(parseISO(booking.date), "EEEE, d MMMM yyyy")],
                  ["Time", `${booking.startTime}–${booking.endTime}`],
                  ["Address", booking.addressSnapshot],
                ].map(([label, value]) => (
                  <div
                    className="grid gap-1 py-4 sm:grid-cols-[150px_1fr]"
                    key={label}
                  >
                    <dt className="text-sm text-[var(--muted)]">{label}</dt>
                    <dd className="font-bold capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
              <section className="mt-8 rounded-[14px] bg-[var(--forest-50)] p-5">
                <h2 className="font-display text-3xl text-[var(--forest-950)]">
                  Prepare for your appointment
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {booking.preparationSnapshot}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  This is a confirmed booking summary / receipt only when the
                  status above says confirmed. Keep your reference when
                  contacting the clinic.
                </p>
              </section>
              <div className="no-print mt-8 flex flex-wrap gap-3">
                <a
                  className="btn btn-secondary"
                  href={calendarHref(booking)}
                  download={`${booking.reference}.ics`}
                >
                  <CalendarPlus size={17} />
                  Add to calendar
                </a>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={17} />
                  Print receipt
                </button>
                <Link className="btn btn-primary" to="/contact">
                  Contact clinic
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
