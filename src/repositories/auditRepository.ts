import { getAuth } from "firebase/auth";
import { doc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

export async function recordAdminAudit(
  firestore: Firestore,
  action: string,
  targetCollection: string,
  targetId: string,
) {
  const actorUid = getAuth().currentUser?.uid;
  if (!actorUid) return;
  const id = crypto.randomUUID();
  await setDoc(doc(firestore, "auditLogs", id), {
    id,
    action,
    actorUid,
    targetCollection,
    targetId,
    createdAt: serverTimestamp(),
  });
}
