import styles from './EndConfirmModal.module.css'

type Props = {
  pointsEarned: number
  onConfirm: () => void
  onCancel: () => void
}

export default function EndConfirmModal({ pointsEarned, onConfirm, onCancel }: Props) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>End session early?</h2>
        <p className={styles.body}>
          You'll receive all{' '}
          <span className={styles.points}>+{pointsEarned} points</span>{' '}
          earned so far.
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>Keep going</button>
          <button className={styles.confirmBtn} onClick={onConfirm}>End session</button>
        </div>
      </div>
    </div>
  )
}