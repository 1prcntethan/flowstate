import styles from './NavBarBottom.module.css'

export default function NavBarBottom() {
  return (
    <nav className={styles.nav}>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Leaderboard</span>
        </div>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Collection</span>
        </div>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Home</span>
        </div>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>History</span>
        </div>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Settings</span>
        </div>
    </nav>
  )
}