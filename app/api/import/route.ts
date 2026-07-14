import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batches = await prisma.importBatch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      source: true,
      fileName: true,
      status: true,
      totalRows: true,
      matchedRows: true,
      conflictRows: true,
      unmatchedRows: true,
      summary: true,
      createdAt: true,
      completedAt: true,
    },
  })

  return NextResponse.json({
    batches: batches.map(batch => ({
      ...batch,
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString() ?? null,
    })),
  })
}
