import type { AiGenerateRequest, AiGenerateResult, Router9Config, CustomProviderConfig } from './types';

export const DEFAULT_ROUTER9_URL = 'http://127.0.0.1:20128/v1';

export async function isRouter9Available(baseUrl = DEFAULT_ROUTER9_URL): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRouter9Models(baseUrl = DEFAULT_ROUTER9_URL, apiKey?: string): Promise<string[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(3000)
    });

    if (!res.ok) return ['gh/gpt-4o-mini', 'standard', 'highest'];
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    if (Array.isArray(data.data)) {
      return data.data.map((m) => m.id);
    }
  } catch {
    // fallback default models
  }
  return ['gh/gpt-4o-mini', 'standard', 'highest'];
}

function cleanAiDiagramOutput(raw: string, type: 'mermaid' | 'dbml'): string {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
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

export async function generateWithOpenAiCompatible(
  req: AiGenerateRequest,
  config: Router9Config | CustomProviderConfig
): Promise<AiGenerateResult> {
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

  let cleanBaseUrl = (config.baseUrl || DEFAULT_ROUTER9_URL).trim().replace(/\/+$/, '');
  if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
    cleanBaseUrl = `http://${cleanBaseUrl}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (config.apiKey && config.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  }

  const requestBody = {
    model: config.model || 'gh/gpt-4o-mini',
    messages: [
      { role: 'system', content: systemInstructions },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.15
  };

  try {
    const res = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    const rawText = await res.text();

    if (!res.ok) {
      let message = rawText;
      try {
        const errJson = JSON.parse(rawText) as { error?: { message?: string } | string };
        if (typeof errJson.error === 'string') {
          message = errJson.error;
        } else if (errJson.error && typeof errJson.error === 'object' && 'message' in errJson.error && typeof errJson.error.message === 'string') {
          message = errJson.error.message;
        }
      } catch {
        // raw text fallback
      }
      return {
        success: false,
        error: `AI Gateway error (${res.status}): ${message}`
      };
    }

    let content = '';

    // 1. Strip trailing SSE marker "data: [DONE]" if 9Router appended it
    let cleanedJsonText = rawText.trim();
    if (cleanedJsonText.includes('data: [DONE]')) {
      cleanedJsonText = cleanedJsonText.replace(/\s*data:\s*\[DONE\]\s*$/, '').trim();
    }

    // 2. Try parsing direct JSON
    try {
      const data = JSON.parse(cleanedJsonText) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string } | string;
      };

      if (data.error) {
        const errMsg = typeof data.error === 'string' ? data.error : data.error.message || 'Unknown error';
        return { success: false, error: `AI Provider error: ${errMsg}` };
      }

      content = data.choices?.[0]?.message?.content || '';
    } catch {
      // 3. Fallback: Extract outermost { ... }
      const firstBrace = cleanedJsonText.indexOf('{');
      const lastBrace = cleanedJsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          const sub = cleanedJsonText.slice(firstBrace, lastBrace + 1);
          const data = JSON.parse(sub) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          content = data.choices?.[0]?.message?.content || '';
        } catch {
          // continue to SSE fallback
        }
      }

      // 4. Fallback: Parse as SSE stream chunks (data: {...})
      if (!content) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('data:')) {
            const payload = t.slice(5).trim();
            if (payload === '[DONE]' || !payload) continue;
            try {
              const chunk = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
              };
              const delta = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content;
              if (delta) content += delta;
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    }

    if (!content) {
      return {
        success: false,
        error: `AI returned an unparseable response: ${rawText.slice(0, 160)}`
      };
    }

    const cleanedCode = cleanAiDiagramOutput(content, req.type);
    return {
      success: true,
      code: cleanedCode
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network or API failure: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
