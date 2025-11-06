"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useNotification } from "@/contexts/notification-context"

export function Toaster() {
  const { toasts, removeToast } = useNotification()

  return (
    <ToastProvider>
      {toasts.map(({ id, type, title, message }) => (
        <Toast
          key={id}
          variant={type}
          onOpenChange={(open) => {
            if (!open) removeToast(id)
          }}
        >
          <div className="flex items-start gap-3">
            <ToastIcon variant={type} />
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {message && <ToastDescription>{message}</ToastDescription>}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
