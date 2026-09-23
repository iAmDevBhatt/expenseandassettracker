import { useEffect, useState } from 'react'

// Chrome/Edge/Samsung Internet fire `beforeinstallprompt` when the PWA is installable.
// It can fire before any component mounts, so capture it at module load.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(fn => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1))

export function useInstallPrompt() {
  const [, force] = useState(0)

  useEffect(() => {
    const fn = () => force(n => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  const promptInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    notify()
  }

  return {
    /** Browser offered a native install prompt (Android / desktop Chromium) */
    canInstall: deferred !== null,
    /** iOS Safari — install is manual via Share → Add to Home Screen */
    showIOSHint: isIOS() && !isStandalone(),
    isStandalone: isStandalone(),
    promptInstall,
  }
}
