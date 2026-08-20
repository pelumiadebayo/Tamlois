import { collection, getDocs, query, where } from "firebase/firestore";
import { galleryItems, homeOfferings } from "../data/content";
import { db, firebaseEnabled } from "../lib/firebase";
import type { GalleryItem, HomeOffering, HomeOfferingId } from "../types";
import { FirestoreRepository } from "./firestoreRepository";
import { LocalRepository } from "./localRepository";

const localOfferings = new LocalRepository<HomeOffering>(
  "tamlois-home-offerings",
  homeOfferings,
);
const localGallery = new LocalRepository<GalleryItem>(
  "tamlois-gallery-items",
  galleryItems,
);

export const homeOfferingRepository =
  firebaseEnabled && db
    ? new FirestoreRepository<HomeOffering>(db, "homeOfferings")
    : localOfferings;
export const galleryRepository =
  firebaseEnabled && db
    ? new FirestoreRepository<GalleryItem>(db, "gallery")
    : localGallery;

const offeringOrder: HomeOfferingId[] = [
  "salon",
  "trichology",
  "products",
  "gallery",
];

async function listOfferings() {
  const records =
    !firebaseEnabled || !db
      ? await localOfferings.list()
      : (
          await getDocs(
            query(collection(db, "homeOfferings"), where("active", "==", true)),
          )
        ).docs.map((item) => item.data() as HomeOffering);
  const complete = offeringOrder.map((id, index) =>
    records.find(
      (item) => item.id === id && item.active && item.sequence === index + 1,
    ),
  );
  return complete.every(Boolean) ? (complete as HomeOffering[]) : homeOfferings;
}

function publishableGalleryItem(item: GalleryItem) {
  return (
    item.active &&
    (!item.isClientResult ||
      (item.consentConfirmed &&
        Boolean(item.consentRecordReference?.trim()) &&
        !item.placeholder))
  );
}

async function listGallery() {
  if (!firebaseEnabled || !db)
    return (await localGallery.list()).filter(publishableGalleryItem);
  const nonResults = await getDocs(
    query(
      collection(db, "gallery"),
      where("active", "==", true),
      where("isClientResult", "==", false),
    ),
  );
  const consentedResults = await getDocs(
    query(
      collection(db, "gallery"),
      where("active", "==", true),
      where("isClientResult", "==", true),
      where("consentConfirmed", "==", true),
      where("placeholder", "==", false),
      where("consentRecordReference", ">", ""),
    ),
  );
  return [...nonResults.docs, ...consentedResults.docs]
    .map((item) => item.data() as GalleryItem)
    .filter(publishableGalleryItem);
}

export const publicHomeContent = {
  offerings: listOfferings,
  gallery: listGallery,
};
