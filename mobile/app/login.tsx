import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, firestore } from '../lib/firebase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configuração do Google Sign-In Nativo
GoogleSignin.configure({
  webClientId: '596031963442-ln90leqsq14o1noqqu3iev2pcobg4f1s.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export default function LoginScreen() {
  const [step, setStep] = useState<'initial' | 'complete_profile'>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      // Força a saída para permitir escolher outra conta na próxima vez
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      
      console.log('[Google Native] Login Sucesso:', userInfo.data?.user.email);
      
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('ID Token não recebido');

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      const userDocSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      if (userDocSnap.exists()) {
        router.replace('/(tabs)');
      } else {
        setGoogleUser(firebaseUser);
        setStep('complete_profile');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Google Native] Cancelado');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('[Google Native] Já em andamento');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Erro', 'Google Play Services não disponível');
      } else {
        console.error('[Google Native] Erro Crítico:', error);
        Alert.alert('Erro de Autenticação', 'Não foi possível completar o login nativo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!username || !phone) {
      Alert.alert('Aviso', 'Codinome e WhatsApp são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const userProfile = {
        id: googleUser.uid,
        name: googleUser.displayName || 'Operador',
        username,
        email: googleUser.email,
        phone,
        role: 'student',
        photoUrl: googleUser.photoURL || `https://picsum.photos/seed/${googleUser.uid}/200/200`,
        createdAt: Date.now(),
        xp: 0,
        level: 1,
        studyStreak: 0,
        completedLessons: [],
      };
      await setDoc(doc(firestore, 'users', googleUser.uid), userProfile);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Feather name="award" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>
            APROVA<Text style={styles.titleBold}>CONCURSOS</Text>
          </Text>
          <Text style={styles.subtitle}>Treinamento Científico de Elite</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === 'complete_profile' ? 'RECRUTAMENTO' : 'ACESSO À BASE'}
          </Text>

          <View style={styles.form}>
            {step === 'complete_profile' ? (
              <>
                <View style={styles.inputGroup}>
                  <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Codinome"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="WhatsApp"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Senha"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]} 
              onPress={step === 'complete_profile' ? handleCompleteRegistration : handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.primaryButtonText}>
                  {step === 'complete_profile' ? 'ATIVAR PERFIL' : 'ENTRAR NA MISSÃO'}
                </Text>
              )}
            </TouchableOpacity>

            {step === 'initial' && (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>OU</Text>
                  <View style={styles.line} />
                </View>

                <TouchableOpacity 
                  style={styles.googleButton} 
                  onPress={handleGoogleLogin}
                  disabled={loading}
                >
                  <Feather name="chrome" size={18} color="#0f172a" />
                  <Text style={styles.googleButtonText}>GOOGLE NATIVO</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => step === 'complete_profile' && setStep('initial')}>
            <Text style={styles.footerLink}>
              {step === 'complete_profile' ? 'VOLTAR AO LOGIN' : 'AINDA NÃO TEM CONTA? CADASTRE-SE'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-around',
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#3b82f6',
    letterSpacing: -0.5,
  },
  titleBold: {
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 20,
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  googleButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 0.5,
  }
});
