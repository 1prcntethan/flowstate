declare interface Window {
  electronAPI: {
    classify: (payload: {
      subjects: string[]
      todos: { text: string }[]
    }) => Promise<{
      label: 'on_task' | 'off_task' | 'ambiguous'
      confidence: number
      reason: string
    }>
    setMiniMode: () => Promise<void>
    setExpandMode: () => Promise<void>
  }
}