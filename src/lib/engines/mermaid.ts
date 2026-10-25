import mermaid from 'mermaid';
import type { MermaidTheme, RenderResult } from '$lib/types';

let initialized = false;
let currentTheme: MermaidTheme = 'dark';
let renderCounter = 0;

export function initMermaid(theme: MermaidTheme = 'dark') {
  currentTheme = theme;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: theme,
    fontFamily: 'Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif',
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis'
    },
    er: {
      useMaxWidth: false
    },
    sequence: {
      useMaxWidth: false
    }
  });
  initialized = true;
}

export function parseMermaidError(err: unknown): { message: string; line?: number; column?: number } {
  if (!err) {
    return { message: 'Unknown parsing error' };
  }

  let errStr = String(err);
  if (err instanceof Error) {
    errStr = err.message;
  } else if (err && typeof err === 'object' && 'message' in err) {
    const msg = err.message;
    if (typeof msg === 'string') {
      errStr = msg;
    }
  }
  
  // Extract line number if present: "Parse error on line X:"
  const lineMatch = errStr.match(/Parse error on line (\d+)/i) || errStr.match(/at line (\d+)/i);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

  // Clean up noisy stack or HTML tags from Mermaid error messages
  let cleanMessage = errStr
    .replace(/^Error:\s*/, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();

  // If the message is excessively long due to lexer expectation dumps, trim it
  if (cleanMessage.includes('Expecting')) {
    const lines = cleanMessage.split('\n');
    if (lines.length > 5) {
      cleanMessage = lines.slice(0, 5).join('\n') + '\n...';
    }
  }

  return {
    message: cleanMessage,
    line
  };
}

export async function renderMermaid(code: string, theme: MermaidTheme = 'dark'): Promise<RenderResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { success: true, svg: '' };
  }

  try {
    if (!initialized || currentTheme !== theme) {
      initMermaid(theme);
    }

    renderCounter += 1;
    const renderId = `smart-diagram-${Date.now()}-${renderCounter}`;

    // Validate first if possible
    await mermaid.parse(trimmed);

    // Render SVG
    const { svg } = await mermaid.render(renderId, trimmed);

    // Clean up any stray error elements mermaid may have injected into DOM
    if (typeof document !== 'undefined') {
      const stray = document.querySelectorAll(`[id^="d${renderId}"], [id^="dsmart-diagram"]`);
      stray.forEach((el) => el.remove());
    }

    return {
      success: true,
      svg
    };
  } catch (error) {
    const parsed = parseMermaidError(error);
    
    // Clean up error containers from DOM
    if (typeof document !== 'undefined') {
      const errNodes = document.querySelectorAll('.error-icon, [id^="dsmart-diagram"]');
      errNodes.forEach((el) => el.remove());
    }

    return {
      success: false,
      error: parsed.message,
      line: parsed.line,
      rawError: error
    };
  }
}
