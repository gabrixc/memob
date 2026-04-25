import { applyTextTransform } from '@/lib/canvas/textTransform'

describe('applyTextTransform', () => {
  it('uppercases', () => expect(applyTextTransform('hello world', 'upper')).toBe('HELLO WORLD'))
  it('lowercases', () => expect(applyTextTransform('HELLO', 'lower')).toBe('hello'))
  it('title-cases', () => expect(applyTextTransform('hello world', 'title')).toBe('Hello World'))
  it('returns unchanged for none', () => expect(applyTextTransform('Hello', 'none')).toBe('Hello'))
  it('title-cases words around field references', () =>
    expect(applyTextTransform('dear {{name}} welcome', 'title')).toBe('Dear {{Name}} Welcome'))
})
