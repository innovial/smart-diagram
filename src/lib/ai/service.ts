import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { AiSettings, AiGenerateRequest, AiGenerateResult } from './types';
import {
  getAntigravityAuthUrl,
  exchangeAntigravityCode,
  generateWithAntigravity,
  ANTIGRAVITY_CALLBACK_PORT
} from './antigravity';
import {
  DEFAULT_ROUTER9_URL,
  generateWithOpenAiCompatible,
  isRouter9Available
} from './router9';

const STORAGE_KEY = 'smart-diagram-ai-settings-v1';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  activeProvider: '9router',
  router9: {
    baseUrl: DEFAULT_ROUTER9_URL,
    apiKey: 'sk-ec08dcf659ea63b3-mdz563-5732d1c1',
    model: 'gh/gpt-4o-mini'
  },
  custom: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini'
  }
};

export function loadAiSettings(): AiSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      router9: { ...DEFAULT_AI_SETTINGS.router9, ...(parsed.router9 || {}) },
      custom: { ...DEFAULT_AI_SETTINGS.custom, ...(parsed.custom || {}) }
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save AI settings to localStorage:', e);
  }
}

export async function openExternalBrowser(url: string): Promise<boolean> {
  try {
    await openUrl(url);
    return true;
  } catch (err) {
    console.warn('plugin-opener openUrl failed, falling back to window.open:', err);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
      return true;
    }
    return false;
  }
}

export async function loginWithAntigravity(onProgress?: (status: string) => void): Promise<AiSettings> {
  onProgress?.('Starting local OAuth listener on port 51121...');

  const authUrl = getAntigravityAuthUrl();

  let codePromise: Promise<string>;

  // Check if running in Tauri
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    // Start local TCP listener in Rust backend
    codePromise = invoke<string>('start_oauth_listener', { port: ANTIGRAVITY_CALLBACK_PORT });
    // Open user default system browser using official Tauri plugin-opener
    await openExternalBrowser(authUrl);
  } else {
    // Web environment: open popup
    window.open(authUrl, '_blank', 'width=600,height=700');
    codePromise = new Promise<string>((resolve, reject) => {
      // In web browser without Tauri Rust listener, listen on postMessage or timeout
      const onMessage = (e: MessageEvent) => {
        if (e.data && typeof e.data === 'object' && 'antigravityCode' in e.data) {
          const codeValue = e.data.antigravityCode;
          if (typeof codeValue === 'string') {
            window.removeEventListener('message', onMessage);
            resolve(codeValue);
          }
        }
      };
      window.addEventListener('message', onMessage);

      setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('OAuth login timed out. Ensure port 51121 is available.'));
      }, 120000);
    });
  }

  onProgress?.('Waiting for Google sign-in authorization in your browser...');
  const rawCode = await codePromise;
  const cleanCode = decodeURIComponent(rawCode.trim());

  onProgress?.('Exchanging code for Antigravity access token and discovering GCP project...');
  const credentials = await exchangeAntigravityCode(cleanCode);

  const current = loadAiSettings();
  const updated: AiSettings = {
    ...current,
    activeProvider: 'antigravity',
    antigravityCredentials: credentials
  };

  saveAiSettings(updated);
  return updated;
}

export async function submitAntigravityCode(rawCodeOrUrl: string): Promise<AiSettings> {
  let code = rawCodeOrUrl.trim();
  if (code.includes('code=')) {
    const match = code.match(/[?&]code=([^&]+)/);
    if (match) {
      code = match[1];
    }
  }
  const cleanCode = decodeURIComponent(code.trim());
  const credentials = await exchangeAntigravityCode(cleanCode);

  const current = loadAiSettings();
  const updated: AiSettings = {
    ...current,
    activeProvider: 'antigravity',
    antigravityCredentials: credentials
  };

  saveAiSettings(updated);
  return updated;
}

export async function generateDiagramAi(
  req: AiGenerateRequest,
  settings: AiSettings
): Promise<AiGenerateResult> {
  const provider = settings.activeProvider;

  if (provider === 'antigravity') {
    if (!settings.antigravityCredentials?.accessToken) {
      return {
        success: false,
        error: 'Not logged in to Antigravity. Please connect your Google account in AI settings.'
      };
    }
    return generateWithAntigravity(req, settings.antigravityCredentials, 'gemini-3.8-flash');
  }

  if (provider === '9router') {
    const isAlive = await isRouter9Available(settings.router9.baseUrl);
    if (!isAlive) {
      return {
        success: false,
        error: `9Router is not responding at ${settings.router9.baseUrl}. Please ensure 9router is running or switch to Antigravity.`
      };
    }
    return generateWithOpenAiCompatible(req, settings.router9);
  }

  if (provider === 'custom') {
    if (!settings.custom.baseUrl) {
      return {
        success: false,
        error: 'Custom API base URL is missing. Please configure it in AI settings.'
      };
    }
    return generateWithOpenAiCompatible(req, settings.custom);
  }

  return {
    success: false,
    error: `Unknown AI provider: ${provider}`
  };
}
