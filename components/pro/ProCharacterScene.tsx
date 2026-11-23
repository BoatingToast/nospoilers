'use client'

import { useEffect, useRef, useState } from 'react'

export type CharacterSilhouette = 'sleek' | 'classic' | 'cosmic'
export type CharacterAccessory = 'visor' | 'headphones' | 'halo' | 'none'
export type CharacterEnergy = 'calm' | 'pulse' | 'orbit'

export interface CharacterConfig {
  skin: string
  suit: string
  accent: string
  silhouette: CharacterSilhouette
  accessory: CharacterAccessory
  energy: CharacterEnergy
}

interface ProCharacterSceneProps {
  config: CharacterConfig
  /** Stops the idle turn and float. Dragging still works. */
  paused?: boolean
}

function disposeMaterial(material: unknown) {
  const candidate = material as { dispose?: () => void }
  candidate.dispose?.()
}

export default function ProCharacterScene({ config, paused = false }: ProCharacterSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  // Keeps the character facing the same way when a color or accessory changes.
  const rotationRef = useRef(0.28)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let cancelled = false
    let animationFrame = 0
    let cleanupScene: (() => void) | undefined

    async function createScene() {
      const THREE = await import('three')
      if (cancelled || !mount) return

      const scene = new THREE.Scene()

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
      // Frames the whole figure and its platform, from the halo down to the floor.
      const cameraDistance = 8.6
      camera.position.set(0, 0.45, cameraDistance)
      camera.lookAt(0, -0.2, 0)

      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        })
      } catch {
        setStatus('unavailable')
        return
      }
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      renderer.setClearColor(0x121214, 0)
      renderer.domElement.className = 'absolute inset-0 h-full w-full cursor-grab touch-pan-y active:cursor-grabbing'
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D cinema character. Drag to rotate.')
      renderer.domElement.setAttribute('role', 'img')
      mount.appendChild(renderer.domElement)

      const accent = new THREE.Color(config.accent)
      const suit = new THREE.Color(config.suit)
      const skin = new THREE.Color(config.skin)

      // A simple studio setup: warm key, soft fill, and a rim in the viewer's color.
      scene.add(new THREE.HemisphereLight(0xfff4ea, 0x1c1c20, 2.1))
      const keyLight = new THREE.DirectionalLight(0xfff1e4, 3.2)
      keyLight.position.set(3.5, 5.5, 4)
      scene.add(keyLight)
      const rimLight = new THREE.PointLight(accent, 9, 12, 2)
      rimLight.position.set(-3.6, 2.2, -1.4)
      scene.add(rimLight)

      const world = new THREE.Group()
      world.position.y = -0.62
      scene.add(world)

      const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x26262b,
        metalness: 0.1,
        roughness: 0.82,
      })
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.48, 0.12, 72), platformMaterial)
      platform.position.y = -1.68
      world.add(platform)

      const ringMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55 })
      const platformRing = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.01, 10, 96), ringMaterial)
      platformRing.rotation.x = Math.PI / 2
      platformRing.position.y = -1.615
      world.add(platformRing)

      const character = new THREE.Group()
      character.rotation.y = rotationRef.current
      world.add(character)

      const skinMaterial = new THREE.MeshPhysicalMaterial({
        color: skin,
        roughness: 0.56,
        clearcoat: config.silhouette === 'cosmic' ? 0.52 : 0.12,
        clearcoatRoughness: 0.55,
      })
      const suitMaterial = new THREE.MeshPhysicalMaterial({
        color: suit,
        roughness: 0.66,
        metalness: config.silhouette === 'cosmic' ? 0.34 : 0.04,
        clearcoat: 0.06,
      })
      const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, metalness: 0.02, roughness: 0.74 })
      const accentMaterial = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.55,
        metalness: 0.2,
        roughness: 0.36,
      })

      const hip = new THREE.Mesh(new THREE.SphereGeometry(0.55, 36, 24), suitMaterial)
      hip.scale.set(1, 0.62, 0.72)
      hip.position.y = -0.31
      character.add(hip)

      const shoulderWidth = config.silhouette === 'classic' ? 0.92 : config.silhouette === 'cosmic' ? 1.03 : 0.82
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.42, 1.35, config.silhouette === 'cosmic' ? 8 : 32),
        suitMaterial,
      )
      torso.scale.x = shoulderWidth
      torso.position.y = 0.48
      character.add(torso)

      const chestLight = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), accentMaterial)
      chestLight.position.set(0, 0.64, 0.5)
      chestLight.rotation.z = Math.PI / 4
      character.add(chestLight)

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.28, 28), skinMaterial)
      neck.position.y = 1.26
      character.add(neck)

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 32), skinMaterial)
      head.scale.set(config.silhouette === 'sleek' ? 0.88 : 0.96, 1.08, 0.9)
      head.position.y = 1.74
      character.add(head)

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.512, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.46), darkMaterial)
      hair.scale.copy(head.scale)
      hair.position.y = 1.77
      character.add(hair)

      const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x17171a })
      // A visor covers the eyes, so they are only built when they can be seen.
      for (const side of config.accessory === 'visor' ? [] : [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 12), eyeMaterial)
        eye.scale.set(1.25, 0.72, 0.45)
        eye.position.set(side * 0.18, 1.8, 0.445)
        character.add(eye)
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), pupilMaterial)
        pupil.position.set(side * 0.18, 1.8, 0.487)
        character.add(pupil)
      }

      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 8, 24, Math.PI), darkMaterial)
      mouth.position.set(0, 1.58, 0.465)
      mouth.rotation.z = Math.PI
      character.add(mouth)

      const limbRadius = config.silhouette === 'cosmic' ? 0.18 : 0.15
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(limbRadius, 0.82, 8, 18), suitMaterial)
        arm.position.set(side * shoulderWidth * 0.59, 0.38, 0)
        arm.rotation.z = side * -0.13
        character.add(arm)
        const hand = new THREE.Mesh(new THREE.SphereGeometry(limbRadius * 1.04, 20, 14), skinMaterial)
        hand.position.set(side * shoulderWidth * 0.69, -0.18, 0.02)
        character.add(hand)

        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.92, 8, 18), darkMaterial)
        leg.position.set(side * 0.27, -1.08, 0)
        character.add(leg)
      }

      if (config.accessory === 'visor') {
        // A curved band that wraps the front of the head.
        const visor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.2, 40, 1, true, -1.25, 2.5),
          new THREE.MeshStandardMaterial({
            color: accent,
            emissive: accent,
            emissiveIntensity: 0.32,
            roughness: 0.3,
            side: THREE.DoubleSide,
          }),
        )
        visor.scale.set(head.scale.x * 1.03, 1, head.scale.z * 1.05)
        visor.position.set(0, 1.81, 0)
        character.add(visor)
      }

      if (config.accessory === 'headphones') {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 12, 48, Math.PI), darkMaterial)
        band.position.y = 1.82
        band.rotation.z = Math.PI / 2
        character.add(band)
        for (const side of [-1, 1]) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), accentMaterial)
          cup.position.set(side * 0.48, 1.77, 0)
          cup.rotation.z = Math.PI / 2
          character.add(cup)
        }
      }

      if (config.accessory === 'halo') {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 12, 64), accentMaterial)
        halo.position.y = 2.48
        halo.rotation.x = Math.PI / 2
        character.add(halo)
      }

      let targetRotationY = rotationRef.current
      let targetRotationX = 0
      let dragging = false
      let lastX = 0
      let lastY = 0
      let onScreen = true

      const onPointerDown = (event: PointerEvent) => {
        dragging = true
        lastX = event.clientX
        lastY = event.clientY
        renderer.domElement.setPointerCapture(event.pointerId)
      }
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return
        targetRotationY += (event.clientX - lastX) * 0.012
        targetRotationX = THREE.MathUtils.clamp(targetRotationX + (event.clientY - lastY) * 0.004, -0.18, 0.18)
        lastX = event.clientX
        lastY = event.clientY
      }
      const onPointerUp = () => { dragging = false }
      renderer.domElement.addEventListener('pointerdown', onPointerDown)
      renderer.domElement.addEventListener('pointermove', onPointerMove)
      renderer.domElement.addEventListener('pointerup', onPointerUp)
      renderer.domElement.addEventListener('pointercancel', onPointerUp)

      const resize = () => {
        const width = Math.max(1, mount.clientWidth)
        const height = Math.max(1, mount.clientHeight)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.position.z = cameraDistance * Math.max(1, 0.92 / camera.aspect)
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(mount)
      resize()

      const timer = new THREE.Timer()
      timer.connect(document)
      const animate = () => {
        animationFrame = 0
        if (!onScreen) return
        timer.update()
        const elapsed = timer.getElapsed()
        const still = pausedRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
        character.rotation.y += (targetRotationY - character.rotation.y) * 0.07
        character.rotation.x += (targetRotationX - character.rotation.x) * 0.07
        rotationRef.current = targetRotationY
        if (!dragging && !still) targetRotationY += config.energy === 'orbit' ? 0.0028 : 0.0008

        const floatStrength = config.energy === 'calm' ? 0.015 : config.energy === 'pulse' ? 0.045 : 0.028
        const floatTarget = still ? 0 : Math.sin(elapsed * 1.45) * floatStrength
        character.position.y += (floatTarget - character.position.y) * 0.12
        chestLight.scale.setScalar(config.energy === 'pulse' && !still ? 1 + Math.sin(elapsed * 4.5) * 0.14 : 1)
        renderer.render(scene, camera)
        animationFrame = window.requestAnimationFrame(animate)
      }

      // Rendering stops entirely while the stage is scrolled out of view.
      const visibility = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
        if (onScreen && !animationFrame) animate()
      })
      visibility.observe(mount)

      animate()
      setStatus('ready')

      cleanupScene = () => {
        observer.disconnect()
        visibility.disconnect()
        timer.dispose()
        window.cancelAnimationFrame(animationFrame)
        renderer.domElement.removeEventListener('pointerdown', onPointerDown)
        renderer.domElement.removeEventListener('pointermove', onPointerMove)
        renderer.domElement.removeEventListener('pointerup', onPointerUp)
        renderer.domElement.removeEventListener('pointercancel', onPointerUp)
        scene.traverse(object => {
          const mesh = object as {
            geometry?: { dispose?: () => void }
            material?: unknown | unknown[]
          }
          mesh.geometry?.dispose?.()
          if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial)
          else if (mesh.material) disposeMaterial(mesh.material)
        })
        renderer.dispose()
        renderer.domElement.remove()
      }
    }

    void createScene()
    return () => {
      cancelled = true
      cleanupScene?.()
    }
  }, [config])

  return (
    <div ref={mountRef} className="absolute inset-0" data-testid="pro-character-scene">
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-ns-muted">
          {status === 'loading' ? 'Loading your character…' : '3D preview is not available on this device. Your choices still save.'}
        </div>
      )}
    </div>
  )
}
