import { z } from 'zod';

const FirebaseSchema = z.object({
    projectId: z.string().min(1, "O ID do Projeto Firebase é obrigatório."),
    apiKey: z.string().min(1, "A Chave de API é obrigatória."),
    authDomain: z.string().min(1, "O Domínio de Autenticação é obrigatório."),
    appId: z.string().min(1, "O App ID é obrigatório."),
    messagingSenderId: z.string().min(1, "O Messaging Sender ID é obrigatório."),
    storageBucket: z.string().optional(),
    measurementId: z.string().optional(),
});

const MysqlSchema = z.object({
    host: z.string().min(1, "Host é obrigatório."),
    user: z.string().min(1, "Usuário é obrigatório."),
    password: z.string().optional(),
    database: z.string().min(1, "Database é obrigatório."),
});

export const SetupSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('firebase'), firebase: FirebaseSchema }),
    z.object({ type: z.literal('mysql'), mysql: MysqlSchema }),
]);
