// ============================================================
// whatsapp.ts — wa.me link builder with template messages
// Opens WhatsApp with pre-filled message for customer updates
// ============================================================

export type WhatsAppStage = 'received' | 'in_progress' | 'quality_check' | 'ready';

const FOOTER = `\n\nFor all service related queries, call us at 9844223174.\n— Bharath Cycle Hub`;

interface TemplateParams {
  name: string;
  bike: string;
  quote?: string;
  serviceId?: string;
  mechanicName?: string;
}

const TEMPLATES: Record<WhatsAppStage, (p: TemplateParams) => string> = {
  received: (p) =>
    `Hi ${p.name}, your ${p.bike} has been received at Bharath Cycle Hub.${p.serviceId ? ` Your Service ID: ${p.serviceId}.` : ''}${p.quote ? ` Estimated cost: ${p.quote}.` : ''} We'll update you on the progress! 🚲${FOOTER}`,
  in_progress: (p) =>
    `Hi ${p.name}, work has started on your ${p.bike}${p.mechanicName ? ` by ${p.mechanicName}` : ''} at Bharath Cycle Hub.${p.serviceId ? ` Service ID: ${p.serviceId}.` : ''}${p.quote ? ` Estimated cost: ${p.quote}.` : ''} We'll notify you once it's done! 🔧${FOOTER}`,
  quality_check: (p) =>
    `Hi ${p.name}, your ${p.bike} has passed quality check and is almost ready for pickup!${p.serviceId ? ` Service ID: ${p.serviceId}.` : ''}${p.quote ? ` Total: ${p.quote}.` : ''} ✅${FOOTER}`,
  ready: (p) =>
    `Hi ${p.name}, your ${p.bike} is ready for pickup at Bharath Cycle Hub!${p.serviceId ? ` Service ID: ${p.serviceId}.` : ''}${p.quote ? ` Total: ${p.quote}.` : ''} 🎉${FOOTER}`,
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
  bike: string,
  quote?: number | null,
  serviceId?: string,
  mechanicName?: string,
): string {
  const normalized = normalizePhone(phone);
  const quoteStr = quote != null ? '₹' + quote.toLocaleString('en-IN') : undefined;
  const message = TEMPLATES[stage]({ name: customerName, bike, quote: quoteStr, serviceId, mechanicName });
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Open WhatsApp in a new tab/window */
export function openWhatsApp(
  phone: string,
  stage: WhatsAppStage,
  customerName: string,
  bike: string,
  quote?: number | null,
  serviceId?: string,
  mechanicName?: string,
): void {
  const url = buildWhatsAppUrl(phone, stage, customerName, bike, quote, serviceId, mechanicName);
  window.open(url, '_blank');
}
