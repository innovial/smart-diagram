<script lang="ts">
  import { TEMPLATES } from '$lib/engines/templates';
  import type { DiagramTemplate, DiagramType } from '$lib/types';
  import { X, Search, FileCode, Check } from '@lucide/svelte';

  interface Props {
    isOpen: boolean;
    currentType: DiagramType;
    theme?: 'dark' | 'light';
    onSelect: (template: DiagramTemplate) => void;
    onClose: () => void;
  }

  let {
    isOpen = false,
    currentType,
    theme = 'dark',
    onSelect,
    onClose
  }: Props = $props();

  let searchQuery = $state('');
  let activeTab: 'all' | 'mermaid' | 'dbml' = $state('all');

  const filteredTemplates = $derived(() => {
    const q = searchQuery.toLowerCase().trim();
    return TEMPLATES.filter((t) => {
      if (activeTab === 'mermaid' && t.type !== 'mermaid') return false;
      if (activeTab === 'dbml' && t.type !== 'dbml') return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  });
</script>

{#if isOpen}
  <div class="modal-backdrop">
    <button class="backdrop-click-target" onclick={onClose} aria-label="Close dialog overlay"></button>
    <div
      class="modal-card {theme}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <div class="header-left">
          <FileCode size={18} class="header-icon" />
          <h3 id="templates-title">Diagram Templates</h3>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <Search size={14} class="search-icon" />
          <input
            type="text"
            placeholder="Search templates..."
            bind:value={searchQuery}
            class="search-input"
          />
        </div>
        <div class="tab-pills">
          <button
            class="pill-btn"
            class:active={activeTab === 'all'}
            onclick={() => (activeTab = 'all')}
          >
            All
          </button>
          <button
            class="pill-btn"
            class:active={activeTab === 'mermaid'}
            onclick={() => (activeTab = 'mermaid')}
          >
            Mermaid
          </button>
          <button
            class="pill-btn"
            class:active={activeTab === 'dbml'}
            onclick={() => (activeTab = 'dbml')}
          >
            DBML
          </button>
        </div>
      </div>

      <div class="templates-list">
        {#each filteredTemplates() as template}
          <div class="template-item">
            <div class="template-info">
              <div class="template-header">
                <span class="template-badge badge-{template.type}">
                  {template.type.toUpperCase()}
                </span>
                <span class="template-name">{template.name}</span>
              </div>
              <p class="template-desc">{template.description}</p>
            </div>
            <button
              class="load-btn"
              onclick={() => {
                onSelect(template);
                onClose();
              }}
            >
              Use Template
            </button>
          </div>
        {/each}

        {#if filteredTemplates().length === 0}
          <div class="empty-state">No templates found matching your search.</div>
        {/if}
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
    max-width: 580px;
    max-height: 80vh;
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
    padding: 14px 20px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.header-icon) {
    color: #3b82f6;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 15px;
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

  .filter-bar {
    padding: 12px 20px;
    display: flex;
    gap: 12px;
    align-items: center;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    background: rgba(0, 0, 0, 0.08);
  }

  .search-box {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.search-icon) {
    position: absolute;
    left: 10px;
    color: #94a3b8;
  }

  .search-input {
    width: 100%;
    padding: 7px 10px 7px 32px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(0, 0, 0, 0.15);
    color: inherit;
    font-size: 12px;
    outline: none;
  }

  .search-input:focus {
    border-color: #3b82f6;
  }

  .tab-pills {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.15);
    padding: 3px;
    border-radius: 6px;
  }

  .pill-btn {
    padding: 4px 8px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
  }

  .pill-btn:hover {
    opacity: 1;
  }

  .pill-btn.active {
    background: #2563eb;
    color: #ffffff;
    opacity: 1;
  }

  .templates-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .template-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(255, 255, 255, 0.02);
    gap: 12px;
    transition: all 0.15s ease;
  }

  .template-item:hover {
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.04);
  }

  .template-info {
    flex: 1;
  }

  .template-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .template-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
  }

  .badge-mermaid {
    background: rgba(168, 85, 247, 0.2);
    color: #d8b4fe;
  }

  .badge-dbml {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
  }

  .template-name {
    font-size: 13px;
    font-weight: 600;
  }

  .template-desc {
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
  }

  .load-btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid #2563eb;
    background: #2563eb;
    color: #ffffff;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease;
  }

  .load-btn:hover {
    background: #1d4ed8;
  }

  .empty-state {
    padding: 40px;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
  }
</style>
