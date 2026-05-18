import styles from './NavBarTop.module.css'

type Props = {
  currentCoins: number
  streak: number
  userName: string
}

export default function NavBarTop({ currentCoins, streak, userName }: Props) {
  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <span>{streak} day streak</span>
        <span className={styles.ssDivider}></span>
        <span>{currentCoins} coins</span>
      </div>
      <div className={styles.right}>
        <img src="/PfpPlaceholder.png" alt="Profile picture" />
        <span>{userName}</span>
      </div>
    </nav>
  )
}