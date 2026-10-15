import type { RpcErrorCode } from '@shared/types';

const rpcMessages: Record<RpcErrorCode, string> = {
  not_owner: 'Solo il proprietario della scatola può farlo.',
  forbidden: 'Non hai i permessi per modificare una delle due scatole.',
  user_not_found: 'Nessun utente Boxly con questa email. Controlla e riprova.',
  cannot_share_with_self: 'Questa scatola è già tua: non serve condividerla con te.',
  invalid_role: 'Scegli se può solo guardare o anche modificare.',
};

type MaybeError = { message?: string; code?: string } | null | undefined;

/** Converte un errore Supabase in un messaggio in italiano, con tono da BRAND.md. */
export function errorMessage(error: MaybeError | unknown, fallback = 'Qualcosa è andato storto. Riprova.'): string {
  const e = error as MaybeError;
  const msg = (e?.message ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(rpcMessages, msg)) return rpcMessages[msg as RpcErrorCode];
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Email o password non corretti.';
  if (lower.includes('user already registered') || lower.includes('already been registered'))
    return 'Esiste già un account con questa email. Prova ad accedere.';
  if (lower.includes('password should be at least') || lower.includes('weak password'))
    return 'La password deve avere almeno 6 caratteri.';
  if (lower.includes('unable to validate email') || lower.includes('invalid email') || lower.includes('email address') && lower.includes('invalid'))
    return 'Controlla l’indirizzo email.';
  if (lower.includes('network request failed') || lower.includes('failed to fetch'))
    return 'Non riesco a collegarmi. Controlla la connessione e riprova.';
  if (lower.includes('row-level security') || e?.code === '42501')
    return 'Non hai i permessi per farlo.';
  return fallback;
}
