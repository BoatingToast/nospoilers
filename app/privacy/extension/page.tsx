import { publicPageMetadata } from '@/lib/seo'
import Footer from '@/components/landing/Footer'
import Logo from '@/components/ui/Logo'
import PolicyContents from './PolicyContents'

export const metadata = publicPageMetadata({
  title: 'Shield Privacy Policy',
  description: 'Privacy policy for the NoSpoilers Shield Chrome extension.',
  path: '/privacy/extension',
})

const UPDATED = 'July 13, 2026'

const SECTIONS = [
  { id: 'summary', title: 'Summary' },
  { id: 'information', title: 'Information the extension handles' },
  { id: 'use', title: 'How information is used' },
  { id: 'storage', title: 'Storage, sharing, and retention' },
  { id: 'permissions', title: 'Permissions' },
  { id: 'limited-use', title: 'Limited use' },
  { id: 'choices', title: 'Your choices' },
  { id: 'contact', title: 'Contact' },
]

export default function ExtensionPrivacyPage() {
  return (
    <main className="min-h-dvh bg-ns-bg text-ns-text">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <Logo />

        <header className="mt-10 max-w-3xl">
          <h1 className="font-display text-4xl text-ns-text sm:text-5xl lg:text-6xl">
            NoSpoilers Shield Privacy Policy
          </h1>
          <p className="mt-4 text-base text-ns-muted">Chrome extension · Last updated: {UPDATED}</p>
        </header>

        <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
        <div className="max-w-2xl space-y-12 text-lg leading-8 text-ns-muted">
          <PolicySection id="summary" title="Summary" first>
            <p>
              NoSpoilers Shield identifies and obscures likely movie and television spoilers on webpages.
              Page classification happens locally in your browser. NoSpoilers does not receive, sell, or use
              webpage content for advertising.
            </p>
          </PolicySection>

          <PolicySection id="information" title="Information the extension handles">
            <ul className="list-disc space-y-4 pl-6 marker:text-ns-secondary-readable">
              <li>
                <strong className="text-ns-text">Website content:</strong> Visible text and labels are inspected
                temporarily in browser memory to decide whether a page element is likely to contain a spoiler.
                This content is not stored or transmitted to NoSpoilers.
              </li>
              <li>
                <strong className="text-ns-text">Your settings:</strong> Protected titles, sensitivity, the global
                on/off setting, generic-spoiler preference, and domains you explicitly pause are stored using
                Chrome&apos;s synchronized extension storage.
              </li>
              <li>
                <strong className="text-ns-text">Plot Passport titles:</strong> When you explicitly choose Sync on
                the signed-in NoSpoilers website, the page sends the names of unfinished titles to the installed
                extension. The extension validates the website origin and stores those title names separately from
                titles you entered manually.
              </li>
              <li>
                <strong className="text-ns-text">Per-page counts:</strong> The number shown on the extension badge
                is calculated locally for the current tab and is not retained as browsing history.
              </li>
            </ul>
          </PolicySection>

          <PolicySection id="use" title="How information is used">
            <p>
              Information is used only to provide the extension&apos;s user-facing spoiler-protection features:
              matching protected titles, applying the selected sensitivity, pausing chosen domains, hiding likely
              spoilers, and revealing content at your request.
            </p>
          </PolicySection>

          <PolicySection id="storage" title="Storage, sharing, and retention">
            <p>
              NoSpoilers operates no server for this extension and does not receive its settings or page content.
              Chrome may synchronize extension settings between browsers signed in to your Google account under
              Google&apos;s own privacy terms. NoSpoilers does not sell, rent, share, or use this information for
              personalized advertising. Settings remain until you remove them, clear extension storage, or
              uninstall the extension.
            </p>
          </PolicySection>

          <PolicySection id="permissions" title="Permissions">
            <ul className="list-disc space-y-4 pl-6 marker:text-ns-secondary-readable">
              <li><strong className="text-ns-text">Website access</strong> is required to identify and cover likely spoilers on webpages.</li>
              <li><strong className="text-ns-text">Storage</strong> saves and synchronizes your protection preferences.</li>
              <li><strong className="text-ns-text">Context menus</strong> let you protect selected titles or pause a site.</li>
            </ul>
          </PolicySection>

          <PolicySection id="limited-use" title="Limited use">
            <p>
              NoSpoilers Shield&apos;s use and transfer of information received from Google APIs complies with the
              Chrome Web Store User Data Policy, including its Limited Use requirements. The extension does not
              execute remotely hosted code.
            </p>
          </PolicySection>

          <PolicySection id="choices" title="Your choices">
            <p>
              You can remove individual protected titles, resume paused domains, disable protection, clear the
              extension&apos;s storage, or uninstall the extension at any time through Chrome.
            </p>
          </PolicySection>

          <PolicySection id="contact" title="Contact">
            <p>
              Questions about this policy can be sent to{' '}
              <a className="font-semibold text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text" href="mailto:nospoilers641@gmail.com">
                nospoilers641@gmail.com
              </a>.
            </p>
          </PolicySection>
        </div>
        <PolicyContents sections={SECTIONS} />
        </div>
      </div>
      <Footer />
    </main>
  )
}

function PolicySection({
  id,
  title,
  first = false,
  children,
}: {
  id: string
  title: string
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <section id={id} data-policy-section className={`scroll-mt-28 ${first ? '' : 'ns-reveal'}`}>
      <h2 className="font-display text-2xl text-ns-text sm:text-3xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
