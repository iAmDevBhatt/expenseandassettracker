import { useEffect, useState } from 'react'

type Labels = Record<string, string>

let cache: Labels | null = null
const listeners: Array<(labels: Labels) => void> = []

async function loadLabels(): Promise<Labels> {
  if (cache) return cache
  const res = await fetch('/labels.properties')
  const text = await res.text()
  const parsed: Labels = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    parsed[line.slice(0, eq).trim()] = line.slice(eq + 1)
  }
  cache = parsed
  listeners.forEach((fn) => fn(parsed))
  return parsed
}

export function useLabels() {
  const [labels, setLabels] = useState<Labels>(cache ?? {})

  useEffect(() => {
    if (cache) {
      setLabels(cache)
      return
    }
    listeners.push(setLabels)
    loadLabels()
    return () => {
      const i = listeners.indexOf(setLabels)
      if (i !== -1) listeners.splice(i, 1)
    }
  }, [])

  // l(key, fallback?) — returns the label or the key itself if not found
  const l = (key: string, fallback?: string): string =>
    labels[key] ?? fallback ?? key

  return { l, labels }
}
