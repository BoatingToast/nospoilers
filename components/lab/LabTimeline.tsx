import { useRef, useState, type PointerEvent } from 'react'
import { clipDuration, formatTime, projectDuration, sequence, type LabProject, type Selection } from '@/lib/lab/model'
import LabIcon from './LabIcon'
import styles from './lab.module.css'

interface Props {
  project: LabProject; time: number; selection: Selection; zoom: number
  onZoom: (zoom: number) => void; onSeek: (time: number) => void
  onSelect: (selection: Selection) => void; onSplit: () => void; onDelete: () => void; onDuplicate: () => void
  onMove: (id: string, index: number) => void
  onTrim: (id: string, edge: 'in' | 'out', delta: number) => void
  onAddAsset: (id: string) => void
}

export default function LabTimeline({ project, time, selection, zoom, onZoom, onSeek, onSelect, onSplit, onDelete, onDuplicate, onMove, onTrim, onAddAsset }: Props) {
  const duration = projectDuration(project)
  const span = Math.max(12, Math.ceil(duration / 5) * 5 + 2)
  const width = Math.max(600, span * zoom)
  const px = width / span
  const entries = sequence(project.clips)
  const ruler = useRef<HTMLDivElement>(null)
  const [trim, setTrim] = useState<{ id: string; edge: 'in' | 'out'; x: number } | null>(null)
  const [trimLabel, setTrimLabel] = useState('')
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const selectedEntry = entries.find(entry => selection?.kind === 'clip' && selection.id === entry.clip.id)
  const canSplit = Boolean(selectedEntry && time - selectedEntry.start >= 0.1 && selectedEntry.end - time >= 0.1)
  const step = px < 25 ? 5 : px < 60 ? 2 : 1

  function seekAt(clientX: number) { if (ruler.current) onSeek(Math.max(0, Math.min(duration, (clientX - ruler.current.getBoundingClientRect().left) / px))) }
  function startTrim(event: PointerEvent<HTMLButtonElement>, id: string, edge: 'in' | 'out') {
    event.stopPropagation(); event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId)
    setTrim({ id, edge, x: event.clientX }); setTrimLabel('Trimming…')
  }
  function updateTrim(event: PointerEvent<HTMLButtonElement>) { if (trim) setTrimLabel(`${((event.clientX - trim.x) / px).toFixed(2)}s`) }
  function endTrim(event: PointerEvent<HTMLButtonElement>, speed: number) {
    if (!trim) return
    onTrim(trim.id, trim.edge, (event.clientX - trim.x) / px * speed)
    setTrim(null); setTrimLabel(''); event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function cancelTrim() { setTrim(null); setTrimLabel('') }

  return <section className={styles.timeline} aria-label="Movie timeline">
    <div className={styles.timelineToolbar}><div className={styles.row}><span className={styles.eyebrow}>Timeline</span><span className={styles.toolbarDivider} /><button className={styles.button} onClick={onSplit} disabled={!canSplit} title="Split at playhead (S)"><LabIcon name="scissors" size={15} /> Split</button><button className={styles.iconButton} onClick={onDuplicate} disabled={!selection} aria-label="Duplicate selection" title="Duplicate selection"><LabIcon name="copy" size={16} /></button><button className={styles.iconButton} onClick={onDelete} disabled={!selection} aria-label="Remove selection" title="Remove selection (Delete)"><LabIcon name="trash" size={16} /></button></div><label className={styles.zoomLabel}>Zoom<input type="range" min="12" max="100" step="2" value={zoom} onChange={event => onZoom(Number(event.target.value))} /></label></div>
    <div className={styles.timelineScroll}>
      <div className={styles.timelineGrid} style={{ width: width + 100 }}>
        <div className={styles.trackLabel}><span>30 FPS</span></div><div ref={ruler} className={styles.ruler} style={{ width }} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); seekAt(event.clientX) }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) seekAt(event.clientX) }} onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId) }}>
          {Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => <span key={i} style={{ left: i * step * px }}>{formatTime(i * step)}</span>)}
        </div>
        <div className={styles.trackLabel}><LabIcon name="film" size={14} /><span>PICTURE</span></div><div className={styles.videoLane} data-testid="video-lane" style={{ width }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const asset = event.dataTransfer.getData('application/nospoilers-asset'); if (asset) onAddAsset(asset); else { const id = event.dataTransfer.getData('application/nospoilers-clip'); if (id) onMove(id, project.clips.length - 1) } setDropTarget(null) }}>
          {entries.map(({ clip, start }, index) => {
            const asset = project.assets.find(item => item.id === clip.assetId)
            const selected = selection?.kind === 'clip' && selection.id === clip.id
            return <div key={clip.id} className={`${styles.timelineClip} ${selected ? styles.selectedClip : ''} ${dropTarget === clip.id ? styles.dropTarget : ''}`} style={{ left: start * px, width: clipDuration(clip) * px, backgroundColor: clip.assetId ? undefined : clip.color }} draggable={!trimLabel} onDragStart={event => { event.dataTransfer.setData('application/nospoilers-clip', clip.id); event.dataTransfer.effectAllowed = 'move' }} onDragOver={event => { if (event.dataTransfer.types.includes('application/nospoilers-clip')) { event.preventDefault(); event.stopPropagation(); setDropTarget(clip.id) } }} onDragLeave={() => setDropTarget(null)} onDragEnd={() => setDropTarget(null)} onDrop={event => { const id = event.dataTransfer.getData('application/nospoilers-clip'); if (id) { event.preventDefault(); event.stopPropagation(); onMove(id, index); setDropTarget(null) } }}>
              <button className={styles.clipSelect} aria-label={`Select shot ${index + 1}: ${clip.name}`} aria-pressed={selected} onClick={() => { onSelect({ kind: 'clip', id: clip.id }); onSeek(start) }} title={`${clip.name} · ${formatTime(clipDuration(clip), true)}`}>
                {asset?.thumbnail && <span className={styles.clipThumbnail} style={{ backgroundImage: `url(${asset.thumbnail})` }} />}
                <span className={styles.clipName}><b>{String(index + 1).padStart(2, '0')}</b> {clip.name}</span><span className={styles.clipMeta}>{formatTime(clipDuration(clip), true)}{clip.speed !== 1 ? ` · ${clip.speed}×` : ''}{clip.volume === 0 && asset?.kind === 'video' ? ' · muted' : ''}</span>
              </button>
              {selected && (['in', 'out'] as const).map(edge => <button key={edge} className={`${styles.trimHandle} ${edge === 'in' ? styles.trimStart : styles.trimEnd}`} aria-label={`Drag to trim ${edge === 'in' ? 'start' : 'end'}`} title="Drag to trim; use Inspector for precise times" onClick={event => event.stopPropagation()} onPointerDown={event => startTrim(event, clip.id, edge)} onPointerMove={updateTrim} onPointerUp={event => endTrim(event, clip.speed)} onPointerCancel={cancelTrim} />)}
            </div>
          })}
          {!entries.length && <p className={styles.laneEmpty}>Add footage from your media bin, or start with a color card.</p>}
        </div>
        <div className={styles.trackLabel}><LabIcon name="text" size={14} /><span>TITLES</span></div><div className={styles.overlayLanes} style={{ width, minHeight: Math.max(1, project.titles.length) * 34 + 12 }}>{project.titles.map((title, index) => <button key={title.id} className={`${styles.titleClip} ${selection?.kind === 'title' && selection.id === title.id ? styles.selectedClip : ''}`} style={{ left: title.start * px, width: title.duration * px, top: index * 34 + 6 }} aria-label={`Select title: ${title.text}`} aria-pressed={selection?.kind === 'title' && selection.id === title.id} onClick={() => { onSelect({ kind: 'title', id: title.id }); onSeek(title.start) }}><LabIcon name="text" size={12} /><span>{title.text || 'Untitled text'}</span></button>)}{!project.titles.length && <p className={styles.laneEmpty}>Your titles and subtitles appear here.</p>}</div>
        <div className={styles.trackLabel}><LabIcon name="music" size={14} /><span>AUDIO</span></div><div className={styles.overlayLanes} style={{ width, minHeight: Math.max(1, project.audio.length) * 40 + 12 }}>{project.audio.map((audio, index) => <button key={audio.id} className={`${styles.audioClip} ${selection?.kind === 'audio' && selection.id === audio.id ? styles.selectedClip : ''}`} style={{ left: audio.start * px, width: (audio.out - audio.in) * px, top: index * 40 + 6 }} aria-label={`Select audio: ${audio.name}`} aria-pressed={selection?.kind === 'audio' && selection.id === audio.id} onClick={() => { onSelect({ kind: 'audio', id: audio.id }); onSeek(audio.start) }}><LabIcon name="music" size={13} /><span>{audio.name}</span></button>)}{!project.audio.length && <p className={styles.laneEmpty}>Add music, voiceover, or sound effects from your media bin.</p>}</div>
        <div className={styles.playhead} style={{ left: 100 + time * px }} aria-hidden="true"><span /></div>
      </div>
    </div>
    <div className={styles.timelineFooter}><span>{trimLabel || `${project.clips.length} shots · ${project.titles.length} titles · ${project.audio.length} audio clips`}</span><span>Drag shots to reorder · Select a shot to trim</span></div>
  </section>
}
