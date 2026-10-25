<script lang="ts">
  import type { DbmlSchemaData } from '$lib/types';
  import { Database, Key, ArrowRight, Table, Layers, FileCode } from '@lucide/svelte';

  interface Props {
    schema: DbmlSchemaData | undefined;
    theme?: 'dark' | 'light';
    mermaidErCode?: string;
  }

  let { schema, theme = 'dark', mermaidErCode = '' }: Props = $props();

  let activeTab: 'tables' | 'relations' | 'code' = $state('tables');
  let searchQuery = $state('');

  const filteredTables = $derived(() => {
    if (!schema?.tables) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return schema.tables;
    return schema.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.fields.some((f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q))
    );
  });
</script>

<div class="inspector-container {theme}">
  <!-- Tab navigation -->
  <div class="inspector-tabs">
    <button
      class="tab-btn"
      class:active={activeTab === 'tables'}
      onclick={() => (activeTab = 'tables')}
    >
      <Table size={14} />
      <span>Tables ({schema?.tables?.length ?? 0})</span>
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'relations'}
      onclick={() => (activeTab = 'relations')}
    >
      <Layers size={14} />
      <span>Relations ({schema?.references?.length ?? 0})</span>
    </button>
    {#if mermaidErCode}
      <button
        class="tab-btn"
        class:active={activeTab === 'code'}
        onclick={() => (activeTab = 'code')}
      >
        <FileCode size={14} />
        <span>Mermaid ER Code</span>
      </button>
    {/if}
  </div>

  <div class="inspector-body">
    {#if activeTab === 'tables'}
      <div class="search-bar">
        <input
          type="text"
          placeholder="Filter tables and fields..."
          bind:value={searchQuery}
          class="search-input"
        />
      </div>

      <div class="tables-grid">
        {#each filteredTables() as table}
          <div class="table-card">
            <div class="table-header">
              <div class="table-title">
                <Database size={15} class="table-icon" />
                <span class="table-name">{table.name}</span>
              </div>
              <span class="fields-count">{table.fields.length} columns</span>
            </div>

            {#if table.note}
              <div class="table-note">{table.note}</div>
            {/if}

            <table class="columns-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Attributes</th>
                </tr>
              </thead>
              <tbody>
                {#each table.fields as field}
                  <tr>
                    <td class="col-name">
                      {#if field.pk}
                        <Key size={12} class="pk-icon" />
                      {/if}
                      <span>{field.name}</span>
                    </td>
                    <td class="col-type">{field.type}</td>
                    <td class="col-flags">
                      {#if field.pk}
                        <span class="badge badge-pk">PK</span>
                      {/if}
                      {#if field.unique}
                        <span class="badge badge-unique">UNIQUE</span>
                      {/if}
                      {#if field.notNull}
                        <span class="badge badge-notnull">NOT NULL</span>
                      {/if}
                      {#if field.increment}
                        <span class="badge badge-inc">AUTO</span>
                      {/if}
                      {#if field.note}
                        <span class="field-note" title={field.note}>ℹ️ {field.note}</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/each}

        {#if filteredTables().length === 0}
          <div class="empty-state">No tables found matching "{searchQuery}"</div>
        {/if}
      </div>
    {:else if activeTab === 'relations'}
      <div class="relations-list">
        {#if !schema?.references || schema.references.length === 0}
          <div class="empty-state">No foreign key references found in DBML.</div>
        {:else}
          {#each schema.references as ref}
            <div class="relation-card">
              <div class="ref-endpoint">
                <span class="ref-table">{ref.sourceTable}</span>
                <span class="ref-dot">.</span>
                <span class="ref-field">{ref.sourceField}</span>
                <span class="ref-rel">({ref.sourceRelation})</span>
              </div>
              <div class="ref-arrow">
                <ArrowRight size={14} />
              </div>
              <div class="ref-endpoint">
                <span class="ref-table">{ref.targetTable}</span>
                <span class="ref-dot">.</span>
                <span class="ref-field">{ref.targetField}</span>
                <span class="ref-rel">({ref.targetRelation})</span>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {:else if activeTab === 'code'}
      <div class="code-view">
        <pre class="code-block"><code>{mermaidErCode}</code></pre>
      </div>
    {/if}
  </div>
</div>

<style>
  .inspector-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dark {
    background: #0f172a;
    color: #e2e8f0;
  }

  .light {
    background: #f8fafc;
    color: #1e293b;
  }

  .inspector-tabs {
    display: flex;
    gap: 2px;
    padding: 8px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(0, 0, 0, 0.1);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: inherit;
    opacity: 0.7;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    opacity: 1;
    background: rgba(148, 163, 184, 0.1);
  }

  .tab-btn.active {
    opacity: 1;
    background: #2563eb;
    color: #ffffff;
  }

  .inspector-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .search-bar {
    margin-bottom: 14px;
  }

  .search-input {
    width: 100%;
    max-width: 320px;
    padding: 7px 12px;
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

  .tables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .table-card {
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(148, 163, 184, 0.08);
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .table-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.table-icon) {
    color: #3b82f6;
  }

  .table-name {
    font-size: 13px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  .fields-count {
    font-size: 11px;
    color: #94a3b8;
  }

  .table-note {
    padding: 6px 14px;
    font-size: 11px;
    color: #94a3b8;
    background: rgba(59, 130, 246, 0.05);
    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  }

  .columns-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .columns-table th {
    text-align: left;
    padding: 6px 12px;
    font-weight: 600;
    color: #94a3b8;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .columns-table td {
    padding: 7px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.05);
  }

  .col-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
  }

  :global(.pk-icon) {
    color: #eab308;
  }

  .col-type {
    font-family: 'JetBrains Mono', monospace;
    color: #38bdf8;
  }

  .col-flags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    align-items: center;
  }

  .badge {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .badge-pk {
    background: rgba(234, 179, 8, 0.2);
    color: #fde047;
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .badge-unique {
    background: rgba(168, 85, 247, 0.2);
    color: #d8b4fe;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .badge-notnull {
    background: rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
  }

  .badge-inc {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
  }

  .field-note {
    font-size: 10px;
    color: #94a3b8;
  }

  .relations-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 600px;
  }

  .relation-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(255, 255, 255, 0.02);
  }

  .ref-endpoint {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }

  .ref-table {
    font-weight: 600;
    color: #60a5fa;
  }

  .ref-dot {
    color: #94a3b8;
  }

  .ref-field {
    color: #f1f5f9;
  }

  .ref-rel {
    font-size: 11px;
    color: #eab308;
    margin-left: 4px;
  }

  .ref-arrow {
    color: #94a3b8;
  }

  .code-view {
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    background: rgba(0, 0, 0, 0.2);
    overflow: auto;
  }

  .code-block {
    margin: 0;
    padding: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
  }

  .empty-state {
    padding: 40px;
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
  }
</style>
