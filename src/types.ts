export type ServiceType = "service" | "consultation" | "package";
export type ServiceCategory = "salon" | "trichology";
export type SchedulingMode = "salon-session" | "precise-time";
export type BookingStatus =
  | "draft"
  | "slot-held"
  | "pending-payment"
  | "request-submitted"
  | "pending-confirmation"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show"
  | "expired"
  | "reschedule-requested"
  | "cancellation-requested";
export type PaymentMode =
  | "full"
  | "deposit_percentage"
  | "deposit_fixed"
  | "clinic"
  | "disabled";
export type PaymentStatus =
  | "not-required"
  | "not-started"
  | "initialised"
  | "processing"
  | "partially-paid"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially-refunded";
export type IntakeFieldType =
  | "short-text"
  | "long-text"
  | "single-choice"
  | "multi-choice"
  | "yes-no"
  | "checkbox"
  | "date";

export interface ServiceVariation {
  id: string;
  name: string;
  price: number;
  duration: number;
}
export interface Service {
  id: string;
  slug: string;
  name: string;
  category: ServiceCategory;
  type: ServiceType;
  summary: string;
  description: string;
  concerns: string[];
  price: number;
  duration: number;
  durationMinutes?: number;
  preparation: string;
  expectation: string;
  aftercare: string;
  caution: string;
  consultationRequired: boolean;
  depositRequired: boolean;
  depositAmount: number;
  active: boolean;
  archived?: boolean;
  featured?: boolean;
  order: number;
  displayOrder?: number;
  schedulingMode?: SchedulingMode;
  image: string;
  imageAlt: string;
  variations: ServiceVariation[];
  intakeSchemaId?: string;
  photoUploadEnabled?: boolean;
  placeholder: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceExtra {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  compatibleServiceIds: string[];
  incompatibleExtraIds: string[];
  active: boolean;
  order: number;
  placeholder: boolean;
}

export interface IntakeQuestion {
  id: string;
  schemaId: string;
  label: string;
  helpText?: string;
  type: IntakeFieldType;
  required: boolean;
  options?: string[];
  condition?: { questionId: string; equals: string };
  order: number;
  active: boolean;
}

export interface Concern {
  slug: string;
  name: string;
  summary: string;
  overview: string;
  signs: string[];
  factors: string[];
  assessment: string;
  relatedServiceIds: string[];
  doctorNote: string;
}
export interface Product {
  id: string;
  title: string;
  summary: string;
  price: number;
  category: string;
  available: boolean;
  featured: boolean;
  image: string;
  imageAlt: string;
  variantId?: string;
}

export type HomeOfferingId = "trichology" | "salon" | "products" | "gallery";
export interface HomeOffering {
  id: HomeOfferingId;
  sequence: number;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image: {
    src: string;
    alt: string;
    focalPoint?: string;
    placeholder: boolean;
  };
  theme: {
    backgroundToken: string;
    foregroundToken: string;
    accentToken: string;
  };
  active: boolean;
}

export type GalleryCategory =
  | "trichology"
  | "natural-hair"
  | "clinic"
  | "products";
export interface StaticGalleryItem {
  id: string;
  category: Exclude<GalleryCategory, "products">;
  caption: string;
  alt: string;
  order: number;
  featured: boolean;
  active: boolean;
  width: number;
  height: number;
  sources: Array<{ src: string; width: number }>;
  provenance: "tamlois" | "licensed-placeholder";
  provenanceLabel: string;
  isClientResult: boolean;
  writtenConsentConfirmed: boolean;
  consentNote: string;
  relatedHref?: string;
}

export interface PaymentSettings {
  enabledModes: PaymentMode[];
  defaultMode: PaymentMode;
  depositPercentage: number;
  fixedDepositAmount: number;
  balanceDue: "at-clinic" | "before-appointment";
  holdMinutes: number;
  approvalRequired: boolean;
}

export interface BusinessSettings {
  timezone: string;
  address: string;
  bookingInterval: number;
  bufferMinutes: number;
  minimumNoticeHours: number;
  maximumAdvanceDays: number;
  openingHour: number;
  closingHour: number;
  closedDays: number[];
  blockedPeriods: BlockedPeriod[];
  payment: PaymentSettings;
}

export interface BookingPolicy {
  id: string;
  title: string;
  summary: string;
  displayOrder: number;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export type CreateBookingPolicyInput = Pick<BookingPolicy, "title" | "summary">;
export type UpdateBookingPolicyInput = Pick<BookingPolicy, "title" | "summary">;
export interface BookingPolicyRepository {
  list(): Promise<BookingPolicy[]>;
  createAsAdmin(input: CreateBookingPolicyInput): Promise<BookingPolicy>;
  updateAsAdmin(
    id: string,
    input: UpdateBookingPolicyInput,
  ): Promise<BookingPolicy>;
  reorderAsAdmin(ids: string[]): Promise<void>;
  deleteAsAdmin(id: string): Promise<void>;
}
export interface BlockedPeriod {
  id: string;
  date: string;
  start?: string;
  end?: string;
  reason: string;
  kind?: "all-day" | "time-range" | "salon-session";
  sessionId?: string;
  adminUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
export interface CapacityOverride {
  id: string;
  date: string;
  sessionId: string;
  capacity: number;
  reason: string;
  adminUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
export interface BookingExtraSnapshot {
  id: string;
  name: string;
  price: number;
  duration: number;
}
export interface BookingServiceSnapshot {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  duration: number;
  preparation: string;
}
export interface PolicyConsentRecord {
  accepted: boolean;
  version: string;
  acceptedAt: string;
  sessionId: string;
  policies: Array<
    Pick<BookingPolicy, "id" | "title" | "summary" | "version">
  >;
}

export interface Booking {
  id: string;
  reference: string;
  ownerUid?: string;
  managementToken?: string;
  category: ServiceCategory;
  schedulingMode?: SchedulingMode;
  serviceId: string;
  serviceName: string;
  serviceSnapshot: BookingServiceSnapshot;
  extras: BookingExtraSnapshot[];
  addressSnapshot: string;
  policyVersion: string;
  preparationSnapshot: string;
  date: string;
  startTime: string;
  endTime: string;
  salonSessionId?: "morning" | "afternoon" | "evening";
  totalDuration: number;
  subtotal: number;
  amountDueNow: number;
  balanceDue: number;
  fullName: string;
  phone: string;
  email: string;
  preferredContact: "phone" | "whatsapp" | "email" | "";
  concern: string;
  hopes: string;
  concernDuration: string;
  priorProfessionalTreatment: string;
  productsTreatments: string;
  note: string;
  intakeResponses: Record<string, string | string[] | boolean>;
  photoMetadata?: {
    name: string;
    type: string;
    size: number;
    consent: boolean;
  };
  policyConsent: boolean;
  policyConsentRecord: PolicyConsentRecord;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  status: BookingStatus;
  internalNotes: string;
  createdAt: string;
  updatedAt?: unknown;
  followUpDue: boolean;
  lockIds?: string[];
}

export interface BookingDraft {
  sessionId: string;
  bookingId: string;
  bookingReference: string;
  flowVersion: number;
  step: number;
  policyConsent?: PolicyConsentRecord;
  category?: ServiceCategory;
  serviceId?: string;
  extraIds: string[];
  date: string;
  time: string;
  details: Partial<
    Pick<
      Booking,
      | "fullName"
      | "phone"
      | "email"
      | "preferredContact"
      | "concern"
      | "hopes"
      | "concernDuration"
      | "priorProfessionalTreatment"
      | "productsTreatments"
      | "note"
    >
  >;
  intakeResponses: Record<string, string | string[] | boolean>;
  paymentMode?: PaymentMode;
  updatedAt: string;
}

export interface BookingLock {
  lockId: string;
  bookingId: string;
  ownerUid: string;
  serviceType: ServiceCategory;
  date: string;
  sessionId?: "morning" | "afternoon" | "evening";
  unitTime?: string;
  startTime: string;
  endTime: string;
  status: "active";
  createdAt: unknown;
}

export interface SalonAvailabilityResult {
  date: string;
  blocked: boolean;
  sessions: Array<{
    id: "morning" | "afternoon" | "evening";
    label: string;
    startTime: string;
    endTime: string;
    capacity: number;
    remaining: number;
    available: boolean;
    blocked: boolean;
  }>;
}

export interface SalonMonthAvailabilityDay {
  remaining: number;
  status: "available" | "booked" | "blocked" | "unavailable";
  reason?: string;
}

export interface TrichologyAvailabilityResult {
  date: string;
  slots: string[];
  blocked: boolean;
}

export interface BookingAvailabilityRequest {
  date: string;
  serviceId: string;
  extraIds: string[];
}

export interface CreateBookingInput {
  bookingId: string;
  bookingReference: string;
  service: Service;
  extras: ServiceExtra[];
  date: string;
  startTime: string;
  details: Pick<
    Booking,
    | "fullName"
    | "phone"
    | "email"
    | "preferredContact"
    | "concern"
    | "hopes"
    | "concernDuration"
    | "priorProfessionalTreatment"
    | "productsTreatments"
    | "note"
  >;
  intakeResponses: Booking["intakeResponses"];
  policyConsentRecord: PolicyConsentRecord;
  addressSnapshot: string;
}

export interface RescheduleBookingInput {
  date: string;
  startTime: string;
}

export interface AvailabilityRepositoryContract {
  getSalonSessionAvailability(
    request: BookingAvailabilityRequest,
  ): Promise<SalonAvailabilityResult>;
  getTrichologyAvailability(
    request: BookingAvailabilityRequest,
  ): Promise<TrichologyAvailabilityResult>;
  getSalonMonthAvailability(
    month: string,
  ): Promise<Record<string, SalonMonthAvailabilityDay>>;
}

export interface BookingRepositoryContract {
  list(): Promise<Booking[]>;
  get(id: string): Promise<Booking | null>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  cancelBookingAsAdmin(bookingId: string): Promise<void>;
  rescheduleBookingAsAdmin(
    bookingId: string,
    input: RescheduleBookingInput,
  ): Promise<void>;
  updateStatusAsAdmin(bookingId: string, status: BookingStatus): Promise<void>;
  saveInternalNotesAsAdmin(bookingId: string, internalNotes: string): Promise<void>;
}

export interface Lead {
  id: string;
  email: string;
  consent: boolean;
  createdAt: string;
  utm: Record<string, string>;
}
export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  save(item: T): Promise<T>;
  remove(id: string): Promise<void>;
}
import type { Timestamp } from "firebase/firestore";
