import { useState, useEffect } from 'react'
import { themes, Theme, DEFAULT_THEME_ID } from './themes'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
}

export function useTheme() {
  const [themeId, setThemeId] = useState<string>(() => {
    // read from localStorage for now — swap for electron-store later
    return localStorage.getItem('themeId') ?? DEFAULT_THEME_ID
  })

  useEffect(() => {
    const theme = themes[themeId] ?? themes[DEFAULT_THEME_ID]
    applyTheme(theme)
    localStorage.setItem('themeId', themeId)
  }, [themeId])

  const currentTheme = themes[themeId] ?? themes[DEFAULT_THEME_ID]

  return { themeId, setThemeId, currentTheme }
}