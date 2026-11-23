import { audienceApiError, audienceUser } from '@/lib/audience-api'
import { csvCell } from '@/lib/audience-engine'
import { prisma } from '@/lib/db'
import { studyReport } from '@/services/audience-engine'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await audienceUser()
    const report = await studyReport(user.id, (await params).id)
    const headers = [
      'study',
      'variant',
      'assigned',
      'exposed',
      'started',
      'reported_90_percent',
      'expressed_interest',
      'responses',
      'average_rating_min_n_5',
      'interest_rate',
      'interest_95_low',
      'interest_95_high',
    ]
    const rows = report.variants.map((v) => [
      report.project.title,
      v.label,
      v.assigned,
      v.exposed,
      v.started,
      v.completed,
      v.interested,
      v.responses,
      v.rating,
      v.interestRate.rate,
      v.interestRate.low,
      v.interestRate.high,
    ])
    await prisma.audienceAudit.create({
      data: {
        actorId: user.id,
        action: 'report.exported',
        targetId: report.project.id,
        detail: { format: 'aggregate_csv' },
      },
    })
    return new Response([headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audience-${report.project.id}.csv"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return audienceApiError(error)
  }
}
