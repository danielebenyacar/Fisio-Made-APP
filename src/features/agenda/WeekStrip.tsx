import { addDays, format, isSameDay, max, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'
import { giorniSettimana } from '../../lib/agenda'
import { formatDateShort, formatDayHeading, toIsoDate } from '../../lib/dates'

type Props = {
  selected: Date
  now: Date
  onSelect: (day: Date) => void
  /** Days with something planned (YYYY-MM-DD): they get a dot. */
  marked?: Set<string>
  /** Days before today can't be chosen (booking a new appointment). */
  fromToday?: boolean
}

/** One week (Monday–Sunday) with tappable days and arrows to move by a week. */
export function WeekStrip({ selected, now, onSelect, marked, fromToday = false }: Props) {
  const week = giorniSettimana(selected)
  const selectedIso = toIsoDate(selected)
  const today = startOfDay(now)
  const isPast = (day: Date) => fromToday && day < today
  const prevDisabled = fromToday && week[0] <= today

  const arrow = 'flex min-h-12 min-w-12 items-center justify-center rounded-xl text-brand-700 active:bg-brand-100'

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelect(fromToday ? max([addDays(selected, -7), today]) : addDays(selected, -7))}
          aria-label="Settimana prima"
          disabled={prevDisabled}
          className={`${arrow} disabled:opacity-30`}
        >
          <ChevronLeftIcon />
        </button>
        <p className="font-semibold">
          {formatDateShort(toIsoDate(week[0]))} – {formatDateShort(toIsoDate(week[6]))}
        </p>
        <button type="button" onClick={() => onSelect(addDays(selected, 7))} aria-label="Settimana dopo" className={arrow}>
          <ChevronRightIcon />
        </button>
      </div>

      <div role="group" aria-label="Giorni della settimana" className="mt-1 grid grid-cols-7 gap-1">
        {week.map((day) => {
          const iso = toIsoDate(day)
          const isSelected = iso === selectedIso
          const isToday = isSameDay(day, now)
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSelected}
              aria-label={formatDayHeading(day)}
              disabled={isPast(day) && !isSelected}
              onClick={() => onSelect(day)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl leading-tight disabled:opacity-35 ${
                isSelected ? 'bg-brand-800 text-white' : isToday ? 'bg-white font-bold ring-2 ring-brand-800' : 'bg-white'
              }`}
            >
              <span className="text-sm uppercase">{format(day, 'EEEEE', { locale: it })}</span>
              <span className="text-lg font-semibold">{format(day, 'd')}</span>
              <span
                className={`mt-0.5 size-1.5 rounded-full ${marked?.has(iso) ? (isSelected ? 'bg-white' : 'bg-brand-500') : ''}`}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
