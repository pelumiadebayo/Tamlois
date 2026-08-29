import { describe, expect, it } from "vitest";
import { serviceFromFirestore, serviceToFirestore } from "../repositories/firestoreModels";
import type { Service } from "../types";

const service: Service = {
  id: "service-one",
  slug: "service-one",
  name: "Service one",
  category: "salon",
  type: "service",
  summary: "Summary",
  description: "Description",
  concerns: [],
  price: 1000,
  duration: 60,
  preparation: "Preparation",
  expectation: "Expectation",
  aftercare: "Aftercare",
  caution: "Caution",
  consultationRequired: false,
  depositRequired: false,
  depositAmount: 0,
  active: true,
  order: 4,
  image: "https://example.com/service.jpg",
  imageAlt: "A service",
  variations: [],
  placeholder: true,
};

describe("Firestore document adapters", () => {
  it("writes canonical scheduling, duration, order and production fields", () => {
    const record = serviceToFirestore(service, true);
    expect(record).toMatchObject({
      duration: 60,
      durationMinutes: 60,
      order: 4,
      displayOrder: 4,
      schedulingMode: "salon-session",
      archived: false,
      placeholder: false,
    });
    expect(Object.values(record)).not.toContain(undefined);
  });

  it("hydrates canonical service fields for existing UI consumers", () => {
    const hydrated = serviceFromFirestore("service-one", {
      ...service,
      duration: undefined,
      durationMinutes: 90,
      order: undefined,
      displayOrder: 2,
      archived: false,
    });
    expect(hydrated.duration).toBe(90);
    expect(hydrated.order).toBe(2);
    expect(hydrated.schedulingMode).toBe("salon-session");
  });
});
