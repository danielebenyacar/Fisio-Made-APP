import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarIcon, MoreIcon, PlusIcon, UsersIcon } from '../components/icons'

type Item = { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }

function NavItem({ to, label, Icon }: Item) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-16 flex-col items-center justify-center gap-0.5 text-base ${
          isActive ? 'font-semibold text-brand-900' : 'text-brand-500'
        }`
      }
    >
      <Icon />
      {label}
    </NavLink>
  )
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 items-center">
        <NavItem to="/" label="Oggi" Icon={CalendarIcon} />
        <NavItem to="/clienti" label="Clienti" Icon={UsersIcon} />
        <NavLink
          to="/segna-lezione"
          aria-label="Segna lezione"
          className="flex min-h-16 items-center justify-center"
        >
          {({ isActive }) => (
            <span
              className={`flex size-14 items-center justify-center rounded-full text-white shadow-md ${
                isActive ? 'bg-brand-900' : 'bg-brand-800'
              }`}
            >
              <PlusIcon width={30} height={30} strokeWidth={2.5} />
            </span>
          )}
        </NavLink>
        <NavItem to="/altro" label="Altro" Icon={MoreIcon} />
      </div>
    </nav>
  )
}
