// ============================================================
// Browser Notification API wrapper — shared-device safe
// ============================================================

const PERM_KEY = 'bch_notif_permission';

/** Check if browser supports Notification API */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/** Get stored permission state */
export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/** Check if user has explicitly dismissed the permission prompt */
export function wasPermissionDismissed(): boolean {
  return localStorage.getItem(PERM_KEY) === 'dismissed';
}

/** Mark permission prompt as dismissed (user clicked "Not now") */
export function dismissPermissionPrompt(): void {
  localStorage.setItem(PERM_KEY, 'dismissed');
}

/**
 * Request notification permission.
 * Returns true if granted.
 */
export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    localStorage.setItem(PERM_KEY, 'granted');
    return true;
  }
  return false;
}

/**
 * Show a browser notification if permission is granted.
 * No-op if permission not granted (safe to call unconditionally).
 */
export function notify(
  title: string,
  body: string,
  options?: { tag?: string; icon?: string }
): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: options?.icon || '/icon-192.png',
      tag: options?.tag, // prevents duplicate notifications with same tag
      silent: false,
    });
  } catch {
    // Notification constructor can fail on some mobile browsers
  }
}

/**
 * Show a notification via the Service Worker for background delivery.
 * Falls back to regular Notification API if SW is not available.
 */
export async function notifyViaServiceWorker(
  title: string,
  body: string,
  options?: { tag?: string; icon?: string }
): Promise<void> {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: options?.icon || '/icon-192.png',
        tag: options?.tag,
        silent: false,
      });
      return;
    }
  } catch {
    // SW not available — fall through to regular notification
  }

  // Fallback to regular Notification constructor
  notify(title, body, options);
}
