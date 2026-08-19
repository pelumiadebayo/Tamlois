import { db, firebaseEnabled } from '../lib/firebase';
import { createRepositories } from './factory';

export const appRepositories = firebaseEnabled && db
  ? createRepositories('firebase', db)
  : createRepositories('demo');
