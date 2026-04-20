import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PreviewCanvas from './PreviewCanvas'

export default async function PreviewPage({ params }: { params: { templateId: string } }) {
  const session = await auth()
  if (!session) redirect('/login')
  const template = await prisma.template.findUnique({ where: { id: params.templateId } })
  if (!template) return <div>Template not found</div>

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
      <div className="no-print fixed top-3 right-3 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="bg-indigo-500 text-white px-4 py-2 rounded text-sm shadow">
          Print
        </button>
        <button onClick={() => window.close()}
          className="bg-slate-500 text-white px-4 py-2 rounded text-sm shadow">
          Close
        </button>
      </div>
      <div className="w-[794px] mx-auto bg-white shadow-lg">
        <PreviewCanvas canvasJson={template.canvasJson as object} />
      </div>
    </>
  )
}
