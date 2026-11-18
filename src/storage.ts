// Stockage : les secrets (jeton de connexion) vont dans le coffre du système
// (Gestionnaire d'identifiants Windows / Trousseau iOS). Le reste (thème,
// adresse du serveur, dernier agent choisi) va dans localStorage.
import { Capacitor } from '@capacitor/core';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const isNative = Capacitor.isNativePlatform();
export const platform: 'windows' | 'ios' | 'web' = isTauri ? 'windows' : isNative ? 'ios' : 'web';

export async function secretGet(key: string): Promise<string | null> {
  try {
    if (isTauri) {
      const { invoke } = await import('@tauri-apps/api/core');
      return (await invoke<string | null>('secret_get', { key })) ?? null;
    }
    if (isNative) {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
      const v = await SecureStorage.get(key);
      return typeof v === 'string' ? v : null;
    }
  } catch (e) {
    console.warn('coffre indisponible', e);
  }
  return localStorage.getItem('secret:' + key);
}

export async function secretSet(key: string, value: string | null): Promise<void> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    if (value === null) await invoke('secret_delete', { key });
    else await invoke('secret_set', { key, value });
    return;
  }
  if (isNative) {
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
    if (value === null) await SecureStorage.remove(key);
    else await SecureStorage.set(key, value);
    return;
  }
  if (value === null) localStorage.removeItem('secret:' + key);
  else localStorage.setItem('secret:' + key, value);
}

export type Theme = 'horde' | 'alliance';

export interface Prefs {
  server: string;
  theme: Theme;
  model: string;
  webSearch: boolean;
  showThinking: boolean;
  sendOnEnter: boolean;
}

const DEFAULTS: Prefs = {
  server: 'https://thrall-ia.duckdns.org',
  theme: 'horde',
  model: '',
  webSearch: false,
  showThinking: true,
  sendOnEnter: platform !== 'ios',
};

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('prefs') || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem('prefs', JSON.stringify(p));
  } catch {
    /* rien */
  }
}
