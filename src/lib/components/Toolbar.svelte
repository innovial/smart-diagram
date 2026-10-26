<script lang="ts">
  import type { DiagramType } from '$lib/types';
  import {
    FolderOpen,
    Save,
    FilePlus,
    LayoutTemplate,
    Download,
    Sun,
    Moon,
    Columns,
    Maximize,
    Database,
    GitBranch,
    Table,
    Layers,
    Sparkles
  } from '@lucide/svelte';

  interface Props {
    diagramType: DiagramType;
    viewMode: 'interactive' | 'mermaid-er' | 'inspector';
    theme: 'dark' | 'light';
    editorOpen: boolean;
    aiPanelOpen: boolean;
    hasErrors: boolean;
    isRendering: boolean;
    onChangeType: (type: DiagramType) => void;
    onChangeViewMode: (mode: 'interactive' | 'mermaid-er' | 'inspector') => void;
    onToggleTheme: () => void;
    onToggleEditor: () => void;
    onNew: () => void;
    onOpen: () => void;
    onSave: () => void;
    onOpenTemplates: () => void;
    onOpenExport: () => void;
    onOpenAi: () => void;
  }

  let {
    diagramType,
    viewMode,
    theme,
    editorOpen,
    aiPanelOpen,
    hasErrors,
    isRendering,
    onChangeType,
    onChangeViewMode,
    onToggleTheme,
    onToggleEditor,
    onNew,
    onOpen,
    onSave,
    onOpenTemplates,
    onOpenExport,
    onOpenAi
  }: Props = $props();
</script>

<header class="app-toolbar {theme}">
  <!-- Brand / Title -->
  <div class="toolbar-section left">
    <div class="brand">
      <div class="brand-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H10V10H4V4Z" fill="#3b82f6" rx="1.5" />
          <path d="M14 4H20V10H14V4Z" fill="#8b5cf6" rx="1.5" />
          <path d="M9 14H15V20H9V14Z" fill="#10b981" rx="1.5" />
          <path d="M7 10V12H12V14" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round" />
          <path d="M17 10V12H12" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <span class="brand-text">Smart Diagram</span>
    </div>

    <!-- Mode switch: Mermaid vs DBML -->
    <div class="segmented-control mode-selector">
      <button
        class="segment-btn"
        class:active={diagramType === 'mermaid'}
        onclick={() => onChangeType('mermaid')}
        title="Mermaid Diagrams (Flowchart, Sequence, State, GitGraph, etc.)"
      >
        <GitBranch size={13} />
        <span>Mermaid</span>
      </button>
      <button
        class="segment-btn"
        class:active={diagramType === 'dbml'}
        onclick={() => onChangeType('dbml')}
        title="DBML Database Modeling"
      >
        <Database size={13} />
        <span>DBML</span>
      </button>
    </div>

    <!-- If DBML, toggle between ER Diagram and Schema Table view -->
    {#if diagramType === 'dbml'}
      <div class="segmented-control sub-view-selector">
        <button
          class="segment-btn"
          class:active={viewMode === 'interactive'}
          onclick={() => onChangeViewMode('interactive')}
          title="Dedicated Interactive ER Canvas (Draggable tables & field-to-field lines)"
        >
          <Layers size={13} />
          <span>Interactive ER</span>
        </button>
        <button
          class="segment-btn"
          class:active={viewMode === 'mermaid-er'}
          onclick={() => onChangeViewMode('mermaid-er')}
          title="Render as Mermaid ER Diagram"
        >
          <GitBranch size={13} />
          <span>Mermaid ER</span>
        </button>
        <button
          class="segment-btn"
          class:active={viewMode === 'inspector'}
          onclick={() => onChangeViewMode('inspector')}
          title="Relational Schema Tables Inspector"
        >
          <Table size={13} />
          <span>Tables</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- Center Actions: File & Templates -->
  <div class="toolbar-section center">
    <button class="tool-btn" onclick={onNew} title="New Diagram">
      <FilePlus size={15} />
      <span class="btn-text">New</span>
    </button>
    <button class="tool-btn" onclick={onOpen} title="Open File (.mmd, .dbml, .txt)">
      <FolderOpen size={15} />
      <span class="btn-text">Open</span>
    </button>
    <button class="tool-btn" onclick={onSave} title="Save / Download File">
      <Save size={15} />
      <span class="btn-text">Save</span>
    </button>
    <div class="tool-divider"></div>
    <button class="tool-btn highlight" onclick={onOpenTemplates} title="Browse Sample Templates">
      <LayoutTemplate size={15} />
      <span class="btn-text">Templates</span>
    </button>
    <button
      class="tool-btn ai-btn"
      class:active={aiPanelOpen}
      onclick={onOpenAi}
      title="AI Diagram Copilot (Ctrl+K)"
    >
      <Sparkles size={14} class="ai-sparkle-icon" />
      <span class="btn-text">AI Agent</span>
    </button>
  </div>

  <!-- Right Actions: Export, Layout, Theme, Status -->
  <div class="toolbar-section right">
    <div class="status-indicator">
      {#if isRendering}
        <span class="status-pill status-rendering">Rendering...</span>
      {:else if hasErrors}
        <span class="status-pill status-error">Syntax Error</span>
      {:else}
        <span class="status-pill status-ready">Ready</span>
      {/if}
    </div>

    <button class="action-btn export-btn" onclick={onOpenExport} title="Export Diagram as PNG or SVG">
      <Download size={14} />
      <span>Export</span>
    </button>

    <div class="tool-divider"></div>

    <button
      class="tool-btn icon-only"
      class:active={!editorOpen}
      onclick={onToggleEditor}
      title={editorOpen ? 'Collapse Code Editor' : 'Show Code Editor'}
    >
      <Columns size={16} />
    </button>

    <button
      class="tool-btn icon-only"
      onclick={onToggleTheme}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {#if theme === 'dark'}
        <Sun size={16} />
      {:else}
        <Moon size={16} />
      {/if}
    </button>
  </div>
</header>

<style>
  .app-toolbar {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    user-select: none;
    z-index: 30;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .dark {
    background-color: #0f172a;
    border-bottom-color: #1e293b;
    color: #f1f5f9;
  }

  .light {
    background-color: #ffffff;
    border-bottom-color: #e2e8f0;
    color: #0f172a;
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-section.left {
    flex: 1;
  }

  .toolbar-section.center {
    display: flex;
    justify-content: center;
  }

  .toolbar-section.right {
    flex: 1;
    justify-content: flex-end;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 12px;
  }

  .brand-logo {
    display: flex;
    align-items: center;
  }

  .brand-text {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.2px;
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .segmented-control {
    display: flex;
    background: rgba(0, 0, 0, 0.15);
    padding: 3px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  .light .segmented-control {
    background: #f1f5f9;
  }

  .segment-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition: all 0.15s ease;
  }

  .segment-btn:hover {
    opacity: 1;
  }

  .segment-btn.active {
    background: #2563eb;
    color: #ffffff;
    opacity: 1;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .tool-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    color: inherit;
    cursor: pointer;
    opacity: 0.8;
    transition: all 0.15s ease;
  }

  .tool-btn:hover {
    opacity: 1;
    background: rgba(148, 163, 184, 0.12);
  }

  .tool-btn.highlight {
    color: #38bdf8;
  }
  .tool-btn.highlight {
    color: #38bdf8;
  }

  .tool-btn.ai-btn {
    color: #c084fc;
    background: rgba(192, 132, 252, 0.1);
    border: 1px solid rgba(192, 132, 252, 0.2);
  }

  .tool-btn.ai-btn:hover {
    background: rgba(192, 132, 252, 0.2);
    color: #d8b4fe;
  }

  .tool-btn.ai-btn.active {
    background: #9333ea;
    border-color: #9333ea;
    color: #ffffff;
    opacity: 1;
  }

  .tool-btn.ai-btn.active :global(.ai-sparkle-icon) {
    color: #ffffff;
  }
  .tool-btn.icon-only {
    padding: 6px;
  }

  .tool-btn.active {
    background: rgba(37, 99, 235, 0.15);
    color: #3b82f6;
  }

  .tool-divider {
    width: 1px;
    height: 18px;
    background: rgba(148, 163, 184, 0.2);
    margin: 0 4px;
  }

  .status-indicator {
    margin-right: 4px;
  }

  .status-pill {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .status-ready {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  .status-rendering {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  .status-error {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .action-btn.export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid #2563eb;
    background: #2563eb;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.3);
    transition: background-color 0.15s ease;
  }

  .action-btn.export-btn:hover {
    background: #1d4ed8;
  }
</style>
