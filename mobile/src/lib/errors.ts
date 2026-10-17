import type { RpcErrorCode } from '@shared/types';

import i18n from '@/i18n';

const RPC_CODES: RpcErrorCode[] = [
  'not_owner',
  'forbidden',
  'user_not_found',
  'cannot_share_with_self',
  'invalid_role',
  'invalid_type',
];

type MaybeError = { message?: string; code?: string } | null | undefined;

/** Converte un errore Supabase in un messaggio nella lingua attiva, con tono da BRAND.md. */
export function errorMessage(error: MaybeError | unknown, fallback?: string): string {
  const t = i18n.t.bind(i18n);
  const e = error as MaybeError;
  const msg = (e?.message ?? '').trim();
  if ((RPC_CODES as string[]).includes(msg)) return t(`errors.rpc.${msg}`);
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return t('errors.invalidCredentials');
  if (lower.includes('user already registered') || lower.includes('already been registered'))
    return t('errors.alreadyRegistered');
  if (lower.includes('password should be at least') || lower.includes('weak password')) return t('errors.weakPassword');
  if (
    lower.includes('unable to validate email') ||
    lower.includes('invalid email') ||
    (lower.includes('email address') && lower.includes('invalid'))
  )
    return t('errors.invalidEmail');
  if (lower.includes('network request failed') || lower.includes('failed to fetch')) return t('errors.network');
  if (lower.includes('row-level security') || e?.code === '42501') return t('errors.permission');
  return fallback ?? t('errors.generic');
}
