type CharStyle = { fontWeight?: string; fontStyle?: string }
type FabricStyles = Record<number, Record<number, CharStyle>>

/**
 * Parse **bold**, *italic*, ***bold-italic*** markers in a markdown string and
 * return the clean display text (markers stripped) plus Fabric charStyles.
 *
 * Markers must not cross line boundaries.
 */
export function parseMarkdown(raw: string): { text: string; styles: FabricStyles } {
  const lines = raw.split('\n')
  const resultLines: string[] = []
  const styles: FabricStyles = {}

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    let clean = ''
    const lineStyles: Record<number, CharStyle> = {}
    let i = 0
    let charIdx = 0

    while (i < line.length) {
      // *** bold italic — check before ** to avoid partial match
      if (line[i] === '*' && line[i + 1] === '*' && line[i + 2] === '*') {
        const end = line.indexOf('***', i + 3)
        if (end !== -1) {
          const content = line.slice(i + 3, end)
          for (let j = 0; j < content.length; j++) {
            lineStyles[charIdx + j] = { fontWeight: 'bold', fontStyle: 'italic' }
          }
          clean += content
          charIdx += content.length
          i = end + 3
          continue
        }
      }
      // ** bold
      if (line[i] === '*' && line[i + 1] === '*') {
        const end = line.indexOf('**', i + 2)
        if (end !== -1) {
          const content = line.slice(i + 2, end)
          for (let j = 0; j < content.length; j++) {
            lineStyles[charIdx + j] = { fontWeight: 'bold' }
          }
          clean += content
          charIdx += content.length
          i = end + 2
          continue
        }
      }
      // * italic
      if (line[i] === '*') {
        const end = line.indexOf('*', i + 1)
        if (end !== -1) {
          const content = line.slice(i + 1, end)
          for (let j = 0; j < content.length; j++) {
            lineStyles[charIdx + j] = { fontStyle: 'italic' }
          }
          clean += content
          charIdx += content.length
          i = end + 1
          continue
        }
      }
      clean += line[i]
      charIdx++
      i++
    }

    resultLines.push(clean)
    if (Object.keys(lineStyles).length > 0) {
      styles[lineIdx] = lineStyles
    }
  }

  return { text: resultLines.join('\n'), styles }
}
