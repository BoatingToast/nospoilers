'use client'

import { useEffect, useRef, useState } from 'react'
import type * as Three from 'three'
import { seatPosition, type TheaterParticipant } from '@/lib/theater'

export interface TheaterSceneProps {
  capacity?: number
  participants?: TheaterParticipant[]
  mySeat?: number | null
  ownerView?: boolean
  video?: HTMLVideoElement | null
  resetKey?: number
  onUnavailable?: () => void
}

const NO_PARTICIPANTS: TheaterParticipant[] = []

export default function TheaterScene({ capacity = 48, participants = NO_PARTICIPANTS, mySeat = 27, ownerView = false, video = null, resetKey = 0, onUnavailable }: TheaterSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const updatePeopleRef = useRef<((people: TheaterParticipant[]) => void) | null>(null)
  const updateVideoRef = useRef<((video: HTMLVideoElement | null) => void) | null>(null)
  const resetRef = useRef<(() => void) | null>(null)
  const peopleRef = useRef(participants)
  const videoRef = useRef(video)
  const unavailableRef = useRef(onUnavailable)
  const [failed, setFailed] = useState(false)

  useEffect(() => { peopleRef.current = participants; updatePeopleRef.current?.(participants) }, [participants])
  useEffect(() => { videoRef.current = video; updateVideoRef.current?.(video) }, [video])
  useEffect(() => { unavailableRef.current = onUnavailable }, [onUnavailable])
  useEffect(() => { resetRef.current?.() }, [resetKey])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let cleanup = () => {}

    async function initialize() {
      const THREE = await import('three')
      const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js')
      if (disposed || !mount) return
      let renderer: Three.WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      } catch {
        setFailed(true)
        unavailableRef.current?.()
        return
      }
      setFailed(false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.25
      const canvas = renderer.domElement
      canvas.className = 'h-full w-full cursor-grab outline-none active:cursor-grabbing'
      canvas.style.touchAction = 'none'
      canvas.tabIndex = 0
      canvas.setAttribute('aria-label', ownerView ? '3D creator overview. Drag to orbit; scroll to zoom. Press R to reset.' : 'First-person theater. Drag or use arrow keys to look around. Press R to face the screen.')
      canvas.setAttribute('role', 'img')
      mount.appendChild(canvas)

      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#06060c')
      scene.fog = new THREE.FogExp2('#06060c', 0.013)
      const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 120)
      const rows = capacity / 8
      const depth = rows * 1.65 + 4
      const geometries = new Set<Three.BufferGeometry>()
      const materials = new Set<Three.Material>()
      const textures = new Set<Three.Texture>()
      const geometry = <T extends Three.BufferGeometry>(item: T) => { geometries.add(item); return item }
      const material = <T extends Three.Material>(item: T) => { materials.add(item); return item }
      const standard = (color: string, roughness = 0.8) => material(new THREE.MeshStandardMaterial({ color, roughness }))
      const glow = (color: string, intensity = 1) => material(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity }))
      const carpet = standard('#10111d')
      const wall = standard('#161422')
      const velvet = standard('#452638', 0.94)
      const seatSide = standard('#241d2f')
      const brass = material(new THREE.MeshStandardMaterial({ color: '#9f8153', metalness: 0.8, roughness: 0.3 }))
      const aisleGlow = glow('#dc9a5d', 1.8)
      const violetGlow = glow('#7452c9', 1.3)
      const boxGeometry = geometry(new THREE.BoxGeometry(1, 1, 1))
      const chairGeometry = geometry(new RoundedBoxGeometry(1, 1, 1, 3, 0.12))

      function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: Three.Material, parent: Three.Object3D = scene) {
        const mesh = new THREE.Mesh(boxGeometry, mat)
        mesh.scale.set(w, h, d)
        mesh.position.set(x, y, z)
        parent.add(mesh)
        return mesh
      }

      scene.add(new THREE.HemisphereLight('#b4a6da', '#15101d', 1.15))
      const screenLight = new THREE.PointLight('#d2ddff', 160, 32, 2)
      screenLight.position.set(0, 6, -7.5)
      scene.add(screenLight)
      const fill = new THREE.DirectionalLight('#dbb4fc', 0.9)
      fill.position.set(1, 9, 5)
      scene.add(fill)
      box(19, 0.3, depth + 14, 0, -0.25, (depth - 14) / 2, carpet)
      box(17, 0.45, 3.6, 0, 0, -7.8, seatSide)
      box(16.6, 0.025, 0.035, 0, 0.24, -6.02, aisleGlow)

      // A cutaway removes the roof and side walls in the creator's orbit view.
      if (!ownerView) {
        box(0.4, 11, depth + 14, -9.3, 5.25, (depth - 14) / 2, wall)
        box(0.4, 11, depth + 14, 9.3, 5.25, (depth - 14) / 2, wall)
        box(19, 11, 0.4, 0, 5.25, depth, wall)
        box(19, 0.3, depth + 14, 0, 10.6, (depth - 14) / 2, standard('#080912'))
        for (let z = -7; z < depth; z += 3) {
          for (const x of [-9.06, 9.06]) {
            box(0.06, 5.2, 1.8, x, 4.4, z, standard('#252030'))
            box(0.08, 3.8, 0.025, x + (x < 0 ? 0.05 : -0.05), 4.4, z - 0.9, violetGlow)
          }
        }
        // Ceiling ribs and warm practical lights give the room a physical scale.
        for (let z = -6; z < depth; z += 4.5) {
          box(18.5, 0.2, 0.25, 0, 10.2, z, seatSide)
          for (const x of [-7.3, 7.3]) box(0.4, 0.035, 1.6, x, 10.06, z, aisleGlow)
        }
      }

      // Fluted curtains frame a true 16:9 projection surface.
      const curtain = standard('#3b1d33')
      for (const side of [-1, 1]) {
        for (let i = 0; i < 9; i++) box(0.21, 9.5, 0.25 + (i % 2) * 0.13, side * (7.35 + i * 0.22), 4.8, -10.65, curtain)
      }
      box(14.9, 8.5, 0.24, 0, 5.25, -10.75, standard('#050508'))
      box(15, 0.035, 0.28, 0, 9.53, -10.7, brass)
      const projection = document.createElement('canvas')
      projection.width = 1600
      projection.height = 900
      const ctx = projection.getContext('2d')!
      const gradient = ctx.createRadialGradient(800, 420, 10, 800, 420, 940)
      gradient.addColorStop(0, '#353044')
      gradient.addColorStop(0.5, '#17151f')
      gradient.addColorStop(1, '#090a10')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 1600, 900)
      ctx.strokeStyle = '#ba9c69'
      ctx.lineWidth = 2
      ctx.strokeRect(690, 200, 220, 130)
      ctx.beginPath(); ctx.moveTo(780, 232); ctx.lineTo(840, 265); ctx.lineTo(780, 298); ctx.closePath(); ctx.stroke()
      ctx.textAlign = 'center'
      ctx.fillStyle = '#d6c4a4'
      ctx.font = '24px sans-serif'
      ctx.fillText('N O S P O I L E R S   P R O', 800, 411)
      ctx.fillStyle = '#f9f3e8'
      ctx.font = '100px Georgia, serif'
      ctx.fillText('Theater', 800, 533)
      ctx.fillStyle = '#a5a0b0'
      ctx.font = '25px sans-serif'
      ctx.fillText('Small filmmakers. A big-screen moment.', 800, 608)
      const idleTexture = new THREE.CanvasTexture(projection)
      idleTexture.colorSpace = THREE.SRGBColorSpace
      textures.add(idleTexture)
      const screenMaterial = material(new THREE.MeshBasicMaterial({ map: idleTexture, toneMapped: false }))
      const screen = new THREE.Mesh(geometry(new THREE.PlaneGeometry(14.4, 8.1)), screenMaterial)
      screen.position.set(0, 5.25, -10.59)
      scene.add(screen)
      let videoTexture: Three.VideoTexture | null = null
      const updateVideo = (element: HTMLVideoElement | null) => {
        videoTexture?.dispose()
        videoTexture = element ? new THREE.VideoTexture(element) : null
        if (videoTexture) videoTexture.colorSpace = THREE.SRGBColorSpace
        screenMaterial.map = videoTexture ?? idleTexture
        screenMaterial.needsUpdate = true
      }
      updateVideoRef.current = updateVideo
      updateVideo(videoRef.current)

      const chairParts = [
        { scale: [0.86, 0.98, 0.2], position: [0, 0.78, 0.32], mat: velvet },
        { scale: [0.85, 0.22, 0.78], position: [0, 0.43, -0.02], mat: velvet },
        { scale: [0.12, 0.16, 0.84], position: [-0.49, 0.65, 0], mat: seatSide },
        { scale: [0.12, 0.16, 0.84], position: [0.49, 0.65, 0], mat: seatSide },
        { scale: [0.64, 0.35, 0.48], position: [0, 0.17, 0.05], mat: seatSide },
      ]
      const dummy = new THREE.Object3D()
      for (const part of chairParts) {
        const chairs = new THREE.InstancedMesh(chairGeometry, part.mat, capacity)
        for (let seat = 0; seat < capacity; seat++) {
          const p = seatPosition(seat)
          dummy.position.set(p.x + part.position[0], p.y + part.position[1], p.z + part.position[2])
          dummy.scale.set(part.scale[0], part.scale[1], part.scale[2])
          dummy.updateMatrix()
          chairs.setMatrixAt(seat, dummy.matrix)
        }
        scene.add(chairs)
      }
      for (let row = 0; row < rows; row++) {
        box(16.8, row * 0.3 + 0.1, 1.65, 0, row * 0.15 - 0.05, row * 1.65 + 0.15, carpet)
        for (const x of [-7.8, -0.56, 0.56, 7.8]) {
          box(0.03, 0.025, 1.58, x, row * 0.3 + 0.02, row * 1.65, aisleGlow)
        }
      }

      const audience = new THREE.Group()
      scene.add(audience)
      const headGeometry = geometry(new THREE.SphereGeometry(0.22, 16, 12))
      const torsoGeometry = geometry(new THREE.CapsuleGeometry(0.24, 0.3, 4, 10))
      const haloGeometry = geometry(new THREE.TorusGeometry(0.29, 0.022, 6, 24))
      const peopleMaterials = new Set<Three.Material>()
      const updatePeople = (people: TheaterParticipant[]) => {
        audience.clear()
        peopleMaterials.forEach(m => { materials.delete(m); m.dispose() })
        peopleMaterials.clear()
        for (const person of people.filter(p => p.present && (ownerView || p.seat !== mySeat))) {
          const p = seatPosition(person.seat)
          const group = new THREE.Group()
          group.position.set(p.x, p.y, p.z)
          const personMaterial = (color: string, emission = false) => {
            const mat = emission ? glow(color, 0.6) : standard(color, 0.6)
            peopleMaterials.add(mat)
            return mat
          }
          const skin = personMaterial(person.avatar.skin)
          const suit = personMaterial(person.avatar.suit)
          const accent = personMaterial(person.avatar.accent, true)
          const head = new THREE.Mesh(headGeometry, skin)
          head.position.set(0, 1.28, -0.02)
          if (person.avatar.silhouette === 'sleek') head.scale.x = 0.88
          group.add(head)
          const torso = new THREE.Mesh(torsoGeometry, suit)
          torso.position.set(0, 0.79, 0)
          torso.scale.x = person.avatar.silhouette === 'cosmic' ? 1.25 : 1
          group.add(torso)
          box(0.1, 0.1, 0.03, 0, 0.9, -0.25, accent, group)
          for (const side of [-1, 1]) {
            box(0.15, 0.17, 0.48, side * 0.18, 0.51, -0.28, suit, group)
            box(0.12, 0.44, 0.14, side * 0.33, 0.77, -0.04, suit, group)
          }
          if (person.avatar.accessory === 'visor') box(0.4, 0.08, 0.1, 0, 1.3, -0.22, accent, group)
          if (person.avatar.accessory === 'headphones') {
            for (const side of [-1, 1]) box(0.08, 0.18, 0.14, side * 0.22, 1.29, 0, accent, group)
          }
          if (person.avatar.accessory === 'halo') {
            const halo = new THREE.Mesh(haloGeometry, accent)
            halo.rotation.x = Math.PI / 2
            halo.position.y = 1.61
            group.add(halo)
          }
          audience.add(group)
        }
      }
      updatePeopleRef.current = updatePeople
      updatePeople(peopleRef.current)

      let yaw = 0
      let pitch = 0
      let radius = Math.max(23, depth + 11)
      const seat = seatPosition(mySeat ?? Math.min(capacity - 1, Math.floor(rows / 2) * 8 + 3))
      const target = new THREE.Vector3(0, 2, depth / 2 - 3)
      const reset = () => {
        yaw = ownerView ? 0.55 : Math.atan2(seat.x, seat.z + 10.6)
        pitch = ownerView ? 0.72 : Math.atan2(5.25 - (seat.y + 1.6), Math.hypot(seat.x, seat.z + 10.6))
        radius = Math.max(23, depth + 11)
      }
      resetRef.current = reset
      reset()
      let pointer: { id: number; x: number; y: number } | null = null
      const down = (event: PointerEvent) => {
        if (event.button !== 0) return
        canvas.focus()
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
        canvas.setPointerCapture(event.pointerId)
      }
      const move = (event: PointerEvent) => {
        if (!pointer || pointer.id !== event.pointerId) return
        yaw -= (event.clientX - pointer.x) * 0.004
        pitch += (event.clientY - pointer.y) * 0.004 * (ownerView ? -1 : 1)
        pitch = THREE.MathUtils.clamp(pitch, ownerView ? 0.15 : -1.15, ownerView ? 1.45 : 1.15)
        pointer.x = event.clientX
        pointer.y = event.clientY
      }
      const up = () => { pointer = null }
      const wheel = (event: WheelEvent) => {
        if (!ownerView) return
        event.preventDefault()
        radius = THREE.MathUtils.clamp(radius + event.deltaY * 0.03, 13, 55)
      }
      const key = (event: KeyboardEvent) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'r', 'R'].includes(event.key)) event.preventDefault()
        if (event.key === 'ArrowLeft') yaw += 0.09
        if (event.key === 'ArrowRight') yaw -= 0.09
        if (event.key === 'ArrowUp') pitch += 0.07
        if (event.key === 'ArrowDown') pitch -= 0.07
        if (event.key.toLowerCase() === 'r') reset()
        pitch = THREE.MathUtils.clamp(pitch, ownerView ? 0.15 : -1.15, ownerView ? 1.45 : 1.15)
      }
      const contextLost = (event: Event) => { event.preventDefault(); setFailed(true); unavailableRef.current?.() }
      canvas.addEventListener('pointerdown', down)
      canvas.addEventListener('pointermove', move)
      canvas.addEventListener('pointerup', up)
      canvas.addEventListener('pointercancel', up)
      canvas.addEventListener('wheel', wheel, { passive: false })
      canvas.addEventListener('keydown', key)
      canvas.addEventListener('webglcontextlost', contextLost)
      const resize = new ResizeObserver(() => {
        const { width, height } = mount.getBoundingClientRect()
        renderer.setSize(width, height)
        camera.aspect = width / Math.max(1, height)
        camera.updateProjectionMatrix()
      })
      resize.observe(mount)
      let frame = 0
      const draw = () => {
        if (disposed) return
        frame = requestAnimationFrame(draw)
        if (document.hidden) return
        if (ownerView) {
          camera.position.set(target.x + radius * Math.sin(yaw) * Math.cos(pitch), target.y + radius * Math.sin(pitch), target.z + radius * Math.cos(yaw) * Math.cos(pitch))
          camera.lookAt(target)
        } else {
          camera.position.set(seat.x, seat.y + 1.6, seat.z - 0.12)
          camera.rotation.set(pitch, yaw, 0, 'YXZ')
        }
        // Letterbox arbitrary film aspect ratios without stretching the frame.
        const activeVideo = videoRef.current
        if (activeVideo?.videoWidth && activeVideo.videoHeight) {
          const aspect = activeVideo.videoWidth / activeVideo.videoHeight
          screen.scale.set(Math.min(1, aspect / (16 / 9)), Math.min(1, (16 / 9) / aspect), 1)
        } else screen.scale.set(1, 1, 1)
        renderer.render(scene, camera)
      }
      draw()
      cleanup = () => {
        cancelAnimationFrame(frame)
        resize.disconnect()
        canvas.removeEventListener('pointerdown', down)
        canvas.removeEventListener('pointermove', move)
        canvas.removeEventListener('pointerup', up)
        canvas.removeEventListener('pointercancel', up)
        canvas.removeEventListener('wheel', wheel)
        canvas.removeEventListener('keydown', key)
        canvas.removeEventListener('webglcontextlost', contextLost)
        updatePeopleRef.current = null
        updateVideoRef.current = null
        resetRef.current = null
        videoTexture?.dispose()
        textures.forEach(t => t.dispose())
        geometries.forEach(g => g.dispose())
        materials.forEach(m => m.dispose())
        renderer.dispose()
        canvas.remove()
      }
    }
    initialize().catch(() => { setFailed(true); unavailableRef.current?.() })
    return () => { disposed = true; cleanup() }
  }, [capacity, mySeat, ownerView])

  return (
    <div ref={mountRef} className="absolute inset-0 overflow-hidden bg-[#08080e]">
      {failed && <div className="absolute inset-0 grid place-items-center p-8 text-center"><p className="max-w-sm text-sm leading-7 text-white/60">3D is unavailable on this device. You can still watch the premiere in screen view.</p></div>}
    </div>
  )
}
