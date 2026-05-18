import type { Page } from '../App'

type Props = { nav: (p: Page) => void }

export default function PreSession({ nav }: Props) {
  return (
    <div>
      <h1>Pre-Session</h1>
      <button onClick={() => nav('dashboard')}>back to dashboard</button>
    </div>
  )
}