// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (
          email !== process.env.ADMIN_EMAIL ||
          !bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH ?? '')
        ) return null
        return { id: '1', email }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
})
