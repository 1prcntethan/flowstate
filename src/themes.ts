export type Theme = {
  id: string
  name: string
  unlockable: boolean   // false = default, true = gacha reward
  vars: {
    '--dark-purple': string
    '--orange-cream': string
    '--orange-cream-10': string
    '--orange-cream-20': string
    '--orange-cream-30': string
    '--orange-cream-40': string
    '--orange-cream-50': string
    '--orange-cream-60': string
    '--orange-cream-70': string
    '--orange-cream-80': string
    '--orange-cream-90': string
    '--pink': string
    '--pink-10': string
    '--pink-20': string
    '--pink-30': string
    '--pink-40': string
    '--pink-50': string
    '--pink-60': string
    '--pink-70': string
    '--pink-80': string
    '--pink-90': string
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
      '--orange-cream':    '#F3E5D8',
      '--orange-cream-10': 'rgba(243,229,216,0.1)',
      '--orange-cream-20': 'rgba(243,229,216,0.2)',
      '--orange-cream-30': 'rgba(243,229,216,0.3)',
      '--orange-cream-40': 'rgba(243,229,216,0.4)',
      '--orange-cream-50': 'rgba(243,229,216,0.5)',
      '--orange-cream-60': 'rgba(243,229,216,0.6)',
      '--orange-cream-70': 'rgba(243,229,216,0.7)',
      '--orange-cream-80': 'rgba(243,229,216,0.8)',
      '--orange-cream-90': 'rgba(243,229,216,0.9)',
      '--pink':            '#CE6C81',
      '--pink-10': 'rgba(207, 110, 131, 0.1)',
      '--pink-20': 'rgba(207, 110, 131, 0.2)',
      '--pink-30': 'rgba(207, 110, 131, 0.3)',
      '--pink-40': 'rgba(207, 110, 131, 0.4)',
      '--pink-50': 'rgba(207, 110, 131, 0.5)',
      '--pink-60': 'rgba(207, 110, 131, 0.6)',
      '--pink-70': 'rgba(207, 110, 131, 0.7)',
      '--pink-80': 'rgba(207, 110, 131, 0.8)',
      '--pink-90': 'rgba(207, 110, 131, 0.9)',
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
      '--orange-cream':    '#E8EDF5',
      '--orange-cream-10': 'rgba(232, 237, 245, 0.1)',
      '--orange-cream-20': 'rgba(232, 237, 245, 0.2)',
      '--orange-cream-30': 'rgba(232, 237, 245, 0.3)',
      '--orange-cream-40': 'rgba(232, 237, 245, 0.4)',
      '--orange-cream-50': 'rgba(232, 237, 245, 0.5)',
      '--orange-cream-60': 'rgba(232, 237, 245, 0.6)',
      '--orange-cream-70': 'rgba(232, 237, 245, 0.7)',
      '--orange-cream-80': 'rgba(232, 237, 245, 0.8)',
      '--orange-cream-90': 'rgba(232, 237, 245, 0.9)',
      '--pink':            '#4D9EFF',
      '--pink-10': 'rgba(77, 158, 255, 0.1)',
      '--pink-20': 'rgba(77, 158, 255, 0.2)',
      '--pink-30': 'rgba(77, 158, 255, 0.3)',
      '--pink-40': 'rgba(77, 158, 255, 0.4)',
      '--pink-50': 'rgba(77, 158, 255, 0.5)',
      '--pink-60': 'rgba(77, 158, 255, 0.6)',
      '--pink-70': 'rgba(77, 158, 255, 0.7)',
      '--pink-80': 'rgba(77, 158, 255, 0.8)',
      '--pink-90': 'rgba(77, 158, 255, 0.9)',
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
      '--orange-cream':    '#F2E8D5',
      '--orange-cream-10': 'rgba(242, 232, 213, 0.1)',
      '--orange-cream-20': 'rgba(242, 232, 213, 0.2)',
      '--orange-cream-30': 'rgba(242, 232, 213, 0.3)',
      '--orange-cream-40': 'rgba(242, 232, 213, 0.4)',
      '--orange-cream-50': 'rgba(242, 232, 213, 0.5)',
      '--orange-cream-60': 'rgba(242, 232, 213, 0.6)',
      '--orange-cream-70': 'rgba(242, 232, 213, 0.7)',
      '--orange-cream-80': 'rgba(242, 232, 213, 0.8)',
      '--orange-cream-90': 'rgba(242, 232, 213, 0.9)',
      '--pink':            '#E8A838',
      '--pink-10': 'rgba(232, 168, 56, 0.1)',
      '--pink-20': 'rgba(232, 168, 56, 0.2)',
      '--pink-30': 'rgba(232, 168, 56, 0.3)',
      '--pink-40': 'rgba(232, 168, 56, 0.4)',
      '--pink-50': 'rgba(232, 168, 56, 0.5)',
      '--pink-60': 'rgba(232, 168, 56, 0.6)',
      '--pink-70': 'rgba(232, 168, 56, 0.7)',
      '--pink-80': 'rgba(232, 168, 56, 0.8)',
      '--pink-90': 'rgba(232, 168, 56, 0.9)',
      '--status-green':    '#39FF85',
      '--status-red':      '#FF6B6B',
      '--status-amber':    '#FFD700',
    }
  }
}

export const DEFAULT_THEME_ID = 'lantern'