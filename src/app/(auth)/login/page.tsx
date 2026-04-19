// src/app/(auth)/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    if (result?.error) setError('Invalid email or password')
    else router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">📄 MemoBuilder</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input name="email" type="email" placeholder="Email" required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Password" required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <button type="submit"
          className="w-full bg-sky-500 text-white rounded px-3 py-2 text-sm font-medium">
          Sign In
        </button>
      </form>
    </div>
  )
}
