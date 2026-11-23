'use client'

import { useEffect, useRef, useState } from 'react'
import type * as Three from 'three'
import { sceneFont, scenePalette } from './scene-palette'

export interface TheaterDoor {
  number: number
  title: string
  subtitle: string
  badge: string
  href: string | null
}
export type WalkDirection = 'forward' | 'backward' | 'left' | 'right'
export type WalkControls = (direction: WalkDirection, pressed: boolean) => void

export default function TheaterMultiplexScene({ doors, paused = false, onNearDoor, onEnter, onControls }: {
  doors: TheaterDoor[]
  paused?: boolean
  onNearDoor: (door: TheaterDoor | null) => void
  onEnter: (door: TheaterDoor) => void
  onControls: (controls: WalkControls | null) => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef({ doors, paused, onNearDoor, onEnter, onControls })
  const updatePostersRef = useRef<(() => void) | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    dataRef.current = { doors, paused, onNearDoor, onEnter, onControls }
    updatePostersRef.current?.()
  }, [doors, paused, onNearDoor, onEnter, onControls])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let cleanup = () => {}
    async function initialize() {
      const THREE = await import('three')
      const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js')
      const palette = scenePalette()
      const displayFont = await sceneFont()
      if (disposed || !mount) return
      let renderer: Three.WebGLRenderer
      try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }) }
      catch { setFailed(true); return }
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.2
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
      const canvas = renderer.domElement
      canvas.className = 'h-full w-full cursor-grab outline-none active:cursor-grabbing'
      canvas.style.touchAction = 'none'
      canvas.tabIndex = 0
      canvas.setAttribute('aria-label', 'Walkable cinema lobby. Arrow keys or W A S D to move. Drag to look around. E to enter a nearby theater.')
      canvas.setAttribute('role', 'img')
      mount.appendChild(canvas)
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(palette.bg)
      scene.fog = new THREE.Fog(palette.bg, 28, 58)
      const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 100)
      const geometries = new Set<Three.BufferGeometry>()
      const materials = new Set<Three.Material>()
      const textures = new Set<Three.Texture>()
      const geo = <T extends Three.BufferGeometry>(g: T) => { geometries.add(g); return g }
      const mat = <T extends Three.Material>(m: T) => { materials.add(m); return m }
      const standard = (color: string, metalness = 0, roughness = 0.7) => mat(new THREE.MeshStandardMaterial({ color, metalness, roughness }))
      const glow = (color: string, strength = 1.3) => mat(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength }))
      const unit = geo(new THREE.BoxGeometry(1, 1, 1))
      const rounded = geo(new RoundedBoxGeometry(1, 1, 1, 3, 0.08))
      const floor = standard(palette.surface, 0.25, 0.3)
      const floorAlt = standard(palette.surface2, 0.15, 0.38)
      const wall = standard(palette.surface3)
      const dark = standard(palette.bg)
      const trim = standard(palette.subtle, 0.7, 0.25)
      const light = glow(palette.warmLight, 0.55)
      const coralLight = glow(palette.coral, 1.2)
      const velvet = standard(palette.velvet, 0, 0.9)
      const obstacles: Array<{ x: number; z: number; w: number; d: number }> = []
      function box(w: number, h: number, d: number, x: number, y: number, z: number, material: Three.Material, round = false) {
        const mesh = new THREE.Mesh(round ? rounded : unit, material)
        mesh.scale.set(w, h, d); mesh.position.set(x, y, z); scene.add(mesh); return mesh
      }
      scene.add(new THREE.HemisphereLight(palette.text, palette.surface, 2.8))
      const sun = new THREE.DirectionalLight(palette.warmLight, 1.3)
      sun.position.set(0, 8, 15); scene.add(sun)
      // Floor tiles, metal inlays and a carpet runner lead from the entrance to the halls.
      for (let x = -11; x <= 11; x += 2) for (let z = -19; z <= 23; z += 2) {
        box(1.98, 0.1, 1.98, x, -0.08, z, (x + z) % 4 === 0 ? floor : floorAlt)
      }
      box(5.8, 0.015, 39, 0, 0, 2, standard(palette.runner))
      for (const x of [-2.93, 2.93]) box(0.025, 0.02, 39, x, 0.01, 2, trim)
      box(0.35, 7, 44, -12, 3.5, 2, wall)
      box(0.35, 7, 44, 12, 3.5, 2, wall)
      box(24, 7, 0.4, 0, 3.5, -20, wall)
      box(24, 7, 0.4, 0, 3.5, 24, dark)
      box(24, 0.3, 44, 0, 7, 2, dark)
      for (const side of [-1, 1]) {
        box(0.12, 0.12, 43.5, side * 11.7, 0.2, 2, trim)
        box(0.14, 0.06, 43.5, side * 11.7, 6.5, 2, light)
      }
      for (let z = -16; z <= 20; z += 8) {
        // Floating rectangular luminaires make the lobby feel like an actual multiplex.
        box(9, 0.14, 2.8, 0, 6.65, z, dark)
        box(8.7, 0.025, 2.5, 0, 6.56, z, glow(palette.muted, 0.1))
        const lamp = new THREE.PointLight(palette.warmLight, 5, 13, 2)
        lamp.position.set(0, 5.7, z); scene.add(lamp)
        for (const x of [-11.6, 11.6]) {
          box(0.22, 6.2, 0.2, x, 3.1, z + 3, trim)
          box(0.25, 2.3, 0.06, x + (x < 0 ? 0.1 : -0.1), 3.8, z + 3, light)
        }
      }
      function label(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) {
        const labelCanvas = document.createElement('canvas')
        labelCanvas.width = width; labelCanvas.height = height
        const ctx = labelCanvas.getContext('2d')!
        draw(ctx, labelCanvas)
        const texture = new THREE.CanvasTexture(labelCanvas)
        texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture)
        return { texture, canvas: labelCanvas, ctx }
      }
      function plane(w: number, h: number, x: number, y: number, z: number, texture: Three.Texture, rotation = 0) {
        const mesh = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h)), mat(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })))
        mesh.position.set(x, y, z); mesh.rotation.y = rotation; scene.add(mesh); return mesh
      }
      const brand = label(1600, 600, ctx => {
        ctx.fillStyle = palette.surface; ctx.fillRect(0, 0, 1600, 600)
        ctx.textAlign = 'center'; ctx.fillStyle = palette.coralText; ctx.font = `600 40px ${displayFont}`; ctx.fillText('NoSpoilers Pro', 800, 150)
        ctx.font = `700 190px ${displayFont}`; ctx.fillStyle = palette.text; ctx.fillText('Theater', 800, 350)
        ctx.font = `500 42px ${displayFont}`; ctx.fillStyle = palette.muted; ctx.fillText('Every story deserves an opening night.', 800, 460)
      })
      plane(11, 4.12, 0, 4.4, -19.7, brand.texture)

      // A reception desk and seating islands leave wide, collision-aware walkways.
      box(8, 1.3, 1.3, 0, 0.65, -16.7, dark, true)
      box(8.2, 0.13, 1.5, 0, 1.34, -16.7, trim, true)
      box(7.4, 0.025, 0.04, 0, 0.4, -15.99, light)
      obstacles.push({ x: 0, z: -16.7, w: 8.2, d: 1.5 })
      const welcome = label(800, 180, ctx => { ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, 800, 180); ctx.textAlign = 'center'; ctx.fillStyle = palette.text; ctx.font = `600 46px ${displayFont}`; ctx.fillText('Welcome to the cinema', 400, 108) })
      plane(5.4, 1.2, 0, 0.73, -16.03, welcome.texture)
      for (const x of [-5.7, 5.7]) for (const z of [-3, 11]) {
        box(1.5, 0.5, 3.2, x, 0.45, z, velvet, true)
        box(0.22, 0.8, 3.2, x, 0.95, z, velvet, true)
        box(1.2, 0.18, 2.7, x, 0.15, z, trim, true)
        obstacles.push({ x, z, w: 1.5, d: 3.2 })
      }
      // Round planters and sculptural leaves soften the entrance.
      const potGeometry = geo(new THREE.CylinderGeometry(0.62, 0.47, 0.9, 20))
      const leafGeometry = geo(new THREE.SphereGeometry(1, 12, 8))
      const leafMat = standard(palette.leaf)
      for (const x of [-8, 8]) for (const z of [-17, 21]) {
        const pot = new THREE.Mesh(potGeometry, trim); pot.position.set(x, 0.45, z); scene.add(pot)
        obstacles.push({ x, z, w: 1.3, d: 1.3 })
        for (let i = 0; i < 7; i++) {
          const leaf = new THREE.Mesh(leafGeometry, leafMat)
          const angle = i * Math.PI * 2 / 7
          leaf.scale.set(0.19, 1.05, 0.09); leaf.position.set(x + Math.cos(angle) * 0.2, 1.55, z + Math.sin(angle) * 0.2)
          leaf.rotation.set(Math.cos(angle) * 0.5, angle, Math.sin(angle) * 0.45); scene.add(leaf)
        }
      }

      const doorPositions = Array.from({ length: 8 }, (_, i) => ({ x: i % 2 === 0 ? -11.75 : 11.75, z: 16 - Math.floor(i / 2) * 8, rotation: i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2 }))
      const posters = doorPositions.map((p, i) => {
        const side = p.x < 0 ? 1 : -1
        box(0.2, 4.3, 3.2, p.x, 2.15, p.z, trim)
        box(0.22, 4.03, 2.93, p.x + side * 0.12, 2.01, p.z, dark)
        for (const dz of [-0.72, 0.72]) {
          box(0.12, 3.85, 1.41, p.x + side * 0.26, 1.94, p.z + dz, standard(palette.surface2))
          box(0.2, 0.6, 0.045, p.x + side * 0.36, 1.35, p.z + dz * 0.22, trim)
        }
        box(0.06, 0.035, 3.05, p.x + side * 0.4, 0.03, p.z, light)
        const number = label(700, 180, ctx => {
          ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, 700, 180); ctx.textAlign = 'center'
          ctx.fillStyle = palette.muted; ctx.font = `600 46px ${displayFont}`; ctx.fillText('Theater', 250, 108)
          ctx.fillStyle = palette.coralText; ctx.font = `700 92px ${displayFont}`; ctx.fillText(String(i + 1).padStart(2, '0'), 535, 122)
        })
        plane(3.4, 0.88, p.x + side * 0.4, 4.96, p.z, number.texture, p.rotation)
        const poster = label(540, 780, () => {})
        box(0.13, 3.12, 2.22, p.x + side * 0.08, 2.1, p.z - 3.04, trim)
        plane(2.1, 3.03, p.x + side * 0.19, 2.1, p.z - 3.04, poster.texture, p.rotation)
        box(0.25, 0.12, 2.2, p.x + side * 0.17, 3.8, p.z - 3.04, coralLight)
        return poster
      })
      let nearIndex = -1
      const updatePosters = () => {
        posters.forEach(({ ctx, texture }, i) => {
          const door = dataRef.current.doors[i]
          ctx.fillStyle = palette.surface2; ctx.fillRect(0, 0, 540, 780)
          ctx.fillStyle = door?.badge === 'Now showing' ? palette.coral : palette.surface3; ctx.fillRect(0, 0, 540, 14)
          ctx.textAlign = 'left'; ctx.fillStyle = palette.coralText; ctx.font = `600 26px ${displayFont}`; ctx.fillText(door?.badge || 'Coming soon', 44, 92)
          ctx.font = `700 150px ${displayFont}`; ctx.fillStyle = palette.surface3; ctx.fillText(String(i + 1).padStart(2, '0'), 44, 300)
          const words = (door?.title || 'A new story awaits.').split(/\s+/)
          ctx.font = `700 54px ${displayFont}`; ctx.fillStyle = palette.text
          let line = ''; let y = 425
          for (const word of words) {
            if (ctx.measureText(`${line} ${word}`).width > 430 && line) { ctx.fillText(line, 44, y); y += 61; line = ''; if (y > 608) break }
            line += `${line ? ' ' : ''}${word}`
          }
          ctx.fillText(line, 44, y)
          ctx.font = `500 26px ${displayFont}`; ctx.fillStyle = palette.muted
          ctx.fillText((door?.subtitle || 'The next premiere is on its way.').slice(0, 34), 44, 700)
          texture.needsUpdate = true
        })
        if (nearIndex >= 0) dataRef.current.onNearDoor(dataRef.current.doors[nearIndex] ?? null)
      }
      updatePostersRef.current = updatePosters
      updatePosters()

      const position = new THREE.Vector3(0, 1.7, 21)
      let yaw = 0; let pitch = 0
      const keys = new Set<WalkDirection>()
      const keyMap: Record<string, WalkDirection> = { ArrowUp: 'forward', KeyW: 'forward', ArrowDown: 'backward', KeyS: 'backward', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
      let pointer: { x: number; y: number; id: number } | null = null
      const nearDoor = () => nearIndex >= 0 ? dataRef.current.doors[nearIndex] : null
      const enter = () => { const door = nearDoor(); if (door?.href) { keys.clear(); dataRef.current.onEnter(door) } }
      const down = (event: KeyboardEvent) => {
        if (dataRef.current.paused) return
        if (event.target instanceof HTMLElement && (event.target.closest('input,textarea,select,dialog') || event.target.closest('[data-theater-menu]'))) return
        if (keyMap[event.code]) { event.preventDefault(); keys.add(keyMap[event.code]) }
        if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); enter() }
      }
      const up = (event: KeyboardEvent) => { if (keyMap[event.code]) keys.delete(keyMap[event.code]) }
      const clear = () => keys.clear()
      const pointerDown = (event: PointerEvent) => { canvas.focus(); pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }; canvas.setPointerCapture(event.pointerId) }
      const pointerMove = (event: PointerEvent) => {
        if (!pointer || pointer.id !== event.pointerId) return
        yaw -= (event.clientX - pointer.x) * 0.004
        pitch = THREE.MathUtils.clamp(pitch + (event.clientY - pointer.y) * 0.003, -0.85, 0.85)
        pointer.x = event.clientX; pointer.y = event.clientY
      }
      const pointerUp = () => { pointer = null }
      window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear)
      document.addEventListener('visibilitychange', clear)
      canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove)
      canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp)
      const control: WalkControls = (direction, pressed) => { if (pressed) keys.add(direction); else keys.delete(direction) }
      dataRef.current.onControls(control)
      const canWalk = (x: number, z: number) => Math.abs(x) < 11.05 && z > -18.7 && z < 22.7 && !obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + 0.32 && Math.abs(z - o.z) < o.d / 2 + 0.32)
      const resize = new ResizeObserver(() => {
        renderer.setSize(mount.clientWidth, mount.clientHeight)
        camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight); camera.updateProjectionMatrix()
      })
      resize.observe(mount)
      let frame = 0; let previous = performance.now()
      const draw = (time: number) => {
        if (disposed) return
        frame = requestAnimationFrame(draw)
        const dt = Math.min((time - previous) / 1000, 0.05); previous = time
        if (document.hidden) return
        if (dataRef.current.paused) keys.clear()
        let forward = Number(keys.has('forward')) - Number(keys.has('backward'))
        let sideways = Number(keys.has('right')) - Number(keys.has('left'))
        const length = Math.hypot(forward, sideways)
        if (length) { forward /= length; sideways /= length }
        const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * dt * 4.2
        const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) * dt * 4.2
        if (canWalk(position.x + dx, position.z)) position.x += dx
        if (canWalk(position.x, position.z + dz)) position.z += dz
        camera.position.copy(position); camera.rotation.set(pitch, yaw, 0, 'YXZ')
        const nextNear = doorPositions.findIndex(p => Math.hypot(position.x - p.x, position.z - p.z) < 3.5)
        if (nextNear !== nearIndex) { nearIndex = nextNear; dataRef.current.onNearDoor(nearDoor()) }
        renderer.render(scene, camera)
      }
      draw(performance.now())
      cleanup = () => {
        cancelAnimationFrame(frame); resize.disconnect(); dataRef.current.onControls(null); updatePostersRef.current = null
        window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear)
        document.removeEventListener('visibilitychange', clear)
        canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove)
        canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp)
        textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); canvas.remove()
      }
    }
    initialize().catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; cleanup() }
  }, [])
  return <div ref={mountRef} className="absolute inset-0 bg-ns-bg">{failed && <div role="status" className="absolute inset-0 grid place-items-center p-10"><p className="max-w-sm text-center text-base leading-relaxed text-ns-muted">The 3D lobby is unavailable on this device. Open Showtimes to choose and enter a theater.</p></div>}</div>
}
