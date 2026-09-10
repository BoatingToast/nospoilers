import { useEffect, useRef, type ReactNode } from 'react'
import LabIcon from './LabIcon'
import styles from './lab.module.css'

export default function LabDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => { dialog?.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className={styles.dialog} aria-labelledby="lab-dialog-title" onCancel={event => { event.preventDefault(); onClose() }}><div className={styles.dialogHeading}><h2 id="lab-dialog-title">{title}</h2><button className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><LabIcon name="close" /></button></div>{children}</dialog>
}
