<script lang="ts">
  import { onMount } from 'svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import Canvas from '$lib/components/Canvas.svelte';
  import DbmlInspector from '$lib/components/DbmlInspector.svelte';
  import ExportModal from '$lib/components/ExportModal.svelte';
  import TemplateModal from '$lib/components/TemplateModal.svelte';

  import { renderMermaid } from '$lib/engines/mermaid';
  import { renderDbml } from '$lib/engines/dbml';
  import { downloadText } from '$lib/export';
  import { TEMPLATES } from '$lib/engines/templates';
  import type { DiagramType, DbmlSchemaData, DiagramTemplate } from '$lib/types';

  // State
  let diagramType: DiagramType = $state('mermaid');
  let viewMode: 'diagram' | 'inspector' = $state('diagram');
  let theme: 'dark' | 'light' = $state('dark');
  let editorOpen = $state(true);
  let editorWidth = $state(480);
  let isDragging = $state(false);

  // File & Content
  let currentFileName = $state('diagram.mmd');
  let code = $state(TEMPLATES[0].code);
  let svgContent = $state('');
  let errorMessage = $state('');
  let errorLine = $state<number | undefined>(undefined);
  let isRendering = $state(false);

  // DBML Extra Data
  let dbmlSchema = $state<DbmlSchemaData | undefined>(undefined);
  let dbmlMermaidEr = $state<string>('');

  // Modals
  let isExportModalOpen = $state(false);
  let isTemplateModalOpen = $state(false);

  // Debounce handle
  let renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let fileInputEl: HTMLInputElement | null = null;

  async function triggerRender() {
    isRendering = true;
    try {
      const activeTheme = theme === 'dark' ? 'dark' : 'default';

      if (diagramType === 'mermaid') {
        const result = await renderMermaid(code, activeTheme);
        if (result.success) {
          svgContent = result.svg || '';
          errorMessage = '';
          errorLine = undefined;
        } else {
          errorMessage = result.error || 'Failed to render Mermaid diagram';
          errorLine = result.line;
        }
      } else {
        const result = await renderDbml(code, activeTheme);
        if (result.success) {
          svgContent = result.svg || '';
          errorMessage = '';
          errorLine = undefined;
          dbmlSchema = result.schema;
          dbmlMermaidEr = result.mermaidEr || '';
        } else {
          errorMessage = result.error || 'Failed to parse DBML database schema';
          errorLine = result.line;
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isRendering = false;
    }
  }

  function queueRender(delay = 200) {
    if (renderDebounceTimer) {
      clearTimeout(renderDebounceTimer);
    }
    renderDebounceTimer = setTimeout(() => {
      triggerRender();
    }, delay);
  }

  function handleCodeChange(newCode: string) {
    code = newCode;
    queueRender(220);
  }

  function handleTypeChange(nextType: DiagramType) {
    if (nextType === diagramType) return;
    diagramType = nextType;
    viewMode = 'diagram';

    // Switch default template if current code matches standard template
    if (nextType === 'dbml') {
      currentFileName = 'schema.dbml';
      const defaultDbml = TEMPLATES.find((t) => t.id === 'dbml-ecommerce');
      if (defaultDbml) {
        code = defaultDbml.code;
      }
    } else {
      currentFileName = 'diagram.mmd';
      const defaultMermaid = TEMPLATES.find((t) => t.id === 'mermaid-flowchart');
      if (defaultMermaid) {
        code = defaultMermaid.code;
      }
    }

    queueRender(50);
  }

  function handleToggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    queueRender(50);
  }

  function handleSelectTemplate(template: DiagramTemplate) {
    diagramType = template.type;
    viewMode = 'diagram';
    currentFileName = template.type === 'dbml' ? 'schema.dbml' : 'diagram.mmd';
    code = template.code;
    queueRender(50);
  }

  function handleNew() {
    if (diagramType === 'mermaid') {
      code = 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]';
      currentFileName = 'new-diagram.mmd';
    } else {
      code = 'Table users {\n  id integer [pk, increment]\n  email varchar [unique, not null]\n}';
      currentFileName = 'new-schema.dbml';
    }
    queueRender(50);
  }

  function handleOpen() {
    if (!fileInputEl) {
      fileInputEl = document.createElement('input');
      fileInputEl.type = 'file';
      fileInputEl.accept = '.mmd,.mermaid,.dbml,.sql,.txt';
      fileInputEl.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const file = target?.files?.[0];
        if (!file) return;

        currentFileName = file.name;
        if (file.name.endsWith('.dbml')) {
          diagramType = 'dbml';
        } else if (file.name.endsWith('.mmd') || file.name.endsWith('.mermaid')) {
          diagramType = 'mermaid';
        }

        const reader = new FileReader();
        reader.onload = (re) => {
          const content = re.target?.result;
          if (typeof content === 'string') {
            code = content;
            queueRender(50);
          }
        };
        reader.readAsText(file);
      };
    }
    fileInputEl.click();
  }

  function handleSave() {
    const ext = diagramType === 'dbml' ? '.dbml' : '.mmd';
    let filename = currentFileName;
    if (!filename.endsWith(ext)) {
      filename = filename.replace(/\.[^/.]+$/, '') + ext;
    }
    downloadText(code, filename, 'text/plain');
  }

  // Split-pane resizing
  function startDragging(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', stopDragging);
  }

  function onDragging(e: MouseEvent) {
    if (!isDragging) return;
    const newWidth = Math.max(260, Math.min(e.clientX, window.innerWidth * 0.75));
    editorWidth = newWidth;
  }

  function stopDragging() {
    isDragging = false;
    window.removeEventListener('mousemove', onDragging);
    window.removeEventListener('mouseup', stopDragging);
  }

  // Keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      editorOpen = !editorOpen;
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      isExportModalOpen = true;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    // Initial diagram render
    triggerRender();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (renderDebounceTimer) {
        clearTimeout(renderDebounceTimer);
      }
    };
  });
</script>

<div class="workspace {theme}">
  <!-- Top Navigation & Actions Bar -->
  <Toolbar
    {diagramType}
    {viewMode}
    {theme}
    {editorOpen}
    hasErrors={Boolean(errorMessage)}
    {isRendering}
    onChangeType={handleTypeChange}
    onChangeViewMode={(mode) => (viewMode = mode)}
    onToggleTheme={handleToggleTheme}
    onToggleEditor={() => (editorOpen = !editorOpen)}
    onNew={handleNew}
    onOpen={handleOpen}
    onSave={handleSave}
    onOpenTemplates={() => (isTemplateModalOpen = true)}
    onOpenExport={() => (isExportModalOpen = true)}
  />

  <!-- Main Content Split Workspace -->
  <main class="workspace-body">
    {#if editorOpen}
      <!-- Left Panel: CodeMirror Editor -->
      <section
        class="editor-pane"
        style="width: {editorWidth}px;"
        aria-label="Diagram Source Editor"
      >
        <div class="pane-header">
          <span class="file-tab">
            <span class="file-dot"></span>
            <span class="file-title">{currentFileName}</span>
          </span>
          <span class="char-count">{code.length} chars</span>
        </div>
        <div class="pane-content">
          <Editor
            bind:value={code}
            {theme}
            onChange={handleCodeChange}
          />
        </div>
      </section>

      <!-- Resizable Splitter Handle -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
      <div
        class="splitter-bar"
        class:dragging={isDragging}
        onmousedown={startDragging}
        role="separator"
        tabindex="-1"
        aria-valuenow={editorWidth}
        aria-valuemin={260}
        aria-valuemax={1200}
        aria-orientation="vertical"
        aria-label="Resize Split View"
        onkeydown={(e) => {
          if (e.key === 'ArrowLeft') {
            editorWidth = Math.max(260, editorWidth - 20);
          } else if (e.key === 'ArrowRight') {
            editorWidth = Math.min(1200, editorWidth + 20);
          }
        }}
      >
        <div class="splitter-line"></div>
      </div>
    {/if}

    <!-- Right Panel: Visual Viewport or DBML Inspector -->
    <section class="viewer-pane" aria-label="Diagram Preview Viewport">
      {#if diagramType === 'dbml' && viewMode === 'inspector'}
        <DbmlInspector
          schema={dbmlSchema}
          {theme}
          mermaidErCode={dbmlMermaidEr}
        />
      {:else}
        <Canvas
          {svgContent}
          error={errorMessage}
          {errorLine}
          {theme}
          {isRendering}
          onExportSvg={() => (isExportModalOpen = true)}
          onExportPng={() => (isExportModalOpen = true)}
        />
      {/if}
    </section>
  </main>

  <!-- Modals -->
  <ExportModal
    isOpen={isExportModalOpen}
    {svgContent}
    diagramName={currentFileName.replace(/\.[^/.]+$/, '')}
    {theme}
    onClose={() => (isExportModalOpen = false)}
  />

  <TemplateModal
    isOpen={isTemplateModalOpen}
    currentType={diagramType}
    {theme}
    onSelect={handleSelectTemplate}
    onClose={() => (isTemplateModalOpen = false)}
  />
</div>

<style>
  .workspace {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dark {
    background-color: #0b0f19;
    color: #f1f5f9;
  }

  .light {
    background-color: #f8fafc;
    color: #0f172a;
  }

  .workspace-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  /* Left Editor Pane */
  .editor-pane {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid rgba(148, 163, 184, 0.12);
    flex-shrink: 0;
  }

  .pane-header {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    background: rgba(0, 0, 0, 0.15);
    user-select: none;
  }

  .light .pane-header {
    background: #f1f5f9;
  }

  .file-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: inherit;
  }

  .file-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #3b82f6;
  }

  .char-count {
    font-size: 10px;
    color: #94a3b8;
  }

  .pane-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* Splitter */
  .splitter-bar {
    width: 6px;
    height: 100%;
    cursor: col-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    user-select: none;
    z-index: 10;
    transition: background-color 0.15s ease;
  }

  .splitter-bar:hover,
  .splitter-bar.dragging {
    background-color: rgba(59, 130, 246, 0.4);
  }

  .splitter-line {
    width: 1px;
    height: 24px;
    background: rgba(148, 163, 184, 0.3);
  }

  /* Right Viewer Pane */
  .viewer-pane {
    flex: 1;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
