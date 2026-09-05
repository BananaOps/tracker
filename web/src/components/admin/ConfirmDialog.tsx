import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', destructive = false, pending = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="max-w-md">
        <DialogHeader>
          <DialogTitle><span id="confirm-dialog-title">{title}</span></DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-hud-on-surface-var">{message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={pending}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
