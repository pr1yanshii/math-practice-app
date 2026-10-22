import { useAppData } from '../../app/appContext'
import type { StorageProblem } from '../../services/storageService'
import { Button } from './Button'

const MESSAGES: Record<StorageProblem, string> = {
  unavailable:
    'Your progress can’t be saved in this browser right now. You can keep practicing, but your answers won’t be remembered.',
  full: 'This browser’s storage is full, so your latest answers weren’t saved. You can keep practicing.',
  'newer-version':
    'Your saved progress came from a newer version of this app, so it won’t be changed here. You can keep practicing.',
  'migration-failed':
    'Your saved progress couldn’t be updated for this version of the app, so it won’t be changed. You can keep practicing.',
  'write-failed':
    'Something stopped your progress from being saved. You can keep practicing.',
}

export function StorageWarning() {
  const { storageProblem, dismissStorageProblem } = useAppData()
  if (!storageProblem) return null
  // role="alert" is announced by screen readers as soon as it appears.
  return (
    <div className="storage-warning" role="alert">
      <p>{MESSAGES[storageProblem]}</p>
      <Button variant="secondary" onClick={dismissStorageProblem}>
        OK
      </Button>
    </div>
  )
}
