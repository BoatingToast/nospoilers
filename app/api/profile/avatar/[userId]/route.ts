import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId)) {
    return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 })
  }

  try {
    const avatar = await prisma.avatarImage.findUnique({
      where:  { userId },
      select: { data: true, contentType: true },
    })

    if (!avatar) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return new NextResponse(Buffer.from(avatar.data), {
      headers: {
        'Content-Type':           avatar.contentType,
        'Content-Length':         String(avatar.data.byteLength),
        'Cache-Control':          'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Avatar read error:', error)
    return NextResponse.json({ error: 'Avatar unavailable' }, { status: 500 })
  }
}
