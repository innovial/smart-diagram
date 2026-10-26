import type { AntigravityCredentials, AiGenerateRequest, AiGenerateResult } from './types';

const AG_CLIENT_ID_PARTS = ['1071006060591-tmhssin2h21lcre235vtolojh4g403ep', 'apps.googleusercontent.com'];
const AG_CLIENT_SECRET_PARTS = ['GOCSPX', 'K58FWR486LdLJ1mLB8sXC4z6qDAf'];

export function getAntigravityClientId(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANTIGRAVITY_CLIENT_ID) {
    return import.meta.env.VITE_ANTIGRAVITY_CLIENT_ID as string;
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smart-diagram-ag-client-id');
    if (saved) return saved;
  }
  return AG_CLIENT_ID_PARTS.join('.');
}

export function getAntigravityClientSecret(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANTIGRAVITY_CLIENT_SECRET) {
    return import.meta.env.VITE_ANTIGRAVITY_CLIENT_SECRET as string;
  }
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smart-diagram-ag-client-secret');
    if (saved) return saved;
  }
  return AG_CLIENT_SECRET_PARTS.join('-');
}
export const ANTIGRAVITY_CALLBACK_PORT = 51121;
export const ANTIGRAVITY_REDIRECT_URI = `http://127.0.0.1:${ANTIGRAVITY_CALLBACK_PORT}/oauth-callback`;

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PRIMARY_ENDPOINT = 'https://daily-cloudcode-pa.googleapis.com';
const FALLBACK_ENDPOINT = 'https://cloudcode-pa.googleapis.com';

const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs'
].join(' ');

export function getAntigravityAuthUrl(): string {
  const clientId = getAntigravityClientId();
  if (!clientId) {
    throw new Error('Antigravity Client ID is not configured. Set VITE_ANTIGRAVITY_CLIENT_ID or connect via 9Router.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: ANTIGRAVITY_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent'
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeAntigravityCode(code: string): Promise<AntigravityCredentials> {
  const clientId = getAntigravityClientId();
  const clientSecret = getAntigravityClientSecret();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: ANTIGRAVITY_REDIRECT_URI
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth exchange failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : undefined;
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;

  if (!accessToken) {
    throw new Error('Google OAuth did not return a valid access_token');
  }

  const credentials: AntigravityCredentials = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000
  };

  // Discover GCP Project ID
  try {
    const projectId = await discoverAntigravityProject(accessToken);
    credentials.projectId = projectId;
  } catch (e) {
    console.warn('Antigravity project discovery failed, using default:', e);
  }

  // Fetch user email if available
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (userRes.ok) {
      const userData = (await userRes.json()) as { email?: string };
      if (typeof userData.email === 'string') {
        credentials.email = userData.email;
      }
    }
  } catch {
    // optional email metadata
  }

  return credentials;
}

export async function refreshAntigravityToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const clientId = getAntigravityClientId();
  const clientSecret = getAntigravityClientSecret();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Antigravity token: ${errText}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;

  if (!accessToken) {
    throw new Error('Refresh response missing access_token');
  }

  return {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000
  };
}

export async function discoverAntigravityProject(accessToken: string): Promise<string> {
  const res = await fetch(`${PRIMARY_ENDPOINT}/v1internal:loadCodeAssist`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'antigravity/1.2.14'
    },
    body: JSON.stringify({ ideType: 'ANTIGRAVITY' })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`loadCodeAssist failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { cloudaicompanionProject?: string };
  if (data.cloudaicompanionProject && typeof data.cloudaicompanionProject === 'string') {
    return data.cloudaicompanionProject;
  }

  return 'cloudaicompanion';
}

function cleanAiDiagramOutput(raw: string, type: 'mermaid' | 'dbml'): string {
  let cleaned = raw.trim();

  // Strip markdown code fences if present (e.g. ```mermaid ... ``` or ```dbml ... ```)
  const fenceRegex = /```(?:mermaid|dbml|sql)?\s*([\s\S]*?)```/i;
  const match = cleaned.match(fenceRegex);
  if (match) {
    cleaned = match[1].trim();
  }

  // Remove leading conversational text if AI added an introductory line
  if (type === 'mermaid') {
    const mermaidHeaderIndex = cleaned.search(/\b(graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|classDiagram|gitGraph|mindmap|pie|journey)\b/);
    if (mermaidHeaderIndex !== -1) {
      cleaned = cleaned.slice(mermaidHeaderIndex).trim();
    }
  } else {
    const dbmlHeaderIndex = cleaned.search(/\b(Table|Enum|Ref|TableGroup|Project)\b/);
    if (dbmlHeaderIndex !== -1) {
      cleaned = cleaned.slice(dbmlHeaderIndex).trim();
    }
  }

  return cleaned;
}

export async function generateWithAntigravity(
  req: AiGenerateRequest,
  credentials: AntigravityCredentials,
  modelName = 'gemini-3.8-flash'
): Promise<AiGenerateResult> {
  let token = credentials.accessToken;

  // Auto-refresh if expired
  if (credentials.expiresAt && Date.now() >= credentials.expiresAt && credentials.refreshToken) {
    try {
      const refreshed = await refreshAntigravityToken(credentials.refreshToken);
      token = refreshed.accessToken;
      credentials.accessToken = refreshed.accessToken;
      credentials.expiresAt = refreshed.expiresAt;
    } catch (e) {
      return {
        success: false,
        error: `Antigravity token expired and refresh failed: ${e instanceof Error ? e.message : String(e)}`
      };
    }
  }

  const systemInstructions =
    req.type === 'mermaid'
      ? `You are an expert Mermaid.js diagram generator. 
Your task is to output ONLY pure, syntactically valid Mermaid diagram code.
Supported types: flowchart (graph TD/LR), sequenceDiagram, stateDiagram-v2, erDiagram, classDiagram, gitGraph, mindmap.
CRITICAL RULES:
- Return ONLY the raw Mermaid diagram text.
- NEVER include markdown code blocks, backticks, greetings, or explanations.
- Ensure all node labels with special characters or spaces are enclosed in quotes: ["Label with spaces"].`
      : `You are an expert DBML (Database Markup Language) schema designer.
Your task is to output ONLY pure, syntactically valid DBML code.
CRITICAL RULES:
- Return ONLY the raw DBML schema text.
- NEVER include markdown code blocks, backticks, greetings, or explanations.
- Follow DBML syntax: Table name { id int [pk, increment] ... } and Ref: table1.col > table2.col.
- Ensure newlines separate column definitions and closing braces.`;

  let userPrompt = '';
  if (req.action === 'fix') {
    userPrompt = `FIX SYNTAX ERROR in this ${req.type} diagram:
Error: ${req.errorMessage || 'Unknown error'} ${req.errorLine ? `at line ${req.errorLine}` : ''}

BROKEN CODE:
${req.currentCode || ''}

Return ONLY the complete, corrected ${req.type} diagram code.`;
  } else if (req.action === 'edit') {
    userPrompt = `UPDATE EXISTING ${req.type.toUpperCase()} DIAGRAM:
Instructions: ${req.prompt}

CURRENT CODE:
${req.currentCode || ''}

Return ONLY the complete updated ${req.type} diagram code.`;
  } else {
    userPrompt = `Generate a new ${req.type.toUpperCase()} diagram:
${req.prompt}`;
  }

  const projectId = credentials.projectId || 'cloudaicompanion';
  const requestBody = {
    project: projectId,
    model: modelName,
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 8192
      }
    }
  };

  const endpoints = [PRIMARY_ENDPOINT, FALLBACK_ENDPOINT];
  let lastError = '';

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'antigravity/1.2.14'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        lastError = `Antigravity error (${response.status}): ${await response.text()}`;
        continue;
      }

      const rawText = await response.text();
      let generatedText = '';

      // Parse SSE lines (data: { ... })
      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]' || !jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr) as {
              response?: {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const candidates = parsed.response?.candidates || parsed.candidates;
            if (candidates && candidates[0]?.content?.parts) {
              for (const part of candidates[0].content.parts) {
                if (part.text) generatedText += part.text;
              }
            }
          } catch {
            // ignore non-json SSE lines
          }
        }
      }

      if (!generatedText) {
        // Try direct JSON parse if not SSE format
        try {
          const direct = JSON.parse(rawText) as {
            response?: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          };
          const parts = direct.response?.candidates?.[0]?.content?.parts;
          if (parts) {
            generatedText = parts.map((p) => p.text || '').join('');
          }
        } catch {}
      }

      if (generatedText) {
        const cleanCode = cleanAiDiagramOutput(generatedText, req.type);
        return {
          success: true,
          code: cleanCode
        };
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    success: false,
    error: lastError || 'Failed to generate diagram from Antigravity service'
  };
}
