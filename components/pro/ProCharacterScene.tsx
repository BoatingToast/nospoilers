'use client'

import { useEffect, useRef } from 'react'

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
}

function disposeMaterial(material: unknown) {
  const candidate = material as { dispose?: () => void }
  candidate.dispose?.()
}

export default function ProCharacterScene({ config }: ProCharacterSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)

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
      scene.fog = new THREE.FogExp2(0x050814, 0.085)

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
      camera.position.set(0, 1.1, 6.8)
      camera.lookAt(0, 0.85, 0)

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.18
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      renderer.setClearColor(0x050814, 0)
      renderer.domElement.className = 'absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing'
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D cinema character. Drag to rotate.')
      renderer.domElement.setAttribute('role', 'img')
      mount.appendChild(renderer.domElement)

      const accent = new THREE.Color(config.accent)
      const suit = new THREE.Color(config.suit)
      const skin = new THREE.Color(config.skin)

      scene.add(new THREE.HemisphereLight(0xc4b5fd, 0x071022, 2.6))
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.6)
      keyLight.position.set(3.5, 5.5, 4)
      scene.add(keyLight)
      const rimLight = new THREE.PointLight(accent, 18, 12, 2)
      rimLight.position.set(-3.6, 2.2, -1.4)
      scene.add(rimLight)
      const lowLight = new THREE.PointLight(0x13d9c4, 10, 9, 2)
      lowLight.position.set(2.7, -1.2, 2.4)
      scene.add(lowLight)

      const world = new THREE.Group()
      world.position.y = -0.62
      scene.add(world)

      const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x0c1230,
        metalness: 0.86,
        roughness: 0.2,
      })
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.28, 0.18, 64), platformMaterial)
      platform.position.y = -1.7
      world.add(platform)

      const ringMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72 })
      const platformRing = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.025, 12, 96), ringMaterial)
      platformRing.rotation.x = Math.PI / 2
      platformRing.position.y = -1.59
      world.add(platformRing)

      const character = new THREE.Group()
      world.add(character)

      const skinMaterial = new THREE.MeshPhysicalMaterial({
        color: skin,
        roughness: 0.56,
        clearcoat: config.silhouette === 'cosmic' ? 0.52 : 0.12,
        clearcoatRoughness: 0.55,
      })
      const suitMaterial = new THREE.MeshPhysicalMaterial({
        color: suit,
        roughness: 0.28,
        metalness: config.silhouette === 'cosmic' ? 0.62 : 0.3,
        clearcoat: 0.48,
      })
      const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x070a18, metalness: 0.7, roughness: 0.26 })
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 2.4,
        metalness: 0.32,
        roughness: 0.22,
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

      const chestLight = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glowMaterial)
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
      const pupilMaterial = new THREE.MeshBasicMaterial({ color: accent })
      for (const side of [-1, 1]) {
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

      let accessoryMotion: { rotation: { z: number } } | undefined
      if (config.accessory === 'visor') {
        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.83, 0.2, 0.08),
          new THREE.MeshPhysicalMaterial({
            color: accent,
            emissive: accent,
            emissiveIntensity: 1.6,
            transparent: true,
            opacity: 0.72,
            transmission: 0.25,
            roughness: 0.08,
          }),
        )
        visor.position.set(0, 1.81, 0.49)
        character.add(visor)
        accessoryMotion = visor
      }

      if (config.accessory === 'headphones') {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 12, 48, Math.PI), darkMaterial)
        band.position.y = 1.82
        band.rotation.z = Math.PI / 2
        character.add(band)
        for (const side of [-1, 1]) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), glowMaterial)
          cup.position.set(side * 0.48, 1.77, 0)
          cup.rotation.z = Math.PI / 2
          character.add(cup)
        }
        accessoryMotion = band
      }

      if (config.accessory === 'halo') {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 12, 64), glowMaterial)
        halo.position.y = 2.48
        halo.rotation.x = Math.PI / 2
        character.add(halo)
        accessoryMotion = halo
      }

      const orbitGroup = new THREE.Group()
      world.add(orbitGroup)
      for (let index = 0; index < 3; index += 1) {
        const orbit = new THREE.Mesh(
          new THREE.TorusGeometry(1.25 + index * 0.32, 0.008 + index * 0.003, 8, 96),
          new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.24 - index * 0.045 }),
        )
        orbit.rotation.set(Math.PI / (2.6 + index * 0.18), index * 0.65, index * 0.82)
        orbit.position.y = 0.5
        orbitGroup.add(orbit)
      }

      const particleCount = 260
      const particlePositions = new Float32Array(particleCount * 3)
      for (let index = 0; index < particleCount; index += 1) {
        const radius = 2.4 + Math.random() * 4.6
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
        particlePositions[index * 3 + 1] = radius * Math.cos(phi) + 0.7
        particlePositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      }
      const particleGeometry = new THREE.BufferGeometry()
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({ color: accent, size: 0.025, transparent: true, opacity: 0.58 }),
      )
      scene.add(particles)

      let targetRotationY = 0.28
      let targetRotationX = 0
      let dragging = false
      let lastX = 0
      let lastY = 0

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
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(mount)
      resize()

      const timer = new THREE.Timer()
      timer.connect(document)
      const animate = () => {
        timer.update()
        const elapsed = timer.getElapsed()
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        character.rotation.y += (targetRotationY - character.rotation.y) * 0.07
        character.rotation.x += (targetRotationX - character.rotation.x) * 0.07
        if (!dragging && !reducedMotion) targetRotationY += config.energy === 'orbit' ? 0.0028 : 0.0008

        const floatStrength = config.energy === 'calm' ? 0.015 : config.energy === 'pulse' ? 0.045 : 0.028
        character.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.45) * floatStrength
        orbitGroup.rotation.y = reducedMotion ? 0 : elapsed * (config.energy === 'orbit' ? 0.23 : 0.09)
        particles.rotation.y = reducedMotion ? 0 : elapsed * 0.012
        platformRing.scale.setScalar(config.energy === 'pulse' && !reducedMotion ? 1 + Math.sin(elapsed * 2.8) * 0.025 : 1)
        if (accessoryMotion && config.accessory === 'halo' && !reducedMotion) accessoryMotion.rotation.z = elapsed * 0.7
        chestLight.scale.setScalar(config.energy === 'pulse' && !reducedMotion ? 1 + Math.sin(elapsed * 4.5) * 0.14 : 1)
        renderer.render(scene, camera)
        animationFrame = window.requestAnimationFrame(animate)
      }
      animate()

      cleanupScene = () => {
        observer.disconnect()
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
    <div ref={mountRef} className="relative h-full min-h-[470px] w-full" data-testid="pro-character-scene">
      <div className="pointer-events-none absolute inset-0 grid min-h-[470px] place-items-center text-[10px] uppercase tracking-[0.2em] text-ns-muted">
        Initializing 3D identity…
      </div>
    </div>
  )
}
