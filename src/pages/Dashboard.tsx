import NavBarTop from "../components/NavBarTop";
import NavBarBottom from "../components/NavBarBottom";
import styles from "./Dashboard.module.css";
import type { Page } from "../App";
import DashboardStatCard from "../components/DashboardStatCard";

type Props = { nav: (p: Page) => void };

export default function Dashboard({ nav }: Props) {
  return (
    <div className={styles.page}>
      <NavBarTop currentCoins={100} streak={5} userName={"Alexis Ma"} />
      <NavBarBottom />
      <div className={styles.dashboardContent}>
        <button
          className={styles.startSessionButton}
          onClick={() => nav("presession")}
        >
          Start session
        </button>
        <div className={styles.dashboardCards}>
          <DashboardStatCard statName="Focus Percentage" statValue="98%" />
          <DashboardStatCard statName="Hours Studied Today" statValue="4 hrs" />
          <DashboardStatCard
            statName="Today's Earnings"
            statValue="+200 coins"
          />
        </div>
        <div className={styles.monthlyHeatmap}>Monthly Heatmap</div>
        <div className={styles.recentSessions}>
          <span>Recent Sessions</span>
          <div className={styles.sessionItem}>Session 1</div>
          <div className={styles.sessionItem}>Session 2</div>
        </div>
        <div className={styles.socials}>
          <div className={styles.weeklyLeaderboard}>
            <span>Weekly Leaderboard</span>
            <div className={styles.leaderboardList}>
              <ol>
                <li>Friend 1</li>
                <li>Friend 2</li>
                <li>Friend 3</li>
              </ol>
            </div>
          </div>
          <div className={styles.gacha}>Gacha</div>
        </div>
      </div>
    </div>
  );
}
