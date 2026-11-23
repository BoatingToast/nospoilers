import { audienceApiError, audienceUser } from '@/lib/audience-api'
import { downloadDataset } from '@/services/audience-admin'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await audienceUser(true)
    const dataset = await downloadDataset(user.id, (await params).id)
    const rows = Array.isArray(dataset.rows) ? dataset.rows : []
    return new Response(rows.map((row) => JSON.stringify(row)).join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="audience-dataset-${dataset.id}.jsonl"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return audienceApiError(error)
  }
}
