import { firebaseEnabled } from '../lib/firebase';

const ANNOUNCEMENT_KEY = 'tamlois-announcement';

export const contentRepository = {
  async getAnnouncement() {
    if (!firebaseEnabled) return localStorage.getItem(ANNOUNCEMENT_KEY) || '';
    return '';
  },
  async saveAnnouncement(text: string) {
    if (!firebaseEnabled) { localStorage.setItem(ANNOUNCEMENT_KEY, text); return; }
    throw new Error('Homepage announcements are source-controlled in Firebase mode.');
  }
};
