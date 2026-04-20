import puppeteer from 'puppeteer'

export function canvasJsonToHtml(canvasJson: Record<string, unknown>, pageWidth = 794): string {
  const objects = (canvasJson.objects as Record<string, unknown>[]) ?? []
  const elements = objects.map(obj => {
    const s = `position:absolute;left:${obj.left}px;top:${obj.top}px;`
    if (obj.type === 'i-text' || obj.type === 'textbox') {
      return `<div style="${s}font-size:${obj.fontSize}px;font-family:${obj.fontFamily ?? 'sans-serif'};color:${obj.fill};width:${obj.width}px;white-space:pre-wrap">${String(obj.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`
    }
    if (obj.type === 'rect') {
      return `<div style="${s}width:${obj.width}px;height:${obj.height}px;background:${obj.fill};border:${obj.strokeWidth}px solid ${obj.stroke}"></div>`
    }
    return ''
  }).join('')
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;width:${pageWidth}px;min-height:1123px;position:relative;">${elements}</body></html>`
}

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
