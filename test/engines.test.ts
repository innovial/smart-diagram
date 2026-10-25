import { describe, it, expect } from 'vitest';
import { parseMermaidError } from '../src/lib/engines/mermaid';
import { parseDbml, convertDbmlSchemaToMermaid } from '../src/lib/engines/dbml';
import { TEMPLATES } from '../src/lib/engines/templates';

describe('Mermaid Engine Utilities', () => {
  it('extracts line numbers from Mermaid error strings', () => {
    const err = new Error('Parse error on line 14:\nExpecting "SEMI", got "EOF"');
    const result = parseMermaidError(err);
    expect(result.line).toBe(14);
    expect(result.message).toContain('Parse error on line 14');
  });
});

describe('DBML Engine', () => {
  it('extracts tables, columns, flags, and relationships from DBML code', () => {
    const code = `
      Table users {
        id integer [pk, increment]
        email varchar(255) [unique, not null]
        bio text [note: "user bio info"]
      }
      Table orders {
        id integer [pk]
        user_id integer [not null]
      }
      Ref: orders.user_id > users.id
    `;

    const res = parseDbml(code);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.schema.tables.length).toBe(2);

      const usersTable = res.schema.tables.find((t) => t.name === 'users');
      expect(usersTable).toBeDefined();
      expect(usersTable?.fields.length).toBe(3);

      const idField = usersTable?.fields.find((f) => f.name === 'id');
      expect(idField?.pk).toBe(true);
      expect(idField?.increment).toBe(true);

      const emailField = usersTable?.fields.find((f) => f.name === 'email');
      expect(emailField?.unique).toBe(true);
      expect(emailField?.notNull).toBe(true);

      expect(res.schema.references.length).toBe(1);
      const ref = res.schema.references[0];
      expect(ref.sourceTable).toBe('orders');
      expect(ref.sourceField).toBe('user_id');
      expect(ref.targetTable).toBe('users');
      expect(ref.targetField).toBe('id');
    }
  });

  it('detects syntax errors with line numbers', () => {
    const brokenCode = `
      Table users {
        id integer [pk
      }
    `;
    const res = parseDbml(brokenCode);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.line).toBeDefined();
      expect(res.error.length).toBeGreaterThan(0);
    }
  });

  it('convertDbmlSchemaToMermaid produces valid erDiagram syntax', () => {
    const schema = {
      tables: [
        {
          name: 'customers',
          fields: [
            { name: 'id', type: 'int', pk: true },
            { name: 'email', type: 'varchar_255', unique: true }
          ]
        },
        {
          name: 'invoices',
          fields: [
            { name: 'id', type: 'int', pk: true },
            { name: 'customer_id', type: 'int' }
          ]
        }
      ],
      references: [
        {
          sourceTable: 'invoices',
          sourceField: 'customer_id',
          sourceRelation: '*',
          targetTable: 'customers',
          targetField: 'id',
          targetRelation: '1'
        }
      ]
    };

    const mermaid = convertDbmlSchemaToMermaid(schema);
    expect(mermaid.startsWith('erDiagram')).toBe(true);
    expect(mermaid).toContain('customers {');
    expect(mermaid).toContain('invoices {');
    expect(mermaid).toContain('invoices }o--|| customers');
  });
});

describe('Templates Library', () => {
  it('all built-in templates are defined and non-empty', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(7);
    for (const t of TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.code.length).toBeGreaterThan(20);
      if (t.type === 'dbml') {
        const parsed = parseDbml(t.code);
        expect(parsed.success).toBe(true);
      }
    }
  });
});
