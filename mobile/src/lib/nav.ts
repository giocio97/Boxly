import { router } from 'expo-router';

/** Torna indietro se possibile, altrimenti apre la lista scatole. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
