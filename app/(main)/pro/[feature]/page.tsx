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
import WhyDidILoveThat from '@/components/pro/taste/WhyDidILoveThat'

type Props = {
  params: Promise<{ feature: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getProTool((await params).feature)
  return { title: tool ? `${tool.title} — NoSpoilers Pro` : 'NoSpoilers Pro', robots: { index: false, follow: false } }
}

export default async function ProFeaturePage({ params, searchParams }: Props) {
  const tool = getProTool((await params).feature)
  if (!tool) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !hasProAccess(session.user.email)) redirect(`/pro/access?feature=${tool.slug}`)

  const mode = tool.slug === 'identity' ? 'forge' : tool.slug === 'lumi' ? 'lumi' : tool.slug === 'spoiler-field' ? 'shield' : null
  if (mode) return <ProFeatureShell key={tool.slug} tool={tool}><ProCommandCenter mode={mode} userId={session.user.id} /></ProFeatureShell>

  if (tool.slug === 'taste-lab') {
    // The labeled fixture mode runs on sample ratings and reads nothing of the member's.
    const demo = (await searchParams).demo === '1'
    const data = demo ? null : await getProPreviewData(session.user.id)
    return (
      <ProFeatureShell key={tool.slug} tool={tool}>
        <WhyDidILoveThat userId={session.user.id} demo={demo} />
        {data && <ProPreview data={data} activeTab="taste" />}
      </ProFeatureShell>
    )
  }

  const data = await getProPreviewData(session.user.id)
  const activeTab = tool.slug === 'double-feature' ? 'double' : 'tonight'
  return <ProFeatureShell key={tool.slug} tool={tool}><ProPreview data={data} activeTab={activeTab} /></ProFeatureShell>
}
