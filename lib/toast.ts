export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // durasi dalam milidetik (default 5000ms)
}

type ToastListener = () => void;

const DEFAULT_DURATION_MS = 5000;

let activeToasts: ToastData[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Abaikan jika listener error
    }
  });
}

/**
 * Berlangganan perubahan daftar toast (digunakan oleh useSyncExternalStore)
 */
export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Snapshot daftar toast aktif saat ini
 */
export function getToasts(): ToastData[] {
  return activeToasts;
}

/**
 * Menghapus notifikasi toast tertentu berdasarkan ID
 */
export function dismissToast(id: string) {
  const previousLength = activeToasts.length;
  activeToasts = activeToasts.filter((toast) => toast.id !== id);
  if (activeToasts.length !== previousLength) {
    notify();
  }
}

/**
 * Menghapus seluruh notifikasi toast
 */
export function clearAllToasts() {
  if (activeToasts.length > 0) {
    activeToasts = [];
    notify();
  }
}

/**
 * Menampilkan toast notifikasi baru
 */
export function showToast(toast: Omit<ToastData, "id">): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const duration = toast.duration ?? DEFAULT_DURATION_MS;
  const newToast: ToastData = { ...toast, id, duration };

  activeToasts = [...activeToasts, newToast];
  notify();

  if (duration > 0 && typeof window !== "undefined") {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}
