"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
      <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.7 0 265.2 0 128.7 110.3 18.2 244 18.2c71.2 0 130.3 27.8 177.1 72.9l-62.8 62.1c-25.9-24.6-60.5-39.6-114.3-39.6-86.3 0-156.4 69.8-156.4 156.4s69.9 156.4 156.4 156.4c97.9 0 138-66.2 141.8-102.1H244v-79.6h244c2.5 12.8 3.9 26.6 3.9 41z"></path>
    </svg>
);

const formatPhoneNumber = (value: string) => {
    if (!value) return ""
    value = value.replace(/\D/g,'')
    value = value.replace(/(\d{2})(\d)/,"($1) $2")
    value = value.replace(/(\d)(\d{4})$/,"$1-$2")
    return value
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState<'initial' | 'complete_profile'>('initial');
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);
  
  const handleRegister = async () => {
    if (!name || !email || !password || !username || !phone) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Todos os campos são obrigatórios.' });
      return;
    }
    setIsProcessing(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const userProfile: UserProfile = {
        id: userCredential.user.uid,
        name,
        username,
        email,
        phone,
        role: 'student',
        photoUrl: `https://picsum.photos/seed/${userCredential.user.uid}/200/200`,
        createdAt: Date.now(),
        sessionStart: Date.now(),
        twoFactorEnabled: false,
        xp: 0,
        level: 1,
        studyStreak: 0,
        lastStudyDate: 0,
        completedLessons: [],
      };
      await setDoc(doc(firestore, 'users', userCredential.user.uid), userProfile);
      // onAuthStateChanged will handle redirect
    } catch (error) {
      const authError = error as AuthError;
      toast({ variant: 'destructive', title: 'Erro no Registro', description: authError.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const userDocRef = doc(firestore, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          toast({ title: 'Bem-vindo de volta!' });
          // onAuthStateChanged will handle redirect
        } else {
          // New user, need more info
          setGoogleUser(result.user);
          setName(result.user.displayName || '');
          setEmail(result.user.email || '');
          setStep('complete_profile');
        }
    } catch (error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/popup-closed-by-user') {
            toast({
                variant: 'default',
                title: 'Registro Cancelado',
                description: 'A janela de registro com o Google foi fechada antes da conclusão.',
            });
        } else {
            toast({ variant: 'destructive', title: 'Erro com Google', description: authError.message });
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCompleteGoogleRegistration = async () => {
    if (!googleUser || !username || !phone) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nome de usuário e WhatsApp são obrigatórios.' });
      return;
    }
    setIsProcessing(true);
    try {
        const userProfile: UserProfile = {
            id: googleUser.uid,
            name: name,
            username: username,
            email: googleUser.email,
            phone: phone,
            role: 'student',
            photoUrl: googleUser.photoURL || `https://picsum.photos/seed/${googleUser.uid}/200/200`,
            createdAt: Date.now(),
            sessionStart: Date.now(),
            twoFactorEnabled: false,
            xp: 0,
            level: 1,
            studyStreak: 0,
            lastStudyDate: 0,
            completedLessons: [],
        };
        await setDoc(doc(firestore, 'users', googleUser.uid), userProfile);
        toast({ title: 'Perfil criado com sucesso!' });
        // let onAuthStateChanged handle redirect
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Erro ao criar perfil', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  }


  if (isUserLoading || (user && !googleUser)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold">Carregando...</div>
      </div>
    );
  }

  if(step === 'complete_profile') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="shadow-2xl border-none w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline font-bold">Complete seu Perfil</CardTitle>
            <CardDescription>Falta pouco! Precisamos de mais algumas informações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input value={name} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input value={email} disabled className="bg-muted/50" />
              </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Nome de usuário</label>
                  <Input 
                  placeholder="Seu nome de usuário único" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp</label>
                <div className="flex gap-2">
                    <Select defaultValue="+55">
                        <SelectTrigger className="w-[90px] h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="+55">+55</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input 
                        type="tel"
                        placeholder="(21) 99999-9999" 
                        value={phone}
                        onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            if (formatted.length <= 15) {
                                setPhone(formatted);
                            }
                        }}
                        maxLength={15}
                    />
                </div>
              </div>
              <Button className="w-full h-11 text-lg font-bold gap-2" onClick={handleCompleteGoogleRegistration} disabled={isProcessing}>
                  {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                  Finalizar Cadastro
              </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="shadow-2xl border-none w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline font-bold">Crie sua Conta</CardTitle>
          <CardDescription>Junte-se à elite dos aprovados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input 
                type="text"
                placeholder="Seu nome" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Nome de usuário</label>
                <Input 
                placeholder="Seu nome de usuário único" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input 
                type="email"
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp</label>
                <div className="flex gap-2">
                    <Select defaultValue="+55">
                        <SelectTrigger className="w-[90px] h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="+55">+55</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input 
                        type="tel"
                        placeholder="(21) 99999-9999" 
                        value={phone}
                        onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            if (formatted.length <= 15) {
                                setPhone(formatted);
                            }
                        }}
                        maxLength={15}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input 
                type="password"
                placeholder="******" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <Button className="w-full h-11 text-lg font-bold gap-2" onClick={handleRegister} disabled={isProcessing}>
                {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                Criar Conta
            </Button>
            
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OU</span>
                </div>
            </div>

            <Button variant="outline" className="w-full h-11 text-base font-bold gap-2" onClick={handleGoogleSignIn} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                Continuar com Google
            </Button>
        </CardContent>
        <CardFooter className="flex-col">
            <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link href="/" className="font-bold text-primary hover:underline">
                    Acesse
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
