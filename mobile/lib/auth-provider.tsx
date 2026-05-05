import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from './firebase';

interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  role?: string;
  xp?: number;
  level?: number;
  photoUrl?: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: (User & UserProfile) | null;
  loading: boolean;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextValue>({ 
  user: null, 
  loading: true,
  isAnonymous: false 
});

export function useAuthContext() {
  return useContext(AuthContext);
}

import { LoadingScreen } from '../components/ui/LoadingScreen';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & UserProfile) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[AuthContext] Auth State Change:', firebaseUser ? firebaseUser.email : 'NULL');
      if (firebaseUser) {
        setIsAnonymous(firebaseUser.isAnonymous);
        
        // Busca perfil no Firestore
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          const profileData = docSnap.exists() ? docSnap.data() : {};
          setUser({ ...firebaseUser, ...profileData, id: firebaseUser.uid } as any);
          setLoading(false);
        }, (err) => {
          console.error('[AuthContext] Erro perfil:', err);
          setUser(firebaseUser as any);
          setLoading(false);
        });
      } else {
        console.log('[AuthContext] Limpando usuário...');
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
        setIsAnonymous(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
