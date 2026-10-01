import { useEffect, useState } from 'react'
import { clamp, clipDuration, formatTime, MIN_CLIP, normalizeClip, sequence, type LabAudio, type LabClip, type LabProject, type LabTitle, type Selection } from '@/lib/lab/model'
import { LOOKS } from '@/lib/lab/engine'
import LabIcon from './LabIcon'
import styles from './lab.module.css'

function NumberField({ label, value, min = 0, max = 86400, step = 0.1, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(Math.round(value * 1000) / 1000))
  useEffect(() => setDraft(String(Math.round(value * 1000) / 1000)), [value])
  function commit() {
    const next = clamp(draft.trim() === '' ? value : Number(draft), min, max)
    setDraft(String(Math.round(next * 1000) / 1000)); if (next !== value) onChange(next)
  }
  return <label className={styles.field}>{label}<input type="number" min={min} max={max} step={step} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
}

function VolumeField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className={styles.field}><span className={styles.spread}><span>Volume</span><span>{Math.round(value * 100)}%</span></span><input aria-label="Volume" type="range" min="0" max="2" step="0.01" value={value} onChange={event => onChange(Number(event.target.value))} /></label>
}

interface Props {
  project: LabProject
  selection: Selection
  change: (update: (project: LabProject) => LabProject, group?: string) => void
  onDelete: () => void
  onDuplicate: () => void
  onMove: (direction: number) => void
}

export default function LabInspector({ project, selection, change, onDelete, onDuplicate, onMove }: Props) {
  const clip = selection?.kind === 'clip' ? project.clips.find(item => item.id === selection.id) : undefined
  const title = selection?.kind === 'title' ? project.titles.find(item => item.id === selection.id) : undefined
  const audio = selection?.kind === 'audio' ? project.audio.find(item => item.id === selection.id) : undefined
  const asset = project.assets.find(item => item.id === (clip?.assetId ?? audio?.assetId))

  function patchClip(patch: Partial<LabClip>) {
    if (!clip) return
    change(p => ({ ...p, clips: p.clips.map(item => item.id === clip.id ? normalizeClip({ ...item, ...patch }, p.assets.find(a => a.id === item.assetId)) : item) }), `clip:${clip.id}:${Object.keys(patch).join()}`)
  }
  function patchTitle(patch: Partial<LabTitle>) {
    if (!title) return
    change(p => ({ ...p, titles: p.titles.map(item => item.id === title.id ? { ...item, ...patch } : item) }), `title:${title.id}:${Object.keys(patch).join()}`)
  }
  function patchAudio(patch: Partial<LabAudio>) {
    if (!audio || !asset) return
    change(p => ({ ...p, audio: p.audio.map(item => {
      if (item.id !== audio.id) return item
      const next = { ...item, ...patch }
      next.in = clamp(next.in, 0, asset!.duration - MIN_CLIP)
      next.out = clamp(next.out, next.in + MIN_CLIP, asset!.duration)
      next.fadeIn = clamp(next.fadeIn, 0, (next.out - next.in) / 2)
      next.fadeOut = clamp(next.fadeOut, 0, (next.out - next.in) / 2)
      return next
    }) }), `audio:${audio.id}:${Object.keys(patch).join()}`)
  }

  return <aside className={styles.inspector} aria-label="Clip inspector">
    <div className={styles.panelHeading}><span><LabIcon name="settings" size={15} /> Inspector</span><small>{clip ? 'SHOT' : title ? 'TEXT' : audio ? 'AUDIO' : 'PROJECT'}</small></div>
    <div className={styles.inspectorBody}>
      {!clip && !title && !audio && <div className={styles.inspectorEmpty}><span className={styles.emptyIcon}><LabIcon name="settings" size={26} /></span><h3>Make every detail yours.</h3><p>Select a shot, title, or audio clip on the timeline to start shaping it.</p><div className={styles.hintCard}><strong>Your edit, explained</strong><p>Shots play in order. Titles and audio use their own start times, so you can layer them over any scene.</p></div></div>}
      {clip && <>
        <label className={styles.field}>Shot name<input maxLength={120} value={clip.name} onChange={event => patchClip({ name: event.target.value })} /></label>
        <div className={styles.inspectorMeta}><span>{asset?.kind ?? 'Color card'}</span><span>{formatTime(clipDuration(clip), true)}</span></div>
        <section className={styles.controlSection}><h3>Timing</h3>
          {asset?.kind === 'video' ? <div className={styles.twoColumns}><NumberField label="Source in (s)" value={clip.in} max={asset.duration - MIN_CLIP} onChange={value => patchClip({ in: value })} /><NumberField label="Source out (s)" value={clip.out} min={clip.in + MIN_CLIP} max={asset.duration} onChange={value => patchClip({ out: value })} /></div> : <NumberField label="Duration (s)" value={clip.out - clip.in} min={MIN_CLIP} max={3600} onChange={value => patchClip({ in: 0, out: value })} />}
          {asset?.kind === 'video' && <label className={styles.field}>Playback speed<select value={clip.speed} onChange={event => patchClip({ speed: Number(event.target.value) })}>{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×{speed === 1 ? ' · Original' : ''}</option>)}</select></label>}
          <p className={styles.finePrint}>Starts at {formatTime(sequence(project.clips).find(item => item.clip.id === clip.id)?.start ?? 0, true)}. Moving or trimming shots keeps titles and music at their timestamps.</p>
          <div className={styles.twoColumns}><button className={styles.button} disabled={project.clips[0]?.id === clip.id} onClick={() => onMove(-1)}><LabIcon name="back" size={14} /> Earlier</button><button className={styles.button} disabled={project.clips.at(-1)?.id === clip.id} onClick={() => onMove(1)}>Later <LabIcon name="next" size={14} /></button></div>
        </section>
        <section className={styles.controlSection}><h3>Picture</h3>
          {!asset ? <label className={styles.field}>Card color<input type="color" value={clip.color} onChange={event => patchClip({ color: event.target.value })} /></label> : <><label className={styles.field}>Framing<select value={clip.fit} onChange={event => patchClip({ fit: event.target.value as LabClip['fit'] })}><option value="contain">Fit · keep the whole frame</option><option value="cover">Fill · crop to the canvas</option></select></label><div className={styles.field}>Color look<div className={styles.lookGrid}>{LOOKS.map(look => <button key={look.id} className={`${styles.lookButton} ${clip.look === look.id ? styles.lookActive : ''}`} aria-pressed={clip.look === look.id} onClick={() => patchClip({ look: look.id })}><span style={{ filter: look.filter, backgroundImage: asset.thumbnail ? `url(${asset.thumbnail})` : undefined }} /><small>{look.label}</small></button>)}</div></div></>}
          <div className={styles.twoColumns}><NumberField label="Fade in (s)" value={clip.fadeIn} max={clipDuration(clip) / 2} onChange={value => patchClip({ fadeIn: value })} /><NumberField label="Fade out (s)" value={clip.fadeOut} max={clipDuration(clip) / 2} onChange={value => patchClip({ fadeOut: value })} /></div><p className={styles.finePrint}>Fades picture through black and fades the shot’s sound with it.</p>
        </section>
        {asset?.kind === 'video' && <section className={styles.controlSection}><h3>Original sound</h3><VolumeField value={clip.volume} onChange={value => patchClip({ volume: value })} /><button className={styles.button} onClick={() => patchClip({ volume: clip.volume ? 0 : 1 })}><LabIcon name="volume" size={15} />{clip.volume ? 'Mute this shot' : 'Restore sound'}</button></section>}
      </>}
      {title && <>
        <label className={styles.field}>Title text<textarea rows={4} maxLength={2000} value={title.text} onChange={event => patchTitle({ text: event.target.value })} placeholder="Tell your story…" /></label>
        <section className={styles.controlSection}><h3>Timing</h3><div className={styles.twoColumns}><NumberField label="Start time (s)" value={title.start} max={86400 - title.duration} onChange={value => patchTitle({ start: value })} /><NumberField label="Duration (s)" value={title.duration} min={MIN_CLIP} max={3600} onChange={value => patchTitle({ duration: value })} /></div></section>
        <section className={styles.controlSection}><h3>Typography</h3><NumberField label="Text size" value={title.size} min={12} max={160} step={1} onChange={value => patchTitle({ size: value })} /><label className={styles.field}>Position<select value={title.position} onChange={event => patchTitle({ position: event.target.value as LabTitle['position'] })}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom / subtitle</option></select></label><label className={styles.field}>Text color<input type="color" value={title.color} onChange={event => patchTitle({ color: event.target.value })} /></label><label className={styles.checkbox}><input type="checkbox" checked={title.backdrop} onChange={event => patchTitle({ backdrop: event.target.checked })} /> Readable background</label></section>
      </>}
      {audio && <>
        <label className={styles.field}>Audio name<input maxLength={120} value={audio.name} onChange={event => patchAudio({ name: event.target.value })} /></label>
        <section className={styles.controlSection}><h3>Timing</h3><NumberField label="Start time (s)" value={audio.start} onChange={value => patchAudio({ start: value })} /><div className={styles.twoColumns}><NumberField label="Source in (s)" value={audio.in} max={(asset?.duration ?? 1) - MIN_CLIP} onChange={value => patchAudio({ in: value })} /><NumberField label="Source out (s)" value={audio.out} min={audio.in + MIN_CLIP} max={asset?.duration} onChange={value => patchAudio({ out: value })} /></div></section>
        <section className={styles.controlSection}><h3>Sound mix</h3><VolumeField value={audio.volume} onChange={value => patchAudio({ volume: value })} /><div className={styles.twoColumns}><NumberField label="Fade in (s)" value={audio.fadeIn} max={(audio.out - audio.in) / 2} onChange={value => patchAudio({ fadeIn: value })} /><NumberField label="Fade out (s)" value={audio.fadeOut} max={(audio.out - audio.in) / 2} onChange={value => patchAudio({ fadeOut: value })} /></div></section>
      </>}
      {(clip || title || audio) && <div className={styles.inspectorActions}><button className={styles.button} onClick={onDuplicate}><LabIcon name="copy" size={15} /> Duplicate</button><button className={styles.dangerButton} onClick={onDelete}><LabIcon name="trash" size={15} /> Remove</button></div>}
    </div>
  </aside>
}
