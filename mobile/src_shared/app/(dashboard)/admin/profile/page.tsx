"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  updateEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  multiFactor,
  PhoneMultiFactorGenerator
} from 'firebase/auth';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  KeyRound, 
  Save, 
  Smartphone,
  ShieldAlert,
  Fingerprint,
  Camera,
  Clock,
  Zap,
  Activity,
  AtSign,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


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

export default function AdminProfilePage() {
  const { user, isUserLoading } = useUser();
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
  const [sessionTime, setSessionTime] = useState('00:00:00');
  
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
    if (!user?.sessionStart) return;

    const interval = setInterval(() => {
      const diff = Date.now() - (user.sessionStart || Date.now());
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setSessionTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.sessionStart]);

  useEffect(() => {
    if (!auth || (window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': () => {}
    });
  }, [auth]);


  const handleSaveData = async () => {
    if (!user || !auth.currentUser) return;
    setIsSaving(true);
    
    try {
        if (formData.email && formData.email !== user.email) {
            await updateEmail(auth.currentUser, formData.email);
            toast({ title: "E-mail de autenticação atualizado", description: "Seu e-mail de login foi alterado." });
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

        toast({ title: "Perfil Atualizado", description: "Suas informações operacionais foram salvas." });

    } catch (error: any) {
        let description = 'Ocorreu um erro inesperado.';
        if (error.code === 'auth/requires-recent-login') {
            description = 'Esta é uma operação sensível. Por favor, faça login novamente para confirmar a alteração do e-mail.';
        } else if (error.code === 'auth/email-already-in-use') {
            description = 'Este e-mail já está sendo utilizado por outra conta.';
        } else if (error.code === 'auth/invalid-email') {
            description = 'O formato do e-mail é inválido.';
        }
        toast({ variant: 'destructive', title: 'Erro ao Atualizar Perfil', description });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({ ...prev, photoUrl: base64 }));
        toast({ title: "Preview Carregado", description: "Clique em Salvar para confirmar a nova foto." });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({ variant: 'destructive', title: "Erro na Senha", description: "As senhas não coincidem." });
      return;
    }
    toast({ title: "Função Desativada", description: "A troca de senha deve ser feita via provedor de autenticação." });
    setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
  };

   const handle2FAToggle = async (checked: boolean) => {
    if (!auth.currentUser || !user) return;
    setIs2FAProcessing(true);

    if (checked) {
      if (!formData.phone) {
        toast({ variant: 'destructive', title: 'Telefone Necessário', description: 'Você precisa cadastrar um telefone para ativar a autenticação de 2 fatores.' });
        setIs2FAProcessing(false);
        return;
      }
      try {
        const recaptchaVerifier = (window as any).recaptchaVerifier;
        const multiFactorSession = await multiFactor(auth.currentUser).getSession();
        const phoneInfoOptions = {
          phoneNumber: toE164(formData.phone),
          session: multiFactorSession
        };
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const verId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
        setVerificationId(verId);
        setIsVerificationDialogOpen(true);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao Enviar SMS', description: 'Não foi possível enviar o código. Tente novamente ou verifique o número de telefone.' });
      }
    } else {
      try {
        const multiFactorUser = multiFactor(auth.currentUser);
        const phoneFactor = multiFactorUser.enrolledFactors.find(f => f.factorId === 'phone');
        if (phoneFactor) {
          await multiFactorUser.unenroll(phoneFactor);
          setIs2FAEnabled(false);
          const userDocRef = doc(firestore, 'users', user.id);
          setDocumentNonBlocking(userDocRef, { twoFactorEnabled: false }, { merge: true });
          toast({ title: '2FA Desativado', description: 'A autenticação de dois fatores foi desativada.' });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao Desativar', description: 'Não foi possível desativar a autenticação de 2 fatores.' });
      }
    }
    setIs2FAProcessing(false);
  };

  const handleVerifyCode = async () => {
    if (!verificationId || !verificationCode || !auth.currentUser) return;
    setIs2FAProcessing(true);

    try {
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(verificationId, verificationCode);
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion);
      
      setIs2FAEnabled(true);
      const userDocRef = doc(firestore, 'users', user.id);
      setDocumentNonBlocking(userDocRef, { twoFactorEnabled: true }, { merge: true });
      
      setIsVerificationDialogOpen(false);
      setVerificationCode('');
      setVerificationId(null);
      toast({ title: 'Sucesso!', description: 'Autenticação de dois fatores ativada com segurança.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Código Inválido', description: 'O código inserido está incorreto. Tente novamente.' });
    } finally {
      setIs2FAProcessing(false);
    }
  };


  if (isUserLoading || !user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-primary" /> Perfil do Administrador
          </h1>
          <p className="text-muted-foreground font-medium">Gestão de identidade, segurança e métricas de conexão.</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="h-10 bg-primary/5 border-primary/20 text-primary font-black px-4 flex gap-2 items-center">
            <Activity className="w-4 h-4 animate-pulse" /> SESSÃO ATIVA: {sessionTime}
          </Badge>
          <Badge variant="outline" className="h-10 border-primary text-primary font-black uppercase tracking-widest px-4">
            STATUS: {user.role?.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="material-card border-2 overflow-hidden">
            <div className="h-2 bg-primary" />
            <CardHeader className="flex flex-row items-center gap-6 pb-2">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                  <AvatarImage src={formData.photoUrl} />
                  <AvatarFallback className="text-2xl font-black">{formData.name?.substring(0, 1)}</AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black italic uppercase">Identidade Operacional</CardTitle>
                <CardDescription>Mantenha seus dados e foto sempre atualizados.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 h-12 font-bold bg-muted/20" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome de Usuário</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 h-12 font-bold bg-muted/20" 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">E-mail Administrativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 h-12 font-bold bg-muted/20" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                 <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Telefone Operacional</Label>
                  <div className="flex gap-2 items-center">
                      <Select defaultValue="+55">
                          <SelectTrigger className="w-[90px] h-12 bg-muted/20">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="+55">+55</SelectItem>
                          </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="tel"
                          className="pl-10 h-12 font-bold bg-muted/20" 
                          placeholder="(21) 99999-9999"
                          value={formData.phone}
                          onChange={e => {
                              const formatted = formatPhoneNumber(e.target.value);
                              if (formatted.length <= 15) {
                                  setFormData({...formData, phone: formatted})
                              }
                          }}
                          maxLength={15}
                        />
                      </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Foto URL (Alternativo)</Label>
                <Input 
                  className="h-10 text-[10px] font-mono" 
                  placeholder="https://..."
                  value={formData.photoUrl}
                  onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-6">
              <Button className="w-full h-14 text-lg font-black gap-2 shadow-[0_5px_0_0_#1e40af] active:translate-y-1 active:shadow-none" onClick={handleSaveData} disabled={isSaving}>
                {isSaving ? "SINCRONIZANDO..." : <><Save className="w-5 h-5" /> SALVAR ALTERAÇÕES TÁTICAS</>}
              </Button>
            </CardFooter>
          </Card>

          <Card className="material-card border-2 overflow-hidden">
            <div className="h-2 bg-orange-500" />
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 italic uppercase">
                <KeyRound className="w-5 h-5 text-orange-500" /> Segurança de Acesso
              </CardTitle>
              <CardDescription>Troca obrigatória recomendada a cada 90 dias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Senha Atual</Label>
                <Input 
                  type="password" 
                  className="h-12 font-mono bg-muted/20" 
                  value={formData.currentPassword}
                  onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nova Senha</Label>
                  <Input 
                    type="password" 
                    className="h-12 font-mono bg-muted/20" 
                    value={formData.newPassword}
                    onChange={e => setFormData({...formData, newPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Confirmar Nova Senha</Label>
                  <Input 
                    type="password" 
                    className="h-12 font-mono bg-muted/20" 
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-6">
              <Button variant="outline" className="w-full h-12 font-black border-orange-500 text-orange-600 hover:bg-orange-50" onClick={handleChangePassword}>
                ATUALIZAR CREDENCIAL DE ACESSO
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="material-card border-emerald-500/20 bg-emerald-50/50 border-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 italic uppercase">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Protocolos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2">
                <div className="space-y-0.5">
                  <Label className="font-black text-sm uppercase">2FA ATIVO</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">Proteção via Token SMS/App.</p>
                </div>
                <div className="flex items-center gap-2">
                  {is2FAProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Switch 
                    checked={is2FAEnabled} 
                    onCheckedChange={handle2FAToggle} 
                    disabled={is2FAProcessing}
                  />
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border-2 space-y-4 shadow-inner">
                 <div className="flex items-center gap-2 text-primary">
                   <Zap className="w-5 h-5" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Métricas da Sessão</span>
                 </div>
                 <div className="space-y-3">
                   <MetricItem label="Operando há" value={sessionTime} />
                   <MetricItem label="Login em" value={user.sessionStart ? new Date(user.sessionStart).toLocaleTimeString() : '--:--'} />
                   <MetricItem label="IP Mapeado" value="172.16.0.42" />
                 </div>
              </div>

              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex gap-3 shadow-sm">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-800 font-bold italic leading-relaxed">
                  Aviso: Sua conta possui privilégios de exclusão irreversível. Mantenha o tempo de sessão monitorado.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full text-destructive font-black uppercase text-[10px] gap-2 hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/20 h-12 rounded-2xl">
            <ShieldAlert className="w-4 h-4" /> Revogar Acesso Master
          </Button>
        </div>
      </div>

      <div id="recaptcha-container"></div>
      
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificação de 2 Fatores</DialogTitle>
            <DialogDescription>
              Um código de verificação foi enviado para o seu telefone. Insira-o abaixo para concluir a ativação.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Código de 6 dígitos"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerificationDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleVerifyCode} disabled={is2FAProcessing}>
              {is2FAProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verificar e Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center text-[10px] border-b border-dashed border-muted pb-1 last:border-0 last:pb-0">
      <span className="font-black text-muted-foreground uppercase tracking-tighter">{label}</span>
      <span className="font-mono font-bold text-primary">{value}</span>
    </div>
  );
}
