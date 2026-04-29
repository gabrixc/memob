import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PreviewCanvas from './PreviewCanvas'
import PreviewActions from './PreviewActions'

export default async function PreviewPage({ params }: { params: { templateId: string } }) {
  const session = await auth()
  if (!session) redirect('/login')
  const template = await prisma.template.findUnique({ where: { id: params.templateId } })
  if (!template) return <div>Template not found</div>

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
      <PreviewActions />
      <div className="w-[794px] mx-auto bg-white shadow-lg">
        <PreviewCanvas canvasJson={template.canvasJson as object} />
      </div>
    </>
  )
}
