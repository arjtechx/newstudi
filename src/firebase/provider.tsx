'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { SystemSettings } from '@/lib/types';
import { getSystemSettings } from '@/lib/store';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: (User & { 
    id?: string;
    role?: string; 
    name?: string; 
    xp?: number; 
    level?: number; 
    studyStreak?: number; 
    photoUrl?: string; 
    completedLessons?: string[];
    fcmToken?: string;
    twoFactorEnabled?: boolean;
  }) | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  messaging: Messaging | null;
  isMessagingSupported: boolean;
  user: UserAuthState['user'];
  isUserLoading: boolean;
  userError: Error | null;
  settings: SystemSettings | null;
}

export interface FirebaseServicesAndUser extends FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [isMessagingSupported, setIsMessagingSupported] = useState<boolean>(false);

  useEffect(() => {
    if (!firestore) return;
    getSystemSettings(firestore).then(setSettings);
  }, [firestore]);

  useEffect(() => {
    if (typeof window !== 'undefined' && firebaseApp) {
      isSupported().then(supported => {
        setIsMessagingSupported(supported);
        if (supported) {
          try {
            const msg = getMessaging(firebaseApp);
            setMessaging(msg);
          } catch (e) {
            console.warn("Messaging failed to initialize:", e);
          }
        }
      });
    }
  }, [firebaseApp]);

  useEffect(() => {
    if (!auth || !firestore) { 
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Serviços não disponíveis.") });
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            const profileData = docSnap.exists() ? docSnap.data() : {};
            
            if (profileData.role === 'admin') {
              const adminRoleRef = doc(firestore, 'roles_admin', firebaseUser.uid);
              getDoc(adminRoleRef).then(adminSnap => {
                if (!adminSnap.exists()) {
                   setDoc(adminRoleRef, { 
                     uid: firebaseUser.uid, 
                     assignedAt: Date.now(), 
                     source: 'self-healing-protocol' 
                   });
                }
              });
            }

            setUserAuthState({
              user: { ...firebaseUser, ...profileData, id: firebaseUser.uid } as any,
              isUserLoading: false,
              userError: null,
            });
          }, (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'get'
            }));
            setUserAuthState({ user: firebaseUser as any, isUserLoading: false, userError: null });
          });
        } else {
          if (unsubscribeProfile) unsubscribeProfile();
          setUserAuthState({ user: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      messaging,
      isMessagingSupported,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      settings,
    };
  }, [firebaseApp, firestore, auth, userAuthState, settings, messaging, isMessagingSupported]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    ...context,
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
  };
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized;
}

export const useUser = () => { 
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
