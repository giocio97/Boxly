import { canEdit, eventLabel, formatDateTime, roleLabel, SEASONS, seasonLabel, shareRoleLabel } from '@/lib/labels';

describe('labels', () => {
  it('SEASONS segue il contratto', () => {
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter', 'all']);
    SEASONS.forEach((s) => expect(seasonLabel[s]).toBeTruthy());
  });

  it('canEdit: solo owner ed editor', () => {
    expect(canEdit('owner')).toBe(true);
    expect(canEdit('editor')).toBe(true);
    expect(canEdit('viewer')).toBe(false);
    expect(canEdit(null)).toBe(false);
    expect(canEdit(undefined)).toBe(false);
  });

  it('etichette ruoli ed eventi in italiano', () => {
    expect(roleLabel.viewer).toBe('Solo lettura');
    expect(shareRoleLabel.editor).toBe(roleLabel.editor);
    expect(Object.keys(eventLabel).sort()).toEqual(['added', 'moved', 'removed', 'updated']);
  });

  it('formatDateTime dd/mm/yyyy hh:mm', () => {
    const d = new Date(2025, 0, 5, 9, 7);
    expect(formatDateTime(d.toISOString())).toBe('05/01/2025 09:07');
  });
});
