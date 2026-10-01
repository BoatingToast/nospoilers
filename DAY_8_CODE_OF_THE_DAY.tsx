'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

interface Movie {
  id: number
  title: string
  year: string
  rating: number
  posterUrl?: string
}

interface DiscoveryChannel {
  id: string
  eyebrow: string
  title: string
  movies: Movie[]
}

interface Day8DiscoverProps {
  channels?: DiscoveryChannel[]
}

const DEMO_CHANNELS: DiscoveryChannel[] = [
  {
    id: 'trending',
    eyebrow: 'Hot right now',
    title: 'Trending This Week',
    movies: [
      { id: 1, title: 'The Last Signal', year: '2026', rating: 8.4 },
      { id: 2, title: 'Midnight Orbit', year: '2025', rating: 8.1 },
      { id: 3, title: 'After the Static', year: '2026', rating: 7.9 },
      { id: 4, title: 'Neon Horizon', year: '2024', rating: 8.2 },
      { id: 5, title: 'Second Screening', year: '2025', rating: 7.8 },
      { id: 6, title: 'The Quiet Frame', year: '2026', rating: 8.0 },
    ],
  },
  {
    id: 'hidden-gems',
    eyebrow: 'Underrated',
    title: 'Hidden Gems',
    movies: [
      { id: 7, title: 'Aperture', year: '2023', rating: 7.7 },
      { id: 8, title: 'Low Light', year: '2024', rating: 7.9 },
      { id: 9, title: 'The Long Cut', year: '2022', rating: 8.0 },
      { id: 10, title: 'North of Tomorrow', year: '2025', rating: 7.8 },
      { id: 11, title: 'Room Tone', year: '2023', rating: 7.6 },
      { id: 12, title: 'Silver Grain', year: '2024', rating: 8.1 },
    ],
  },
  {
    id: 'science-fiction',
    eyebrow: 'Genre',
    title: 'Science Fiction',
    movies: [
      { id: 13, title: 'Deep Relay', year: '2026', rating: 8.3 },
      { id: 14, title: 'Memory Engine', year: '2025', rating: 8.0 },
      { id: 15, title: 'Three Suns', year: '2024', rating: 7.8 },
      { id: 16, title: 'Signal Lost', year: '2026', rating: 8.2 },
      { id: 17, title: 'Red Shift', year: '2025', rating: 7.9 },
      { id: 18, title: 'Borrowed Sky', year: '2023', rating: 7.7 },
    ],
  },
]

function number(value: number) {
  return String(value).padStart(2, '0')
}










function useDiscoverMotion(
  sceneRef: RefObject<HTMLElement | null>,
  sectionCount: number,
) {
  const [activeSection, setActiveSection] = useState(1)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const sections = Array.from(
      scene.querySelectorAll<HTMLElement>('[data-discover-section]'),
    )
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reduceMotion) {
      sections.forEach(section => {
        section.dataset.visible = 'true'
      })
      return
    }

    sections.forEach(section => {
      const rect = section.getBoundingClientRect()
      section.dataset.visible =
        rect.top < window.innerHeight * 0.9 ? 'true' : 'false'
    })
    scene.dataset.motionReady = 'true'

    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).dataset.visible = 'true'
          }
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12,
      },
    )

    sections.forEach(section => revealObserver.observe(section))

    let animationFrame = 0

    function updateScene() {
      animationFrame = 0
      if (!scene) return

      const sceneRect = scene.getBoundingClientRect()
      const scrollable = Math.max(scene.offsetHeight - window.innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -sceneRect.top / scrollable))

      scene.style.setProperty('--scroll-progress', progress.toFixed(4))

      const focalPoint = window.innerHeight * 0.38
      const closest = sections
        .map(section => ({
          section,
          distance: Math.abs(
            section.getBoundingClientRect().top - focalPoint,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.section

      if (closest) {
        const next = Number(closest.dataset.sectionIndex ?? 1)
        setActiveSection(current => (current === next ? current : next))
      }
    }

    function requestUpdate() {
      if (animationFrame) return
      animationFrame = window.requestAnimationFrame(updateScene)
    }

    updateScene()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      revealObserver.disconnect()
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [sceneRef, sectionCount])

  return activeSection
}














function MovieRail({
  channel,
  index,
}: {
  channel: DiscoveryChannel
  index: number
}) {
  const railRef = useRef<HTMLDivElement>(null)

  function move(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.max(railRef.current.clientWidth * 0.8, 420),
      behavior: 'smooth',
    })
  }

  return (
    <section
      className="day8-channel"
      data-discover-section
      data-section-index={index + 1}
    >
      <header className="day8-channel-heading">
        <span className="day8-channel-number">{number(index + 1)}</span>
        <div>
          <p>{channel.eyebrow}</p>
          <h2>{channel.title}</h2>
        </div>
        <div className="day8-arrows">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`Scroll ${channel.title} backward`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`Scroll ${channel.title} forward`}
          >
            →
          </button>
        </div>
      </header>

      <div ref={railRef} className="day8-movie-rail">
        {channel.movies.map((movie, movieIndex) => (
          <a
            key={movie.id}
            href={`/movie/${movie.id}`}
            className="day8-movie"
            style={{ '--movie-index': movieIndex } as CSSProperties}
          >
            <div className="day8-poster">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt="" />
              ) : (
                <span className="day8-poster-placeholder">
                  {number(movieIndex + 1)}
                </span>
              )}
              <strong>{movie.rating.toFixed(1)}</strong>
              <div className="day8-poster-overlay">Open signal</div>
            </div>
            <h3>{movie.title}</h3>
            <p>{movie.year}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

export default function Day8DiscoverExperience({
  channels = DEMO_CHANNELS,
}: Day8DiscoverProps) {
  const sceneRef = useRef<HTMLElement>(null)
  const activeSection = useDiscoverMotion(sceneRef, channels.length)

  return (
    <main ref={sceneRef} className="day8-scene">
      <div className="day8-grid" aria-hidden="true" />

      <aside className="day8-progress" aria-hidden="true">
        <span>Signal depth</span>
        <strong>
          {number(activeSection)} / {number(channels.length)}
        </strong>
        <i />
      </aside>

      <div className="day8-content">
        <header className="day8-theater">
          <div className="day8-fascia" aria-hidden="true">
            {Array.from({ length: 11 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>

          <div className="day8-curtain day8-curtain-left" aria-hidden="true" />
          <div className="day8-curtain day8-curtain-right" aria-hidden="true" />

          <div className="day8-screen-frame">
            <div className="day8-screen">
              <div className="day8-screen-meta">
                <span>● Now showing // NoSpoilers</span>
                <span>{number(channels.length)} curated screenings</span>
              </div>

              <div className="day8-title">
                <p>Feature presentation</p>
                <h1>Discover</h1>
                <h2>Without the noise</h2>
              </div>

              <div className="day8-screen-footer">
                <p>
                  Move through live trends, acclaimed classics, and hidden
                  signals. Every film stays spoiler-free until you choose to
                  go deeper.
                </p>
                <button type="button">Search movies…</button>
              </div>
            </div>
          </div>

          <div className="day8-seats" aria-hidden="true">
            {Array.from({ length: 11 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
        </header>

        {channels.map((channel, index) => (
          <MovieRail key={channel.id} channel={channel} index={index} />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: DAY_8_STYLES }} />
    </main>
  )
}

// Everything stays in this file so the complete effect can be shown at once.
const DAY_8_STYLES = `
  .day8-scene {
    --bg: var(--ns-bg, 5 8 20);
    --surface: var(--ns-surface, 11 15 36);
    --surface-2: var(--ns-surface-2, 16 21 46);
    --border: var(--ns-border, 27 34 66);
    --accent: var(--ns-secondary, 104 13 209);
    --text: var(--ns-text, 237 233 225);
    --muted: var(--ns-muted, 148 152 189);
    --scroll-progress: 0;
    min-height: 100vh;
    overflow: hidden;
    color: rgb(var(--text));
    background: rgb(var(--bg));
  }

  .day8-grid {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: .24;
    background-image:
      linear-gradient(rgb(var(--accent) / .08) 1px, transparent 1px),
      linear-gradient(90deg, rgb(var(--accent) / .08) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(ellipse at center, black, transparent 76%);
    transform: perspective(900px) rotateX(58deg) scale(1.4)
      translateY(calc(var(--scroll-progress) * -90px));
  }

  .day8-content {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 64px 0 120px;
  }

  .day8-theater {
    position: relative;
    overflow: hidden;
    margin-bottom: 120px;
    padding: 64px 28px 74px;
    border: 1px solid rgb(var(--border));
    border-radius: 38px;
    background:
      radial-gradient(ellipse at 50% 0%, rgb(var(--accent) / .13), transparent 60%),
      rgb(var(--bg));
    box-shadow: 0 38px 110px rgb(var(--bg) / .9);
  }

  .day8-fascia {
    position: absolute;
    z-index: 4;
    inset: 0 0 auto;
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 10%;
    border-bottom: 1px solid rgb(var(--border));
    background: linear-gradient(rgb(var(--surface-2)), rgb(var(--bg)));
  }

  .day8-fascia i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgb(var(--text) / .72);
    box-shadow: 0 0 18px rgb(var(--accent) / .72);
  }

  .day8-screen-frame {
    position: relative;
    z-index: 2;
    padding: 14px;
    border: 1px solid rgb(var(--text) / .08);
    border-radius: 22px;
    background: linear-gradient(145deg,
      rgb(var(--surface-2)),
      rgb(var(--bg)) 48%,
      rgb(var(--border))
    );
    box-shadow: inset 0 0 28px rgb(var(--bg)), 0 18px 60px rgb(var(--bg));
  }

  .day8-screen {
    min-height: 520px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 58px;
    overflow: hidden;
    border: 1px solid rgb(var(--text) / .1);
    border-radius: 12px;
    background:
      linear-gradient(135deg, rgb(var(--accent) / .08), transparent 36%),
      linear-gradient(rgb(var(--surface)), rgb(var(--surface-2)));
    box-shadow: inset 0 0 80px rgb(var(--bg) / .6);
  }

  .day8-screen-meta,
  .day8-screen-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    color: rgb(var(--muted));
    font: 500 10px/1.4 system-ui;
    letter-spacing: .22em;
    text-transform: uppercase;
  }

  .day8-screen-meta span:first-child { color: rgb(var(--accent)); }

  .day8-title p {
    margin: 0 0 12px;
    color: rgb(var(--muted));
    font: 500 12px/1 system-ui;
    letter-spacing: .26em;
    text-transform: uppercase;
  }

  .day8-title h1,
  .day8-title h2 {
    margin: 0;
    font-family: Impact, sans-serif;
    font-weight: 400;
    line-height: .82;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .day8-title h1 { font-size: clamp(78px, 12vw, 150px); }

  .day8-title h2 {
    margin-top: 18px;
    color: transparent;
    font-size: clamp(34px, 5.5vw, 68px);
    -webkit-text-stroke: 1px rgb(var(--accent) / .55);
  }

  .day8-screen-footer {
    padding-top: 24px;
    border-top: 1px solid rgb(var(--border));
    text-transform: none;
    letter-spacing: 0;
  }

  .day8-screen-footer p {
    max-width: 570px;
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
  }

  .day8-screen-footer button,
  .day8-arrows button {
    min-height: 42px;
    border: 1px solid rgb(var(--border));
    border-radius: 12px;
    color: rgb(var(--muted));
    background: rgb(var(--bg) / .72);
  }

  .day8-screen-footer button { padding: 0 22px; white-space: nowrap; }

  .day8-curtain {
    position: absolute;
    z-index: 3;
    top: 42px;
    bottom: 52px;
    width: 78px;
    background: repeating-linear-gradient(90deg,
      rgb(var(--accent) / .58) 0 12px,
      rgb(var(--accent) / .24) 12px 22px,
      rgb(var(--surface-2)) 22px 34px
    );
    box-shadow: 0 0 34px rgb(var(--bg));
  }

  .day8-curtain-left {
    left: 0;
    clip-path: polygon(0 0, 100% 0, 70% 48%, 100% 100%, 0 100%);
  }

  .day8-curtain-right {
    right: 0;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 30% 48%);
  }

  .day8-seats {
    position: absolute;
    z-index: 4;
    right: 12%;
    bottom: -18px;
    left: 12%;
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .day8-seats i {
    width: 58px;
    height: 58px;
    border: 1px solid rgb(var(--border) / .65);
    border-radius: 22px 22px 7px 7px;
    background: linear-gradient(rgb(var(--surface-2)), rgb(var(--bg)));
  }

  .day8-progress {
    position: fixed;
    z-index: 5;
    top: 50%;
    right: 26px;
    display: grid;
    justify-items: end;
    gap: 8px;
    transform: translateY(-50%);
    color: rgb(var(--muted) / .55);
    font: 500 9px/1 system-ui;
    letter-spacing: .2em;
    text-transform: uppercase;
  }

  .day8-progress strong {
    color: rgb(var(--text));
    font-size: 22px;
    letter-spacing: .08em;
  }

  .day8-progress i {
    width: 1px;
    height: 150px;
    margin-top: 8px;
    background: linear-gradient(to bottom,
      rgb(var(--accent)) calc(var(--scroll-progress) * 100%),
      rgb(var(--border)) 0
    );
  }

  .day8-channel { margin-bottom: 110px; }

  .day8-channel-heading {
    display: flex;
    align-items: flex-end;
    gap: 22px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgb(var(--border));
  }

  .day8-channel-number {
    color: rgb(var(--accent) / .55);
    font: 54px/.8 Impact, sans-serif;
  }

  .day8-channel-heading p {
    margin: 0 0 5px;
    color: rgb(var(--accent));
    font: 600 10px/1 system-ui;
    letter-spacing: .22em;
    text-transform: uppercase;
  }

  .day8-channel-heading h2 {
    margin: 0;
    font: 42px/.95 Impact, sans-serif;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .day8-arrows {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .day8-arrows button { width: 42px; font-size: 18px; }

  .day8-movie-rail {
    display: flex;
    gap: 18px;
    padding: 28px 2px 24px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .day8-movie-rail::-webkit-scrollbar { display: none; }

  .day8-movie {
    width: 172px;
    flex: 0 0 172px;
    color: inherit;
    text-decoration: none;
    scroll-snap-align: start;
  }

  .day8-poster {
    position: relative;
    height: 258px;
    overflow: hidden;
    border: 1px solid rgb(var(--border));
    border-radius: 18px;
    background: linear-gradient(145deg,
      rgb(var(--surface-2)),
      rgb(var(--accent) / .22),
      rgb(var(--surface))
    );
    transition: transform .5s, border-color .4s, box-shadow .5s;
  }

  .day8-movie:hover .day8-poster {
    border-color: rgb(var(--accent) / .6);
    box-shadow: 0 22px 48px rgb(var(--bg)), 0 0 28px rgb(var(--accent) / .18);
    transform: translateY(-8px) scale(1.02);
  }

  .day8-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .day8-poster-placeholder {
    position: absolute;
    right: 15px;
    bottom: 10px;
    color: rgb(var(--text) / .13);
    font: 72px/1 Impact, sans-serif;
  }

  .day8-poster strong {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 8px;
    border: 1px solid rgb(var(--accent) / .3);
    border-radius: 999px;
    color: rgb(var(--accent));
    background: rgb(var(--bg) / .82);
    font: 700 10px/1 system-ui;
  }

  .day8-poster-overlay {
    position: absolute;
    inset: auto 0 0;
    padding: 44px 12px 12px;
    opacity: 0;
    color: rgb(var(--text));
    background: linear-gradient(transparent, rgb(var(--bg)));
    font: 600 10px/1 system-ui;
    letter-spacing: .16em;
    text-transform: uppercase;
    transition: opacity .4s;
  }

  .day8-movie:hover .day8-poster-overlay { opacity: 1; }

  .day8-movie h3 {
    margin: 12px 0 4px;
    overflow: hidden;
    font: 600 13px/1.3 system-ui;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .day8-movie > p {
    margin: 0;
    color: rgb(var(--muted));
    font: 10px/1 system-ui;
    letter-spacing: .12em;
  }

  .day8-scene[data-motion-ready='true'] .day8-channel {
    opacity: 0;
    filter: blur(14px);
    transform: translateY(90px) scale(.96);
    transition: opacity .8s, filter .9s, transform 1s cubic-bezier(.16, 1, .3, 1);
  }

  .day8-scene[data-motion-ready='true'] .day8-channel[data-visible='true'] {
    opacity: 1;
    filter: blur(0);
    transform: none;
  }

  .day8-scene[data-motion-ready='true'] .day8-channel .day8-movie {
    opacity: 0;
    filter: blur(8px);
    transform: translate(38px, 32px) scale(.92);
    transition: opacity .6s, filter .7s, transform .85s cubic-bezier(.16, 1, .3, 1);
  }

  .day8-scene[data-motion-ready='true']
    .day8-channel[data-visible='true'] .day8-movie {
    opacity: 1;
    filter: blur(0);
    transform: none;
    transition-delay: calc(140ms + var(--movie-index) * 45ms);
  }

  @media (max-width: 720px) {
    .day8-content { padding-top: 24px; }
    .day8-theater { padding: 56px 8px 24px; border-radius: 24px; }
    .day8-curtain, .day8-seats, .day8-progress { display: none; }
    .day8-screen { min-height: 470px; padding: 32px 24px; }
    .day8-screen-meta span:last-child { display: none; }
    .day8-screen-footer { align-items: stretch; flex-direction: column; }
    .day8-channel-heading h2 { font-size: 32px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .day8-grid,
    .day8-channel,
    .day8-movie,
    .day8-poster {
      opacity: 1 !important;
      filter: none !important;
      transform: none !important;
      transition: none !important;
    }
  }
`
