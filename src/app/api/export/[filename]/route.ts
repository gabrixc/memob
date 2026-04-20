import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(_: NextRequest, { params }: { params: { filename: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const filePath = path.join(process.cwd(), 'exports', params.filename)
  try {
    const file = await fs.readFile(filePath)
    const ext = path.extname(params.filename).slice(1)
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeMap[ext] ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${params.filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
