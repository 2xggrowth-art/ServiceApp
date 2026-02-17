/** Trigger haptic feedback if supported by the device */
export function haptic(ms = 50) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch {
    // Silently fail — haptic is a nice-to-have
  }
}
