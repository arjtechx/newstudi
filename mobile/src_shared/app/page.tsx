
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  AuthError,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  PhoneAuthProvider,
  RecaptchaVerifier,
  multiFactor,
  PhoneMultiFactorGenerator,
  MultiFactorResolver,
  PhoneMultiFactorInfo,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, BookOpen, GraduationCap, Loader2, ShieldCheck, ArrowRight, Star, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/loading-screen';


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

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState<'initial' | 'complete_profile' | 'mfa_verify'>('initial');
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  // MFA State
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaHint, setMfaHint] = useState<PhoneMultiFactorInfo | null>(null);

  // Password Reset State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Erro', description: 'E-mail e senha são obrigatórios.' });
      return;
    }
    setIsProcessing(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/multi-factor-required') {
        const resolver = authError.resolver;
        const hint = resolver.hints[0] as PhoneMultiFactorInfo;
        setMfaResolver(resolver);
        setMfaHint(hint);
        
        try {
            if (!(window as any).recaptchaVerifier) {
              (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
            }
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            const verId = await phoneAuthProvider.verifyPhoneNumber({
                multiFactorHint: hint,
                session: resolver.session
            }, (window as any).recaptchaVerifier);
            setVerificationId(verId);
            setStep('mfa_verify');
            toast({ title: 'Verificação Necessária', description: 'Um código foi enviado para seu celular.' });
        } catch (smsError) {
            toast({ variant: 'destructive', title: 'Erro 2FA', description: 'Não foi possível iniciar a verificação de dois fatores.' });
        }
      } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
         toast({ variant: 'destructive', title: 'Erro de Login', description: 'Credenciais inválidas. Verifique seu e-mail e senha ou registre-se.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro de Login', description: authError.message });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaResolver || !verificationId || !verificationCode) return;
    setIsProcessing(true);
    try {
        const cred = PhoneMultiFactorGenerator.assertion(verificationId, verificationCode);
        await mfaResolver.resolveSignIn(cred);
        // Success, onAuthStateChanged will redirect.
    } catch(e) {
        toast({ variant: 'destructive', title: 'Código Inválido', description: 'O código inserido está incorreto.' });
    } finally {
        setIsProcessing(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleProcessing(true);
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
                title: 'Login Cancelado',
                description: 'A janela de login com o Google foi fechada antes da conclusão.',
            });
        } else {
            toast({ variant: 'destructive', title: 'Erro com Google', description: authError.message });
        }
    } finally {
        setIsGoogleProcessing(false);
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

  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({
            variant: 'destructive',
            title: 'E-mail Obrigatório',
            description: 'Por favor, insira o e-mail para o qual deseja redefinir a senha.',
        });
        return;
    }
    setIsProcessing(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: 'Verifique seu E-mail',
            description: 'Se uma conta com este e-mail existir, um link para redefinir a senha foi enviado.',
        });
        setIsResetPasswordOpen(false);
        setResetEmail('');
    } catch (error) {
        console.error("Password reset error:", error);
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Ocorreu uma falha ao tentar enviar o e-mail. Tente novamente mais tarde.',
        });
    } finally {
        setIsProcessing(false);
    }
  };


  if (isUserLoading || (user && !['complete_profile', 'mfa_verify'].includes(step))) {
    return <LoadingScreen />;
  }

  if(step === 'mfa_verify') {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="shadow-2xl border-none w-full max-w-md rounded-[2.5rem]">
          <CardHeader className="text-center p-10">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Segurança</CardTitle>
            <CardDescription className="font-bold">Um código foi enviado para o seu telefone terminando em {mfaHint?.phoneNumber.slice(-4)}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-10 pb-10">
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Código de Verificação</label>
                  <Input 
                    className="h-14 text-2xl text-center font-mono font-black border-2 rounded-2xl"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
              </div>
              <Button className="w-full h-16 text-xl font-black uppercase italic shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none" onClick={handleVerifyMfa} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                  Confirmar Identidade
              </Button>
          </CardContent>
           <CardFooter className="justify-center">
             <Button variant="link" className="text-xs font-bold uppercase tracking-widest opacity-50" onClick={() => setStep('initial')}>Cancelar Login</Button>
           </CardFooter>
        </Card>
        <div id="recaptcha-container" className="mt-4"></div>
      </div>
    )
  }

  if(step === 'complete_profile') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="shadow-2xl border-none w-full max-w-md rounded-[2.5rem]">
          <CardHeader className="text-center p-10">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Recrutamento</CardTitle>
            <CardDescription className="font-bold">Precisamos de mais algumas informações para ativar seu perfil operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-10 pb-10">
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Nome Completo</label>
                  <Input value={name} disabled className="bg-muted/30 h-12 font-bold" />
              </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary">Codinome (Username)</label>
                  <Input 
                    placeholder="Ex: operador_master" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 font-bold border-2"
                  />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary">WhatsApp Operacional</label>
                <div className="flex gap-2">
                    <Select defaultValue="+55">
                        <SelectTrigger className="w-[90px] h-12 border-2 font-bold">
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
                        className="h-12 font-bold border-2 flex-1"
                    />
                </div>
              </div>
              <Button className="w-full h-16 text-xl font-black uppercase italic shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none mt-4" onClick={handleCompleteGoogleRegistration} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Ativar Perfil"}
              </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        
        {/* Left Side - Marketing/Info (Hidden on small mobile) */}
        <div className="flex flex-col gap-8 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/30 rotate-3">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-headline font-black text-primary tracking-tighter italic uppercase">
              Aprova<span className="text-slate-900">Concursos</span>
            </h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-headline font-black text-slate-900 leading-tight uppercase italic">
              O Seu Treinador <span className="text-primary underline decoration-4 underline-offset-8">Científico</span> de Aprovação.
            </h2>
            <p className="text-lg md:text-xl text-slate-600 font-bold leading-relaxed max-w-xl mx-auto lg:mx-0">
              Transforme horas de estudo passivo em <span className="text-primary">missões táticas de alta retenção</span>. Design flexível para estudar no ônibus ou no escritório.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
            <div className="flex flex-col gap-2 p-5 bg-white rounded-3xl shadow-xl border-2 border-primary/5 group hover:border-primary/20 transition-all">
              <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <span className="font-black uppercase italic text-xs tracking-widest text-slate-400">Banco de Dados</span>
              <span className="font-black text-xl">+1000 Alvos</span>
            </div>
            <div className="flex flex-col gap-2 p-5 bg-white rounded-3xl shadow-xl border-2 border-primary/5 group hover:border-primary/20 transition-all">
              <div className="bg-accent/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="w-5 h-5 text-accent" />
              </div>
              <span className="font-black uppercase italic text-xs tracking-widest text-slate-400">Estratégia</span>
              <span className="font-black text-xl">100% Retenção</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Card */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-none rounded-[3rem] overflow-hidden">
          <div className="h-3 bg-primary" />
          <CardHeader className="text-center p-8 md:p-12 pb-6 md:pb-6">
            <CardTitle className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Acesso à Base</CardTitle>
            <CardDescription className="font-bold text-sm md:text-base">Inicie sua jornada rumo à elite dos aprovados.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-12 pt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Credencial de E-mail</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="operador@base.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 font-bold border-2 rounded-2xl bg-slate-50 focus-visible:ring-primary shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha Tática</Label>
                  <Button
                    variant="link"
                    type="button"
                    className="h-auto p-0 text-[10px] font-black text-primary uppercase tracking-widest opacity-60 hover:opacity-100"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetPasswordOpen(true);
                    }}
                  >
                    Esqueceu?
                  </Button>
                </div>
                <Input 
                  id="password"
                  type="password"
                  placeholder="******" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 font-bold border-2 rounded-2xl bg-slate-50 focus-visible:ring-primary shadow-inner"
                />
              </div>

              <Button className="w-full h-16 text-xl font-black uppercase italic shadow-[0_8px_0_0_#1e40af] active:translate-y-1 active:shadow-none transition-all gap-3 bg-primary hover:bg-primary/95" onClick={handleLogin} disabled={isProcessing || isGoogleProcessing}>
                {isProcessing && !isGoogleProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6" /> Entrar na Missão</>}
              </Button>

              <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2" />
                  </div>
                  <div className="relative flex justify-center text-xs font-black uppercase italic tracking-widest">
                      <span className="bg-white px-4 text-slate-400">Via Provedor</span>
                  </div>
              </div>

              <Button variant="outline" className="w-full h-16 text-base font-black uppercase italic border-2 border-slate-200 rounded-2xl gap-3 hover:bg-slate-50 transition-all" onClick={handleGoogleSignIn} disabled={isProcessing || isGoogleProcessing}>
                  {isGoogleProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <GoogleIcon />}
                  Conectar com Google
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4 p-8 md:p-12 pt-0">
            <p className="text-sm font-bold text-slate-500">
              Novo no front?{' '}
              <Link href="/register" className="font-black text-primary hover:underline underline-offset-4">
                CADASTRE-SE AGORA
              </Link>
            </p>
             <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-widest">
                  Protocolo v1.0.0-Beta | Criptografia Militar de Dados
                </p>
          </CardFooter>
        </Card>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="rounded-[2.5rem] border-4 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic">Recuperação de Acesso</DialogTitle>
            <DialogDescription className="font-bold">
              Insira o e-mail cadastrado para disparar o link de redefinição.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-2">
            <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest">E-mail Operacional</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="h-14 font-bold border-2 rounded-2xl"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResetPasswordOpen(false)} className="font-black uppercase">Abortar</Button>
            <Button onClick={handlePasswordReset} disabled={isProcessing} className="h-14 px-8 font-black uppercase italic shadow-[0_5px_0_0_#1e40af]">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar Protocolo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div id="recaptcha-container" className="fixed bottom-0 right-0"></div>
    </div>
  );
}
