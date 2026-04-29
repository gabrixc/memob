import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TemplatesClient from './TemplatesClient'

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const templates = await prisma.template.findMany({ orderBy: { updatedAt: 'desc' } })

  return <TemplatesClient initialTemplates={templates.map(t => ({
    id: t.id,
    name: t.name,
    pageSize: t.pageSize,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))} />
}
