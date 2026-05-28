export type Theme = {
  id: string
  name: string
  unlockable: boolean   // false = default, true = gacha reward
  vars: {
    '--dark-purple': string
    '--surface': string
    '--surface-alt': string
    '--orange-cream': string
    '--orange-cream-50': string
    '--orange-cream-20': string
    '--pink': string
    '--pink-soft': string
    '--status-green': string
    '--status-red': string
    '--status-amber': string
  }
}

export const themes: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Flowstate',
    unlockable: false,
    vars: {
      '--dark-purple':     '#170B13',
      '--surface':         '#1E1118',
      '--surface-alt':     '#2A1622',
      '--orange-cream':    '#F3E5D8',
      '--orange-cream-50': 'rgba(243,229,216,0.5)',
      '--orange-cream-20': 'rgba(243,229,216,0.2)',
      '--pink':            '#CE6C81',
      '--pink-soft':       'rgba(206,108,129,0.15)',
      '--status-green':    '#4CCE7A',
      '--status-red':      '#E05555',
      '--status-amber':    '#E6A817',
    }
  },

  // Future gacha-unlockable themes — define now, ship later
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    unlockable: true,
    vars: {
      '--dark-purple':     '#0B0F1A',
      '--surface':         '#111827',
      '--surface-alt':     '#1C2333',
      '--orange-cream':    '#E8EDF5',
      '--orange-cream-50': 'rgba(232,237,245,0.5)',
      '--orange-cream-20': 'rgba(232,237,245,0.2)',
      '--pink':            '#4D9EFF',
      '--pink-soft':       'rgba(77,158,255,0.15)',
      '--status-green':    '#39FF85',
      '--status-red':      '#FF6B6B',
      '--status-amber':    '#FFD700',
    }
  },

  lantern: {
    id: 'lantern',
    name: 'Lantern',
    unlockable: true,
    vars: {
      '--dark-purple':     '#1C2B1E',
      '--surface':         '#243527',
      '--surface-alt':     '#2E4230',
      '--orange-cream':    '#F2E8D5',
      '--orange-cream-50': 'rgba(242,232,213,0.5)',
      '--orange-cream-20': 'rgba(242,232,213,0.2)',
      '--pink':            '#E8A838',
      '--pink-soft':       'rgba(232,168,56,0.15)',
      '--status-green':    '#7A9E7E',
      '--status-red':      '#C9401A',
      '--status-amber':    '#E8A838',
    }
  }
}

export const DEFAULT_THEME_ID = 'default'