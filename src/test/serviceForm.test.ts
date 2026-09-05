import { describe, expect, it } from "vitest";
import {
  isValidServiceImage,
  nextServiceOrder,
  prepareServiceForSave,
  serviceSlugFromName,
} from "../lib/serviceForm";
import type { Service } from "../types";

const service: Service = {
  id: "service-one",
  slug: "old-custom-slug",
  name: "  Natural Hair Care & Styling  ",
  category: "salon",
  type: "service",
  summary: "  Gentle natural-hair care.  ",
  description: "Old full description.",
  concerns: [],
  price: 24000,
  duration: 90,
  preparation: "",
  expectation: "",
  aftercare: "",
  caution: "",
  consultationRequired: true,
  depositRequired: true,
  depositAmount: 10000,
  active: true,
  featured: true,
  order: 4,
  image: "  /media/natural-hair.webp  ",
  imageAlt: "Old alt text",
  variations: [],
  intakeSchemaId: "intake-trichology",
  placeholder: false,
};

describe("service editor derived fields", () => {
  it("derives hidden fields from the entered name and category", () => {
    const prepared = prepareServiceForSave(service, 7);

    expect(prepared).toMatchObject({
      name: "Natural Hair Care & Styling",
      slug: "natural-hair-care-styling",
      summary: "Gentle natural-hair care.",
      description: "Gentle natural-hair care.",
      image: "/media/natural-hair.webp",
      imageAlt: "Natural Hair Care & Styling",
      intakeSchemaId: "intake-salon",
      order: 7,
      displayOrder: 7,
      durationMinutes: 90,
      schedulingMode: "salon-session",
      consultationRequired: false,
      depositRequired: false,
      depositAmount: 0,
      featured: false,
    });
  });

  it("assigns new services after the highest existing order", () => {
    expect(
      nextServiceOrder([
        service,
        { ...service, id: "service-two", order: 9 },
      ]),
    ).toBe(10);
  });

  it("accepts deployable image locations and gives unusual names a safe slug", () => {
    expect(isValidServiceImage("/media/service.webp")).toBe(true);
    expect(isValidServiceImage("https://example.com/service.webp")).toBe(true);
    expect(isValidServiceImage("C:\\photos\\service.jpg")).toBe(false);
    expect(serviceSlugFromName("Élan Scalp Care")).toBe("elan-scalp-care");
    expect(serviceSlugFromName("护理", "ABC-123")).toBe("service-abc-123");
  });
});
