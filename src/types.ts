export type ServiceType = "service" | "consultation" | "package";
export type ServiceCategory = "salon" | "trichology";
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
  preparation: string;
  expectation: string;
  aftercare: string;
  caution: string;
  consultationRequired: boolean;
  depositRequired: boolean;
  depositAmount: number;
  active: boolean;
  featured?: boolean;
  order: number;
  image: string;
  imageAlt: string;
  variations: ServiceVariation[];
  intakeSchemaId?: string;
  photoUploadEnabled?: boolean;
  placeholder: true;
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
  placeholder: true;
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
  version: string;
  effectiveFrom: string;
  title: string;
  summary: string;
  fullText: string;
  active: boolean;
  placeholder: boolean;
}
export interface BlockedPeriod {
  id: string;
  date: string;
  start?: string;
  end?: string;
  reason: string;
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
}

export interface Booking {
  id: string;
  reference: string;
  managementToken?: string;
  category: ServiceCategory;
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
  totalDuration: number;
  subtotal: number;
  amountDueNow: number;
  balanceDue: number;
  fullName: string;
  phone: string;
  email: string;
  preferredContact: "phone" | "whatsapp" | "email";
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
  followUpDue: boolean;
  holdId?: string;
  lockIds?: string[];
}

export interface BookingDraft {
  sessionId: string;
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
  holdId?: string;
  holdExpiresAt?: string;
  updatedAt: string;
}

export interface BookingHold {
  id: string;
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
  lockIds: string[];
  expiresAt: string;
  status: "active" | "converted" | "expired" | "released";
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
