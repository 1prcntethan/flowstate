import styles from './DashboardStatCard.module.css'

type Props = {
  statName: string
  statValue: string
}

export default function DashboardStatCard({ statName, statValue }: Props) {
  return (
    <div className={styles.card}>
        <span>{statName}</span>
        <span className={styles.statValue}>{statValue}</span>
        <span className={styles.divider}></span>
        <div className={styles.viewDetails}>
            <span>View Details</span>
            <span>&gt;</span>
        </div>
    </div>
  )
}