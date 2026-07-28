import { useState } from 'react'
import Welcome from './Welcome'
import Auth from './Auth'
import ProfileSetup from './ProfileSetup'
import { useAuth } from '../auth/AuthContext'

type Step = 'welcome' | 'auth' | 'profile'

type Props = { startAt?: Step }

export default function Onboarding({ startAt = 'welcome' }: Props) {
  const [step, setStep] = useState<Step>(startAt)
  const { completeOnboarding } = useAuth()

  if (step === 'welcome') {
    return <Welcome onNext={() => setStep('auth')} />
  }

  if (step === 'auth') {
    return (
      <Auth
        onExistingAccount={async () => { await completeOnboarding() }}
        onNewAccount={() => setStep('profile')}
      />
    )
  }

  return (
    <ProfileSetup onFinish={async () => { await completeOnboarding() }} />
  )
}