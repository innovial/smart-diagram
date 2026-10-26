import type { DiagramType } from '$lib/types';

export type AiProviderType = 'antigravity' | '9router' | 'custom';

export interface AntigravityCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  projectId?: string;
  email?: string;
}

export interface Router9Config {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface CustomProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiSettings {
  activeProvider: AiProviderType;
  antigravityCredentials?: AntigravityCredentials;
  router9: Router9Config;
  custom: CustomProviderConfig;
}

export type AiAction = 'generate' | 'edit' | 'fix';

export interface AiGenerateRequest {
  prompt: string;
  currentCode?: string;
  type: DiagramType;
  action: AiAction;
  errorMessage?: string;
  errorLine?: number;
}

export interface AiGenerateResult {
  success: boolean;
  code?: string;
  explanation?: string;
  error?: string;
}
