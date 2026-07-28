import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './index.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
)