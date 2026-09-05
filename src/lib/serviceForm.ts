import { schedulingModeForCategory } from "../config/businessSchedule";
import type { Service } from "../types";

export function serviceSlugFromName(name: string, fallbackId = "service") {
  const slug = name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    slug ||
    `service-${fallbackId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  );
}

export function isValidServiceImage(value: string) {
  const image = value.trim();
  return image.startsWith("/") || /^https:\/\//i.test(image);
}

export function nextServiceOrder(services: Service[]) {
  return (
    services.reduce(
      (highest, service) => Math.max(highest, Number(service.order) || 0),
      0,
    ) + 1
  );
}

export function prepareServiceForSave(service: Service, order: number): Service {
  const name = service.name.trim();
  const summary = service.summary.trim();

  return {
    ...service,
    name,
    slug: serviceSlugFromName(name, service.id),
    summary,
    description: summary,
    image: service.image.trim(),
    imageAlt: name,
    order,
    displayOrder: order,
    durationMinutes: service.duration,
    schedulingMode: schedulingModeForCategory(service.category),
    intakeSchemaId:
      service.category === "salon" ? "intake-salon" : "intake-trichology",
    consultationRequired: false,
    depositRequired: false,
    depositAmount: 0,
    featured: false,
    archived: Boolean(service.archived),
    placeholder: false,
  };
}
