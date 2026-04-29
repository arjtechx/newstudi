'use server';

import { z } from 'zod';
import { SetupSchema } from './schema';

export type TSetupPayload = z.infer<typeof SetupSchema>;
export type TActionResponse = { success: boolean, message: string };

/**
 * Apenas valida a estrutura dos dados no servidor.
 * A lógica real do Firebase foi movida para o cliente para garantir
 * que os tokens de autenticação sejam enviados corretamente para o Firestore.
 */
export async function testDatabaseConnection(data: TSetupPayload): Promise<TActionResponse> {
    const validation = SetupSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: "Dados de entrada inválidos." };
    }
    return { success: true, message: "Estrutura de dados validada. Prossiga com a instalação no cliente." };
}
