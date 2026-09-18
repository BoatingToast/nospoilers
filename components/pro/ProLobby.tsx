import Link from 'next/link'
import {
  ArrowRightIcon,
  ClapperboardIcon,
  LockIcon,
  RecsIcon,
  SpoilerFreeIcon,
} from '@/components/icons'
import { PRO_TOOLS, type ProTool } from './pro-tools'
import styles from './pro-lobby.module.css'

const LOBBY_TOOLS = ['taste-lab', 'identity', 'spoiler-field', 'tonight', 'double-feature']
  .map(slug => PRO_TOOLS.find(tool => tool.slug === slug)!)

function ToolArtwork({ slug }: { slug: ProTool['slug'] }) {
  return (
    <div className={`${styles.toolArtwork} ${styles[slug]}`} aria-hidden="true">
      {slug === 'taste-lab' && (
        <svg viewBox="0 0 160 120" fill="none">
          <path d="M80 8 130 37v56l-50 28-50-28V37Z M80 28l32 19v36l-32 18-32-18V47Z M80 48l15 9v16l-15 9-15-9V57Z" stroke="currentColor" strokeOpacity=".22" />
          <path d="M80 8v113M30 37l100 56M130 37 30 93" stroke="currentColor" strokeOpacity=".15" />
          <path d="m80 22 42 20-17 36-25 30-42-19 16-37Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="1.5" />
          <g fill="currentColor"><circle cx="80" cy="22" r="3" /><circle cx="122" cy="42" r="3" /><circle cx="105" cy="78" r="3" /><circle cx="80" cy="108" r="3" /><circle cx="38" cy="89" r="3" /><circle cx="54" cy="52" r="3" /></g>
        </svg>
      )}
      {slug === 'identity' && (
        <div className={styles.identityPortrait}>
          <span className={styles.portraitHalo} />
          <span className={styles.portraitBody} />
          <span className={styles.portraitHead}><span /></span>
          <span className={styles.portraitPedestal} />
        </div>
      )}
      {slug === 'spoiler-field' && (
        <div className={styles.shieldArt}>
          <span /><span />
          <SpoilerFreeIcon size={54} strokeWidth={1} />
        </div>
      )}
      {slug === 'tonight' && (
        <div className={styles.tonightArt}>
          <span className={styles.moon} />
          <span className={styles.starOne}>✦</span>
          <span className={styles.starTwo}>✦</span>
          <span className={styles.horizon} />
        </div>
      )}
      {slug === 'double-feature' && (
        <div className={styles.doubleArt}>
          <span className={styles.miniPoster}><span>I</span></span>
          <span className={styles.miniPoster}><span>II</span></span>
        </div>
      )}
    </div>
  )
}

export default function ProLobby({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className={styles.lobby}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.brandLine}>
              <span className={styles.proBadge}><RecsIcon size={12} /> NOSPOILERS PRO</span>
              <span className={styles.memberLabel}>THE MEMBERS&apos; LOUNGE</span>
            </div>
            <h1 className={styles.title}>The lobby<span>.</span></h1>
            <p className={styles.subtitle}>Good taste deserves a little more.</p>
          </div>
          {hasAccess ? (
            <span className={styles.accessBadge}><span className={styles.statusDot} /> Founding member</span>
          ) : (
            <Link href="/pro/access" className={styles.accessBadge}>
              <span className={styles.statusDot} /> Private preview <span className={styles.accessDivider} /> Get access <ArrowRightIcon size={14} />
            </Link>
          )}
        </header>

        <section aria-label="Meet your cinema concierge">
          <Link href="/pro/lumi" aria-label="Open Lumi AI" className={styles.hero}>
            <div className={styles.heroCopy}>
              <div className={styles.heroEyebrow}><RecsIcon size={17} /> LUMI AI <span>YOUR CINEMA CONCIERGE</span></div>
              <h2>Less searching.<br /><span>More cinema.</span></h2>
              <p>Tell Lumi your mood, your time, and who&apos;s watching. Find your next great film without giving the story away.</p>
              <span className={styles.primaryAction}>Chat with Lumi <ArrowRightIcon size={18} /></span>
              <span className={styles.heroFootnote}><SpoilerFreeIcon size={14} /> All the feeling. None of the spoilers.</span>
            </div>

            <div className={styles.lumiArtwork} aria-hidden="true">
              <div className={styles.orbitOuter} />
              <div className={styles.orbitInner} />
              <div className={styles.orbGlow} />
              <div className={styles.lumiOrb}>
                <svg viewBox="0 0 80 80" fill="none"><path d="M40 9c4 20 11 27 31 31-20 4-27 11-31 31C36 51 29 44 9 40c20-4 27-11 31-31Z" fill="currentColor" /><path d="M64 7c1.5 7 4 9.5 11 11-7 1.5-9.5 4-11 11-1.5-7-4-9.5-11-11 7-1.5 9.5-4 11-11Z" fill="currentColor" opacity=".7" /></svg>
              </div>
              <span className={styles.orbitPoint} />
              <span className={styles.artLabel}>A LITTLE INTELLIGENCE. A LOT OF TASTE.</span>
              <div className={styles.promptBubble}><span>“</span>Something that stays with me.<span>”</span></div>
              <div className={styles.lumiSignature}><span /> Lumi gets the mood.</div>
            </div>
          </Link>
        </section>

        <section className={styles.toolsSection} aria-labelledby="pro-tools-heading">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>THE PRO COLLECTION</span>
              <h2 id="pro-tools-heading">Your night, your way.</h2>
            </div>
            <p>Explore a little further.</p>
          </div>

          <div className={styles.toolGrid}>
            {LOBBY_TOOLS.map(({ slug, title, description, action, Icon }, index) => (
              <Link key={slug} href={`/pro/${slug}`} aria-label={`Open ${title}`} className={`${styles.toolCard} ${styles[slug]}`}>
                <div className={styles.cardTop}>
                  <span className={styles.toolIcon}><Icon size={21} strokeWidth={1.5} /></span>
                  <span className={styles.toolNumber}>0{index + 1}</span>
                </div>
                <ToolArtwork slug={slug} />
                <div className={styles.cardCopy}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className={styles.cardAction}>{action}<ArrowRightIcon size={16} /></span>
              </Link>
            ))}

            <Link href="/theater" aria-label="Open NoSpoilers Theater" className={`${styles.toolCard} ${styles.theater}`}>
              <div className={styles.cardTop}>
                <span className={styles.toolIcon}><ClapperboardIcon size={21} strokeWidth={1.5} /></span>
                <span className={styles.toolNumber}>06</span>
              </div>
              <div className={styles.toolArtwork} aria-hidden="true">
                <div className={styles.cinemaScreen} />
                <div className={styles.cinemaSeats}>{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
              </div>
              <div className={styles.cardCopy}>
                <h3>NoSpoilers Theater</h3>
                <p>A front-row seat to independent premieres. Better when watched together.</p>
              </div>
              <span className={styles.cardAction}>Enter the theater<ArrowRightIcon size={16} /></span>
            </Link>

            <Link href="/lab" aria-label="Open NoSpoilers Lab" className={styles.toolCard}>
              <div className={styles.cardTop}>
                <span className={styles.toolIcon}><ClapperboardIcon size={21} strokeWidth={1.5} /></span>
                <span className={styles.toolNumber}>07</span>
              </div>
              <div className={styles.toolArtwork} aria-hidden="true">
                <svg viewBox="0 0 160 120" fill="none">
                  <rect x="20" y="12" width="120" height="68" rx="7" stroke="currentColor" strokeOpacity=".3" />
                  <path d="m70 32 24 14-24 14V32Z" fill="currentColor" fillOpacity=".35" />
                  <rect x="20" y="88" width="36" height="12" rx="3" fill="currentColor" fillOpacity=".3" />
                  <rect x="60" y="88" width="48" height="12" rx="3" fill="currentColor" fillOpacity=".18" />
                  <rect x="112" y="88" width="28" height="12" rx="3" fill="currentColor" fillOpacity=".3" />
                  <path d="M82 83v25" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className={styles.cardCopy}>
                <h3>NoSpoilers Lab</h3>
                <p>Your footage. Your cut. Edit shots, add titles and sound, and export your next film.</p>
              </div>
              <span className={styles.cardAction}>Open Lab<ArrowRightIcon size={16} /></span>
            </Link>
          </div>
        </section>

        <footer className={styles.lobbyFooter}>
          <p><LockIcon size={13} /> Your next favorite. Still a surprise.</p>
          {!hasAccess ? (
            <Link href="/pro/access">Pro is in private preview. <span>Join the founding list <ArrowRightIcon size={14} /></span></Link>
          ) : (
            <p>A little more cinema. Just for you.</p>
          )}
        </footer>
      </div>
    </div>
  )
}
