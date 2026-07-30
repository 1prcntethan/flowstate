import styles from "./Welcome.module.css";

type Props = { onNext: () => void };

export default function Welcome({ onNext }: Props) {
  return (
    <div className="page">
      <div className={styles.container}>
        <img src="/logo512.svg" className={styles.logo} alt="" />
        <h1 className={styles.title}>Welcome to Flowstate</h1>
        <p className={styles.subtitle}>
          A focus companion that keeps everything on your device.
        </p>

        <div className={styles.bulletContainer}>
          <span className={styles.bulletCaption}>WHAT WE SEE</span>
          <div className={styles.captionsContainer}>
            <ul className={styles.bullets}>
              <li>
                <span className={styles.greenDot} />
                Placeholder
              </li>
              <li>
                <span className={styles.greenDot} />
                Placeholder
              </li>
              <li>
                <span className={styles.greenDot} />
                Placeholder
              </li>
            </ul>
            <ul className={styles.bullets}>
              <li>
                <span className={styles.redDot} />
                Placeholder
              </li>
              <li>
                <span className={styles.redDot} />
                Placeholder
              </li>
              <li>
                <span className={styles.redDot} />
                Placeholder
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button className={styles.privacyBtn}>Read privacy policy</button>
          <button className={styles.continueBtn} onClick={onNext}>
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}
