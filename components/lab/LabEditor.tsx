'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { clamp, dimensions, formatBytes, formatTime, moveClip, newClip, normalizeClip, projectDuration, splitClip, uid, type AspectRatio, type LabAsset, type LabProject, type Selection } from '@/lib/lab/model'
import { LabEngine, exportFormats, exportMovie } from '@/lib/lab/engine'
import { inspectMedia } from '@/lib/lab/media'
import { downloadBlob, makeBackup, safeFilename, saveProject, type StoredMedia } from '@/lib/lab/storage'
import LabIcon from './LabIcon'
import LabInspector from './LabInspector'
import LabTimeline from './LabTimeline'
import LabDialog from './LabDialog'
import styles from './lab.module.css'

interface Props { database: IDBDatabase; initial: LabProject; storedMedia: StoredMedia[]; onExit: () => Promise<void> }

export default function LabEditor({ database, initial, storedMedia, onExit }: Props) {
  const [project, setProject] = useState(initial)
  const projectRef = useRef(initial)
  const mediaRef = useRef(new Map(storedMedia.map(item => [item.id, item])))
  const urlsRef = useRef(new Map<string, string>())
  const [urls, setUrls] = useState(new Map<string, string>())
  const [selection, setSelection] = useState<Selection>(null)
  const [time, setTime] = useState(0)
  const timeRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [tab, setTab] = useState<'media' | 'titles' | 'notes'>('media')
  const [panel, setPanel] = useState<'media' | 'preview' | 'inspector'>('preview')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(40)
  const [saving, setSaving] = useState<'saving' | 'saved' | 'error'>('saved')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exportError, setExportError] = useState('')
  const [resolution, setResolution] = useState<720 | 1080>(720)
  const [formats, setFormats] = useState<ReturnType<typeof exportFormats>>([])
  const [mime, setMime] = useState('')
  const [exported, setExported] = useState<{ blob: Blob; filename: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<LabEngine | null>(null)
  const previewArea = useRef<HTMLDivElement>(null)
  const undoStack = useRef<LabProject[]>([])
  const redoStack = useRef<LabProject[]>([])
  const lastEdit = useRef({ group: '', at: 0 })
  const [history, setHistory] = useState({ undo: 0, redo: 0 })
  const pendingWrites = useRef(0)
  const unsaved = useRef(false)
  const mounted = useRef(true)
  const duration = projectDuration(project)
  const size = dimensions(project.ratio)

  useEffect(() => {
    mounted.current = true
    const mediaUrls = new Map<string, string>()
    for (const item of mediaRef.current.values()) mediaUrls.set(item.id, URL.createObjectURL(item.blob))
    urlsRef.current = mediaUrls; setUrls(mediaUrls)
    const available = exportFormats(); setFormats(available); setMime(available[0]?.mime ?? '')
    return () => { mounted.current = false; controller.current?.abort(); urlsRef.current.forEach(url => URL.revokeObjectURL(url)); urlsRef.current.clear() }
  }, [])

  useEffect(() => {
    if (!canvas.current) return
    const player = new LabEngine(canvas.current, {
      onTime: value => { timeRef.current = value; setTime(value) },
      onEnded: () => setPlaying(false),
      onBuffering: setBuffering,
      onError: message => { setError(message); setPlaying(false) },
    })
    engine.current = player
    return () => { player.dispose(); engine.current = null }
  }, [])

  useEffect(() => {
    let canceled = false
    setReady(false); setPlaying(false)
    void engine.current?.update(project, urls).then(() => { if (!canceled) setReady(true) }).catch(cause => { if (!canceled) setError(cause instanceof Error ? cause.message : 'Could not prepare the preview.') })
    return () => { canceled = true }
  }, [project, urls])

  useEffect(() => {
    let canceled = false
    pendingWrites.current++; unsaved.current = true; setSaving('saving')
    void saveProject(database, project).then(() => { if (!canceled) { setSaving('saved'); unsaved.current = false } }).catch(cause => { if (!canceled) { setSaving('error'); setError(cause instanceof Error ? cause.message : 'Could not save. Download a backup before leaving.') } }).finally(() => { pendingWrites.current-- })
    return () => { canceled = true }
  }, [database, project])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (pendingWrites.current || unsaved.current || controller.current) { event.preventDefault(); event.returnValue = '' } }
    const visibility = () => { if (document.hidden) { engine.current?.pause(); setPlaying(false) } }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  const change = useCallback((update: (value: LabProject) => LabProject, group = '') => {
    const previous = projectRef.current
    const next = update(previous)
    if (next === previous) return
    if (!group || lastEdit.current.group !== group || Date.now() - lastEdit.current.at > 800) undoStack.current = [...undoStack.current.slice(-79), previous]
    lastEdit.current = { group, at: Date.now() }
    redoStack.current = []
    const saved = { ...next, updatedAt: Date.now() }
    projectRef.current = saved; unsaved.current = true
    setProject(saved); setHistory({ undo: undoStack.current.length, redo: 0 }); setNotice('')
  }, [])

  function travel(direction: 'undo' | 'redo') {
    const source = direction === 'undo' ? undoStack : redoStack
    const target = direction === 'undo' ? redoStack : undoStack
    const next = source.current.pop()
    if (!next) return
    target.current.push(projectRef.current)
    const saved = { ...next, updatedAt: Date.now() }
    projectRef.current = saved; unsaved.current = true; setProject(saved); setSelection(null)
    lastEdit.current = { group: '', at: 0 }
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length })
  }

  function seek(next: number) {
    setPlaying(false)
    const value = clamp(next, 0, projectDuration(projectRef.current))
    timeRef.current = value; setTime(value)
    void engine.current?.seek(value).catch(cause => { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not seek to that frame.') })
  }

  function togglePlay() {
    if (playing) { engine.current?.pause(); setPlaying(false); return }
    if (!ready || !duration) return
    setError(''); setPlaying(true)
    void engine.current?.play(timeRef.current).catch(cause => { setPlaying(false); setError(cause instanceof Error ? cause.message : 'Could not start playback.') })
  }

  function select(value: Selection) { setSelection(value); setPanel('inspector') }

  function removeSelected() {
    if (!selection) return
    change(p => ({ ...p, clips: p.clips.filter(item => selection.kind !== 'clip' || item.id !== selection.id), titles: p.titles.filter(item => selection.kind !== 'title' || item.id !== selection.id), audio: p.audio.filter(item => selection.kind !== 'audio' || item.id !== selection.id) }))
    setSelection(null)
  }

  function duplicateSelected() {
    if (!selection) return
    const id = uid()
    change(p => {
      if (selection.kind === 'clip') return { ...p, clips: p.clips.flatMap(clip => clip.id === selection.id ? [clip, { ...clip, id }] : [clip]) }
      if (selection.kind === 'title') { const title = p.titles.find(item => item.id === selection.id); return title ? { ...p, titles: [...p.titles, { ...title, id, start: title.start + title.duration }] } : p }
      const audio = p.audio.find(item => item.id === selection.id)
      return audio ? { ...p, audio: [...p.audio, { ...audio, id, start: audio.start + audio.out - audio.in }] } : p
    })
    setSelection({ ...selection, id })
  }

  function splitSelected() { if (selection?.kind === 'clip') change(p => splitClip(p, selection.id, timeRef.current)) }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"], dialog') || busy || exportOpen || helpOpen) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); travel(event.shiftKey ? 'redo' : 'undo') }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); travel('redo') }
      else if (event.code === 'Space' && !target.closest('button, a')) { event.preventDefault(); togglePlay() }
      else if (event.key.toLowerCase() === 's' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); splitSelected() }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected() }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { if (target.closest('button, a')) return; event.preventDefault(); seek(timeRef.current + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : 1 / 30)) }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })

  async function importFiles(files: File[]) {
    if (busy || !files.length) return
    engine.current?.pause(); setPlaying(false); setError(''); setBusy('Opening your footage…')
    const errors: string[] = []
    const imported: LabAsset[] = []
    try {
      for (const [index, file] of files.entries()) {
        setBusy(`Importing ${index + 1} of ${files.length}: ${file.name}`)
        try {
          if (projectRef.current.assets.length + imported.length >= 1000) throw new Error('This project has reached its 1,000-file limit.')
          const asset = await inspectMedia(file)
          const stored = { projectId: projectRef.current.id, id: asset.id, blob: new Blob([file], { type: asset.mime }) }
          // Originals and their metadata are committed atomically before success is shown.
          const next = { ...projectRef.current, assets: [...projectRef.current.assets, ...imported, asset] }
          await saveProject(database, next, [stored])
          mediaRef.current.set(asset.id, stored)
          urlsRef.current.set(asset.id, URL.createObjectURL(stored.blob))
          imported.push(asset)
        } catch (cause) { errors.push(cause instanceof Error ? cause.message : `${file.name} could not be imported.`) }
      }
      if (imported.length) {
        setUrls(new Map(urlsRef.current))
        change(p => ({ ...p, assets: [...p.assets, ...imported] }))
        setTab('media'); setPanel('media'); setFilter('all'); setSearch('')
        setNotice(`${imported.length} ${imported.length === 1 ? 'file is' : 'files are'} ready. Use + to add them to your timeline.`)
      }
      if (errors.length) setError(errors.join(' '))
    } finally { setBusy(''); if (fileInput.current) fileInput.current.value = '' }
  }

  function addAsset(id: string) {
    const asset = projectRef.current.assets.find(item => item.id === id)
    if (!asset) return
    const itemId = uid()
    if (asset.kind === 'audio') {
      const remaining = projectDuration(projectRef.current) - timeRef.current
      change(p => ({ ...p, audio: [...p.audio, { id: itemId, assetId: asset.id, name: asset.name, start: timeRef.current, in: 0, out: Math.min(asset.duration, remaining > 0.1 ? remaining : 30), volume: 0.5, fadeIn: 0, fadeOut: 0 }] }))
      setSelection({ kind: 'audio', id: itemId })
    } else {
      const clip = { ...newClip(asset), id: itemId }
      change(p => ({ ...p, clips: [...p.clips, clip] }))
      setSelection({ kind: 'clip', id: itemId })
    }
    setNotice('Added to your timeline.'); setPanel('preview')
  }

  function addCard() {
    const clip = newClip()
    change(p => ({ ...p, clips: [...p.clips, clip] })); select({ kind: 'clip', id: clip.id })
  }

  function addTitle(kind: 'title' | 'subtitle' | 'credits') {
    const id = uid()
    const remaining = duration - timeRef.current
    change(p => ({ ...p, titles: [...p.titles, {
      id, text: kind === 'credits' ? 'A FILM BY\nYour name' : kind === 'subtitle' ? 'Your dialogue goes here.' : 'YOUR FILM TITLE',
      start: timeRef.current, duration: Math.min(4, remaining > 0.1 ? remaining : 4), size: kind === 'subtitle' ? 26 : 48,
      position: kind === 'subtitle' ? 'bottom' : 'center', color: '#ffffff', backdrop: kind === 'subtitle',
    }] }))
    select({ kind: 'title', id })
  }

  async function backup() {
    setBusy('Preparing your project backup…'); setError('')
    try {
      const snapshot = projectRef.current
      if (snapshot.assets.reduce((sum, asset) => sum + asset.size, 0) > 500 * 1024 * 1024) throw new Error('Portable backups support up to 500 MB of original media in this version. Your project stays saved in this browser.')
      const blob = await makeBackup(snapshot, Array.from(mediaRef.current.values()))
      downloadBlob(blob, `${safeFilename(snapshot.name)}.nospoilers.zip`)
      setNotice('Backup downloaded with your edit and original media.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a backup.') }
    finally { setBusy('') }
  }

  async function startExport() {
    if (!mime || exporting) return
    engine.current?.pause(); setPlaying(false); setExportError(''); setExporting(true); setProgress(0); setExported(null)
    const abort = new AbortController(); controller.current = abort
    try {
      const blob = await exportMovie(projectRef.current, urlsRef.current, { resolution, mime, signal: abort.signal, onProgress: setProgress })
      setExported({ blob, filename: `${safeFilename(projectRef.current.name)}.${formats.find(format => format.mime === mime)?.extension ?? 'webm'}` })
    } catch (cause) { if (cause instanceof Error && cause.name !== 'AbortError') setExportError(cause.message) }
    finally { controller.current = null; if (mounted.current) setExporting(false) }
  }

  const visibleAssets = project.assets.filter(asset => (filter === 'all' || asset.kind === filter) && asset.name.toLowerCase().includes(search.toLowerCase()))
  const selectedExists = selection && (selection.kind === 'clip' ? project.clips : selection.kind === 'title' ? project.titles : project.audio).some(item => item.id === selection.id)

  return <main className={`${styles.lab} ${styles.editor}`}>
    <header className={styles.editorHeader}>
      <button className={styles.iconButton} aria-label="Back to projects" disabled={Boolean(busy) || exporting} onClick={async () => { try { await saveProject(database, projectRef.current); await onExit() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Save failed. Download a backup before leaving.') } }}><LabIcon name="back" /></button>
      <span className={styles.editorBrand}>NS<span>LAB</span></span><span className={styles.headerDivider} />
      <div className={styles.projectName}><input aria-label="Project name" value={project.name} maxLength={120} onChange={event => change(p => ({ ...p, name: event.target.value }), 'name')} onBlur={() => { if (!project.name.trim()) change(p => ({ ...p, name: 'Untitled film' })) }} disabled={exporting || Boolean(busy)} /><span className={saving === 'error' ? styles.saveError : styles.saveStatus} role="status">{saving === 'saved' ? <><span className={styles.statusDot} /> Saved on this device</> : saving === 'saving' ? 'Saving…' : 'Save failed · download a backup'}</span></div>
      <div className={styles.headerActions}><button className={styles.iconButton} disabled={!history.undo || exporting || Boolean(busy)} onClick={() => travel('undo')} aria-label="Undo" title="Undo (⌘/Ctrl Z)"><LabIcon name="undo" /></button><button className={styles.iconButton} disabled={!history.redo || exporting || Boolean(busy)} onClick={() => travel('redo')} aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)"><LabIcon name="redo" /></button><button className={`${styles.button} ${styles.backupButton}`} disabled={Boolean(busy) || exporting} onClick={() => void backup()}><LabIcon name="download" size={15} /> Backup</button><button className={styles.iconButton} aria-label="Lab help and shortcuts" onClick={() => setHelpOpen(true)} disabled={exporting}><LabIcon name="help" /></button><button className={styles.primary} disabled={!duration || Boolean(busy) || !ready} onClick={() => { engine.current?.pause(); setPlaying(false); setExportOpen(true); setExportError(''); setExported(null) }}><LabIcon name="download" size={16} /> Export film</button></div>
    </header>
    {error && <div className={styles.editorError} role="alert"><span>{error}</span><button className={styles.iconButton} aria-label="Dismiss error" onClick={() => setError('')}><LabIcon name="close" size={15} /></button></div>}
    {notice && <div className={styles.notice} role="status"><LabIcon name="check" size={14} />{notice}<button className={styles.iconButton} aria-label="Dismiss message" onClick={() => setNotice('')}><LabIcon name="close" size={13} /></button></div>}
    <nav className={styles.mobilePanels} aria-label="Editor panels">{(['media', 'preview', 'inspector'] as const).map(item => <button key={item} aria-pressed={panel === item} className={panel === item ? styles.activePanel : ''} onClick={() => setPanel(item)}><LabIcon name={item === 'media' ? 'folder' : item === 'preview' ? 'play' : 'settings'} size={15} />{item}</button>)}</nav>
    <fieldset disabled={Boolean(busy) || exporting} className={styles.editingFields}>
      <div className={styles.editingGrid} data-panel={panel}>
        <aside className={styles.mediaPanel} aria-label="Media and story tools" onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }} onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); void importFiles(Array.from(event.dataTransfer.files)) } }}>
          <div className={styles.libraryTabs} role="tablist" aria-label="Project tools">{(['media', 'titles', 'notes'] as const).map(item => <button key={item} role="tab" id={`lab-${item}-tab`} aria-selected={tab === item} aria-controls={`lab-${item}-panel`} className={tab === item ? styles.activeTab : ''} onClick={() => setTab(item)}><LabIcon name={item === 'media' ? 'folder' : item === 'titles' ? 'text' : 'notes'} size={17} />{item}</button>)}</div>
          <div className={styles.libraryContent} role="tabpanel" id={`lab-${tab}-panel`} aria-labelledby={`lab-${tab}-tab`}>
            {tab === 'media' && <>
              <button className={styles.importButton} onClick={() => fileInput.current?.click()}><LabIcon name="upload" size={18} /> Import media</button>
              <p className={styles.finePrint}>Video, images, music, and voiceover. Drop files here or choose from your device.</p>
              <div className={styles.filterTabs}>{['all', 'video', 'image', 'audio'].map(kind => <button key={kind} onClick={() => setFilter(kind)} className={filter === kind ? styles.activeFilter : ''} aria-pressed={filter === kind}>{kind === 'image' ? 'Images' : kind}</button>)}</div>
              {project.assets.length > 0 && <input className={styles.searchInput} aria-label="Search media" placeholder="Search your media…" value={search} onChange={event => setSearch(event.target.value)} />}
              <div className={styles.mediaGrid}>{visibleAssets.map(asset => <article key={asset.id} className={styles.mediaCard} draggable onDragStart={event => { event.dataTransfer.setData('application/nospoilers-asset', asset.id); event.dataTransfer.effectAllowed = 'copy' }}><button className={styles.mediaThumbnail} onClick={() => addAsset(asset.id)} aria-label={`Add ${asset.name} to timeline`} title={`Add ${asset.name} to timeline`}>
                {asset.thumbnail
                  // eslint-disable-next-line @next/next/no-img-element -- locally generated media thumbnail
                  ? <img src={asset.thumbnail} alt="" /> : <LabIcon name="music" size={30} />}
                <span className={styles.mediaDuration}>{asset.kind === 'image' ? 'IMAGE' : formatTime(asset.duration)}</span><span className={styles.mediaAdd}><LabIcon name="plus" size={15} /></span></button><p title={asset.name}>{asset.name}</p><small>{formatBytes(asset.size)}</small></article>)}</div>
              {!visibleAssets.length && <div className={styles.libraryEmpty}><LabIcon name="folder" size={28} /><h3>{project.assets.length ? 'No matching files' : 'A home for your footage.'}</h3><p>{project.assets.length ? 'Try another search or media type.' : 'Import a few shots, then add them to the timeline to begin your edit.'}</p></div>}
              <button className={styles.addCardButton} onClick={addCard}><LabIcon name="plus" size={15} /> Add a color card</button>
              <p className={styles.finePrint}>{project.assets.length} files · {formatBytes(project.assets.reduce((sum, asset) => sum + asset.size, 0))} on this device</p>
            </>}
            {tab === 'titles' && <><p className={styles.eyebrow}>Give your story a voice</p><h2 className={styles.libraryTitle}>Words that stay<br />with you.</h2><p className={styles.finePrint}>Add text at the playhead, then set its timing and appearance in Inspector.</p>{(['title', 'subtitle', 'credits'] as const).map(kind => <button className={`${styles.titlePreset} ${kind === 'subtitle' ? styles.subtitlePreset : ''}`} key={kind} onClick={() => addTitle(kind)}><span>{kind === 'title' ? 'YOUR FILM.' : kind === 'subtitle' ? 'Every word matters.' : <>A FILM BY<br /><b>YOUR NAME</b></>}</span><small>{kind === 'title' ? 'Opening title' : kind === 'subtitle' ? 'Manual subtitle' : 'End credits'}<LabIcon name="plus" size={14} /></small></button>)}<button className={styles.addCardButton} onClick={addCard}><LabIcon name="plus" size={15} /> Add a color card</button></>}
            {tab === 'notes' && <><p className={styles.eyebrow}>Before the first frame</p><h2 className={styles.libraryTitle}>Every good film<br />starts with an idea.</h2><label className={styles.field}>Script & shot notes<textarea className={styles.notesArea} value={project.notes} maxLength={50000} onChange={event => change(p => ({ ...p, notes: event.target.value }), 'notes')} placeholder={'Your idea, script, shot list, or edit notes…\n\nScene 01\nWhere does your story begin?'} /></label><p className={styles.finePrint}>Saved with your project and included in backups.</p></>}
          </div>
        </aside>
        <section className={styles.previewPanel} aria-label="Movie preview">
          <div className={styles.panelHeading}><span><span className={styles.monitorDot} /> Program monitor</span><label className={styles.ratioSelect}><span className={styles.srOnly}>Canvas aspect ratio</span><select aria-label="Canvas aspect ratio" value={project.ratio} onChange={event => change(p => ({ ...p, ratio: event.target.value as AspectRatio }))}><option value="16:9">16:9 · Widescreen</option><option value="9:16">9:16 · Portrait</option><option value="1:1">1:1 · Square</option></select></label></div>
          <div ref={previewArea} className={styles.previewStage}>
            <canvas ref={canvas} width={size.width} height={size.height} className={styles.previewCanvas} style={{ aspectRatio: `${size.width} / ${size.height}` }} aria-label="Movie preview canvas" />
            {!duration && <div className={styles.previewEmpty}><span className={styles.emptyViewfinder}><LabIcon name="film" size={32} /></span><p className={styles.eyebrow}>The beginning of something</p><h2>Your story.<br />Your first frame.</h2><p>Bring in your footage. We’ll meet you at the timeline.</p><button className={styles.primary} onClick={() => fileInput.current?.click()}><LabIcon name="plus" size={17} /> Import your first shots</button></div>}
            {duration > 0 && (!ready || buffering) && <span className={styles.buffering} role="status">Preparing picture…</span>}
          </div>
          <div className={styles.playbackControls}><span className={styles.timecode} data-testid="lab-timecode">{formatTime(time, true)} <span>/ {formatTime(duration, true)}</span></span><div className={styles.row}><button className={styles.iconButton} onClick={() => seek(0)} disabled={!duration || !ready} aria-label="Go to beginning"><LabIcon name="rewind" size={17} /></button><button className={styles.playButton} onClick={togglePlay} disabled={!duration || !ready} aria-label={playing ? 'Pause preview' : 'Play preview'}><LabIcon name={playing ? 'pause' : 'play'} size={20} /></button><button className={styles.iconButton} onClick={() => seek(duration)} disabled={!duration || !ready} aria-label="Go to end"><LabIcon name="rewind" size={17} style={{ transform: 'rotate(180deg)' }} /></button></div><button className={styles.iconButton} aria-label="Fullscreen preview" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void previewArea.current?.requestFullscreen().catch(() => setError('Fullscreen preview is unavailable in this browser.')) }}><LabIcon name="fullscreen" size={16} /></button></div>
          <label className={styles.scrubber}><span className={styles.srOnly}>Playhead position</span><input type="range" min="0" max={duration || 1} step={1 / 30} value={Math.min(time, duration)} disabled={!duration || !ready} onChange={event => seek(Number(event.target.value))} aria-label="Playhead position" /></label>
          <div className={styles.previewFootnote}><span>{project.ratio} · 30 fps</span><span>Picture, sound, and titles export together.</span></div>
        </section>
        <LabInspector project={project} selection={selectedExists ? selection : null} change={change} onDelete={removeSelected} onDuplicate={duplicateSelected} onMove={direction => { if (selection?.kind === 'clip') change(p => moveClip(p, selection.id, p.clips.findIndex(clip => clip.id === selection.id) + direction)) }} />
      </div>
      <LabTimeline project={project} time={time} selection={selectedExists ? selection : null} zoom={zoom} onZoom={setZoom} onSeek={seek} onSelect={select} onSplit={splitSelected} onDelete={removeSelected} onDuplicate={duplicateSelected} onMove={(id, index) => change(p => moveClip(p, id, index))} onAddAsset={addAsset} onTrim={(id, edge, delta) => change(p => ({ ...p, clips: p.clips.map(clip => clip.id === id ? normalizeClip({ ...clip, [edge]: edge === 'in' ? Math.min(clip.out - 0.1, clip.in + delta) : Math.max(clip.in + 0.1, clip.out + delta) }, p.assets.find(asset => asset.id === clip.assetId)) : clip) }))} />
    </fieldset>
    <input ref={fileInput} className={styles.hidden} type="file" multiple accept=".mp4,.m4v,.mov,.webm,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.aac,.ogg,.flac" aria-label="Import media files" onChange={event => void importFiles(Array.from(event.target.files ?? []))} />
    <footer className={styles.editorFooter}><span><span className={styles.statusDot} /> LOCAL WORKSPACE</span><button className={styles.textButton} onClick={() => void backup()} disabled={Boolean(busy) || exporting}>Download project backup</button><span>Your next opening night starts here.</span></footer>
    {busy && <div className={styles.busyOverlay} role="status" aria-live="polite"><span className={styles.spinner} /><p>{busy}</p></div>}
    {helpOpen && <LabDialog title="Welcome to your cutting room" onClose={() => setHelpOpen(false)}><div className={styles.dialogBody}><p>Import media, add it to your timeline, and select a shot to trim or style it. Add titles and audio at the playhead, then set their exact timing in Inspector.</p><div className={styles.shortcutList}>{[['Space', 'Play / pause (outside buttons and text fields)'], ['S', 'Split selected shot at the playhead'], ['⌘ / Ctrl Z', 'Undo'], ['⌘ / Ctrl Shift Z', 'Redo'], ['← / →', 'Move one frame; hold Shift for one second'], ['Delete', 'Remove selected timeline item']].map(([key, text]) => <p key={key}><kbd>{key}</kbd><span>{text}</span></p>)}</div><p>Originals and edits are saved in this browser for your account. Clearing site data removes them. A project backup includes your original media and can be restored on another device (up to 500 MB of media).</p><p>Exports run at playback speed. Keep Lab visible until the export finishes. MP4 and WebM availability depends on your browser.</p><button className={styles.primary} onClick={() => setHelpOpen(false)}>Let’s make a film</button></div></LabDialog>}
    {exportOpen && <LabDialog title={exported ? 'Your film is ready.' : 'From your timeline to the world.'} onClose={() => { controller.current?.abort(); setExportOpen(false); setExported(null) }}><div className={styles.dialogBody}>
      {exported ? <><div className={styles.exportSuccess}><span><LabIcon name="check" size={32} /></span><h3>That’s a wrap.</h3><p>{project.name}</p><small>{formatTime(duration)} · {formatBytes(exported.blob.size)} · {exported.filename.split('.').pop()?.toUpperCase()}</small></div><button className={styles.primary} onClick={() => downloadBlob(exported.blob, exported.filename)}><LabIcon name="download" /> Download movie</button><div className={styles.hintCard}><strong>Give your film its first audience.</strong><p>Download your movie, then upload it in Creator Studio. From there, eligible creators can schedule a Theater premiere.</p><Link href="/creator" className={styles.button}>Open Creator Studio <LabIcon name="next" size={15} /></Link></div></> : <><p>Your shots, color, titles, and audio will be rendered into one movie.</p><fieldset disabled={exporting} className={styles.exportSettings}><label className={styles.field}>Format<select aria-label="Export format" value={mime} onChange={event => setMime(event.target.value)}>{formats.map(format => <option value={format.mime} key={format.mime}>{format.label}</option>)}</select></label><label className={styles.field}>Resolution<select aria-label="Export resolution" value={resolution} onChange={event => setResolution(Number(event.target.value) as 720 | 1080)}><option value="720">720p · Faster export</option><option value="1080">1080p · Full HD</option></select></label><div className={styles.exportSummary}><span>{dimensions(project.ratio, resolution).width} × {dimensions(project.ratio, resolution).height}</span><span>30 fps</span><span>{formatTime(duration)}</span></div></fieldset><p className={styles.finePrint}>Keep this tab visible. Export takes approximately the length of your movie, plus preparation. Audio and video are processed on your device.</p>{!formats.length && <p className={styles.error} role="alert">Video export is unavailable in this browser. Open your project backup in a current desktop Chrome, Edge, or Safari browser.</p>}{exportError && <p className={styles.error} role="alert">{exportError}</p>}{exporting ? <><div className={styles.exportProgress}><progress max="1" value={progress} aria-label="Export progress" /><span>{Math.round(progress * 100)}%</span></div><p role="status">{progress < 0.01 ? 'Preparing your film…' : 'Rendering your film…'}</p><button className={styles.button} onClick={() => controller.current?.abort()}>Cancel export</button></> : <button className={styles.primary} disabled={!formats.length} onClick={() => void startExport()}><LabIcon name="download" /> Render movie</button>}</>}
    </div></LabDialog>}
  </main>
}
