type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const toasts = new Map<string, Toast>();
const listeners = new Set<(toasts: Toast[]) => void>();

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
  warning: (message: string) => showToast(message, 'warning'),
};

function showToast(message: string, type: ToastType) {
  const id = Math.random().toString(36).slice(2);
  const t: Toast = { id, message, type };
  toasts.set(id, t);
  notifyListeners();
  setTimeout(() => {
    toasts.delete(id);
    notifyListeners();
  }, 3000);
}

function notifyListeners() {
  const list = Array.from(toasts.values());
  listeners.forEach(fn => fn(list));
}

export function useToasts(callback: (toasts: Toast[]) => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getToasts() {
  return Array.from(toasts.values());
}
