'use client'

import { useEffect } from 'react'

const HIDDEN = { opacity: 0, transform: 'translateY(10px)' }
const SHOWN = { opacity: 1, transform: 'none' }
const ENTER_MS = 420
const STAGGER_MS = 40
const MAX_DELAY_MS = 240
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

/**
 * Plays `.ns-reveal` once for content that starts below the fold, and stops
 * decorative loops while they are off-screen.
 *
 * It uses the Web Animations API and only writes attributes to <html>, so it
 * never changes server-rendered elements that React has yet to hydrate.
 * Anything already in view is left alone and never waits on an animation.
 */
export default function MotionRuntime() {
  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.motion !== 'on') return

    const seen = new WeakSet<Element>()
    const held = new Map<Element, Animation>()

    const release = (element: Element, animate: boolean) => {
      const hold = held.get(element)
      if (!hold) return
      held.delete(element)
      reveals.unobserve(element)
      if (animate) {
        const order = Number.parseFloat(getComputedStyle(element).getPropertyValue('--i')) || 0
        element.animate([HIDDEN, SHOWN], {
          duration: ENTER_MS,
          delay: Math.min(order * STAGGER_MS, MAX_DELAY_MS),
          easing: EASE,
          fill: 'backwards',
        })
      }
      hold.cancel()
    }

    const releaseAll = () => {
      Array.from(held.keys()).forEach(element => release(element, false))
    }

    const reveals = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) release(entry.target, true)
      }
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.04 })

    const loops = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const attribute = entry.target.matches('.ns-marquee') ? 'data-marquee-offscreen' : 'data-glow-offscreen'
        root.toggleAttribute(attribute, !entry.isIntersecting)
      }
    })

    const prepareReveal = (element: Element) => {
      if (seen.has(element)) return
      seen.add(element)
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return
      held.set(element, element.animate([HIDDEN, HIDDEN], { duration: 1, fill: 'forwards' }))
      reveals.observe(element)
    }

    const prepareWithin = (parent: ParentNode) => {
      parent.querySelectorAll('.ns-reveal').forEach(prepareReveal)
      parent.querySelectorAll('.ns-marquee, .ns-hero-glow').forEach(element => loops.observe(element))
    }

    prepareWithin(document)

    const mutations = new MutationObserver(records => {
      let removed = false
      for (const record of records) {
        removed ||= record.removedNodes.length > 0
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return
          if (node.matches('.ns-reveal')) prepareReveal(node)
          if (node.matches('.ns-marquee, .ns-hero-glow')) loops.observe(node)
          prepareWithin(node)
        })
      }
      if (removed) {
        Array.from(held.keys()).forEach(element => {
          if (!element.isConnected) release(element, false)
        })
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('beforeprint', releaseAll)

    return () => {
      window.removeEventListener('beforeprint', releaseAll)
      mutations.disconnect()
      releaseAll()
      reveals.disconnect()
      loops.disconnect()
      root.removeAttribute('data-marquee-offscreen')
      root.removeAttribute('data-glow-offscreen')
    }
  }, [])

  return null
}
