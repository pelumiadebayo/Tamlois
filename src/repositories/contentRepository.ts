import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from '../lib/firebase';

const ANNOUNCEMENT_KEY = 'tamlois-announcement';

export const contentRepository = {
  async getAnnouncement() {
    if (!firebaseEnabled || !db) return localStorage.getItem(ANNOUNCEMENT_KEY) || '';
    try { const snapshot = await getDoc(doc(db, 'content', 'home-announcement')); return snapshot.exists() && snapshot.data().active ? String(snapshot.data().text || '') : ''; }
    catch { return ''; }
  },
  async saveAnnouncement(text: string) {
    if (!firebaseEnabled || !db) { localStorage.setItem(ANNOUNCEMENT_KEY, text); return; }
    await setDoc(doc(db, 'content', 'home-announcement'), { text, active: Boolean(text.trim()), updatedAt: new Date().toISOString() });
  }
};
