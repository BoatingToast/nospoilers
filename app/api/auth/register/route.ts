import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json()

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { username: username.trim() },
        ],
      },
    })

    if (existing) {
      const field = existing.email === normalizedEmail ? 'Email' : 'Username'
      return NextResponse.json({ error: `${field} is already taken.` }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email:    normalizedEmail,
        password: hashed,
        username: username.trim(),
      },
      select: { id: true, email: true, username: true, createdAt: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
