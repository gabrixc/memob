import { readFileAsDataURL } from '@/lib/canvas/imageUpload'

describe('readFileAsDataURL', () => {
  it('resolves with a data URL for a valid file', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    const file = new File([blob], 'test.png', { type: 'image/png' })
    const result = await readFileAsDataURL(file)
    expect(result).toMatch(/^data:image\/png;base64,/)
  })

  it('rejects when FileReader errors', async () => {
    const file = new File([], 'bad.png', { type: 'image/png' })
    const origFR = global.FileReader
    const mockFR = function () {
      return {
        readAsDataURL: function () {
          setTimeout(() => { (this as { onerror?: () => void }).onerror?.() }, 0)
        },
        onerror: null, onload: null,
      }
    }
    global.FileReader = mockFR as unknown as typeof FileReader
    await expect(readFileAsDataURL(file)).rejects.toThrow('FileReader error')
    global.FileReader = origFR
  })
})
