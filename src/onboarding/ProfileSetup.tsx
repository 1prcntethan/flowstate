import { useState } from 'react'
import styles from './ProfileSetup.module.css'

const SUBJECTS = ['Math', 'Science', 'CS', 'English', 'History', 'Language']

type Props = { onFinish: () => void }

export default function ProfileSetup({ onFinish }: Props) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (s: string) =>
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  return (
    <div className="page">
      <div className={styles.container}>
        <h1 className={styles.title}>Set up your profile</h1>
        <input className={styles.input} type="text" placeholder="What should we call you?" value={name} onChange={e => setName(e.target.value)} />

        <p className={styles.label}>What are you studying?</p>
        <div className={styles.chips}>
          {SUBJECTS.map(s => (
            <button key={s} className={selected.includes(s) ? styles.chipActive : styles.chip} onClick={() => toggle(s)}>{s}</button>
          ))}
        </div>

        {/* TODO: persist name + selected subjects once DynamoDB is wired up */}
        <button className={styles.finishBtn} onClick={onFinish}>Start focusing →</button>
      </div>
    </div>
  )
}