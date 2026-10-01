import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json().catch(() => null) as { email?: unknown } | null
    const submittedEmail = typeof body?.email === 'string' ? body.email : ''
    const email = (session?.user?.email ?? submittedEmail).trim().toLowerCase()

    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 },
      )
    }

    const existing = await prisma.proWaitlistEntry.findUnique({ where: { email } })

    if (existing) {
      if (session?.user?.id && !existing.userId) {
        await prisma.proWaitlistEntry.update({
          where: { id: existing.id },
          data: { userId: session.user.id },
        })
      }

      return NextResponse.json({ joined: true, alreadyJoined: true })
    }

    await prisma.proWaitlistEntry.create({
      data: {
        email,
        userId: session?.user?.id ?? null,
      },
    })

    return NextResponse.json({ joined: true, alreadyJoined: false }, { status: 201 })
  } catch (error) {
    // A simultaneous duplicate request is still a successful waitlist signup.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ joined: true, alreadyJoined: true })
    }

    return NextResponse.json(
      { error: 'We could not add you right now. Please try again.' },
      { status: 500 },
    )
  }
}
