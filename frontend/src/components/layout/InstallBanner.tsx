import { useState } from 'react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { useLabels } from '../../hooks/useLabels'

const DISMISS_KEY = 'install-banner-dismissed'

const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

/** Suggests installing the app to the home screen. Hidden once installed or dismissed. */
export function InstallBanner() {
  const { canInstall, showIOSHint, isStandalone, promptInstall } = useInstallPrompt()
  const { l } = useLabels()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (isStandalone || dismissed || (!canInstall && !showIOSHint)) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode — just hide for this session */ }
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm text-primary-900">
      <img src="/icons/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-md" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{l('install.banner.title', 'Install Tracker on your phone')}</p>
        <p className="text-xs text-primary-800/80 mt-0.5">
          {canInstall
            ? l('install.banner.body', 'Opens full-screen from your home screen, like a regular app.')
            : l('install.banner.ios', 'Tap the Share button in Safari, then "Add to Home Screen".')}
        </p>
      </div>
      {canInstall && (
        <button onClick={promptInstall} className="btn-primary shrink-0 px-3 py-1.5">
          {l('install.button', 'Install')}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label={l('install.dismiss', 'Dismiss')}
        className="shrink-0 -mr-1 h-8 w-8 flex items-center justify-center text-primary-700 hover:text-primary-900 text-xl leading-none"
      >
        &times;
      </button>
    </div>
  )
}
