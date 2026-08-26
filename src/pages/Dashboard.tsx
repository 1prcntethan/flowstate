import NavBarTop from "../components/NavBarTop";
import NavBarBottom from "../components/NavBarBottom";
import styles from "./Dashboard.module.css";
import type { Page } from "../App";
import type { User } from "../types";
import DashboardStatCard from "../components/DashboardStatCard";
import { useEffect, useState } from "react";
import { SessionItem } from "../components/SessionItem";
import type { Session } from "../types"

type Props = {
  nav: (p: Page) => void;
  user: User;
};

function useRecentSessions(userId: string, limit = 5) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await window.electronAPI.getRecentSessions(userId, limit);
      if (!cancelled) setSessions(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  return sessions;
}

function useTodayStats(userId: string) {
  const [stats, setStats] = useState({
    focusPercentage: 0,
    hoursStudied: 0,
    coinsEarned: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessions = await window.electronAPI.getTodaySessions(userId);
      if (cancelled) return;

      const totalMinutes = sessions.reduce(
        (sum: number, s: any) => sum + (s.durationMinutes ?? 0),
        0,
      );
      const weightedFocusSum = sessions.reduce(
        (sum: number, s: any) =>
          sum + (s.focusScore ?? 0) * (s.durationMinutes ?? 0),
        0,
      );
      const coinsEarned = sessions.reduce(
        (sum: number, s: any) => sum + (s.pointsEarned ?? 0),
        0,
      );

      setStats({
        focusPercentage:
          totalMinutes > 0 ? Math.round(weightedFocusSum / totalMinutes) : 0,
        hoursStudied: totalMinutes / 60,
        coinsEarned,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return stats;
}

export default function Dashboard({ nav, user }: Props) {
  const { focusPercentage, hoursStudied, coinsEarned } = useTodayStats(
    user.id,
  );
  const recentSessions = useRecentSessions(user.id, 5);

  return (
    <div className="page">
      <NavBarTop
        currentCoins={user.coins}
        streak={user.streak}
        userName={user.name}
      />
      <NavBarBottom nav={nav} />
      <div className={styles.dashboardContent}>
        <button
          className={styles.startSessionButton}
          onClick={() => nav("presession")}
        >
          Start session
        </button>
        <div className={styles.dashboardCards}>
          <DashboardStatCard
            statName="Today's Focus Percentage"
            statValue={`${focusPercentage}%`}
          />
          <DashboardStatCard
            statName="Hours Studied Today"
            statValue={`${hoursStudied.toFixed(1)} hrs`}
          />
          <DashboardStatCard
            statName="Today's Earnings"
            statValue={`+${coinsEarned} coins`}
          />
        </div>
        <div className={styles.monthlyHeatmap}>Monthly Heatmap</div>
        <div className={styles.recentSessions}>
          <span>Recent Sessions</span>
          {recentSessions.length === 0 ? (
            <div className={styles.emptyState}>
              No sessions yet — start one to see it here.
            </div>
          ) : (
            recentSessions.map((s) => (
              <SessionItem key={s.sessionId} session={s} />
            ))
          )}
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
