import { homeOfferings } from "../data/content";
import type { HomeOffering, HomeOfferingId } from "../types";

const offeringOrder: HomeOfferingId[] = [
  "salon",
  "trichology",
  "products",
  "gallery",
];

async function listOfferings() {
  const complete = offeringOrder.map((id, index) =>
    homeOfferings.find(
      (item) => item.id === id && item.active && item.sequence === index + 1,
    ),
  );
  return complete.every(Boolean) ? (complete as HomeOffering[]) : homeOfferings;
}

export const publicHomeContent = { offerings: listOfferings };
