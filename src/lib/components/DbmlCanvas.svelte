<script lang="ts">
  import { onMount } from 'svelte';
  import type { DbmlSchemaData } from '$lib/types';
  import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize2,
    Grid,
    Download,
    LayoutGrid,
    Database,
    Key,
    Link,
    Check
  } from '@lucide/svelte';

  interface Props {
    schema?: DbmlSchemaData;
    theme?: 'dark' | 'light';
    onGetSvg?: (fn: () => string) => void;
    onExportSvg?: (svgString: string) => void;
    onExportPng?: (svgString: string) => void;
  }

  let {
    schema,
    theme = 'dark',
    onGetSvg,
    onExportSvg,
    onExportPng
  }: Props = $props();

  const TABLE_WIDTH = 250;
  const HEADER_HEIGHT = 38;
  const ROW_HEIGHT = 26;

  let containerEl: HTMLDivElement | null = $state(null);
  let svgEl: SVGSVGElement | null = $state(null);

  // Pan & Zoom state
  let panX = $state(60);
  let panY = $state(60);
  let zoom = $state(1.0);
  let gridMode: 'dots' | 'lines' | 'none' = $state('dots');

  // Dragging state
  let isPanningCanvas = $state(false);
  let panStart = { x: 0, y: 0 };
  let draggingTable = $state<string | null>(null);
  let dragOffset = { x: 0, y: 0 };

  // Hover highlighting
  let hoveredTable = $state<string | null>(null);
  let hoveredRefId = $state<string | null>(null);

  // Table positions record: tableName -> { x, y }
  let tablePositions = $state<Record<string, { x: number; y: number }>>({});
  let lastSchemaSignature = '';

  function getTypeColor(type: string, isDark: boolean): string {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('serial') || t.includes('number')) {
      return isDark ? '#38bdf8' : '#0284c7'; // cyan / sky
    }
    if (t.includes('varchar') || t.includes('char') || t.includes('text') || t.includes('string')) {
      return isDark ? '#34d399' : '#059669'; // emerald / green
    }
    if (t.includes('bool')) {
      return isDark ? '#f472b6' : '#db2777'; // pink
    }
    if (t.includes('time') || t.includes('date')) {
      return isDark ? '#fbbf24' : '#d97706'; // amber
    }
    if (t.includes('uuid')) {
      return isDark ? '#c084fc' : '#9333ea'; // purple
    }
    if (t.includes('decimal') || t.includes('float') || t.includes('numeric')) {
      return isDark ? '#60a5fa' : '#2563eb'; // blue
    }
    return isDark ? '#94a3b8' : '#64748b'; // default slate
  }

  export function autoArrange() {
    if (!schema?.tables || schema.tables.length === 0) return;

    const count = schema.tables.length;
    // Determine columns count based on table count
    const cols = count <= 3 ? count : count <= 8 ? 3 : 4;
    const colWidth = TABLE_WIDTH + 80;
    const colHeights = new Array(cols).fill(60);

    const newPositions: Record<string, { x: number; y: number }> = {};

    schema.tables.forEach((table, idx) => {
      // Find shortest column
      let shortestCol = 0;
      let minH = colHeights[0];
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < minH) {
          minH = colHeights[c];
          shortestCol = c;
        }
      }

      const tableHeight = HEADER_HEIGHT + table.fields.length * ROW_HEIGHT + 16;
      const x = 60 + shortestCol * colWidth;
      const y = colHeights[shortestCol];

      newPositions[table.name] = { x, y };
      colHeights[shortestCol] += tableHeight + 40;
    });

    tablePositions = newPositions;
    fitToScreen();
  }

  export function fitToScreen() {
    if (!containerEl || !schema?.tables || schema.tables.length === 0) return;

    const vpWidth = containerEl.clientWidth;
    const vpHeight = containerEl.clientHeight;
    if (vpWidth <= 0 || vpHeight <= 0) return;

    // Calculate bounding box of all tables
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    schema.tables.forEach((t) => {
      const pos = tablePositions[t.name] || { x: 60, y: 60 };
      const h = HEADER_HEIGHT + t.fields.length * ROW_HEIGHT + 16;
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + TABLE_WIDTH > maxX) maxX = pos.x + TABLE_WIDTH;
      if (pos.y + h > maxY) maxY = pos.y + h;
    });

    if (minX === Infinity) return;

    const diagramWidth = maxX - minX + 80;
    const diagramHeight = maxY - minY + 80;

    const scaleX = (vpWidth - 80) / diagramWidth;
    const scaleY = (vpHeight - 80) / diagramHeight;
    const targetScale = Math.min(scaleX, scaleY, 1.2);
    zoom = Math.max(0.1, targetScale);

    // Center diagram in viewport
    panX = (vpWidth - diagramWidth * zoom) / 2 - minX * zoom + 40 * zoom;
    panY = (vpHeight - diagramHeight * zoom) / 2 - minY * zoom + 40 * zoom;
  }

  // Pointer interactions
  function onCanvasPointerDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only left click
    isPanningCanvas = true;
    panStart = { x: e.clientX - panX, y: e.clientY - panY };
    window.addEventListener('mousemove', onCanvasPointerMove);
    window.addEventListener('mouseup', onCanvasPointerUp);
  }

  function onCanvasPointerMove(e: MouseEvent) {
    if (draggingTable) {
      const pos = tablePositions[draggingTable];
      if (pos) {
        const newX = (e.clientX - panX) / zoom - dragOffset.x;
        const newY = (e.clientY - panY) / zoom - dragOffset.y;
        tablePositions[draggingTable] = {
          x: Math.round(newX),
          y: Math.round(newY)
        };
      }
      return;
    }

    if (isPanningCanvas) {
      panX = e.clientX - panStart.x;
      panY = e.clientY - panStart.y;
    }
  }

  function onCanvasPointerUp() {
    isPanningCanvas = false;
    draggingTable = null;
    window.removeEventListener('mousemove', onCanvasPointerMove);
    window.removeEventListener('mouseup', onCanvasPointerUp);
  }

  function onTableHeaderMouseDown(e: MouseEvent, tableName: string) {
    e.stopPropagation();
    if (e.button !== 0) return;

    draggingTable = tableName;
    const pos = tablePositions[tableName] || { x: 60, y: 60 };
    dragOffset = {
      x: (e.clientX - panX) / zoom - pos.x,
      y: (e.clientY - panY) / zoom - pos.y
    };

    window.addEventListener('mousemove', onCanvasPointerMove);
    window.addEventListener('mouseup', onCanvasPointerUp);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!containerEl) return;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(4.0, Math.max(0.05, zoom * zoomFactor));

    const rect = containerEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;
  }

  // Calculate connection paths
  const connections = $derived(() => {
    if (!schema?.references || !schema.tables) return [];

    const lines: Array<{
      id: string;
      path: string;
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      sourceRel: string;
      targetRel: string;
      sourceTable: string;
      targetTable: string;
      sourceField: string;
      targetField: string;
      isHighlighted: boolean;
    }> = [];

    schema.references.forEach((ref, index) => {
      const t1 = schema.tables.find((t) => t.name === ref.sourceTable);
      const t2 = schema.tables.find((t) => t.name === ref.targetTable);
      if (!t1 || !t2) return;

      const pos1 = tablePositions[t1.name] || { x: 60, y: 60 };
      const pos2 = tablePositions[t2.name] || { x: 60, y: 60 };

      const f1Index = t1.fields.findIndex((f) => f.name === ref.sourceField);
      const f2Index = t2.fields.findIndex((f) => f.name === ref.targetField);
      if (f1Index === -1 || f2Index === -1) return;

      const p1Y = pos1.y + HEADER_HEIGHT + f1Index * ROW_HEIGHT + ROW_HEIGHT / 2;
      const p2Y = pos2.y + HEADER_HEIGHT + f2Index * ROW_HEIGHT + ROW_HEIGHT / 2;

      let p1X: number;
      let p2X: number;

      // Anchor selection based on relative positioning
      if (pos2.x >= pos1.x + TABLE_WIDTH - 20) {
        // t2 is to the right of t1
        p1X = pos1.x + TABLE_WIDTH;
        p2X = pos2.x;
      } else if (pos1.x >= pos2.x + TABLE_WIDTH - 20) {
        // t1 is to the right of t2
        p1X = pos1.x;
        p2X = pos2.x + TABLE_WIDTH;
      } else {
        // vertically aligned: connect opposite sides
        p1X = pos1.x + TABLE_WIDTH;
        p2X = pos2.x + TABLE_WIDTH;
      }

      const dx = Math.max(30, Math.abs(p2X - p1X) * 0.45);
      const c1X = pos2.x >= pos1.x ? p1X + dx : p1X - dx;
      const c2X = pos2.x >= pos1.x ? p2X - dx : p2X + dx;

      const pathData = `M ${p1X} ${p1Y} C ${c1X} ${p1Y}, ${c2X} ${p2Y}, ${p2X} ${p2Y}`;

      const refId = ref.id || `ref-${index}`;
      const isHighlighted =
        hoveredRefId === refId ||
        hoveredTable === t1.name ||
        hoveredTable === t2.name;

      lines.push({
        id: refId,
        path: pathData,
        p1: { x: p1X, y: p1Y },
        p2: { x: p2X, y: p2Y },
        sourceRel: ref.sourceRelation,
        targetRel: ref.targetRelation,
        sourceTable: t1.name,
        targetTable: t2.name,
        sourceField: ref.sourceField,
        targetField: ref.targetField,
        isHighlighted
      });
    });

    return lines;
  });

  // Export full SVG serialization
  export function serializeSvg(): string {
    if (!svgEl) return '';
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('style');
    clone.removeAttribute('class');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    schema?.tables?.forEach((t) => {
      const pos = tablePositions[t.name] || { x: 60, y: 60 };
      const h = HEADER_HEIGHT + t.fields.length * ROW_HEIGHT + 16;
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + TABLE_WIDTH > maxX) maxX = pos.x + TABLE_WIDTH;
      if (pos.y + h > maxY) maxY = pos.y + h;
    });

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    const padding = 40;
    const vbX = Math.round(minX - padding);
    const vbY = Math.round(minY - padding);
    const vbW = Math.round(maxX - minX + padding * 2);
    const vbH = Math.round(maxY - minY + padding * 2);

    clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    clone.setAttribute('width', `${vbW}`);
    clone.setAttribute('height', `${vbH}`);

    // Insert background rect so exported SVG has theme background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', `${vbX}`);
    bg.setAttribute('y', `${vbY}`);
    bg.setAttribute('width', `${vbW}`);
    bg.setAttribute('height', `${vbH}`);
    bg.setAttribute('fill', theme === 'dark' ? '#0b0f19' : '#f8fafc');
    clone.insertBefore(bg, clone.firstChild);

    // Remove zoom/pan transform from viewport group in exported SVG
    const g = clone.querySelector('#canvas-transform-group');
    if (g) {
      g.removeAttribute('transform');
    }

    return new XMLSerializer().serializeToString(clone);
  }

  $effect(() => {
    onGetSvg?.(serializeSvg);
  });

  $effect(() => {
    // When schema changes, verify table positions and initialize new tables
    if (schema?.tables && schema.tables.length > 0) {
      const currentSignature = schema.tables.map((t) => t.name).sort().join(',');
      if (currentSignature !== lastSchemaSignature) {
        lastSchemaSignature = currentSignature;
        autoArrange();
      }
    }
  });

  onMount(() => {
    if (schema?.tables && schema.tables.length > 0) {
      autoArrange();
    }
  });
</script>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_static_element_interactions -->
<div
  class="dbml-canvas-container {theme} grid-{gridMode}"
  bind:this={containerEl}
  onmousedown={onCanvasPointerDown}
  onwheel={onWheel}
  role="region"
  aria-label="Interactive DBML Schema Canvas"
>
  <!-- Top Right Canvas Controls -->
  <div class="controls-overlay top-right">
    <div class="control-group">
      <button
        class="control-btn"
        onclick={() => {
          if (gridMode === 'dots') gridMode = 'lines';
          else if (gridMode === 'lines') gridMode = 'none';
          else gridMode = 'dots';
        }}
        title="Toggle Grid ({gridMode})"
      >
        <Grid size={15} />
      </button>
      <button class="control-btn highlight" onclick={autoArrange} title="Auto-Arrange Table Layout">
        <LayoutGrid size={15} />
        <span class="btn-label">Auto Layout</span>
      </button>
      {#if onExportSvg}
        <button
          class="control-btn"
          onclick={() => onExportSvg?.(serializeSvg())}
          title="Export Schema as Vector SVG"
        >
          <Download size={15} />
          <span class="btn-label">SVG</span>
        </button>
      {/if}
      {#if onExportPng}
        <button
          class="control-btn"
          onclick={() => onExportPng?.(serializeSvg())}
          title="Export Schema as Raster PNG"
        >
          <Download size={15} />
          <span class="btn-label">PNG</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Bottom Right Zoom Controls -->
  <div class="controls-overlay bottom-right">
    <div class="control-group zoom-group">
      <button
        class="control-btn"
        onclick={() => (zoom = Math.max(0.05, zoom - 0.15))}
        title="Zoom Out (-)"
      >
        <ZoomOut size={16} />
      </button>
      <span class="zoom-indicator">{Math.round(zoom * 100)}%</span>
      <button
        class="control-btn"
        onclick={() => (zoom = Math.min(4.0, zoom + 0.15))}
        title="Zoom In (+)"
      >
        <ZoomIn size={16} />
      </button>
      <div class="divider"></div>
      <button
        class="control-btn"
        onclick={() => {
          zoom = 1.0;
          panX = 60;
          panY = 60;
        }}
        title="Reset to 100%"
      >
        <RotateCcw size={15} />
      </button>
      <button class="control-btn" onclick={fitToScreen} title="Fit Entire Schema to Screen">
        <Maximize2 size={15} />
        <span class="btn-label">Fit</span>
      </button>
    </div>
  </div>

  <!-- Pure Interactive Vector SVG Canvas -->
  <svg
    bind:this={svgEl}
    class="dbml-svg-viewport"
    width="100%"
    height="100%"
  >
    <defs>
      <!-- Shadow filter for table cards -->
      <filter id="table-shadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="8"
          flood-color={theme === 'dark' ? '#000000' : '#0f172a'}
          flood-opacity={theme === 'dark' ? '0.45' : '0.12'}
        />
      </filter>
    </defs>

    <g
      id="canvas-transform-group"
      transform="translate({panX}, {panY}) scale({zoom})"
    >
      <!-- Connection Bezier Curves Layer -->
      <g class="relationships-layer">
        {#each connections() as conn}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <path
            d={conn.path}
            fill="none"
            stroke="transparent"
            stroke-width="14"
            class="hit-path"
            onmouseenter={() => (hoveredRefId = conn.id)}
            onmouseleave={() => (hoveredRefId = null)}
          />

          <!-- Visible styled Bezier curve -->
          <path
            d={conn.path}
            fill="none"
            stroke={conn.isHighlighted ? '#3b82f6' : theme === 'dark' ? '#475569' : '#94a3b8'}
            stroke-width={conn.isHighlighted ? 2.5 : 1.5}
            stroke-dasharray={conn.isHighlighted ? 'none' : 'none'}
            class="relation-path"
            class:highlighted={conn.isHighlighted}
          />

          <!-- Endpoint Connector Dots -->
          <circle
            cx={conn.p1.x}
            cy={conn.p1.y}
            r={conn.isHighlighted ? 4 : 3}
            fill={conn.isHighlighted ? '#3b82f6' : theme === 'dark' ? '#64748b' : '#94a3b8'}
          />
          <circle
            cx={conn.p2.x}
            cy={conn.p2.y}
            r={conn.isHighlighted ? 4 : 3}
            fill={conn.isHighlighted ? '#3b82f6' : theme === 'dark' ? '#64748b' : '#94a3b8'}
          />

          <!-- Relationship Cardinality Label at p2 -->
          <text
            x={conn.p2.x > conn.p1.x ? conn.p2.x - 10 : conn.p2.x + 10}
            y={conn.p2.y - 4}
            fill={conn.isHighlighted ? '#60a5fa' : '#64748b'}
            font-size="10"
            font-family="'JetBrains Mono', monospace"
            font-weight="600"
            text-anchor={conn.p2.x > conn.p1.x ? 'end' : 'start'}
          >
            {conn.targetRel}
          </text>
        {/each}
      </g>

      <!-- Table Cards Layer -->
      <g class="tables-layer">
        {#if schema?.tables}
          {#each schema.tables as table}
            {@const pos = tablePositions[table.name] || { x: 60, y: 60 }}
            {@const tableHeight = HEADER_HEIGHT + table.fields.length * ROW_HEIGHT + 8}
            {@const isTableHovered = hoveredTable === table.name}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <g
              class="table-node"
              class:hovered={isTableHovered}
              class:dragging={draggingTable === table.name}
              transform="translate({pos.x}, {pos.y})"
              onmouseenter={() => (hoveredTable = table.name)}
              onmouseleave={() => (hoveredTable = null)}
            >
              <!-- Card Background -->
              <rect
                width={TABLE_WIDTH}
                height={tableHeight}
                rx="8"
                fill={theme === 'dark' ? '#111827' : '#ffffff'}
                stroke={isTableHovered
                  ? '#3b82f6'
                  : theme === 'dark'
                    ? '#1e293b'
                    : '#e2e8f0'}
                stroke-width={isTableHovered ? '2' : '1'}
                filter="url(#table-shadow)"
              />

              <!-- Card Header Area (Draggable) -->
              <rect
                width={TABLE_WIDTH}
                height={HEADER_HEIGHT}
                rx="8"
                fill={theme === 'dark' ? '#1f2937' : '#f1f5f9'}
                class="header-rect"
                onmousedown={(e) => onTableHeaderMouseDown(e, table.name)}
              />
              <!-- Square-off bottom corners of header -->
              <rect
                y={HEADER_HEIGHT - 6}
                width={TABLE_WIDTH}
                height={6}
                fill={theme === 'dark' ? '#1f2937' : '#f1f5f9'}
                onmousedown={(e) => onTableHeaderMouseDown(e, table.name)}
              />
              <line
                x1="0"
                y1={HEADER_HEIGHT}
                x2={TABLE_WIDTH}
                y2={HEADER_HEIGHT}
                stroke={theme === 'dark' ? '#374151' : '#e2e8f0'}
                stroke-width="1"
              />

              <!-- Header Table Icon & Title -->
              <text
                x="14"
                y="24"
                fill={theme === 'dark' ? '#f3f4f6' : '#0f172a'}
                font-size="13"
                font-family="'JetBrains Mono', monospace"
                font-weight="700"
                class="header-text"
                onmousedown={(e) => onTableHeaderMouseDown(e, table.name)}
              >
                {table.name}
              </text>

              <!-- Header Field Count Pill -->
              <text
                x={TABLE_WIDTH - 14}
                y="24"
                fill="#94a3b8"
                font-size="11"
                font-family="system-ui, sans-serif"
                text-anchor="end"
                onmousedown={(e) => onTableHeaderMouseDown(e, table.name)}
              >
                {table.fields.length}
              </text>

              <!-- Columns / Fields Rows -->
              {#each table.fields as field, i}
                {@const rowY = HEADER_HEIGHT + i * ROW_HEIGHT}
                {@const isFieldFk = schema.references?.some(
                  (r) =>
                    (r.sourceTable === table.name && r.sourceField === field.name) ||
                    (r.targetTable === table.name && r.targetField === field.name)
                )}

                <!-- Row background zebra hover -->
                <rect
                  x="1"
                  y={rowY}
                  width={TABLE_WIDTH - 2}
                  height={ROW_HEIGHT}
                  fill="transparent"
                  class="row-rect"
                />

                <!-- Key badge or icon -->
                {#if field.pk}
                  <text
                    x="12"
                    y={rowY + 17}
                    fill="#eab308"
                    font-size="11"
                    font-family="'JetBrains Mono', monospace"
                    font-weight="700"
                  >
                    PK
                  </text>
                {:else if isFieldFk}
                  <text
                    x="12"
                    y={rowY + 17}
                    fill="#3b82f6"
                    font-size="11"
                    font-family="'JetBrains Mono', monospace"
                    font-weight="600"
                  >
                    FK
                  </text>
                {/if}

                <!-- Column Name -->
                <text
                  x={field.pk || isFieldFk ? 34 : 14}
                  y={rowY + 17}
                  fill={theme === 'dark' ? '#e2e8f0' : '#1e293b'}
                  font-size="12"
                  font-family="'JetBrains Mono', monospace"
                  font-weight={field.pk ? '600' : '400'}
                >
                  {field.name}
                </text>

                <!-- Column Data Type (Color-Coded) -->
                <text
                  x={TABLE_WIDTH - 14}
                  y={rowY + 17}
                  fill={getTypeColor(field.type, theme === 'dark')}
                  font-size="11"
                  font-family="'JetBrains Mono', monospace"
                  font-weight="500"
                  text-anchor="end"
                >
                  {field.type}
                </text>

                <!-- Row Divider -->
                <line
                  x1="10"
                  y1={rowY + ROW_HEIGHT}
                  x2={TABLE_WIDTH - 10}
                  y2={rowY + ROW_HEIGHT}
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}
                  stroke-width="1"
                />
              {/each}
            </g>
          {/each}
        {/if}
      </g>
    </g>
  </svg>
</div>

<style>
  .dbml-canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    user-select: none;
    cursor: grab;
  }

  .dbml-canvas-container:active {
    cursor: grabbing;
  }

  /* Grid styles */
  .dark {
    background-color: #0b0f19;
  }

  .light {
    background-color: #f8fafc;
  }

  .dark.grid-dots {
    background-image: radial-gradient(#1e293b 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .light.grid-dots {
    background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
    background-size: 20px 20px;
  }

  .dark.grid-lines {
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .light.grid-lines {
    background-image:
      linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .dbml-svg-viewport {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Nodes */
  .header-rect {
    cursor: grab;
  }

  .table-node.dragging .header-rect {
    cursor: grabbing;
  }

  .header-text {
    cursor: grab;
  }

  .relation-path {
    transition: stroke 0.15s ease, stroke-width 0.15s ease;
  }

  .hit-path {
    cursor: pointer;
  }

  .hit-path:hover + .relation-path {
    stroke: #3b82f6;
    stroke-width: 2.5;
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

  .control-btn.highlight {
    color: #38bdf8;
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
</style>
