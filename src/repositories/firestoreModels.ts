import { serverTimestamp } from "firebase/firestore";
import { schedulingModeForCategory } from "../config/businessSchedule";
import type { Service } from "../types";
import { withoutUndefined } from "./firestoreRepository";

type DocumentData = Record<string, unknown>;

export function serviceFromFirestore(id: string, data: DocumentData): Service {
  const category = data.category === "salon" ? "salon" : "trichology";
  const durationMinutes = Number(data.durationMinutes ?? data.duration ?? 0);
  const displayOrder = Number(data.displayOrder ?? data.order ?? 0);
  return {
    ...(data as unknown as Service),
    id,
    category,
    duration: durationMinutes,
    durationMinutes,
    order: displayOrder,
    displayOrder,
    schedulingMode:
      data.schedulingMode === "salon-session" || data.schedulingMode === "precise-time"
        ? data.schedulingMode
        : schedulingModeForCategory(category),
    archived: Boolean(data.archived),
    placeholder: false,
  };
}

export function serviceToFirestore(service: Service, isNew: boolean) {
  const durationMinutes = Number(service.durationMinutes ?? service.duration);
  const displayOrder = Number(service.displayOrder ?? service.order);
  return withoutUndefined({
    id: service.id,
    slug: service.slug,
    name: service.name,
    category: service.category,
    type: service.type,
    summary: service.summary,
    description: service.description,
    concerns: service.concerns,
    price: service.price,
    duration: durationMinutes,
    durationMinutes,
    preparation: service.preparation,
    expectation: service.expectation,
    aftercare: service.aftercare,
    caution: service.caution,
    consultationRequired: service.consultationRequired,
    depositRequired: service.depositRequired,
    depositAmount: service.depositAmount,
    active: service.active,
    archived: Boolean(service.archived),
    featured: service.featured,
    order: displayOrder,
    displayOrder,
    schedulingMode: schedulingModeForCategory(service.category),
    image: service.image,
    imageAlt: service.imageAlt,
    variations: service.variations,
    intakeSchemaId: service.intakeSchemaId,
    photoUploadEnabled: service.photoUploadEnabled,
    placeholder: false,
    createdAt:
      isNew || !service.createdAt ? serverTimestamp() : service.createdAt,
    updatedAt: serverTimestamp(),
  });
}
