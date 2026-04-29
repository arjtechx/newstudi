"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useAuth, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  updateEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  multiFactor,
  PhoneMultiFactorGenerator
} from 'firebase/auth';
import { getToken } from 'firebase/messaging';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  KeyRound, 
  Save, 
  Camera,
  AtSign,
  ShieldCheck,
  Loader2,
  Bell,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const formatPhoneNumber = (value: string) => {
    if (!value) return ""
    value = value.replace(/\D/g,'')
    value = value.replace(/(\d{2})(\d)/,"($1) $2")
    value = value.replace(/(\d)(\d{4})$/,"$1-$2")
    return value
}

const toE164 = (phone: string, countryCode = '+55') => {
  return `${countryCode}${phone.replace(/\D/g, '')}`;
}

export default function StudentProfilePage() {
  const { user } = useUser();
  const { messaging, isMessagingSupported } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    photoUrl: user?.photoUrl || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isPushProcessing, setIsPushProcessing] = useState(false);

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.twoFactorEnabled || false);
  const [is2FAProcessing, setIs2FAProcessing] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        photoUrl: user.photoUrl || '',
      }));
      setIs2FAEnabled(user.twoFactorEnabled || false);
    }
  }, [user]);

  useEffect(() => {
    if (!auth || (window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': () => {}
    });
  }, [auth]);

  const handleRequestPushPermission = async () => {
    if (!isMessagingSupported) {
       toast({ variant: 'destructive', title: "Não Suportado", description: "Este navegador ou dispositivo não suporta notificações nativas." });
       return;
    }

    if (!messaging || !user) {
       toast({ variant: 'destructive', title: "Motor Offline", description: "O serviço de mensagens está sendo inicializado. Aguarde 3 segundos." });
       return;
    }

    setIsPushProcessing(true);
    try {
      // Tenta registrar o Service Worker manualmente primeiro
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // ATENÇÃO: Substitua pelo VAPID Key gerado no console do seu Firebase
        const token = await getToken(messaging, { 
          serviceWorkerRegistration: registration,
          vapidKey: 'BGE3Y_X_YOUR_PUBLIC_VAPID_KEY_HERE' 
        });
        
        if (token) {
          const userDocRef = doc(firestore, 'users', user.id);
          setDocumentNonBlocking(userDocRef, { fcmToken: token }, { merge: true });
          toast({ title: "Protocolo Ativado", description: "Dispositivo sincronizado com a base central." });
        } else {
          throw new Error("Token não gerado.");
        }
      } else {
        toast({ variant: 'destructive', title: "Acesso Negado", description: "Permissão de notificação bloqueada pelo usuário." });
      }
    } catch (error: any) {
      console.error("FCM Error:", error);
      toast({ 
        variant: 'destructive', 
        title: "Erro de Sincronização", 
        description: "Falha ao registrar link. Certifique-se de estar usando HTTPS ou Localhost." 
      });
    } finally {
      setIsPushProcessing(false);
    }
  };

  const handleSaveData = async () => {
    if (!user || !auth.currentUser) return;
    setIsSaving(true);
    
    try {
        if (formData.email && formData.email !== user.email) {
            await updateEmail(auth.currentUser, formData.email);
            toast({ title: "E-mail Atualizado" });
        }

        const userDocRef = doc(firestore, 'users', user.id);
        const dataToUpdate = {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          photoUrl: formData.photoUrl,
        };

        setDocumentNonBlocking(userDocRef, dataToUpdate, { merge: true });
        toast({ title: "Perfil Sincronizado" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro de Gravação', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, photoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handle2FAToggle = async (checked: boolean) => {
    if (!auth.currentUser || !user) return;
    setIs2FAProcessing(true);

    if (checked) {
      if (!formData.phone) {
        toast({ variant: 'destructive', title: 'Contato Ausente', description: 'Cadastre seu WhatsApp antes de ativar o 2FA.' });
        setIs2FAProcessing(false);
        return;
      }
      try {
        const recaptchaVerifier = (window as any).recaptchaVerifier;
        const multiFactorSession = await multiFactor(auth.currentUser).getSession();
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const verId = await phoneAuthProvider.verifyPhoneNumber({ phoneNumber: toE164(formData.phone), session: multiFactorSession }, recaptchaVerifier);
        setVerificationId(verId);
        setIsVerificationDialogOpen(true);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Falha no SMS' });
      }
    } else {
      try {
        const multiFactorUser = multiFactor(auth.currentUser);
        const phoneFactor = multiFactorUser.enrolledFactors.find(f => f.factorId === 'phone');
        if (phoneFactor) {
          await multiFactorUser.unenroll(phoneFactor);
          setIs2FAEnabled(false);
          setDocumentNonBlocking(doc(firestore, 'users', user.id), { twoFactorEnabled: false }, { merge: true });
          toast({ title: '2FA Desativado' });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro na Desativação' });
      }
    }
    setIs2FAProcessing(false);
  };

  const handleVerifyCode = async () => {
    if (!verificationId || !verificationCode || !auth.currentUser || !user) return;
    setIs2FAProcessing(true);
    try {
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(verificationId, verificationCode);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion);
      setIs2FAEnabled(true);
      setDocumentNonBlocking(doc(firestore, 'users', user.id), { twoFactorEnabled: true }, { merge: true });
      setIsVerificationDialogOpen(false);
      setVerificationCode('');
      toast({ title: 'Segurança Máxima Ativada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Código Inválido' });
    } finally {
      setIs2FAProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-primary">
            <User className="w-8 h-8" /> Meu Perfil
          </h1>
          <p className="text-muted-foreground font-medium">Gestão de identidade e segurança tática.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="material-card border-2 overflow-hidden shadow-xl">
            <div className="h-2 bg-primary" />
            <CardHeader className="flex flex-row items-center gap-6 pb-2">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                  <AvatarImage src={formData.photoUrl} />
                  <AvatarFallback className="text-2xl font-black">{formData.name?.substring(0, 1)}</AvatarFallback>
                </Avatar>
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black italic uppercase">Seus Dados</CardTitle>
                <CardDescription>Informações operacionais do recruta.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-10 h-12 font-bold bg-muted/20" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                </div>
                 <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Codinome</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-10 h-12 font-bold bg-muted/20" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">E-mail</Label>
                    <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-10 h-12 font-bold bg-muted/20" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp</Label>
                  <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="tel" className="pl-10 h-12 font-bold bg-muted/20" placeholder="(21) 99999-9999" value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})} maxLength={15} />
                      </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-6">
              <Button className="w-full h-14 text-lg font-black gap-2 shadow-[0_5px_0_0_#1e40af] active:translate-y-1 transition-all" onClick={handleSaveData} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> SALVAR ALTERAÇÕES</>}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card className={cn("material-card border-2 overflow-hidden shadow-lg", isMessagingSupported ? "border-primary/20 bg-primary/5" : "border-amber-200 bg-amber-50")}>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 italic uppercase">
                <Bell className="w-5 h-5 text-primary" /> Notificações Push
              </CardTitle>
              <CardDescription className="text-xs">Alertas nativos no sistema operacional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isMessagingSupported ? (
                <div className="p-4 bg-amber-100 rounded-xl flex gap-3 text-amber-900 border border-amber-200">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <p className="text-[10px] font-bold uppercase leading-tight">Este navegador não suporta notificações nativas. Use Safari no iOS (Add to Home Screen) ou Chrome no Android/Desktop.</p>
                </div>
              ) : (
                <div className="p-5 bg-white rounded-2xl border-2 space-y-4 shadow-inner">
                   <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status do Link</p>
                         <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", user.fcmToken ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                            <span className="text-xs font-bold uppercase">{user.fcmToken ? 'CONECTADO' : 'PENDENTE'}</span>
                         </div>
                      </div>
                      {user.fcmToken && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                   </div>
                   
                   <Button variant="outline" className="w-full font-black text-[10px] border-primary text-primary h-12 uppercase gap-2 hover:bg-primary hover:text-white transition-colors" onClick={handleRequestPushPermission} disabled={isPushProcessing}>
                      {isPushProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                      {user.fcmToken ? 'RENOVAR CONEXÃO' : 'SINCRONIZAR DISPOSITIVO'}
                   </Button>
                   
                   <p className="text-[9px] text-center text-muted-foreground italic leading-tight">
                     * Compatível com iOS (Safari 16.4+), Android e Desktop via Web Push.
                   </p>
                </div>
              )}
            </CardContent>
          </Card>

           <Card className="material-card border-2 overflow-hidden shadow-lg">
            <div className="h-2 bg-orange-500" />
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 italic uppercase">
                <KeyRound className="w-5 h-5 text-orange-500" /> Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2">
                <div className="space-y-0.5">
                  <Label className="font-black text-sm uppercase">2FA ATIVO</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">Proteção via Token SMS.</p>
                </div>
                 <div className="flex items-center gap-2">
                  {is2FAProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Switch checked={is2FAEnabled} onCheckedChange={handle2FAToggle} disabled={is2FAProcessing} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div id="recaptcha-container"></div>
      
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-4 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic">Verificação de Segurança</DialogTitle>
            <DialogDescription className="font-bold">Insira o código de 6 dígitos enviado para seu WhatsApp/SMS.</DialogDescription>
          </DialogHeader>
          <div className="py-4"><Input placeholder="000 000" className="h-14 text-2xl text-center font-mono font-black border-2" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} /></div>
          <DialogFooter><Button onClick={handleVerifyCode} className="h-14 w-full font-black uppercase italic shadow-[0_5px_0_0_#1e40af]">AUTENTICAR</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
