import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  notifications: Array<{
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    timestamp: Date
    read: boolean
  }>
  
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarOpen: false,
  notifications: [],
  
  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },
  
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },
  
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    }
    set((state) => ({ 
      notifications: [newNotification, ...state.notifications].slice(0, 50) // Keep only last 50
    }))
  },
  
  markNotificationRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      ),
    }))
  },
  
  clearNotifications: () => {
    set({ notifications: [] })
  },
}))