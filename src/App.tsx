import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import PreSession from './pages/PreSession'
// import ActiveSession from './pages/ActiveSession'
// import SessionEnd from './pages/SessionEnd'

export type Page = 'dashboard' | 'presession' | 'session' | 'sessionend'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  const nav = (p: Page) => setPage(p)

  if (page === 'dashboard')   return <Dashboard   nav={nav} />
  if (page === 'presession')  return <PreSession  nav={nav} />
  // if (page === 'session')     return <ActiveSession nav={nav} />
  // if (page === 'sessionend')  return <SessionEnd  nav={nav} />
}