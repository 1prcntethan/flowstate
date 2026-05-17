type Props = { nav: (p: string) => void }

export default function Dashboard({ nav }: Props) {
  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => nav('presession')}>Start session</button>
    </div>
  )
}