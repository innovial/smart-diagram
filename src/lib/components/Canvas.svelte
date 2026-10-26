<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Panzoom from '@panzoom/panzoom';
  import type { PanzoomObject } from '@panzoom/panzoom';
  import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize2,
    Grid,
    AlertCircle,
    Check,
    Copy,
    Download,
    Sparkles
  } from '@lucide/svelte';

  interface Props {
    svgContent: string;
    error?: string;
    errorLine?: number;
    theme?: 'dark' | 'light';
    isRendering?: boolean;
    onExportSvg?: () => void;
    onExportPng?: () => void;
    onFixWithAi?: () => void;
  }

  let {
    svgContent = '',
    error = '',
    errorLine,
    theme = 'dark',
    isRendering = false,
    onExportSvg,
    onExportPng,
    onFixWithAi
  }: Props = $props();

  let viewportEl: HTMLDivElement | null = $state(null);
  let canvasTargetEl: HTMLDivElement | null = $state(null);
  let panzoomInstance: PanzoomObject | null = null;
  let zoomLevel = $state(100);
  let gridMode: 'dots' | 'lines' | 'none' = $state('dots');
  let copyFeedback = $state(false);

  function initPanzoom() {
    if (!canvasTargetEl || !viewportEl) return;

    if (panzoomInstance) {
      panzoomInstance.destroy();
      panzoomInstance = null;
    }

    panzoomInstance = Panzoom(canvasTargetEl, {
      canvas: true,
      maxScale: 10,
      minScale: 0.05,
      step: 0.2,
      cursor: 'grab'
    });

    const onWheel = (event: WheelEvent) => {
      if (!panzoomInstance) return;
      panzoomInstance.zoomWithWheel(event, { step: 0.15 });
      updateZoomPercentage();
    };

    viewportEl.addEventListener('wheel', onWheel, { passive: false });

    canvasTargetEl.addEventListener('panzoomchange', () => {
      updateZoomPercentage();
    });
  }

  function updateZoomPercentage() {
    if (panzoomInstance) {
      zoomLevel = Math.round(panzoomInstance.getScale() * 100);
    }
  }

  export function zoomIn() {
    if (panzoomInstance) {
      panzoomInstance.zoomIn();
      updateZoomPercentage();
    }
  }

  export function zoomOut() {
    if (panzoomInstance) {
      panzoomInstance.zoomOut();
      updateZoomPercentage();
    }
  }

  export function resetZoom() {
    if (panzoomInstance) {
      panzoomInstance.reset();
      updateZoomPercentage();
    }
  }

  export function fitToScreen() {
    if (!canvasTargetEl || !viewportEl || !panzoomInstance) return;
    const svgEl = canvasTargetEl.querySelector('svg');
    if (!svgEl) return;

    const vpWidth = viewportEl.clientWidth;
    const vpHeight = viewportEl.clientHeight;
    if (vpWidth <= 0 || vpHeight <= 0) return;

    const availWidth = vpWidth - 80;
    const availHeight = vpHeight - 80;

    let svgW = 0;
    let svgH = 0;

    // 1. Try viewBox attribute
    const viewBoxAttr = svgEl.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
      if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
        svgW = parts[2];
        svgH = parts[3];
      }
    }

    // 2. Try getBBox
    if (!svgW || !svgH) {
      try {
        const bbox = svgEl.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          svgW = bbox.width;
          svgH = bbox.height;
        }
      } catch {
        // getBBox fallback handled below
      }
    }

    // 3. Try client dimensions or fallback
    if (!svgW || !svgH) {
      svgW = svgEl.clientWidth || 800;
      svgH = svgEl.clientHeight || 600;
    }

    const scaleX = availWidth / svgW;
    const scaleY = availHeight / svgH;
    const targetScale = Math.min(scaleX, scaleY, 1.2);
    const finalScale = Math.max(0.05, targetScale);

    panzoomInstance.zoom(finalScale, { animate: true });
    panzoomInstance.pan(0, 0, { animate: true });
    updateZoomPercentage();
  }

  function toggleGrid() {
    if (gridMode === 'dots') gridMode = 'lines';
    else if (gridMode === 'lines') gridMode = 'none';
    else gridMode = 'dots';
  }

  async function copySvgCode() {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      copyFeedback = true;
      setTimeout(() => {
        copyFeedback = false;
      }, 2000);
    } catch {
      // clipboard access error handled gracefully
    }
  }

  onMount(() => {
    initPanzoom();
  });

  let lastSvg = '';
  $effect(() => {
    // When svgContent updates, auto-fit to show the entire diagram
    if (svgContent && canvasTargetEl && svgContent !== lastSvg) {
      lastSvg = svgContent;
      setTimeout(() => {
        fitToScreen();
      }, 60);
    }
  });

  onDestroy(() => {
    if (panzoomInstance) {
      panzoomInstance.destroy();
      panzoomInstance = null;
    }
  });
</script>

<div
  class="canvas-container {theme} grid-{gridMode}"
  bind:this={viewportEl}
  role="region"
  aria-label="Diagram Interactive Viewport"
>
  <!-- Floating Canvas Controls -->
  <div class="controls-overlay top-right">
    <div class="control-group">
      <button class="control-btn" onclick={toggleGrid} title="Toggle Canvas Grid ({gridMode})">
        <Grid size={15} />
      </button>
      <button class="control-btn" onclick={copySvgCode} title="Copy SVG code to clipboard">
        {#if copyFeedback}
          <Check size={15} color="#10b981" />
        {:else}
          <Copy size={15} />
        {/if}
      </button>
      {#if onExportSvg}
        <button class="control-btn" onclick={onExportSvg} title="Export Clean SVG">
          <Download size={15} />
          <span class="btn-label">SVG</span>
        </button>
      {/if}
      {#if onExportPng}
        <button class="control-btn" onclick={onExportPng} title="Export Rasterized PNG">
          <Download size={15} />
          <span class="btn-label">PNG</span>
        </button>
      {/if}
    </div>
  </div>

  <div class="controls-overlay bottom-right">
    <div class="control-group zoom-group">
      <button class="control-btn" onclick={zoomOut} title="Zoom Out (-)">
        <ZoomOut size={16} />
      </button>
      <span class="zoom-indicator">{zoomLevel}%</span>
      <button class="control-btn" onclick={zoomIn} title="Zoom In (+)">
        <ZoomIn size={16} />
      </button>
      <div class="divider"></div>
      <button class="control-btn" onclick={resetZoom} title="Reset to 100%">
        <RotateCcw size={15} />
      </button>
      <button class="control-btn" onclick={fitToScreen} title="Fit to Screen (Show entire diagram)">
        <Maximize2 size={15} />
        <span class="btn-label">Fit</span>
      </button>
    </div>
  </div>

  <!-- Interactive Pan & Zoom SVG Wrapper -->
  <div class="canvas-viewport">
    <div class="canvas-target" bind:this={canvasTargetEl}>
      {#if svgContent}
        <div class="svg-host">
          {@html svgContent}
        </div>
      {:else if !error}
        <div class="empty-state">
          <p class="empty-title">No Diagram Rendered</p>
          <p class="empty-sub">Type diagram code on the left or choose a template to get started</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Inline Error Notification Card -->
  {#if error}
    <div class="error-banner">
      <div class="error-header">
        <AlertCircle size={16} class="error-icon" />
        <span class="error-title">
          {#if errorLine}
            Syntax Error at Line {errorLine}
          {:else}
            Syntax Error
          {/if}
        </span>
        {#if onFixWithAi}
          <button class="fix-ai-btn" onclick={onFixWithAi} title="Fix syntax error with AI">
            <Sparkles size={12} />
            <span>Fix with AI</span>
          </button>
        {/if}
      </div>
      <p class="error-body">{error}</p>
    </div>
  {/if}

  <!-- Rendering status pulse -->
  {#if isRendering}
    <div class="rendering-indicator">
      <div class="pulse-dot"></div>
      <span>Rendering...</span>
    </div>
  {/if}
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    user-select: none;
    transition: background-color 0.2s ease;
  }

  /* Grid styles */
  .canvas-container.dark {
    background-color: #0b0f19;
  }

  .canvas-container.light {
    background-color: #f8fafc;
  }

  .canvas-container.dark.grid-dots {
    background-image: radial-gradient(#1e293b 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .canvas-container.light.grid-dots {
    background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
    background-size: 20px 20px;
  }

  .canvas-container.dark.grid-lines {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .canvas-container.light.grid-lines {
    background-image:
      linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .canvas-viewport {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
  }

  .canvas-viewport:active {
    cursor: grabbing;
  }

  .canvas-target {
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
    padding: 60px;
  }

  .svg-host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.svg-host svg) {
    display: block;
    width: auto;
    height: auto;
    filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.15));
  }

  /* Floating controls */
  .controls-overlay {
    position: absolute;
    z-index: 20;
    pointer-events: none;
  }

  .controls-overlay.top-right {
    top: 14px;
    right: 14px;
  }

  .controls-overlay.bottom-right {
    bottom: 14px;
    right: 14px;
  }

  .control-group {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
  }

  .dark .control-group {
    background-color: rgba(17, 24, 39, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
  }

  .light .control-group {
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(0, 0, 0, 0.08);
    color: #1e293b;
  }

  .control-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 8px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: inherit;
    transition: background-color 0.15s ease, transform 0.1s ease;
  }

  .dark .control-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .light .control-btn:hover {
    background-color: rgba(0, 0, 0, 0.06);
  }

  .control-btn:active {
    transform: scale(0.96);
  }

  .btn-label {
    font-size: 11px;
    font-weight: 600;
  }

  .zoom-indicator {
    font-size: 11px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    min-width: 44px;
    text-align: center;
    padding: 0 4px;
  }

  .divider {
    width: 1px;
    height: 16px;
    background: rgba(148, 163, 184, 0.2);
    margin: 0 2px;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 40px;
    border: 2px dashed rgba(148, 163, 184, 0.25);
    border-radius: 12px;
    max-width: 360px;
  }

  .empty-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px 0;
    color: #94a3b8;
  }

  .empty-sub {
    font-size: 12px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }

  /* Error banner */
  .error-banner {
    position: absolute;
    bottom: 60px;
    left: 20px;
    right: 20px;
    max-width: 580px;
    background: #450a0a;
    border: 1px solid #dc2626;
    border-radius: 8px;
    padding: 10px 14px;
    color: #fecaca;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    z-index: 25;
    animation: slideUp 0.15s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .error-title {
    font-size: 12px;
    font-weight: 600;
    color: #fca5a5;
  }

  .fix-ai-btn {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(248, 113, 113, 0.4);
    background: rgba(220, 38, 38, 0.3);
    color: #fecaca;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .fix-ai-btn:hover {
    background: rgba(220, 38, 38, 0.5);
    color: #ffffff;
  }
  .error-body {
    margin: 0;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1.4;
    white-space: pre-wrap;
    max-height: 100px;
    overflow-y: auto;
  }

  /* Rendering pill */
  .rendering-indicator {
    position: absolute;
    top: 14px;
    left: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 11px;
    font-weight: 500;
    z-index: 20;
    backdrop-filter: blur(4px);
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #3b82f6;
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 0.3;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1.2);
    }
  }
</style>
