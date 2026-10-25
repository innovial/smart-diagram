# Smart Diagram

> Ultra-lightweight, high-performance desktop diagram and database schema editor designed to run smoothly on older Linux and Windows devices.

Smart Diagram supports **Mermaid** diagrams and **DBML** database schemas with real-time visual preview, relational table inspection, interactive pan & zoom, and flexible export capabilities.

---

## ⚡ Why Smart Diagram Runs Smoothly on Older Devices

Standard desktop tools (e.g. Electron apps) regularly consume 250MB–500MB+ RAM at idle. Smart Diagram is purpose-built to stay below ~60MB RAM:

1. **Tauri v2 + System Webview:** Uses the native operating system webview (`WebKitGTK` on Linux, `WebView2` on Windows) instead of bundling a duplicate 150MB Chromium runtime.
2. **Svelte 5 Runes Engine:** Compiles directly into surgically minimal DOM manipulations with zero Virtual DOM diffing overhead or memory leaks.
3. **CodeMirror 6:** Virtualized, modular editor that loads in <300KB and preserves instant keystroke latency without Monaco's heavy background workers.
4. **Debounced Rendering Pipeline:** Keystrokes are buffered and debounced (200ms) to prevent CPU spikes when editing large diagrams on dual-core CPUs.
5. **Hardware-Accelerated Pan & Zoom:** SVG canvas interactions leverage GPU-accelerated CSS transforms for smooth 60 FPS viewport manipulation.

---

## 📊 Core Features

- **Mermaid Support:** Full support for Mermaid diagrams:
  - Flowcharts (`graph TD` / `flowchart LR`)
  - Sequence diagrams (`sequenceDiagram`)
  - State machines (`stateDiagram-v2`)
  - Git graphs (`gitGraph`)
  - Architecture & Mindmaps (`mindmap`)
  - Entity-relationship diagrams (`erDiagram`)
  - Class diagrams, Gantt charts, Pie charts, and Quadrants.
- **DBML Database Modeling:**
  - Fast AST parsing of DBML models (`@dbml/core`)
  - **ER Diagram View:** Automatic transpilation of DBML schemas & foreign keys into Mermaid ER diagrams.
  - **Schema Tables Inspector:** Interactive relational inspector displaying columns, data types, Primary Keys (`PK`), Unique keys (`UK`), `NOT NULL`, auto-increments, column notes, and foreign key references.
  - Search/filter across tables and columns.
- **Live Diagnostics:** Inline syntax error detection showing exact line numbers and error descriptions without interrupting workflow.
- **Export Capabilities:**
  - Clean Vector SVG download
  - High-resolution PNG rasterization (1x, 2x HD, 3x Ultra HD)
  - Direct PNG image copy to clipboard (paste into Docs, Slack, Notion)
  - Direct SVG markup copy to clipboard
- **Built-in Templates:** Instant 1-click templates for payment flows, OAuth2 PKCE auth sequence, order state machines, Git branching models, e-commerce schemas, and multi-tenant SaaS schemas.
- **Keyboard Shortcuts:**
  - `Ctrl+S` / `Cmd+S`: Save diagram source file
  - `Ctrl+B` / `Cmd+B`: Toggle code editor panel
  - `Ctrl+E` / `Cmd+E`: Open Export modal

---

## 🛠️ Project Structure

```
smart-diagram/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Canvas.svelte          # Pan & Zoom SVG viewport with grid modes
│   │   │   ├── DbmlInspector.svelte   # Relational table & columns inspector
│   │   │   ├── Editor.svelte          # CodeMirror 6 editor with themes
│   │   │   ├── ExportModal.svelte     # PNG/SVG export & clipboard modal
│   │   │   ├── TemplateModal.svelte   # Built-in diagram template library
│   │   │   └── Toolbar.svelte         # Top navigation, modes, and actions
│   │   ├── engines/
│   │   │   ├── dbml.ts                # DBML parser & Mermaid ER transpiler
│   │   │   ├── mermaid.ts             # Mermaid renderer & error parser
│   │   │   └── templates.ts           # Pre-configured templates
│   │   ├── export.ts                  # Canvas-to-PNG & download helpers
│   │   └── types.ts                   # Domain TypeScript definitions
│   └── routes/
│       ├── +layout.svelte             # Root layout & theme variables
│       └── +page.svelte               # Main split-view workspace
├── src-tauri/                         # Tauri v2 desktop shell (Rust)
│   ├── src/lib.rs                     # Tauri command bindings
│   ├── Cargo.toml                     # Rust manifest
│   └── tauri.conf.json                # Desktop window & bundle configuration
└── test/
    └── engines.test.ts                # Test suite for diagram engines
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested on Node.js v22)
- `pnpm` (or `npm`)
- Rust & Cargo (for compiling the native desktop binary)
- Linux: `libwebkit2gtk-4.1-dev` (or `4.0`)
- Windows: `WebView2` runtime (included with Windows 10/11)

### Development

Run the web frontend dev server:
```bash
pnpm dev
```

Run inside the desktop Tauri window:
```bash
pnpm tauri dev
```

### Run Tests

```bash
pnpm test
```

### Type Checking & Build

```bash
pnpm check
pnpm build
```

### Package Desktop Executables

To build the standalone lightweight native binary for Linux (`.deb`, `.appimage`) or Windows (`.msi`, `.exe`):
```bash
pnpm tauri build
```
