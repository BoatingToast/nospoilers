'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatTime, newClip, newProject, parseProject, projectDuration, uid, type LabProject } from '@/lib/lab/model'
import { deleteProject, listProjects, loadMedia, openLabStorage, readBackup, saveProject, type StoredMedia } from '@/lib/lab/storage'
import LabEditor from './LabEditor'
import LabIcon from './LabIcon'
import styles from './lab.module.css'

export default function LabWorkspace({ ownerId }: { ownerId: string }) {
  const [db, setDb] = useState<IDBDatabase | null>(null)
  const [projects, setProjects] = useState<LabProject[]>([])
  const [opened, setOpened] = useState<{ project: LabProject; media: StoredMedia[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const backupInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let canceled = false
    let database: IDBDatabase | undefined
    void (async () => {
      try {
        database = await openLabStorage(ownerId)
        const saved = await listProjects(database)
        if (canceled) { database.close(); return }
        setDb(database); setProjects(saved)
      } catch (cause) { if (!canceled) setError(cause instanceof Error ? cause.message : 'Could not load your projects.') }
      finally { if (!canceled) setLoading(false) }
    })()
    return () => { canceled = true; database?.close() }
  }, [ownerId])

  async function open(project: LabProject) {
    if (!db || busy) return
    setBusy(true); setError('')
    try {
      const valid = parseProject(project)
      const media = await loadMedia(db, valid.id)
      setOpened({ project: valid, media })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open this project.') }
    finally { setBusy(false) }
  }

  async function create(starter = false) {
    if (!db || busy) return
    setBusy(true); setError('')
    try {
      const project = newProject(starter ? 'My first film' : `Untitled film${projects.length ? ` ${projects.length + 1}` : ''}`)
      if (starter) {
        project.clips = ['#0b0f24', '#241334', '#101d28'].map((color, index) => ({ ...newClip(), name: ['Opening', 'The story', 'End credits'][index], color, fadeIn: 0.35, fadeOut: 0.35 }))
        project.titles = ['EVERY STORY\nSTARTS SOMEWHERE.', 'THIS ONE\nSTARTS WITH YOU.', 'A FILM BY YOU'].map((text, index) => ({ id: uid(), text, start: index * 4 + 0.4, duration: 3.2, size: 48, position: 'center', color: '#ede9e1', backdrop: false }))
        project.notes = 'Working title: My first film\n\nThe idea\nWhat do you want your audience to feel?\n\nShot list\n□ Establish the world\n□ Introduce your character\n□ Capture the detail that changes everything\n\nEdit notes\nReplace these color cards with your footage. Titles and music keep their timestamps when you move or trim shots.'
      }
      await saveProject(db, project)
      setProjects(await listProjects(db)); setOpened({ project, media: [] })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a project.') }
    finally { setBusy(false) }
  }

  async function restore(file: File) {
    if (!db) return
    setBusy(true); setError('')
    try {
      const restored = await readBackup(file)
      await saveProject(db, restored.project, restored.media)
      setProjects(await listProjects(db)); setOpened(restored)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This backup could not be restored.') }
    finally { setBusy(false) }
  }

  if (opened && db) return <LabEditor key={opened.project.id} database={db} initial={opened.project} storedMedia={opened.media} onExit={async () => { setProjects(await listProjects(db)); setOpened(null) }} />

  return <main className={styles.lab}>
    <header className={styles.homeHeader}>
      <Link href="/creator" className={styles.brand}><span className={styles.brandMark}><LabIcon name="film" size={21} /></span><span>NoSpoilers <b>LAB</b></span></Link>
      <Link href="/creator" className={styles.button}><LabIcon name="back" size={15} /> Creator Studio</Link>
    </header>
    <div className={styles.homeContent}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}>A little idea. A whole new world.</p><h1>YOUR NEXT FILM<br />STARTS <span>HERE.</span></h1><p className={styles.heroDescription}>Find your first frame. Make the cut. Bring your story to life in your own filmmaking workspace.</p><div className={styles.row}><button className={styles.primary} disabled={!db || busy} onClick={() => void create()}><LabIcon name="plus" /> Create a film</button><button className={styles.button} disabled={!db || busy} onClick={() => void create(true)}><LabIcon name="play" size={16} /> Try a starter film</button></div><p className={styles.localNote}><span className={styles.statusDot} /> Your footage stays on this device. No AI API needed.</p></div>
        <div className={styles.heroArtwork} aria-hidden="true"><div className={styles.artFrame}><span className={styles.artCorner} /><div className={styles.artSun} /><div className={styles.artHorizon} /><span className={styles.artCaption}>THE WORLD, THROUGH YOUR LENS.</span><span className={styles.artTime}>00:00:01:24</span></div><div className={styles.artStrip}><span /><span /><span /><span /><span /></div><div className={styles.artPlayhead} /><span className={styles.artLabel}>PICTURE · SOUND · STORY</span></div>
      </section>
      {error && <div className={styles.error} role="alert">{error}{!db && <button className={styles.button} onClick={() => window.location.reload()}>Reload Lab</button>}</div>}
      <section className={styles.projectsSection} aria-labelledby="projects-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>The cutting room</p><h2 id="projects-title">Your projects <span>{projects.length.toString().padStart(2, '0')}</span></h2></div><button className={styles.button} disabled={!db || busy} onClick={() => backupInput.current?.click()}><LabIcon name="upload" size={16} /> Restore backup</button></div>
        <input ref={backupInput} type="file" accept=".zip" aria-label="Restore project backup" className={styles.hidden} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void restore(file) }} />
        {loading ? <p className={styles.muted} role="status">Opening your cutting room…</p> : <div className={styles.projectGrid}>
          <button className={styles.newProjectCard} disabled={!db || busy} onClick={() => void create()}><span><LabIcon name="plus" size={28} /></span><strong>Something only you can make.</strong><small>Start a new film</small></button>
          {projects.map(project => <article key={project.id} className={styles.projectCard}>
            <button className={styles.projectOpen} onClick={() => void open(project)} disabled={busy} aria-label={`Open ${project.name}`}><div className={styles.projectPoster} style={{ backgroundColor: project.clips[0]?.color }}>
              {project.assets.find(asset => asset.id === project.clips[0]?.assetId)?.thumbnail
                // eslint-disable-next-line @next/next/no-img-element -- local, generated thumbnail
                ? <img src={project.assets.find(asset => asset.id === project.clips[0]?.assetId)?.thumbnail} alt="" />
                : <span>{project.titles[0]?.text || 'YOUR\nNEXT FILM.'}</span>}
              <small>{project.ratio}</small><span className={styles.posterDuration}>{formatTime(projectDuration(project))}</span>
            </div><div className={styles.projectDetails}><h3>{project.name}</h3><p>{project.clips.length} shots <span>·</span> {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div></button>
            <div className={styles.projectActions}>{deleteId === project.id ? <><span>Delete film and local footage?</span><button className={styles.dangerButton} disabled={busy} onClick={async () => { if (!db) return; setBusy(true); try { await deleteProject(db, project.id); setProjects(await listProjects(db)); setDeleteId(null) } catch { setError('Could not delete the project. Try again.') } finally { setBusy(false) } }}>Delete</button><button className={styles.textButton} onClick={() => setDeleteId(null)}>Keep</button></> : <><span>Saved on this device</span><button className={styles.iconButton} aria-label={`Delete ${project.name}`} onClick={() => setDeleteId(project.id)}><LabIcon name="trash" size={14} /></button></>}</div>
          </article>)}
        </div>}
        {busy && <p role="status" className={styles.localNote}>Preparing your project…</p>}
      </section>
      <div className={styles.homeFooter}><p>From the first frame to opening night.</p><p>Projects are stored in this browser. Download backups to keep a separate copy or move devices.</p></div>
    </div>
  </main>
}
