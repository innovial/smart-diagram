<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, Compartment } from '@codemirror/state';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { keymap } from '@codemirror/view';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';

  interface Props {
    value: string;
    theme?: 'dark' | 'light';
    placeholder?: string;
    onChange?: (value: string) => void;
  }

  let { value = $bindable(), theme = 'dark', placeholder = '', onChange }: Props = $props();

  let containerEl: HTMLDivElement | null = $state(null);
  let view: EditorView | null = null;
  const themeCompartment = new Compartment();

  const customDarkTheme = EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: '#111827',
        color: '#e5e7eb',
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace"
      },
      '.cm-content': {
        padding: '12px 0',
        caretColor: '#60a5fa'
      },
      '.cm-gutters': {
        backgroundColor: '#0f172a',
        color: '#475569',
        border: 'none',
        borderRight: '1px solid #1e293b'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#1e293b',
        color: '#94a3b8'
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)'
      },
      '.cm-selectionMatch': {
        backgroundColor: 'rgba(59, 130, 246, 0.2)'
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: '#60a5fa',
        borderLeftWidth: '2px'
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(59, 130, 246, 0.35)'
      }
    },
    { dark: true }
  );

  const customLightTheme = EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace"
      },
      '.cm-content': {
        padding: '12px 0',
        caretColor: '#2563eb'
      },
      '.cm-gutters': {
        backgroundColor: '#f8fafc',
        color: '#94a3b8',
        border: 'none',
        borderRight: '1px solid #e2e8f0'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f1f5f9',
        color: '#475569'
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(0, 0, 0, 0.02)'
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: '#2563eb',
        borderLeftWidth: '2px'
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(59, 130, 246, 0.2)'
      }
    },
    { dark: false }
  );

  onMount(() => {
    if (!containerEl) return;

    const currentEditorTheme = theme === 'dark' ? [oneDark, customDarkTheme] : [customLightTheme];

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        themeCompartment.of(currentEditorTheme),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextVal = update.state.doc.toString();
            if (nextVal !== value) {
              value = nextVal;
              onChange?.(nextVal);
            }
          }
        }),
        EditorView.lineWrapping
      ]
    });

    view = new EditorView({
      state,
      parent: containerEl
    });
  });

  $effect(() => {
    // Sync external value changes into editor
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value
        }
      });
    }
  });

  $effect(() => {
    // Sync theme changes dynamically without rebuilding entire editor
    if (view) {
      const currentEditorTheme = theme === 'dark' ? [oneDark, customDarkTheme] : [customLightTheme];
      view.dispatch({
        effects: themeCompartment.reconfigure(currentEditorTheme)
      });
    }
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
      view = null;
    }
  });
</script>

<div class="editor-wrapper" bind:this={containerEl}></div>

<style>
  .editor-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  :global(.cm-editor) {
    height: 100%;
  }

  :global(.cm-scroller) {
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
  }

  :global(.cm-scroller::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }

  :global(.cm-scroller::-webkit-scrollbar-thumb) {
    background-color: rgba(148, 163, 184, 0.25);
    border-radius: 3px;
  }
</style>
