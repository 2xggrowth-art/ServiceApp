// ============================================================
// whatsapp.ts — wa.me link builder with template messages
// Opens WhatsApp with pre-filled message for customer updates
// ============================================================

export type WhatsAppStage = 'received' | 'in_progress' | 'quality_check' | 'ready';

const TEMPLATES: Record<WhatsAppStage, (name: string, bike: string) => string> = {
  received: (name, bike) =>
    `Hi ${name}, your ${bike} has been received at Bharath Cycle Hub. We'll update you on the progress! 🚲`,
  in_progress: (name, bike) =>
    `Hi ${name}, work has started on your ${bike} at Bharath Cycle Hub. We'll notify you once it's done! 🔧`,
  quality_check: (name, bike) =>
    `Hi ${name}, your ${bike} has passed quality check and is almost ready for pickup! ✅`,
  ready: (name, bike) =>
    `Hi ${name}, your ${bike} is ready for pickup at Bharath Cycle Hub! 🎉`,
};

/** Clean phone number and add India country code */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) return digits;
  if (digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/** Build a wa.me URL with a pre-filled template message */
export function buildWhatsAppUrl(
  phone: string,
  stage: WhatsAppStage,
  customerName: string,
  bike: string
): string {
  const normalized = normalizePhone(phone);
  const message = TEMPLATES[stage](customerName, bike);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Open WhatsApp in a new tab/window */
export function openWhatsApp(
  phone: string,
  stage: WhatsAppStage,
  customerName: string,
  bike: string
): void {
  const url = buildWhatsAppUrl(phone, stage, customerName, bike);
  window.open(url, '_blank');
}
