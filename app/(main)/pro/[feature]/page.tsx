import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { getProPreviewData } from '@/services/pro'
import { getProTool } from '@/components/pro/pro-tools'
import ProCommandCenter from '@/components/pro/ProCommandCenter'
import ProFeatureShell from '@/components/pro/ProFeatureShell'
import ProPreview from '@/components/pro/ProPreview'

type Props = { params: Promise<{ feature: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getProTool((await params).feature)
  return { title: tool ? `${tool.title} — NoSpoilers Pro` : 'NoSpoilers Pro', robots: { index: false, follow: false } }
}

export default async function ProFeaturePage({ params }: Props) {
  const tool = getProTool((await params).feature)
  if (!tool) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !hasProAccess(session.user.email)) redirect(`/pro/access?feature=${tool.slug}`)

  const mode = tool.slug === 'identity' ? 'forge' : tool.slug === 'lumi' ? 'lumi' : tool.slug === 'spoiler-field' ? 'shield' : null
  if (mode) return <ProFeatureShell key={tool.slug} tool={tool}><ProCommandCenter mode={mode} userId={session.user.id} /></ProFeatureShell>

  const data = await getProPreviewData(session.user.id)
  const activeTab = tool.slug === 'double-feature' ? 'double' : tool.slug === 'taste-lab' ? 'taste' : 'tonight'
  return <ProFeatureShell key={tool.slug} tool={tool}><ProPreview data={data} activeTab={activeTab} /></ProFeatureShell>
}
