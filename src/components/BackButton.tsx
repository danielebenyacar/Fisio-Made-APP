import { ChevronLeftIcon } from './icons'

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 mb-2 flex min-h-12 items-center gap-1 px-2 font-semibold text-brand-700"
    >
      <ChevronLeftIcon />
      {label}
    </button>
  )
}
