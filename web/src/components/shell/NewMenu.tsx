import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useCreatePanel } from '../../contexts/createPanel'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Kbd } from '../ui/kbd'
import { CREATE_ACTIONS } from './create-actions'

/** The single New button of the top bar, with its menu: event, lock, drift, service, RPA. */
export function NewMenu() {
  const { open } = useCreatePanel()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="primary" iconRight="chevron-down">
          New
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[220px] overflow-hidden rounded-lg border border-rule bg-overlay py-1.5 text-ink shadow-overlay motion-safe:animate-palette-in"
        >
          {CREATE_ACTIONS.map((action) => (
            <DropdownMenu.Item
              key={action.panel}
              onSelect={() => open(action.panel)}
              className="group/item flex cursor-pointer items-center gap-2.5 px-space-4 py-2 text-[14px] outline-hidden data-highlighted:bg-signature-wash"
            >
              <Icon name={action.icon} className="text-muted group-data-highlighted/item:text-ink" />
              <span className="flex-1">{action.label.replace('New ', '')}</span>
              <Kbd>{action.kbd}</Kbd>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
