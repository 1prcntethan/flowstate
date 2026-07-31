import { useState } from 'react'
import Welcome from './Welcome'
import Auth from './Auth'
import Permissions from './Permissions'
import ProfileSetup from './ProfileSetup'
import { useAuth } from '../auth/AuthContext'

type Step = 'welcome' | 'auth' | 'permissions' | 'profile'

type Props = { startAt?: Step }

const isDev = import.meta.env.DEV

export default function Onboarding({ startAt = 'welcome' }: Props) {
  const [step, setStep] = useState<Step>(startAt)
  const [cameFromSignup, setCameFromSignup] = useState(false)
  const [devForcePermissions, setDevForcePermissions] = useState(false)
  const { completeOnboarding } = useAuth()

  const goToDashboard = async () => { await completeOnboarding() }

  const afterPermissions = () => {
    if (cameFromSignup) setStep('profile')
    else goToDashboard()
  }

  return (
    <>
      {step === 'welcome' && <Welcome onNext={() => setStep('auth')} />}

      {step === 'auth' && (
        <Auth
          onExistingAccount={() => { setCameFromSignup(false); setStep('permissions') }}
          onNewAccount={() => { setCameFromSignup(true); setStep('permissions') }}
        />
      )}

      {step === 'permissions' && (
        <PermissionsGate force={devForcePermissions} onNext={afterPermissions} />
      )}

      {step === 'profile' && <ProfileSetup onFinish={goToDashboard} />}

      {isDev && (
        <button
          onClick={() => setDevForcePermissions((v) => !v)}
          style={{
            position: 'fixed', bottom: 12, right: 12, zIndex: 999,
            fontSize: 11, padding: '6px 10px', borderRadius: 8,
            background: '#222', color: '#fff', border: '1px solid #444',
            cursor: 'pointer', opacity: 0.7,
          }}
        >
          Dev: force permissions {devForcePermissions ? 'ON' : 'OFF'}
        </button>
      )}
    </>
  )
}

function PermissionsGate({ force, onNext }: { force: boolean; onNext: () => void }) {
  const [platform, setPlatform] = useState<string | null>(null)

  useState(() => {
    window.electronAPI.getPlatform().then(setPlatform)
  })

  if (platform === null) return null
  if (platform !== 'darwin' && !force) {
    onNext()
    return null
  }
  return <Permissions onNext={onNext} />
}