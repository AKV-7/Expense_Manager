"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ToastNotification, NotificationType } from '@/types/notification'

interface NotificationContextType {
  toasts: ToastNotification[]
  showToast: (toast: Omit<ToastNotification, 'id'>) => void
  showSuccess: (title: string, message: string, duration?: number) => void
  showError: (title: string, message: string, duration?: number) => void
  showInfo: (title: string, message: string, duration?: number) => void
  showWarning: (title: string, message: string, duration?: number) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastNotification = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    }
    
    setToasts(prev => [...prev, newToast])

    // Auto-dismiss if duration is set
    if (newToast.duration) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    showToast({ type: 'success', title, message, duration })
  }, [showToast])

  const showError = useCallback((title: string, message: string, duration?: number) => {
    showToast({ type: 'error', title, message, duration })
  }, [showToast])

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    showToast({ type: 'info', title, message, duration })
  }, [showToast])

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    showToast({ type: 'warning', title, message, duration })
  }, [showToast])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
