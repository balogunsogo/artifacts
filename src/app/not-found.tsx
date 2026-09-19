import Link from "next/link";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p>404 / Archive gap</p>
      <h1>This artifact is not in the archive.</h1>
      <Link href="/">Return to the index →</Link>
    </main>
  );
}
