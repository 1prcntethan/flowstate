import styles from './NavBar.module.css'

type Props = {
  currentCoins: number
  streak: number
}

export default function NavBar({ currentCoins, streak }: Props) {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>focusapp</span>
      <div className={styles.right}>
        <span>{streak} day streak</span>
        <span>{currentCoins} coins</span>
      </div>
    </nav>
  )
}