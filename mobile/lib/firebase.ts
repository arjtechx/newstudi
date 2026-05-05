import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Importa exatamente as mesmas chaves da web sem duplicar código!
import { firebaseConfig } from './firebase-config';

// No mobile, sempre inicializamos explicitamente com as chaves
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firestore = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
