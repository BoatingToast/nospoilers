'use client'

import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/icons'

export default function WrappedTab() {
  const year = new Date().getFullYear()
  return (
    <PageHeader
      title={`${year} Wrapped`}
      lede="Your year in film — genres, ratings, and milestones."
    >
      <Button variant="primary" href="/wrapped">
        View {year} Wrapped <ArrowRightIcon size={14} />
      </Button>
    </PageHeader>
  )
}
