// Updated regex to support dot notation for aliased fields (e.g., {{check.status}})
const RE = /\{\{([a-zA-Z_][\w.]*)\}\}/g

export function extractPlaceholders(canvasJson: Record<string, unknown>): string[] {
  const found = new Set<string>()
  for (const m of JSON.stringify(canvasJson).matchAll(RE)) found.add(m[1])
  return Array.from(found)
}

export function substitutePlaceholders(
  canvasJson: Record<string, unknown>,
  record: Record<string, string>
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(canvasJson).replace(RE, (_, key) => {
      // Try exact key match first (supports dot notation like "check.status")
      if (key in record) {
        return record[key] ?? ''
      }
      return ''
    })
  )
}
