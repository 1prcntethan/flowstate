import styles from './NavBarTop.module.css'

export default function NavBarBottom() {
  return (
    <nav className={styles.nav}>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Home</span>
        </div>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Home</span>
        </div>
        <div className={styles.item}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Home</span>
        </div>
    </nav>
  )
}