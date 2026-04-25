// src/lib/canvas/tableConfig.ts
export interface TableBorderStyle {
  showInner:    boolean
  showOuter:    boolean
  borderColor:  string
  borderWeight: number
}

export interface TableConfig {
  title:       string
  headers:     string[]
  cols:        number
  rows:        number
  cellData:    string[][]
  borderStyle: TableBorderStyle
}

export function defaultTableConfig(cols = 3, rows = 2): TableConfig {
  return {
    title:   '',
    headers: Array.from({ length: cols }, (_, i) => `Col ${i + 1}`),
    cols,
    rows,
    cellData: Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => `{{col${c + 1}}}`)
    ),
    borderStyle: { showInner: true, showOuter: true, borderColor: '#e2e8f0', borderWeight: 1 },
  }
}
