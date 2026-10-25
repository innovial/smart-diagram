import { Parser } from '@dbml/core';
import type { DbmlSchemaData, DbmlTable, DbmlReference, RenderResult, MermaidTheme } from '$lib/types';
import { renderMermaid } from './mermaid';

interface DbmlDiagLocationPoint {
  line: number;
  column: number;
  offset: number;
}

interface DbmlDiag {
  message?: string;
  location?: {
    start?: DbmlDiagLocationPoint;
    end?: DbmlDiagLocationPoint;
  };
}

export interface DbmlParseSuccess {
  success: true;
  schema: DbmlSchemaData;
  mermaidEr: string;
}

export interface DbmlParseFailure {
  success: false;
  error: string;
  line?: number;
  column?: number;
}

export type DbmlParseResult = DbmlParseSuccess | DbmlParseFailure;

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function parseDbml(code: string): DbmlParseResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      success: true,
      schema: { tables: [], references: [] },
      mermaidEr: 'erDiagram\n'
    };
  }

  try {
    const parser = new Parser();
    const db = parser.parse(trimmed, 'dbml');
    const mainSchema = db.schemas?.[0];

    if (!mainSchema) {
      return {
        success: true,
        schema: { tables: [], references: [] },
        mermaidEr: 'erDiagram\n'
      };
    }

    const tables: DbmlTable[] = [];
    const references: DbmlReference[] = [];

    // Parse tables
    if (Array.isArray(mainSchema.tables)) {
      for (const t of mainSchema.tables) {
        const fields = Array.isArray(t.fields)
          ? t.fields.map((f: {
              name?: string;
              type?: { type_name?: string };
              pk?: boolean;
              unique?: boolean;
              not_null?: boolean;
              increment?: boolean;
              note?: string;
              dbdefault?: unknown;
            }) => ({
              name: f.name || 'unnamed',
              type: f.type?.type_name || 'varchar',
              pk: Boolean(f.pk),
              unique: Boolean(f.unique),
              notNull: Boolean(f.not_null),
              increment: Boolean(f.increment),
              note: f.note || undefined,
              defaultValue: f.dbdefault !== undefined && f.dbdefault !== null ? String(f.dbdefault) : undefined
            }))
          : [];

        tables.push({
          name: t.name || 'unnamed_table',
          alias: t.alias || undefined,
          note: t.note || undefined,
          fields
        });
      }
    }

    // Parse references
    if (Array.isArray(mainSchema.refs)) {
      for (const r of mainSchema.refs) {
        if (!Array.isArray(r.endpoints) || r.endpoints.length < 2) continue;
        const ep1 = r.endpoints[0];
        const ep2 = r.endpoints[1];

        const f1 = ep1?.fields?.[0];
        const f2 = ep2?.fields?.[0];
        if (!f1 || !f2) continue;

        const table1 = f1.table?.name || '';
        const field1 = f1.name || '';
        const rel1 = ep1.relation || '*';

        const table2 = f2.table?.name || '';
        const field2 = f2.name || '';
        const rel2 = ep2.relation || '1';

        references.push({
          id: r.name || `${table1}_${field1}_${table2}_${field2}`,
          sourceTable: table1,
          sourceField: field1,
          sourceRelation: rel1,
          targetTable: table2,
          targetField: field2,
          targetRelation: rel2
        });
      }
    }

    const schema: DbmlSchemaData = { tables, references };
    const mermaidEr = convertDbmlSchemaToMermaid(schema);

    return {
      success: true,
      schema,
      mermaidEr
    };
  } catch (err: unknown) {
    let errorMsg = 'Failed to parse DBML syntax';
    let line: number | undefined;
    let column: number | undefined;

    if (err && typeof err === 'object') {
      if ('diags' in err && Array.isArray(err.diags) && err.diags.length > 0) {
        const firstDiag = err.diags[0] as DbmlDiag;
        const msg = firstDiag.message || 'Syntax error';
        const start = firstDiag.location?.start;
        line = start?.line;
        column = start?.column;
        errorMsg = line ? `Line ${line}, Col ${column ?? 0}: ${msg}` : msg;
      } else if ('message' in err && typeof err.message === 'string') {
        errorMsg = err.message;
      }
    }

    return {
      success: false,
      error: errorMsg,
      line,
      column
    };
  }
}

export function convertDbmlSchemaToMermaid(schema: DbmlSchemaData): string {
  const lines: string[] = ['erDiagram'];

  if (schema.tables.length === 0) {
    return 'erDiagram\n  EMPTY_SCHEMA {\n    string message\n  }';
  }

  for (const table of schema.tables) {
    const tableName = sanitizeName(table.name);
    lines.push(`  ${tableName} {`);
    for (const field of table.fields) {
      const typeStr = sanitizeName(field.type);
      const nameStr = sanitizeName(field.name);
      const flags: string[] = [];
      if (field.pk) flags.push('PK');
      if (field.unique) flags.push('UK');
      const flagStr = flags.length > 0 ? ` ${flags.join(',')}` : '';
      const commentStr = field.note ? ` "${field.note.replace(/"/g, "'")}"` : '';
      lines.push(`    ${typeStr} ${nameStr}${flagStr}${commentStr}`);
    }
    lines.push('  }');
  }

  for (const ref of schema.references) {
    const t1 = sanitizeName(ref.sourceTable);
    const t2 = sanitizeName(ref.targetTable);
    const f1 = sanitizeName(ref.sourceField);
    const f2 = sanitizeName(ref.targetField);

    // Cardinality mapping:
    // source: '1' -> ||, '*' -> }o
    // target: '1' -> ||, '*' -> o{
    const leftSymbol = ref.sourceRelation === '*' ? '}o' : '||';
    const rightSymbol = ref.targetRelation === '*' ? 'o{' : '||';

    lines.push(`  ${t1} ${leftSymbol}--${rightSymbol} ${t2} : "${f1}_to_${f2}"`);
  }

  return lines.join('\n');
}

export async function renderDbml(code: string, theme: MermaidTheme = 'dark'): Promise<RenderResult & { schema?: DbmlSchemaData; mermaidEr?: string }> {
  const parseRes = parseDbml(code);
  if (!parseRes.success) {
    return {
      success: false,
      error: parseRes.error,
      line: parseRes.line,
      column: parseRes.column
    };
  }

  const mermaidRes = await renderMermaid(parseRes.mermaidEr, theme);
  return {
    ...mermaidRes,
    schema: parseRes.schema,
    mermaidEr: parseRes.mermaidEr
  };
}
