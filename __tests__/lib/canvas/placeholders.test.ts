import { substitutePlaceholders, extractPlaceholders } from '@/lib/canvas/placeholders'

const sampleJson = {
  objects: [
    { type: 'i-text', text: 'Hello {{emp_name}}' },
    { type: 'i-text', text: '{{emp_dept}} Department' },
    { type: 'rect', fill: '#fff' },
  ]
}

describe('extractPlaceholders', () => {
  it('returns all unique placeholder names', () => {
    const result = extractPlaceholders(sampleJson)
    expect(result).toEqual(expect.arrayContaining(['emp_name', 'emp_dept']))
    expect(result).toHaveLength(2)
  })
})

describe('substitutePlaceholders', () => {
  it('replaces all placeholders with record values', () => {
    const result = substitutePlaceholders(sampleJson, { emp_name: 'Ahmad', emp_dept: 'Finance' })
    expect(result.objects[0].text).toBe('Hello Ahmad')
    expect(result.objects[1].text).toBe('Finance Department')
  })

  it('leaves unmatched placeholders as empty string', () => {
    const result = substitutePlaceholders(sampleJson, {})
    expect(result.objects[0].text).toBe('Hello ')
  })

  it('does not mutate the original JSON', () => {
    substitutePlaceholders(sampleJson, { emp_name: 'X' })
    expect(sampleJson.objects[0].text).toBe('Hello {{emp_name}}')
  })
})
