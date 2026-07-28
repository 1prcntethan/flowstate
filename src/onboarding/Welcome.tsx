import styles from './Welcome.module.css'

type Props = { onNext: () => void }

export default function Welcome({ onNext }: Props) {
  return (
    <div className="page">
      <div className={styles.container}>
        <img src="/logo512.svg" className={styles.logo} alt="" />
        <h1 className={styles.title}>Welcome to Flowstate</h1>
        <p className={styles.subtitle}>A focus companion that keeps everything on your device.</p>

        <ul className={styles.bullets}>
          <li><span className={styles.dot} />We read your screen to check what you're studying — then forget it.</li>
          <li><span className={styles.dot} />Screenshots are never saved. Only a focus label leaves your device.</li>
          <li><span className={styles.dot} />You can pause tracking any time during a session.</li>
        </ul>

        <button className={styles.continueBtn} onClick={onNext}>Continue</button>
      </div>
    </div>
  )
}