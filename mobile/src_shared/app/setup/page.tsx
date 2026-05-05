"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SetupSchema } from './schema';
import { firebaseConfig as initialFirebaseConfig } from '@/firebase/config';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  ChevronRight, 
  Database, 
  Flame, 
  KeyRound, 
  Loader2, 
  Server, 
  Sparkles,
  XCircle,
  ShieldCheck,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Firebase Imports
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Step = 'welcome' | 'db-selection' | 'db-credentials' | 'finalize' | 'completed';

export default function SetupPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('welcome');
    const [isTesting, setIsTesting] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [adminCredentials, setAdminCredentials] = useState({ email: '', password: '' });
    
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
    } = useForm<any>({
        resolver: zodResolver(SetupSchema),
        mode: 'onChange',
        defaultValues: {
            type: 'firebase',
            firebase: {
                projectId: initialFirebaseConfig.projectId,
                apiKey: initialFirebaseConfig.apiKey,
                authDomain: initialFirebaseConfig.authDomain,
                appId: initialFirebaseConfig.appId,
                messagingSenderId: initialFirebaseConfig.messagingSenderId,
                storageBucket: initialFirebaseConfig.storageBucket,
                measurementId: initialFirebaseConfig.measurementId,
            }
        }
    });

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleCopyLine = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado", duration: 1000 });
    };

    const handleFinalizeSetup = async (data: any) => {
        setStep('finalize');
        setIsFinalizing(true);
        setProgress(5);
        setLogs([]);
        addLog("Iniciando pipeline de instalação tática...");

        const config = data.firebase;
        const tempAppName = `setup-${Date.now()}`;
        let app;

        try {
            app = initializeApp(config, tempAppName);
            const auth = getAuth(app);
            const firestore = getFirestore(app);

            // 1. Criar Auth
            addLog("Gerando credenciais de acesso administrador...");
            const adminEmail = `admin-${Math.random().toString(36).substring(2, 7)}@aprovaconcursos.com`;
            const adminPass = Math.random().toString(36).substring(2, 10);
            
            const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
            const uid = userCred.user.uid;
            addLog(`Autenticação criada: ${uid}`);
            setProgress(25);

            // 2. Criar Perfil (Firestore)
            addLog("Registrando perfil operacional no banco...");
            const profile: UserProfile = {
                id: uid,
                name: 'Operador Master',
                username: 'admin',
                email: adminEmail,
                role: 'admin',
                phone: '(21) 99999-9999',
                createdAt: Date.now(),
                updatedAt: serverTimestamp(),
                sessionStart: Date.now(),
                twoFactorEnabled: false,
                xp: 0,
                level: 1,
                studyStreak: 1,
                lastStudyDate: Date.now(),
                completedLessons: [],
            };

            const userRef = doc(firestore, 'users', uid);
            await setDoc(userRef, profile);
            addLog("Perfil sincronizado.");
            setProgress(45);

            // 3. Registrar Cargo Admin
            addLog("Elevando privilégios: Registrando permissão Admin...");
            const roleRef = doc(firestore, 'roles_admin', uid);
            await setDoc(roleRef, { 
                uid, 
                assignedAt: Date.now(),
                assignedBy: 'setup-wizard'
            });
            addLog("Privilégios Administrativos concedidos.");
            setProgress(65);

            // 4. Delay Tático para propagação de regras
            addLog("Aguardando sincronização do motor de permissões (1.5s)...");
            await new Promise(resolve => setTimeout(resolve, 1500));
            setProgress(75);

            // 5. Limpar e Semeiar
            addLog("Semeando matérias base do edital...");
            const subjects = [
                { name: 'GCM MARICÁ' },
                { name: 'Língua Portuguesa' },
                { name: 'Raciocínio Lógico' },
                { name: 'Direito Administrativo' },
                { name: 'Legislação Maricá' }
            ];

            const subBatch = writeBatch(firestore);
            for (const s of subjects) {
                const newSubRef = doc(collection(firestore, 'subjects'));
                subBatch.set(newSubRef, { ...s, id: newSubRef.id, createdAt: Date.now(), updatedAt: serverTimestamp() });
            }
            await subBatch.commit();
            addLog("Dados essenciais populados.");

            setAdminCredentials({ email: adminEmail, password: adminPass });
            addLog("Configuração concluída com sucesso!");
            setProgress(100);
            setIsFinalizing(false);

        } catch (e: any) {
            addLog(`ERRO NO PIPELINE: ${e.message}`);
            setIsFinalizing(false);
            setProgress(100);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 'welcome':
                return (
                    <Card className="animate-in fade-in-50 zoom-in-95 duration-500">
                        <CardHeader className="items-center text-center p-8">
                           <div className="p-4 bg-primary/10 rounded-full mb-4">
                             <Sparkles className="w-10 h-10 text-primary" />
                           </div>
                            <CardTitle className="text-3xl font-black">Central de Instalação</CardTitle>
                            <CardDescription className="max-w-md">Bem-vindo à plataforma AprovaConcursos.</CardDescription>
                        </CardHeader>
                        <CardFooter className="p-8">
                            <Button className="w-full h-12 text-lg font-bold" onClick={() => setStep('db-selection')}>
                                INICIAR SETUP <ChevronRight className="ml-2 w-5 h-5" />
                            </Button>
                        </CardFooter>
                    </Card>
                );
            case 'db-selection':
                return (
                     <Card className="animate-in fade-in-50 zoom-in-95 duration-500">
                        <CardHeader className="p-8">
                           <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-black text-sm">1</div>
                            <CardTitle className="text-2xl font-black uppercase italic">Motor de Dados</CardTitle>
                           </div>
                            <CardDescription>Infraestrutura de armazenamento.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <button onClick={() => setStep('db-credentials')} className="group text-left w-full">
                                <Card className="hover:border-primary transition-all duration-300">
                                    <CardHeader className="items-center text-center p-6">
                                        <Flame className="w-10 h-10 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                                        <h3 className="font-bold text-lg">Firebase</h3>
                                        <Badge className="mt-4 bg-primary">NATIVO</Badge>
                                    </CardHeader>
                                </Card>
                            </button>
                        </CardContent>
                    </Card>
                );
            case 'db-credentials':
                return (
                    <form onSubmit={handleSubmit(handleFinalizeSetup)}>
                        <Card className="animate-in fade-in-50 zoom-in-95 duration-500">
                            <CardHeader className="p-8">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-black text-sm">2</div>
                                  <CardTitle className="text-2xl font-black uppercase italic">Credenciais Ativas</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Project ID</Label>
                                    <Input {...register('firebase.projectId')} className="font-mono text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Web API Key</Label>
                                    <Input type="password" {...register('firebase.apiKey')} className="font-mono text-sm" />
                                </div>
                            </CardContent>
                             <CardFooter className="p-8">
                                <Button type="submit" className="w-full h-14 font-black shadow-[0_4px_0_0_#1e40af]" disabled={isFinalizing}>
                                    {isFinalizing ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                    INSTALAR AGORA
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                );
            case 'finalize':
                return (
                    <Card className="w-full max-w-2xl animate-in fade-in-50 zoom-in-95 duration-500 border-2 border-primary/20">
                         <CardHeader className="p-8 bg-primary/5 border-b">
                            <CardTitle className="text-2xl font-black uppercase italic">Pipeline Operacional</CardTitle>
                         </CardHeader>
                         <CardContent className="p-8 space-y-6">
                            <Progress value={progress} className="w-full h-2" />
                            <div className="w-full h-64 bg-slate-950 text-white font-mono text-[10px] rounded-2xl p-6 overflow-y-auto shadow-2xl">
                                {logs.map((log, i) => (
                                    <p 
                                      key={i} 
                                      className={cn(
                                        "mb-1 group cursor-pointer hover:bg-white/5 rounded px-1 transition-colors", 
                                        log.includes("ERRO") ? "text-red-400 font-bold" : "text-emerald-400"
                                      )}
                                      onClick={() => handleCopyLine(log)}
                                    >
                                      <span className="opacity-30">root@aprovaconcursos:~#</span> {log}
                                      <Copy className="inline-block ml-2 w-2 h-2 opacity-0 group-hover:opacity-40" />
                                    </p>
                                ))}
                                {isFinalizing && <div className="w-2 h-3 bg-emerald-400 animate-pulse inline-block align-middle" />}
                            </div>

                            { progress === 100 && !logs.some(l => l.includes("ERRO")) && (
                                 <Alert className="bg-emerald-50 border-emerald-500 border-2 text-emerald-800 rounded-2xl p-6 cursor-pointer" onClick={() => handleCopyLine(`USER: ${adminCredentials.email} | PASS: ${adminCredentials.password}`)}>
                                    <CheckCircle2 className="h-6 w-6 !text-emerald-800" />
                                    <AlertTitle className="font-black text-xl uppercase italic">Sistema Operacional!</AlertTitle>
                                    <AlertDescription className="mt-4 space-y-4">
                                        <p className="font-bold text-sm">Dados do Administrador (Clique no alerta para copiar):</p>
                                        <div className="bg-white/60 p-4 rounded-xl font-mono text-xs border border-emerald-200">
                                            <p className="flex justify-between"><strong>EMAIL:</strong> <span>{adminCredentials.email}</span></p>
                                            <p className="flex justify-between mt-1"><strong>SENHA:</strong> <span>{adminCredentials.password}</span></p>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                         </CardContent>
                         <CardFooter className="p-8 pt-0">
                             <Button
                                className="w-full h-14 text-lg font-black uppercase shadow-[0_6px_0_0_#1e40af]"
                                disabled={progress < 100 || isFinalizing}
                                onClick={() => router.push('/')}
                            >
                                ACESSAR PLATAFORMA
                            </Button>
                         </CardFooter>
                    </Card>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl">{renderStep()}</div>
        </div>
    );
}
