// src/app/(editor)/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EditorClient from './EditorClient'

export default async function EditorPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return <EditorClient />
}
