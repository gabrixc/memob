export function applyTextTransform(text: string, mode: string): string {
  if (mode === 'upper') return text.toUpperCase()
  if (mode === 'lower') return text.toLowerCase()
  if (mode === 'title') return text.replace(/\b\w/g, c => c.toUpperCase())
  return text
}
