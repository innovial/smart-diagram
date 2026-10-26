<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { DiagramType } from '$lib/types';
  import type { AiSettings, AiAction } from '$lib/ai/types';
  import { loadAiSettings, generateDiagramAi } from '$lib/ai/service';
  import {
    Sparkles,
    Settings,
    Send,
    Check,
    Copy,
    Trash2,
    X,
    AlertCircle,
    Wand2,
    Zap,
    Server,
    Key,
    ArrowUp
  } from '@lucide/svelte';

  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    code?: string;
    timestamp: number;
  }

  interface Props {
    diagramType: DiagramType;
    currentCode: string;
    errorMessage?: string;
    errorLine?: number;
    theme?: 'dark' | 'light';
    onApply: (newCode: string) => void;
    onOpenSettings: () => void;
    onClose: () => void;
  }

  let {
    diagramType = 'mermaid',
    currentCode = '',
    errorMessage = '',
    errorLine,
    theme = 'dark',
    onApply,
    onOpenSettings,
    onClose
  }: Props = $props();

  let settings: AiSettings = $state(loadAiSettings());
  let messages = $state<ChatMessage[]>([]);
  let inputText = $state('');
  let action: AiAction = $state('generate');
  let isGenerating = $state(false);
  let errorBannerMsg = $state('');
  let copiedId = $state<string | null>(null);

  let messagesContainerEl: HTMLDivElement | null = $state(null);

  const quickPrompts = $derived(() => {
    if (diagramType === 'mermaid') {
      return [
        'Payment gateway flowchart with retry logic',
        'OAuth2 PKCE authorization code flow',
        'Order lifecycle state machine',
        'System architecture mindmap'
      ];
    }
    return [
      'E-commerce database with orders & products',
      'Clinic management: doctors, patients, appointments',
      'SaaS multi-tenant: orgs, subscriptions, invoices',
      'Social network: users, posts, comments, likes'
    ];
  });

  async function scrollToBottom() {
    await tick();
    if (messagesContainerEl) {
      messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
    }
  }

  async function sendMessage(overrideText?: string, overrideAction?: AiAction) {
    const text = (overrideText || inputText).trim();
    const currentAction = overrideAction || action;
    if (!text && currentAction !== 'fix') return;

    const userMsgId = `user-${Date.now()}`;
    const userMsgText = currentAction === 'fix' ? `Fix syntax error: ${errorMessage}` : text;

    messages = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: userMsgText,
        timestamp: Date.now()
      }
    ];

    inputText = '';
    isGenerating = true;
    errorBannerMsg = '';
    await scrollToBottom();

    try {
      const res = await generateDiagramAi(
        {
          prompt: userMsgText,
          currentCode,
          type: diagramType,
          action: currentAction,
          errorMessage,
          errorLine
        },
        settings
      );

      if (res.success && res.code) {
        messages = [
          ...messages,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            text:
              currentAction === 'fix'
                ? `I fixed the syntax error in your ${diagramType} diagram:`
                : currentAction === 'edit'
                  ? `Here is the updated ${diagramType} diagram:`
                  : `Here is your generated ${diagramType} diagram:`,
            code: res.code,
            timestamp: Date.now()
          }
        ];
      } else {
        errorBannerMsg = res.error || 'Failed to generate diagram response';
        messages = [
          ...messages,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ Generation failed: ${res.error || 'Unknown error. Check provider settings.'}`,
            timestamp: Date.now()
          }
        ];
      }
    } catch (e: unknown) {
      errorBannerMsg = e instanceof Error ? e.message : String(e);
    } finally {
      isGenerating = false;
      await scrollToBottom();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearMessages() {
    messages = [];
  }

  async function copyCode(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
      copiedId = id;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch {}
  }

  export function triggerFix() {
    action = 'fix';
    sendMessage(undefined, 'fix');
  }

  export function refreshSettings() {
    settings = loadAiSettings();
  }

  onMount(() => {
    refreshSettings();
  });
</script>

<div class="ai-agent-panel {theme}" role="region" aria-label="AI Diagram Agent Copilot">
  <!-- Panel Header -->
  <div class="panel-header">
    <div class="header-left">
      <div class="agent-avatar">
        <Sparkles size={14} class="agent-avatar-icon" />
      </div>
      <div class="agent-title-col">
        <span class="agent-title">Diagram Copilot</span>
        <button class="provider-badge" onclick={onOpenSettings} title="Click to change AI provider settings">
          {#if settings.activeProvider === 'antigravity'}
            <Zap size={10} color="#38bdf8" />
            <span>Antigravity</span>
          {:else if settings.activeProvider === '9router'}
            <Server size={10} color="#a78bfa" />
            <span>9Router</span>
          {:else}
            <Key size={10} color="#34d399" />
            <span>Custom</span>
          {/if}
        </button>
      </div>
    </div>

    <div class="header-right">
      <button class="header-icon-btn" onclick={clearMessages} title="Clear conversation history">
        <Trash2 size={14} />
      </button>
      <button class="header-icon-btn" onclick={onOpenSettings} title="AI Provider Settings">
        <Settings size={14} />
      </button>
      <button class="header-icon-btn" onclick={onClose} title="Close AI Panel (Ctrl+K)">
        <X size={15} />
      </button>
    </div>
  </div>

  <!-- Syntax Error Quick Fix Notice -->
  {#if errorMessage}
    <div class="quick-fix-bar">
      <div class="fix-info">
        <AlertCircle size={14} class="fix-alert-icon" />
        <span class="fix-text">Syntax error at {errorLine ? `line ${errorLine}` : 'diagram'}</span>
      </div>
      <button
        class="quick-fix-btn"
        onclick={() => triggerFix()}
        disabled={isGenerating}
      >
        <Sparkles size={12} />
        <span>Fix with AI</span>
      </button>
    </div>
  {/if}

  <!-- Chat History Scrollable Area -->
  <div class="messages-scroll" bind:this={messagesContainerEl}>
    {#if messages.length === 0}
      <!-- Empty State / Welcome Screen -->
      <div class="agent-welcome">
        <div class="welcome-badge">
          <Sparkles size={20} />
        </div>
        <h4 class="welcome-title">How can I help with your diagram?</h4>
        <p class="welcome-sub">
          Ask me to build, expand, or refactor your {diagramType.toUpperCase()} models in natural language.
        </p>

        <div class="quick-prompts-label">Suggested prompts:</div>
        <div class="quick-prompts-grid">
          {#each quickPrompts() as prompt}
            <button
              class="quick-prompt-chip"
              onclick={() => {
                inputText = prompt;
                action = 'generate';
                sendMessage(prompt, 'generate');
              }}
            >
              <span>{prompt}</span>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Messages List -->
      {#each messages as msg}
        <div class="message-row {msg.role}">
          {#if msg.role === 'assistant'}
            <div class="msg-avatar">
              <Sparkles size={12} />
            </div>
          {/if}

          <div class="msg-bubble">
            <p class="msg-text">{msg.text}</p>

            {#if msg.code}
              <div class="code-box">
                <div class="code-box-header">
                  <span class="code-type">{diagramType.toUpperCase()}</span>
                  <div class="code-actions">
                    <button
                      class="code-btn"
                      onclick={() => copyCode(msg.code || '', msg.id)}
                      title="Copy code"
                    >
                      {#if copiedId === msg.id}
                        <Check size={12} color="#10b981" />
                        <span>Copied</span>
                      {:else}
                        <Copy size={12} />
                        <span>Copy</span>
                      {/if}
                    </button>
                    <button
                      class="code-btn apply-btn"
                      onclick={() => onApply(msg.code || '')}
                      title="Apply directly to active CodeMirror editor"
                    >
                      <Check size={12} />
                      <span>Apply to Editor</span>
                    </button>
                  </div>
                </div>
                <pre class="code-body"><code>{msg.code}</code></pre>
              </div>
            {/if}
          </div>
        </div>
      {/each}

      {#if isGenerating}
        <div class="message-row assistant">
          <div class="msg-avatar pulse">
            <Sparkles size={12} />
          </div>
          <div class="msg-bubble thinking-bubble">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="thinking-text">Agent is designing {diagramType}...</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Bottom Input Bar -->
  <div class="panel-footer">
    <div class="action-mode-pills">
      <button
        class="mode-pill"
        class:active={action === 'generate'}
        onclick={() => (action = 'generate')}
      >
        New Diagram
      </button>
      <button
        class="mode-pill"
        class:active={action === 'edit'}
        onclick={() => (action = 'edit')}
      >
        Edit Existing
      </button>
    </div>

    <div class="input-container">
      <textarea
        bind:value={inputText}
        onkeydown={handleKeyDown}
        placeholder={action === 'edit'
          ? `Ask to edit or add elements to your ${diagramType}...`
          : `Describe a ${diagramType} diagram to generate...`}
        rows="2"
        class="agent-textarea"
      ></textarea>

      <button
        class="send-btn"
        onclick={() => sendMessage()}
        disabled={isGenerating || !inputText.trim()}
        title="Send prompt (Enter)"
      >
        <ArrowUp size={16} />
      </button>
    </div>
    <span class="input-hint">Enter to send, Shift+Enter for new line</span>
  </div>
</div>

<style>
  .ai-agent-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(148, 163, 184, 0.12);
    user-select: none;
    overflow: hidden;
  }

  .dark {
    background-color: #0d121f;
    color: #f1f5f9;
  }

  .light {
    background-color: #ffffff;
    color: #0f172a;
    border-left-color: #e2e8f0;
  }

  /* Header */
  .panel-header {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(0, 0, 0, 0.1);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .agent-avatar {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }

  .agent-title-col {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .agent-title {
    font-size: 12px;
    font-weight: 700;
  }

  .provider-badge {
    border: none;
    background: transparent;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: #94a3b8;
    cursor: pointer;
  }

  .provider-badge:hover {
    color: #38bdf8;
    text-decoration: underline;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .header-icon-btn {
    padding: 5px;
    border: none;
    background: transparent;
    color: inherit;
    opacity: 0.6;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-icon-btn:hover {
    opacity: 1;
    background: rgba(148, 163, 184, 0.12);
  }

  /* Quick fix bar */
  .quick-fix-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(220, 38, 38, 0.15);
    border-bottom: 1px solid rgba(220, 38, 38, 0.3);
  }

  .fix-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #fca5a5;
  }

  :global(.fix-alert-icon) {
    color: #ef4444;
  }

  .quick-fix-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(239, 68, 68, 0.4);
    background: rgba(220, 38, 38, 0.3);
    color: #fecaca;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .quick-fix-btn:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.6);
  }

  /* Messages area */
  .messages-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Welcome Screen */
  .agent-welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin: auto 0;
    padding: 20px 8px;
  }

  .welcome-badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c084fc;
    margin-bottom: 12px;
  }

  .welcome-title {
    margin: 0 0 6px 0;
    font-size: 14px;
    font-weight: 700;
  }

  .welcome-sub {
    margin: 0 0 16px 0;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
    max-width: 260px;
  }

  .quick-prompts-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #64748b;
    margin-bottom: 8px;
    align-self: flex-start;
  }

  .quick-prompts-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .quick-prompt-chip {
    width: 100%;
    padding: 7px 10px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
    font-size: 11px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-prompt-chip:hover {
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.08);
  }

  /* Chat Rows */
  .message-row {
    display: flex;
    gap: 8px;
    max-width: 100%;
  }

  .message-row.user {
    justify-content: flex-end;
  }

  .message-row.user .msg-bubble {
    background: #2563eb;
    color: #ffffff;
    border-radius: 12px 12px 2px 12px;
    max-width: 85%;
  }

  .message-row.assistant .msg-bubble {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 12px 12px 12px 2px;
    width: 100%;
  }

  .msg-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #3b82f6;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .msg-avatar.pulse {
    animation: pulse 1s infinite alternate;
  }

  .msg-bubble {
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
  }

  .msg-text {
    margin: 0;
    white-space: pre-wrap;
  }

  /* Code box inside message */
  .code-box {
    margin-top: 8px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }

  .code-box-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgba(148, 163, 184, 0.08);
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .code-type {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
  }

  .code-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .code-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(255, 255, 255, 0.04);
    color: inherit;
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
  }

  .code-btn.apply-btn {
    background: #16a34a;
    border-color: #16a34a;
    color: #ffffff;
    font-weight: 600;
  }

  .code-btn.apply-btn:hover {
    background: #15803d;
  }

  .code-body {
    margin: 0;
    padding: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.4;
    max-height: 220px;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  /* Thinking indicator */
  .thinking-bubble {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
  }

  .typing-indicator {
    display: flex;
    gap: 3px;
  }

  .typing-indicator span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: #3b82f6;
    animation: typing 1s infinite alternate;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    from {
      opacity: 0.2;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .thinking-text {
    font-size: 11px;
  }

  /* Bottom Footer */
  .panel-footer {
    padding: 10px 12px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-mode-pills {
    display: flex;
    gap: 4px;
  }

  .mode-pill {
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: transparent;
    font-size: 10px;
    font-weight: 500;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
  }

  .mode-pill.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #38bdf8;
    opacity: 1;
    font-weight: 600;
  }

  .input-container {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    padding: 6px 8px;
  }

  .input-container:focus-within {
    border-color: #3b82f6;
  }

  .agent-textarea {
    flex: 1;
    border: none;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.4;
    resize: none;
    outline: none;
    max-height: 100px;
    box-sizing: border-box;
  }

  .send-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: #2563eb;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease;
  }

  .send-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .input-hint {
    font-size: 9px;
    color: #64748b;
    text-align: right;
  }
</style>
