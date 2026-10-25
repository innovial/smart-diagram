export type DiagramType = 'mermaid' | 'dbml';

export type MermaidTheme = 'default' | 'dark' | 'neutral' | 'forest';

export interface RenderResult {
  success: boolean;
  svg?: string;
  error?: string;
  line?: number;
  column?: number;
  rawError?: unknown;
}

export interface DbmlTableField {
  name: string;
  type: string;
  pk?: boolean;
  unique?: boolean;
  notNull?: boolean;
  increment?: boolean;
  note?: string;
  defaultValue?: string;
}

export interface DbmlTable {
  name: string;
  alias?: string;
  note?: string;
  fields: DbmlTableField[];
}

export interface DbmlReference {
  id?: string;
  sourceTable: string;
  sourceField: string;
  sourceRelation: string; // '1' | '*'
  targetTable: string;
  targetField: string;
  targetRelation: string; // '1' | '*'
}

export interface DbmlSchemaData {
  tables: DbmlTable[];
  references: DbmlReference[];
}

export interface DiagramTemplate {
  id: string;
  name: string;
  type: DiagramType;
  category: string;
  description: string;
  code: string;
}
