import type { RpcErrorCode } from '@shared/types';

import { errorMessage } from '@/lib/errors';

const ALL_CODES: RpcErrorCode[] = ['not_owner', 'forbidden', 'user_not_found', 'cannot_share_with_self', 'invalid_role'];

describe('errorMessage: mapping errori RPC → italiano', () => {
  it.each(ALL_CODES)('%s ha un messaggio dedicato, non tecnico', (code) => {
    const msg = errorMessage({ message: code });
    expect(msg).not.toBe('Qualcosa è andato storto. Riprova.');
    expect(msg).not.toContain(code);
    expect(msg.length).toBeGreaterThan(10);
  });

  it('tutti i codici hanno messaggi diversi', () => {
    const msgs = new Set(ALL_CODES.map((c) => errorMessage({ message: c })));
    expect(msgs.size).toBe(ALL_CODES.length);
  });

  it('user_not_found invita a controllare l’email', () => {
    expect(errorMessage({ message: 'user_not_found' })).toMatch(/email/i);
  });

  it('tollera spazi attorno al codice', () => {
    expect(errorMessage({ message: ' not_owner ' })).toBe(errorMessage({ message: 'not_owner' }));
  });

  it('login errato', () => {
    expect(errorMessage({ message: 'Invalid login credentials' })).toBe('Email o password non corretti.');
  });

  it('utente già registrato', () => {
    expect(errorMessage({ message: 'User already registered' })).toMatch(/Esiste già/);
  });

  it('password debole', () => {
    expect(errorMessage({ message: 'Password should be at least 6 characters.' })).toMatch(/almeno 6/);
  });

  it('email non valida', () => {
    expect(errorMessage({ message: 'Unable to validate email address: invalid format' })).toMatch(/email/i);
  });

  it('rete', () => {
    expect(errorMessage(new TypeError('Network request failed'))).toMatch(/connessione/);
  });

  it('RLS (42501)', () => {
    expect(errorMessage({ message: 'new row violates row-level security policy for table "items"' })).toMatch(/permessi/);
    expect(errorMessage({ message: 'x', code: '42501' })).toMatch(/permessi/);
  });

  it('fallback generico e personalizzato', () => {
    expect(errorMessage({ message: 'boom' })).toBe('Qualcosa è andato storto. Riprova.');
    expect(errorMessage(null, 'Riprova più tardi.')).toBe('Riprova più tardi.');
    expect(errorMessage(undefined)).toBe('Qualcosa è andato storto. Riprova.');
    expect(errorMessage('stringa')).toBe('Qualcosa è andato storto. Riprova.');
  });

  it('non mappa codici sconosciuti né chiavi del prototype', () => {
    expect(errorMessage({ message: 'toString' })).toBe('Qualcosa è andato storto. Riprova.');
    expect(errorMessage({ message: 'constructor' })).toBe('Qualcosa è andato storto. Riprova.');
  });
});
