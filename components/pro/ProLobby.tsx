import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import { PRO_TOOLS } from './pro-tools'
import styles from './pro-lobby.module.css'

// Film-choosing tools first, then the personal ones. Lumi is the header's primary action.
const LOBBY_TOOLS = ['tonight', 'double-feature', 'taste-lab', 'identity', 'spoiler-field']
  .map(slug => PRO_TOOLS.find(tool => tool.slug === slug)!)

const DIRECTORY = [
  ...LOBBY_TOOLS.map(({ slug, title, description, action }) => ({ href: `/pro/${slug}`, title, description, action })),
  {
    href: '/theater',
    title: 'NoSpoilers Theater',
    description: 'A front-row seat to independent premieres. Better when watched together.',
    action: 'Enter the theater',
  },
  {
    href: '/lab',
    title: 'NoSpoilers Lab',
    description: 'Your footage. Your cut. Edit shots, add titles and sound, and export your next film.',
    action: 'Open Lab',
  },
]

export default function ProLobby({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        title="The lobby."
        lede="Tell Lumi your mood, your time, and who's watching. Find your next great film without giving the story away."
      >
        <Button variant="primary" size="lg" href="/pro/lumi" className="w-full sm:w-auto">
          Open Lumi AI
        </Button>
        {hasAccess ? (
          <Badge variant="outline" size="md">Founding member</Badge>
        ) : (
          <Link
            href="/pro/access"
            className="inline-flex min-h-10 items-center gap-2 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
          >
            Private preview · Get access <ArrowRightIcon size={14} />
          </Link>
        )}
      </PageHeader>

      <Section
        title="Your night, your way."
        note="Good taste deserves a little more."
        headingId="pro-tools-heading"
        className="mt-10 sm:mt-14"
      >
        <div className={styles.directory}>
          {DIRECTORY.map(({ href, title, description, action }) => (
            <Link key={href} href={href} aria-label={`Open ${title}`} className={styles.row}>
              <span className={styles.rowName}>{title}</span>
              <span className={styles.rowDescription}>{description}</span>
              <span className={styles.rowAction}>{action}<ArrowRightIcon size={14} /></span>
            </Link>
          ))}
        </div>
      </Section>

      <footer className="mt-8 flex flex-col gap-2 font-body text-sm text-ns-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Your next favorite. Still a surprise.</p>
        {!hasAccess ? (
          <Link href="/pro/access" className="inline-flex min-h-10 flex-wrap items-center gap-x-1.5">
            Pro is in private preview.
            <span className="text-ns-secondary-readable underline underline-offset-4">Join the founding list</span>
          </Link>
        ) : (
          <p>A little more cinema. Just for you.</p>
        )}
      </footer>
    </div>
  )
}
