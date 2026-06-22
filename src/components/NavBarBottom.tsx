import styles from './NavBarBottom.module.css'
import type { Page } from '../App'

type Props = {
  nav: (p: Page) => void;
};

export default function NavBarBottom({ nav }: Props) {
  return (
    <nav className={styles.nav}>
        <div className={styles.item} onClick={() => {/* nav("leaderboard") once it exists */}}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Leaderboard</span>
        </div>
        <div className={styles.item} onClick={() => {/* nav("collection") once it exists */}}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Collection</span>
        </div>
        {/* <div className={styles.item} onClick={() => nav("dashboard")}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Home</span>
        </div> */}
        <div className={styles.item} onClick={() => {/* nav("history") once it exists */}}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>History</span>
        </div>
        <div className={styles.item} onClick={() => nav("settings")}>
            <img src="/NavIconPlaceholder.png" alt="Nav icon" />
            <span>Settings</span>
        </div> 
    </nav>
  )
}