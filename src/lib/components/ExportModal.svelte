<script lang="ts">
  import { svgToPngBlob, downloadBlob, downloadText, copyPngToClipboard } from '$lib/export';
  import { X, Download, Copy, Check, Image as ImageIcon, FileCode } from '@lucide/svelte';

  interface Props {
    isOpen: boolean;
    svgContent: string;
    diagramName?: string;
    theme?: 'dark' | 'light';
    onClose: () => void;
  }

  let {
    isOpen = false,
    svgContent = '',
    diagramName = 'diagram',
    theme = 'dark',
    onClose
  }: Props = $props();

  let scale = $state(2);
  let backgroundMode: 'transparent' | 'dark' | 'light' = $state('transparent');
  let isExporting = $state(false);
  let copyPngStatus = $state(false);
  let copySvgStatus = $state(false);

  const backgroundColors = {
    transparent: 'transparent',
    dark: '#0f172a',
    light: '#ffffff'
  };

  async function handleExportPng() {
    if (!svgContent || isExporting) return;
    isExporting = true;
    try {
      const blob = await svgToPngBlob(svgContent, {
        scale,
        backgroundColor: backgroundColors[backgroundMode]
      });
      downloadBlob(blob, `${diagramName}.png`);
      onClose();
    } catch (e) {
      console.error('Export PNG failed:', e);
    } finally {
      isExporting = false;
    }
  }

  function handleExportSvg() {
    if (!svgContent) return;
    downloadText(svgContent, `${diagramName}.svg`, 'image/svg+xml');
    onClose();
  }

  async function handleCopyPng() {
    if (!svgContent || isExporting) return;
    isExporting = true;
    try {
      const ok = await copyPngToClipboard(svgContent, {
        scale,
        backgroundColor: backgroundColors[backgroundMode]
      });
      if (ok) {
        copyPngStatus = true;
        setTimeout(() => (copyPngStatus = false), 2000);
      }
    } catch (e) {
      console.error('Copy PNG failed:', e);
    } finally {
      isExporting = false;
    }
  }

  async function handleCopySvg() {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      copySvgStatus = true;
      setTimeout(() => (copySvgStatus = false), 2000);
    } catch (e) {
      console.error('Copy SVG failed:', e);
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop">
    <button class="backdrop-click-target" onclick={onClose} aria-label="Close dialog overlay"></button>
    <div
      class="modal-card {theme}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h3 id="export-title">Export Diagram</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Scale Selector -->
        <div class="option-row">
          <label class="option-label" for="scale-select">Resolution Scale:</label>
          <div class="pill-group" id="scale-select">
            <button
              class="pill-btn"
              class:active={scale === 1}
              onclick={() => (scale = 1)}
            >
              1x (Standard)
            </button>
            <button
              class="pill-btn"
              class:active={scale === 2}
              onclick={() => (scale = 2)}
            >
              2x (HD)
            </button>
            <button
              class="pill-btn"
              class:active={scale === 3}
              onclick={() => (scale = 3)}
            >
              3x (Ultra HD)
            </button>
          </div>
        </div>

        <!-- Background Selector -->
        <div class="option-row">
          <label class="option-label" for="bg-select">Background:</label>
          <div class="pill-group" id="bg-select">
            <button
              class="pill-btn"
              class:active={backgroundMode === 'transparent'}
              onclick={() => (backgroundMode = 'transparent')}
            >
              Transparent
            </button>
            <button
              class="pill-btn"
              class:active={backgroundMode === 'dark'}
              onclick={() => (backgroundMode = 'dark')}
            >
              Dark (#0f172a)
            </button>
            <button
              class="pill-btn"
              class:active={backgroundMode === 'light'}
              onclick={() => (backgroundMode = 'light')}
            >
              Light (#ffffff)
            </button>
          </div>
        </div>

        <!-- Action Grid -->
        <div class="actions-grid">
          <button class="action-card primary" onclick={handleExportPng} disabled={isExporting}>
            <ImageIcon size={20} />
            <div class="action-info">
              <span class="action-title">Download PNG</span>
              <span class="action-desc">High-res raster bitmap ({scale}x scale)</span>
            </div>
            <Download size={16} class="action-end" />
          </button>

          <button class="action-card" onclick={handleExportSvg}>
            <FileCode size={20} />
            <div class="action-info">
              <span class="action-title">Download SVG</span>
              <span class="action-desc">Infinite vector scalability</span>
            </div>
            <Download size={16} class="action-end" />
          </button>

          <button class="action-card" onclick={handleCopyPng} disabled={isExporting}>
            {#if copyPngStatus}
              <Check size={20} color="#10b981" />
            {:else}
              <Copy size={20} />
            {/if}
            <div class="action-info">
              <span class="action-title">
                {copyPngStatus ? 'Copied PNG!' : 'Copy PNG Image'}
              </span>
              <span class="action-desc">Paste directly into Docs / Slack</span>
            </div>
          </button>

          <button class="action-card" onclick={handleCopySvg}>
            {#if copySvgStatus}
              <Check size={20} color="#10b981" />
            {:else}
              <Copy size={20} />
            {/if}
            <div class="action-info">
              <span class="action-title">
                {copySvgStatus ? 'Copied SVG!' : 'Copy SVG Markup'}
              </span>
              <span class="action-desc">Raw vector code to clipboard</span>
            </div>
          </button>
        </div>
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
    width: 100%;
    max-width: 480px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
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
  }

  .light {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #0f172a;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
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
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .option-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .option-label {
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
  }

  .pill-group {
    display: flex;
    gap: 6px;
    background: rgba(0, 0, 0, 0.15);
    padding: 3px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.1);
  }

  .pill-btn {
    flex: 1;
    padding: 6px 10px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    color: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn:hover {
    background: rgba(148, 163, 184, 0.1);
  }

  .pill-btn.active {
    background: #2563eb;
    color: #ffffff;
    font-weight: 600;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 6px;
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(255, 255, 255, 0.03);
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .action-card:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
  }

  .action-card.primary {
    border-color: rgba(37, 99, 235, 0.5);
    background: rgba(37, 99, 235, 0.1);
  }

  .action-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-title {
    font-size: 12px;
    font-weight: 600;
  }

  .action-desc {
    font-size: 10px;
    color: #94a3b8;
  }

  .action-end {
    color: #94a3b8;
  }
</style>
