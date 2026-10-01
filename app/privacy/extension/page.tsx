import { publicPageMetadata } from '@/lib/seo'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Footer from '@/components/landing/Footer'

export const metadata = publicPageMetadata({
  title: 'Shield Privacy Policy',
  description: 'Privacy policy for the NoSpoilers Shield Chrome extension.',
  path: '/privacy/extension',
})

const UPDATED = 'July 13, 2026'

export default function ExtensionPrivacyPage() {
  return (
    <main className="min-h-screen bg-ns-bg text-ns-text">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-10 items-center font-display text-xl tracking-widest text-ns-text transition-colors hover:text-ns-secondary-readable"
        >
          NoSpoilers
        </Link>

        <PageHeader
          title="NoSpoilers Shield Privacy Policy"
          lede={<>How the NoSpoilers Shield Chrome extension handles your information. Last updated: {UPDATED}</>}
        />

        <div className="mt-10 border-b border-ns-border text-sm leading-7 text-ns-muted">
          <PolicySection title="Summary">
            <p>
              NoSpoilers Shield identifies and obscures likely movie and television spoilers on webpages.
              Page classification happens locally in your browser. NoSpoilers does not receive, sell, or use
              webpage content for advertising.
            </p>
          </PolicySection>

          <PolicySection title="Information the extension handles">
            <ul className="list-disc space-y-3 pl-5 marker:text-ns-secondary-readable">
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

          <PolicySection title="How information is used">
            <p>
              Information is used only to provide the extension&apos;s user-facing spoiler-protection features:
              matching protected titles, applying the selected sensitivity, pausing chosen domains, hiding likely
              spoilers, and revealing content at your request.
            </p>
          </PolicySection>

          <PolicySection title="Storage, sharing, and retention">
            <p>
              NoSpoilers operates no server for this extension and does not receive its settings or page content.
              Chrome may synchronize extension settings between browsers signed in to your Google account under
              Google&apos;s own privacy terms. NoSpoilers does not sell, rent, share, or use this information for
              personalized advertising. Settings remain until you remove them, clear extension storage, or
              uninstall the extension.
            </p>
          </PolicySection>

          <PolicySection title="Permissions">
            <ul className="list-disc space-y-3 pl-5 marker:text-ns-secondary-readable">
              <li><strong className="text-ns-text">Website access</strong> is required to identify and cover likely spoilers on webpages.</li>
              <li><strong className="text-ns-text">Storage</strong> saves and synchronizes your protection preferences.</li>
              <li><strong className="text-ns-text">Context menus</strong> let you protect selected titles or pause a site.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Limited use">
            <p>
              NoSpoilers Shield&apos;s use and transfer of information received from Google APIs complies with the
              Chrome Web Store User Data Policy, including its Limited Use requirements. The extension does not
              execute remotely hosted code.
            </p>
          </PolicySection>

          <PolicySection title="Your choices">
            <p>
              You can remove individual protected titles, resume paused domains, disable protection, clear the
              extension&apos;s storage, or uninstall the extension at any time through Chrome.
            </p>
          </PolicySection>

          <PolicySection title="Contact">
            <p>
              Questions about this policy can be sent to{' '}
              <a className="break-words text-ns-secondary-readable underline underline-offset-4 hover:text-white" href="mailto:nospoilers641@gmail.com">
                nospoilers641@gmail.com
              </a>.
            </p>
          </PolicySection>
        </div>
      </div>
      <Footer />
    </main>
  )
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 gap-3 border-t border-ns-border py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:gap-10">
      <h2 className="font-display text-2xl leading-none tracking-wide text-ns-text sm:text-3xl">{title}</h2>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </section>
  )
}
