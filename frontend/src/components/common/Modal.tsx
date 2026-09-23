import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

// Centered dialog on tablet/desktop; slides up as a bottom sheet on phones (< sm)
// so form controls sit within thumb reach and the on-screen keyboard doesn't hide them.
export function Modal({ title, onClose, children, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Stop the page behind the sheet from scrolling on touch devices
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const widthClass = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white shadow-xl w-full ${widthClass} rounded-t-2xl sm:rounded-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col animate-sheet-up sm:animate-none`}
      >
        {/* Grab handle — visual cue that this is a sheet on phones */}
        <div className="sm:hidden flex justify-center pt-2">
          <span className="block h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-10 h-10 -mr-2 flex items-center justify-center"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 pb-safe">{children}</div>
      </div>
    </div>
  )
}
