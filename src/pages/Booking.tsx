import { useEffect, useMemo, useState } from "react";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
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
  LockKeyhole,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SEO } from "../components/SEO";
import {
  bookingPolicies,
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
  generateBookingReference,
  generateManagementToken,
  intakeValueMissing,
  policyBundleVersion,
  resolveExtraSelection,
  sanitizeIntakeResponses,
  validateImageFile,
  type BookingFormData,
} from "../lib/booking";
import {
  defaultSettings,
  endTime,
  getAvailableSlots,
} from "../lib/availability";
import { bookingRepository } from "../repositories/localRepository";
import { publicBookingConfiguration } from "../repositories/bookingConfigurationRepository";
import { availabilityRepository } from "../repositories/availabilityRepository";
import {
  bookingDraftRepository,
  bookingHoldRepository,
} from "../repositories/bookingSessionRepository";
import { bookingLockIds } from "../repositories/firestoreRepository";
import { firebaseEnabled } from "../lib/firebase";
import { HttpBookingGateway } from "../lib/adapters";
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
} from "../types";

const steps = [
  "Category",
  "Service",
  "Extras",
  "Schedule",
  "Details",
  "Summary",
  "Payment",
] as const;
const policyVersion = bookingPolicies[0].version;
const PHOTO_UPLOADS_ENABLED =
  import.meta.env.VITE_ENABLE_CLIENT_PHOTO_UPLOADS === "true";
const PAYSTACK_ENABLED = import.meta.env.VITE_ENABLE_PAYSTACK === "true";
const emptyDetails: BookingFormData = {
  fullName: "",
  phone: "",
  email: "",
  preferredContact: "whatsapp",
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

function HoldCountdown({
  seconds,
  holdMinutes,
}: {
  seconds: number;
  holdMinutes: number;
}) {
  return (
    <Notice tone={seconds < 120 ? "warm" : "info"}>
      <LockKeyhole size={17} className="inline" /> This time is held for{" "}
      {holdMinutes} minutes. Remaining:{" "}
      <strong className="tabular-nums">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </strong>
      .
    </Notice>
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
          <span className="status placeholder-badge">
            Placeholder policy · {version}
          </span>
          <h1 className="page-title mt-6">Before we reserve clinic time</h1>
          <p className="lede mt-5">
            Please review how appointments, payments, changes and private
            information are handled. These terms must be confirmed by the clinic
            before launch.
          </p>
          <div
            className="policy-scroll mt-8 max-h-[520px] overflow-y-auto rounded-[14px] border border-[var(--line)] bg-white px-5 md:px-7"
            tabIndex={0}
            aria-label="Booking policy summaries"
          >
            {policies
              .filter((policy) => policy.active)
              .map((policy) => (
                <article
                  className="border-b border-[var(--line)] py-6 last:border-0"
                  key={policy.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-bold text-[var(--forest-950)]">
                      {policy.title}
                    </h2>
                    {policy.placeholder && (
                      <span className="status placeholder-badge shrink-0">
                        Placeholder
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-[70ch] text-sm leading-6 text-[var(--muted)]">
                    {policy.summary}
                  </p>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-bold text-[var(--forest-800)]">
                      Read full section
                    </summary>
                    <p className="mt-3 leading-6 text-[var(--muted)]">
                      {policy.fullText}
                    </p>
                  </details>
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
        Step {step + 1} of 7 — {steps[step]}
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
        ? `${time}–${endTime(time, parseISO(date), totals?.totalDuration || service.duration)}`
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
}: {
  category?: ServiceCategory;
  services: Service[];
  value?: string;
  onChange: (service: Service) => void;
}) {
  const [details, setDetails] = useState<string>();
  const filtered = services
    .filter((service) => service.active && service.category === category)
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
    <div>
      <h2 className="booking-title">Add extras if they help</h2>
      <p className="booking-copy">
        Extras are optional. Compatible choices add time and price to your
        appointment.
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
                  <span>{extra.name}</span>
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
          No compatible extras are available for this service. Continue without
          extras.
        </Notice>
      )}
      <p className="mt-6 text-sm font-bold text-[var(--forest-800)]">
        You can continue without extras.
      </p>
    </div>
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
  onDate: (date: string) => void;
  onTime: (time: string) => void;
}) {
  const totalDuration =
    service.duration + extras.reduce((sum, extra) => sum + extra.duration, 0);
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
          ).filter((slot) => {
            const candidateLocks = bookingLockIds(
              date,
              slot,
              endTime(slot, parseISO(date), totalDuration),
              settings.bookingInterval,
              settings.bufferMinutes,
            );
            return !bookingHoldRepository
              .listActive(date)
              .some(
                (hold) =>
                  hold.sessionId !== bookingDraftRepository.load().sessionId &&
                  hold.lockIds.some((id) => candidateLocks.includes(id)),
              );
          })
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
          {date && liveSlots === null ? (
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
              {question.label}
              {question.required ? " *" : ""}
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
                aria-required={question.required}
                aria-invalid={
                  question.required && intakeValueMissing(values[question.id])
                }
                aria-describedby={
                  question.required && intakeValueMissing(values[question.id])
                    ? `${question.id}-error`
                    : undefined
                }
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
                  required={question.required}
                  aria-invalid={
                    question.required && intakeValueMissing(values[question.id])
                  }
                  aria-describedby={
                    question.required && intakeValueMissing(values[question.id])
                      ? `${question.id}-error`
                      : undefined
                  }
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
                required={question.required}
                aria-invalid={
                  question.required && intakeValueMissing(values[question.id])
                }
                aria-describedby={
                  question.required && intakeValueMissing(values[question.id])
                    ? `${question.id}-error`
                    : undefined
                }
                value={String(values[question.id] || "")}
                onChange={(event) => onChange(question.id, event.target.value)}
              />
            ) : question.type === "single-choice" ||
              question.type === "yes-no" ? (
              <select
                id={question.id}
                required={question.required}
                aria-invalid={
                  question.required && intakeValueMissing(values[question.id])
                }
                aria-describedby={
                  question.required && intakeValueMissing(values[question.id])
                    ? `${question.id}-error`
                    : undefined
                }
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
                required={question.required}
                aria-invalid={
                  question.required && intakeValueMissing(values[question.id])
                }
                aria-describedby={
                  question.required && intakeValueMissing(values[question.id])
                    ? `${question.id}-error`
                    : undefined
                }
                value={String(values[question.id] || "")}
                onChange={(event) => onChange(question.id, event.target.value)}
              />
            )}
            {question.required && intakeValueMissing(values[question.id]) && (
              <span
                id={`${question.id}-error`}
                className="field-error"
                role="alert"
              >
                This question is required.
              </span>
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
        This information helps prepare the appointment. It is not used to
        diagnose you online.
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
          <label htmlFor="contact-method">Preferred contact *</label>
          <select
            id="contact-method"
            value={details.preferredContact}
            onChange={(e) => set("preferredContact", e.target.value)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="concern">Main hair or scalp concern *</label>
          <textarea
            id="concern"
            required
            aria-invalid={Boolean(errorFor("concern"))}
            aria-describedby={errorFor("concern") ? "concern-error" : undefined}
            value={details.concern}
            onChange={(e) => set("concern", e.target.value)}
            onBlur={() => touch("concern")}
          />
          {errorFor("concern") && (
            <span id="concern-error" className="field-error">
              {errorFor("concern")}
            </span>
          )}
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="hopes">
            What do you hope to get from this appointment? *
          </label>
          <textarea
            id="hopes"
            required
            aria-invalid={Boolean(errorFor("hopes"))}
            aria-describedby={errorFor("hopes") ? "hopes-error" : undefined}
            value={details.hopes}
            onChange={(e) => set("hopes", e.target.value)}
            onBlur={() => touch("hopes")}
          />
          {errorFor("hopes") && (
            <span id="hopes-error" className="field-error">
              {errorFor("hopes")}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="concern-duration">
            How long has this been a concern? *
          </label>
          <select
            id="concern-duration"
            required
            aria-invalid={Boolean(errorFor("concernDuration"))}
            aria-describedby={
              errorFor("concernDuration") ? "concernDuration-error" : undefined
            }
            value={details.concernDuration}
            onChange={(e) => set("concernDuration", e.target.value)}
            onBlur={() => touch("concernDuration")}
          >
            <option value="">Choose one</option>
            <option>Less than 3 months</option>
            <option>3–12 months</option>
            <option>More than 1 year</option>
            <option>Not applicable</option>
          </select>
          {errorFor("concernDuration") && (
            <span id="concernDuration-error" className="field-error">
              {errorFor("concernDuration")}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="prior-treatment">
            Previous professional treatment? *
          </label>
          <select
            id="prior-treatment"
            required
            aria-invalid={Boolean(errorFor("priorProfessionalTreatment"))}
            aria-describedby={
              errorFor("priorProfessionalTreatment")
                ? "priorTreatment-error"
                : undefined
            }
            value={details.priorProfessionalTreatment}
            onChange={(e) => set("priorProfessionalTreatment", e.target.value)}
            onBlur={() => touch("priorProfessionalTreatment")}
          >
            <option value="">Choose one</option>
            <option>Yes</option>
            <option>No</option>
          </select>
          {errorFor("priorProfessionalTreatment") && (
            <span id="priorTreatment-error" className="field-error">
              {errorFor("priorProfessionalTreatment")}
            </span>
          )}
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="products">
            Current products, medication or treatments
          </label>
          <textarea
            id="products"
            value={details.productsTreatments}
            onChange={(e) => set("productsTreatments", e.target.value)}
          />
        </div>
        <div className="field md:col-span-2">
          <label htmlFor="note">Anything else the clinic should know?</label>
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
      2,
    ],
    [
      "Schedule",
      `${format(parseISO(date), "EEEE, d MMMM yyyy")} · ${time}–${endTime(time, parseISO(date), totals.totalDuration)}`,
      3,
    ],
    ["Guest", `${details.fullName} · ${details.email} · ${details.phone}`, 4],
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
  const modes = settings.payment.enabledModes.filter(
    (item) => item !== "disabled",
  );
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
        Your selected time is held while you complete this step.
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
              ? "Paystack must be initialised and verified by the secure booking backend."
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
  const [policiesCatalog, setPoliciesCatalog] = useState(bookingPolicies);
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
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [liveSlots, setLiveSlots] = useState<string[] | null>(null);
  const bookingGateway = useMemo(() => {
    const endpoint = import.meta.env.VITE_BOOKING_API_URL;
    return endpoint ? new HttpBookingGateway(endpoint) : null;
  }, []);
  const deepLinkId = search.get("service") || undefined;
  const activePolicyVersion = policiesCatalog.length
    ? policyBundleVersion(policiesCatalog)
    : policyVersion;
  const service = services.find(
    (item) => item.id === draft.serviceId && item.active,
  );
  const availableExtras = service
    ? compatibleExtras(service.id, extrasCatalog)
    : [];
  const selectedExtras = extrasCatalog.filter((extra) =>
    draft.extraIds.includes(extra.id),
  );
  const paymentMode = draft.paymentMode || settings.payment.defaultMode;
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
        : bookingRepository.list(),
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
          setExtrasCatalog(nextExtras);
          setQuestionsCatalog(nextQuestions);
          setPoliciesCatalog(nextPolicies);
          setConfigurationState("ready");
        },
      )
      .catch(() => setConfigurationState("error"));
    analytics.track("booking_started");
  }, []);
  useEffect(() => {
    if (!deepLinkId || !services.length || draft.serviceId) return;
    const linked = services.find(
      (item) => item.id === deepLinkId && item.active,
    );
    if (linked)
      updateDraft({ category: linked.category, serviceId: linked.id, step: 1 });
  }, [deepLinkId, services.length]);
  useEffect(() => {
    if (!draft.holdExpiresAt) {
      setHoldSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(draft.holdExpiresAt!).getTime() - Date.now()) / 1000,
        ),
      );
      setHoldSeconds(remaining);
      if (!remaining && draft.holdId) {
        releaseCurrentHold(draft.holdId, "expired");
        updateDraft({
          holdId: undefined,
          holdExpiresAt: undefined,
          time: "",
          step: 3,
        });
        setValidation(
          `Your ${settings.payment.holdMinutes}-minute hold expired. Please choose an available time again.`,
        );
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [draft.holdExpiresAt, draft.holdId]);

  useEffect(() => {
    if (!firebaseEnabled || !bookingGateway || !service || !draft.date) {
      setLiveSlots(null);
      return;
    }
    let active = true;
    setLiveSlots(null);
    bookingGateway
      .getAvailability({
        serviceId: service.id,
        extraIds: draft.extraIds,
        date: draft.date,
        paymentMode,
      })
      .then((slots) => {
        if (active) setLiveSlots(slots);
      })
      .catch((error) => {
        if (!active) return;
        setLiveSlots([]);
        setValidation(
          error instanceof Error
            ? error.message
            : "Live availability could not be loaded.",
        );
      });
    return () => {
      active = false;
    };
  }, [bookingGateway, draft.date, draft.extraIds, paymentMode, service]);

  useEffect(() => {
    const reference = search.get("reference") || search.get("trxref");
    if (
      !firebaseEnabled ||
      !reference ||
      !bookingGateway ||
      !draft.holdId ||
      paymentState !== "not-started" ||
      configurationState !== "ready"
    )
      return;
    setPaymentState("processing");
    bookingGateway
      .verifyPayment(reference)
      .then((result) => {
        if (result.requiresReconciliation)
          throw new Error(
            "Your payment was received after the time hold expired. The clinic has been alerted to rebook or refund it; please do not pay again.",
          );
        if (!result.verified)
          throw new Error("Paystack did not verify this payment.");
        return completeBooking(true, reference);
      })
      .catch((error) => {
        setPaymentState("failed");
        setValidation(
          error instanceof Error
            ? error.message
            : "Payment could not be verified.",
        );
      });
  }, [configurationState, draft.holdId, paymentState, search]);

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
  if (
    !draft.policyConsent?.accepted ||
    draft.policyConsent.version !== activePolicyVersion
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
              category: linked?.category,
              serviceId: linked?.id,
              step: linked ? 1 : 0,
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
    if (draft.holdId) releaseCurrentHold(draft.holdId);
    updateDraft({
      category,
      serviceId: undefined,
      extraIds: [],
      date: "",
      time: "",
      holdId: undefined,
      holdExpiresAt: undefined,
    });
  }
  function changeService(next: Service) {
    if (draft.serviceId && draft.serviceId !== next.id)
      setNotice(
        "Changing service cleared extras and schedule so price, duration and availability stay accurate.",
      );
    if (draft.holdId) releaseCurrentHold(draft.holdId);
    updateDraft({
      serviceId: next.id,
      extraIds: [],
      date: "",
      time: "",
      holdId: undefined,
      holdExpiresAt: undefined,
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
    if (draft.holdId) releaseCurrentHold(draft.holdId);
    updateDraft({
      extraIds: next,
      date: "",
      time: "",
      holdId: undefined,
      holdExpiresAt: undefined,
    });
  }
  function validateStep() {
    if (draft.step === 0 && !draft.category)
      return "Choose Salon or Trichology to continue.";
    if (draft.step === 1 && !service)
      return "Choose one main service to continue.";
    if (draft.step === 3 && (!draft.date || !draft.time))
      return "Choose an available date and start time.";
    if (draft.step === 4) {
      const parsed = bookingSchema.safeParse(details);
      if (!parsed.success) return parsed.error.issues[0].message;
      const required = questionsCatalog.filter(
        (q) =>
          q.active &&
          q.schemaId === service?.intakeSchemaId &&
          q.required &&
          (!q.condition ||
            draft.intakeResponses[q.condition.questionId] ===
              q.condition.equals),
      );
      if (
        required.some((question) =>
          intakeValueMissing(draft.intakeResponses[question.id]),
        )
      )
        return "Answer all required service questions.";
      if (photo && (photo.error || !photo.consent))
        return (
          photo.error || "Consent to private photo use or remove the photo."
        );
    }
    return "";
  }
  function releaseCurrentHold(
    holdId: string,
    status: "released" | "expired" = "released",
  ) {
    if (firebaseEnabled) {
      void bookingGateway
        ?.releaseHold(holdId, draft.sessionId)
        .catch(() => undefined);
      return;
    }
    bookingHoldRepository.release(holdId, status);
  }

  async function next() {
    const message = validateStep();
    setValidation(message);
    if (message) return;
    if (draft.step === 3 && service && draft.date && draft.time) {
      const duration =
        service.duration +
        selectedExtras.reduce((sum, extra) => sum + extra.duration, 0);
      const currentSlots = getAvailableSlots(
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
      try {
        if (firebaseEnabled && !bookingGateway)
          throw new Error(
            "The secure booking API is not configured. Set VITE_BOOKING_API_URL.",
          );
        const hold = firebaseEnabled
          ? await bookingGateway!.createHold(draft)
          : bookingHoldRepository.create(
              {
                sessionId: draft.sessionId,
                date: draft.date,
                startTime: draft.time,
                endTime: endTime(draft.time, parseISO(draft.date), duration),
                serviceId: service.id,
              },
              settings.bookingInterval,
              settings.bufferMinutes,
              settings.payment.holdMinutes,
            );
        updateDraft({
          holdId: hold.id,
          holdExpiresAt: hold.expiresAt,
          step: 4,
        });
        return;
      } catch (error) {
        setValidation(
          error instanceof Error
            ? error.message
            : "The time could not be held.",
        );
        return;
      }
    }
    updateDraft({ step: Math.min(6, draft.step + 1) });
  }

  async function completeBooking(paid: boolean, verifiedReference?: string) {
    if (
      !service ||
      !draft.date ||
      !draft.time ||
      !draft.policyConsent ||
      !draft.holdId
    )
      return;
    const hold = firebaseEnabled
      ? {
          status: "active" as const,
          lockIds: bookingLockIds(
            draft.date,
            draft.time,
            endTime(
              draft.time,
              parseISO(draft.date),
              service.duration +
                selectedExtras.reduce((sum, extra) => sum + extra.duration, 0),
            ),
            settings.bookingInterval,
            settings.bufferMinutes,
          ),
        }
      : bookingHoldRepository.get(draft.holdId);
    if (!hold || hold.status !== "active") {
      setValidation("Your time hold expired. Choose another available time.");
      updateDraft({
        step: 3,
        time: "",
        holdId: undefined,
        holdExpiresAt: undefined,
      });
      return;
    }
    const totals = calculateBookingTotals(
      service,
      selectedExtras,
      paymentMode,
      settings.payment,
    );
    const booking: Booking = {
      id: crypto.randomUUID(),
      reference: generateBookingReference(),
      managementToken: generateManagementToken(),
      category: service.category,
      serviceId: service.id,
      serviceName: service.name,
      serviceSnapshot: {
        id: service.id,
        name: service.name,
        category: service.category,
        price: service.price,
        duration: service.duration,
        preparation: service.preparation,
      },
      extras: selectedExtras.map(({ id, name, price, duration }) => ({
        id,
        name,
        price,
        duration,
      })),
      addressSnapshot: settings.address,
      policyVersion: draft.policyConsent.version,
      preparationSnapshot: service.preparation,
      date: draft.date,
      startTime: draft.time,
      endTime: endTime(draft.time, parseISO(draft.date), totals.totalDuration),
      totalDuration: totals.totalDuration,
      subtotal: totals.subtotal,
      amountDueNow: paid ? totals.amountDueNow : 0,
      balanceDue: paid ? totals.balanceDue : totals.subtotal,
      ...details,
      intakeResponses: draft.intakeResponses,
      photoMetadata:
        photo && !photo.error && photo.consent
          ? {
              name: photo.file.name,
              type: photo.file.type,
              size: photo.file.size,
              consent: true,
            }
          : undefined,
      policyConsent: true,
      policyConsentRecord: draft.policyConsent,
      paymentMode,
      paymentStatus: paid
        ? totals.balanceDue
          ? "partially-paid"
          : "paid"
        : "not-required",
      paymentReference: paid
        ? verifiedReference ||
          `MOCK-${draft.sessionId.slice(0, 8).toUpperCase()}`
        : undefined,
      status: settings.payment.approvalRequired
        ? "pending-confirmation"
        : "confirmed",
      internalNotes: "",
      createdAt: new Date().toISOString(),
      followUpDue: false,
      holdId: draft.holdId,
      lockIds: hold.lockIds,
    };
    let savedBooking = booking;
    if (firebaseEnabled) {
      if (!bookingGateway)
        throw new Error("The secure booking API is not configured.");
      const {
        id: _id,
        reference: _reference,
        managementToken: _managementToken,
        ...payload
      } = booking;
      savedBooking = await bookingGateway.submitBooking(payload);
    } else {
      await bookingRepository.save(booking);
      bookingHoldRepository.convert(draft.holdId);
    }
    localStorage.setItem("tamlois-last-booking", JSON.stringify(savedBooking));
    bookingDraftRepository.clear();
    analytics.track("booking_submitted", {
      service: service.id,
      payment: booking.paymentStatus,
    });
    navigate("/booking/confirmation");
  }

  async function pay(fail = false) {
    setValidation("");
    if (firebaseEnabled) {
      if (!bookingGateway || !draft.holdId)
        return setValidation("The secure booking API is not configured.");
      const parsed = bookingSchema.safeParse(details);
      if (!parsed.success) {
        setValidation(parsed.error.issues[0].message);
        updateDraft({ step: 4 });
        return;
      }
      try {
        setPaymentState("initialised");
        const payment = await bookingGateway.initialisePayment(
          draft.holdId,
          parsed.data.email,
          draft.sessionId,
          paymentMode,
        );
        window.location.assign(payment.authorizationUrl);
      } catch (error) {
        setPaymentState("failed");
        setValidation(
          error instanceof Error
            ? error.message
            : "Payment could not be initialised.",
        );
      }
      return;
    }
    setPaymentState("initialised");
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    setPaymentState("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    if (fail) {
      setPaymentState("failed");
      setValidation(
        "The demo payment failed. Your time remains held; retry before the countdown ends.",
      );
      return;
    }
    try {
      await completeBooking(true);
    } catch (error) {
      setPaymentState("failed");
      setValidation(
        error instanceof Error
          ? error.message
          : "Payment could not be verified.",
      );
    }
  }

  const canContinue = draft.step < 6 && !validateStep();
  return (
    <>
      <SEO
        title="Book an appointment"
        description="Complete a policy-first guest booking for Tamlois salon or trichology care."
      />
      <section className="booking-shell page-hero">
        <div className="container-shell">
          <span className="status">Guest booking · no account needed</span>
          <h1 className="page-title mt-6">Reserve time for your care</h1>
          <p className="lede mt-5">
            Choose a category, service and extras, then select live
            availability. Your draft stays in this browser.
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
          {draft.step >= 4 && draft.holdId && holdSeconds > 0 && (
            <div className="mb-5">
              <HoldCountdown
                seconds={holdSeconds}
                holdMinutes={settings.payment.holdMinutes}
              />
            </div>
          )}
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
                    />
                  )}
                  {draft.step === 2 && service && (
                    <ExtrasStep
                      available={availableExtras}
                      selectedIds={draft.extraIds}
                      onToggle={toggleExtra}
                    />
                  )}
                  {draft.step === 3 && service && (
                    <ScheduleStep
                      service={service}
                      extras={selectedExtras}
                      settings={settings}
                      bookings={bookings}
                      date={draft.date}
                      time={draft.time}
                      liveSlots={firebaseEnabled ? liveSlots : undefined}
                      onDate={(date) => {
                        setValidation("");
                        updateDraft({ date, time: "" });
                      }}
                      onTime={(time) => updateDraft({ time })}
                    />
                  )}
                  {draft.step === 4 && service && (
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
                  {draft.step === 5 && service && draft.date && draft.time && (
                    <SummaryStep
                      service={service}
                      extras={selectedExtras}
                      details={details}
                      date={draft.date}
                      time={draft.time}
                      settings={settings}
                      consent={draft.policyConsent}
                      edit={(step) => updateDraft({ step })}
                    />
                  )}
                  {draft.step === 6 && service && (
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
                        completeBooking(false).catch((error) =>
                          setValidation(
                            error instanceof Error
                              ? error.message
                              : "Booking could not be submitted.",
                          ),
                        )
                      }
                    />
                  )}
                  {validation && draft.step !== 6 && (
                    <div className="mt-6">
                      <Notice tone="error">{validation}</Notice>
                    </div>
                  )}
                  {draft.step < 6 && (
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
                      {draft.step < 6 && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!canContinue}
                          onClick={next}
                        >
                          {draft.step === 5
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
              if (draft.holdId) releaseCurrentHold(draft.holdId);
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
  const raw = localStorage.getItem("tamlois-last-booking");
  const booking = raw ? (JSON.parse(raw) as Booking) : null;
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
                  : "Booking request received — awaiting confirmation"}
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
