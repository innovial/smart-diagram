<script lang="ts">
  import { onMount } from 'svelte';
  import type { AiSettings } from '$lib/ai/types';
  import {
    loadAiSettings,
    saveAiSettings,
    loginWithAntigravity,
    submitAntigravityCode,
    openExternalBrowser
  } from '$lib/ai/service';
  import { getAntigravityAuthUrl } from '$lib/ai/antigravity';
  import { isRouter9Available, fetchRouter9Models } from '$lib/ai/router9';
  import {
    X,
    Settings,
    Zap,
    Server,
    Key,
    Check,
    ExternalLink,
    AlertCircle
  } from '@lucide/svelte';

  interface Props {
    isOpen: boolean;
    theme?: 'dark' | 'light';
    onClose: () => void;
    onSettingsChanged?: (settings: AiSettings) => void;
  }

  let {
    isOpen = false,
    theme = 'dark',
    onClose,
    onSettingsChanged
  }: Props = $props();

  let settings: AiSettings = $state(loadAiSettings());
  let router9Connected = $state(false);
  let router9Models = $state<string[]>(['gh/gpt-4o-mini', 'standard', 'highest']);
  let isLoggingIn = $state(false);
  let loginStatusMsg = $state('');
  let errorMsg = $state('');
  let manualCodeInput = $state('');
  let isSubmittingManual = $state(false);
  const authUrl = getAntigravityAuthUrl();

  async function handleManualCodeSubmit() {
    if (!manualCodeInput.trim()) return;
    isSubmittingManual = true;
    errorMsg = '';
    try {
      const updated = await submitAntigravityCode(manualCodeInput.trim());
      settings = updated;
      loginStatusMsg = 'Successfully connected to Antigravity!';
      onSettingsChanged?.(updated);
      manualCodeInput = '';
      setTimeout(() => {
        loginStatusMsg = '';
      }, 2500);
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : String(e);
    } finally {
      isSubmittingManual = false;
    }
  }

  async function checkConnections() {
    router9Connected = await isRouter9Available(settings.router9.baseUrl);
    if (router9Connected) {
      router9Models = await fetchRouter9Models(settings.router9.baseUrl, settings.router9.apiKey);
    }
  }

  async function handleLoginAntigravity() {
    isLoggingIn = true;
    loginStatusMsg = 'Initiating Google Antigravity OAuth...';
    errorMsg = '';
    try {
      const updated = await loginWithAntigravity((status) => {
        loginStatusMsg = status;
      });
      settings = updated;
      loginStatusMsg = 'Successfully logged in to Antigravity!';
      onSettingsChanged?.(updated);
      setTimeout(() => {
        loginStatusMsg = '';
      }, 2500);
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : String(e);
      loginStatusMsg = '';
    } finally {
      isLoggingIn = false;
    }
  }

  function handleSaveSettings() {
    saveAiSettings(settings);
    onSettingsChanged?.(settings);
    onClose();
  }

  onMount(() => {
    settings = loadAiSettings();
    checkConnections();
  });
</script>

{#if isOpen}
  <div class="modal-backdrop">
    <button class="backdrop-click-target" onclick={onClose} aria-label="Close modal overlay"></button>
    <div
      class="modal-card {theme}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-settings-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="modal-header">
        <div class="header-title">
          <Settings size={16} class="header-icon" />
          <h3 id="ai-settings-title">AI Provider Settings</h3>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        {#if errorMsg}
          <div class="feedback-banner error">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        {/if}

        <div class="settings-content">
          <div class="setting-section">
            <span class="setting-title">Choose Active AI Provider:</span>
            <div class="provider-radio-group">
              <!-- Antigravity Option -->
              <div
                class="provider-card"
                class:selected={settings.activeProvider === 'antigravity'}
                onclick={() => (settings.activeProvider = 'antigravity')}
                role="presentation"
              >
                <div class="card-radio">
                  <input
                    type="radio"
                    name="provider"
                    value="antigravity"
                    checked={settings.activeProvider === 'antigravity'}
                  />
                </div>
                <div class="card-details">
                  <div class="card-name-row">
                    <Zap size={15} color="#38bdf8" />
                    <span class="card-name">Google Antigravity OAuth</span>
                  </div>
                  <p class="card-desc">
                    Official Antigravity Cloud Code Assist with Google OAuth login (gemini-3.8-flash).
                  </p>

                  {#if settings.antigravityCredentials?.accessToken}
                    <div class="auth-status connected">
                      <Check size={13} color="#10b981" />
                      <span>
                        Connected {settings.antigravityCredentials.email ? `(${settings.antigravityCredentials.email})` : ''}
                      </span>
                    </div>
                  {:else}
                    <div class="auth-status disconnected">
                      <span>Not logged in yet</span>
                    </div>
                  {/if}

                  {#if isLoggingIn}
                    <div class="oauth-in-progress">
                      <div class="spinner"></div>
                      <span class="login-status-text">{loginStatusMsg}</span>
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noreferrer"
                        class="manual-oauth-link"
                        onclick={(e) => {
                          e.preventDefault();
                          openExternalBrowser(authUrl);
                        }}
                      >
                        Browser tidak terbuka otomatis? Klik di sini untuk login
                      </a>
                    </div>
                  {:else}
                    <button
                      class="oauth-login-btn"
                      onclick={handleLoginAntigravity}
                      disabled={isLoggingIn}
                    >
                      <ExternalLink size={13} />
                      <span>
                        {settings.antigravityCredentials?.accessToken ? 'Re-authenticate with Google' : 'Sign in with Google (Antigravity)'}
                      </span>
                    </button>
                  {/if}

                  <div class="manual-code-box">
                    <span class="manual-hint">Sudah login di browser? Atau paste URL callback / code di sini:</span>
                    <div class="manual-input-group">
                      <input
                        type="text"
                        bind:value={manualCodeInput}
                        placeholder="http://127.0.0.1:51121/oauth-callback?code=..."
                        class="manual-code-field"
                      />
                      <button
                        class="manual-submit-btn"
                        onclick={handleManualCodeSubmit}
                        disabled={isSubmittingManual || !manualCodeInput.trim()}
                      >
                        {isSubmittingManual ? '...' : 'Hubungkan'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 9Router Option -->
              <div
                class="provider-card"
                class:selected={settings.activeProvider === '9router'}
                onclick={() => (settings.activeProvider = '9router')}
                role="presentation"
              >
                <div class="card-radio">
                  <input
                    type="radio"
                    name="provider"
                    value="9router"
                    checked={settings.activeProvider === '9router'}
                  />
                </div>
                <div class="card-details">
                  <div class="card-name-row">
                    <Server size={15} color="#8b5cf6" />
                    <span class="card-name">9Router Gateway (Local)</span>
                  </div>
                  <p class="card-desc">
                    Connect through your running 9Router daemon at {settings.router9.baseUrl}.
                  </p>

                  <div class="auth-status {router9Connected ? 'connected' : 'disconnected'}">
                    <span>{router9Connected ? '9Router Gateway is Active' : '9Router not detected on port 20128'}</span>
                  </div>

                  <div class="input-row">
                    <label for="router9-model" class="field-label">Model:</label>
                    <select id="router9-model" bind:value={settings.router9.model} class="select-field">
                      {#if settings.router9.model && !router9Models.includes(settings.router9.model)}
                        <option value={settings.router9.model}>{settings.router9.model}</option>
                      {/if}
                      {#each router9Models as m}
                        <option value={m}>{m}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              </div>

              <!-- Custom API Option -->
              <div
                class="provider-card"
                class:selected={settings.activeProvider === 'custom'}
                onclick={() => (settings.activeProvider = 'custom')}
                role="presentation"
              >
                <div class="card-radio">
                  <input
                    type="radio"
                    name="provider"
                    value="custom"
                    checked={settings.activeProvider === 'custom'}
                  />
                </div>
                <div class="card-details">
                  <div class="card-name-row">
                    <Key size={15} color="#10b981" />
                    <span class="card-name">Custom OpenAI-Compatible API</span>
                  </div>
                  <p class="card-desc">DeepSeek, OpenAI, Groq, Ollama, or custom proxy.</p>

                  <div class="input-row">
                    <label for="custom-url" class="field-label">Base URL:</label>
                    <input
                      id="custom-url"
                      type="text"
                      bind:value={settings.custom.baseUrl}
                      placeholder="https://api.openai.com/v1"
                      class="text-input"
                    />
                  </div>
                  <div class="input-row">
                    <label for="custom-key" class="field-label">API Key:</label>
                    <input
                      id="custom-key"
                      type="password"
                      bind:value={settings.custom.apiKey}
                      placeholder="sk-..."
                      class="text-input"
                    />
                  </div>
                  <div class="input-row">
                    <label for="custom-model" class="field-label">Model:</label>
                    <input
                      id="custom-model"
                      type="text"
                      bind:value={settings.custom.model}
                      placeholder="gpt-4o-mini"
                      class="text-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="cancel-btn" onclick={onClose}>Cancel</button>
        <button class="save-settings-btn" onclick={handleSaveSettings}>Save & Apply</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
    animation: fadeIn 0.15s ease-out;
  }

  .backdrop-click-target {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    cursor: default;
    z-index: 1;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 580px;
    max-height: 85vh;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleUp 0.15s ease-out;
  }

  @keyframes scaleUp {
    from {
      transform: scale(0.96);
    }
    to {
      transform: scale(1);
    }
  }

  .dark {
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    color-scheme: dark;
  }

  .light {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #0f172a;
    color-scheme: light;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.header-icon) {
    color: #38bdf8;
  }

  .header-title h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
  }

  .close-btn {
    border: none;
    background: transparent;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    opacity: 1;
    background: rgba(148, 163, 184, 0.1);
  }

  .modal-body {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }

  .feedback-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
  }

  .feedback-banner.error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .setting-title {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 10px;
    display: block;
  }

  .provider-radio-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .provider-card {
    display: flex;
    gap: 12px;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .provider-card:hover {
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.03);
  }

  .provider-card.selected {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.06);
  }

  .card-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-name-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .card-name {
    font-size: 13px;
    font-weight: 600;
  }

  .card-desc {
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
  }

  .auth-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    margin-top: 2px;
  }

  .auth-status.connected {
    color: #34d399;
  }

  .auth-status.disconnected {
    color: #94a3b8;
  }

  .oauth-login-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(56, 189, 248, 0.4);
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    width: fit-content;
    margin-top: 4px;
  }

  .oauth-login-btn:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.2);
  }

  .oauth-in-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.2);
  }

  .manual-oauth-link {
    font-size: 11px;
    color: #38bdf8;
    text-decoration: underline;
    cursor: pointer;
    line-height: 1.4;
  }

  .manual-oauth-link:hover {
    color: #7dd3fc;
  }

  .manual-code-box {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed rgba(148, 163, 184, 0.15);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .manual-hint {
    font-size: 10px;
    color: #94a3b8;
  }

  .manual-input-group {
    display: flex;
    gap: 6px;
  }

  .manual-code-field {
    flex: 1;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    outline: none;
    border: 1px solid #334155;
    background-color: #0f172a;
    color: #f1f5f9;
  }

  .light .manual-code-field {
    background-color: #ffffff;
    color: #0f172a;
    border-color: #cbd5e1;
  }

  .manual-submit-btn {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid rgba(56, 189, 248, 0.4);
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease;
  }

  .manual-submit-btn:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.3);
  }

  .manual-submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(56, 189, 248, 0.3);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .login-status-text {
    font-size: 11px;
    font-weight: 500;
    color: #60a5fa;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .field-label {
    font-size: 11px;
    color: #94a3b8;
    min-width: 65px;
  }

  .select-field,
  .text-input {
    flex: 1;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }

  .dark .select-field,
  .dark .text-input {
    background-color: #0f172a;
    color: #f1f5f9;
    border: 1px solid #334155;
    color-scheme: dark;
  }

  .light .select-field,
  .light .text-input {
    background-color: #ffffff;
    color: #0f172a;
    border: 1px solid #cbd5e1;
    color-scheme: light;
  }

  .select-field:focus,
  .text-input:focus {
    border-color: #3b82f6;
  }

  .dark .select-field option {
    background-color: #0f172a;
    color: #f1f5f9;
  }

  .light .select-field option {
    background-color: #ffffff;
    color: #0f172a;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(0, 0, 0, 0.05);
  }

  .cancel-btn {
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: transparent;
    color: inherit;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
  }

  .save-settings-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid #2563eb;
    background: #2563eb;
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
