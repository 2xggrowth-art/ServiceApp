// ============================================================
// WhatsApp Business API Integration Stub
// Enable by setting VITE_WHATSAPP_ENABLED=true in .env
// ============================================================

const ENABLED = import.meta.env.VITE_WHATSAPP_ENABLED === 'true';
const API_URL = import.meta.env.VITE_WHATSAPP_API_URL || '';

export const whatsappService = {
  /** Send a job status update to customer */
  async sendJobUpdate(
    phone: string,
    templateId: string,
    params: Record<string, string>
  ): Promise<void> {
    if (!ENABLED) return;
    // TODO: Implement when WhatsApp Business API is configured
    console.log('[WhatsApp] sendJobUpdate:', { phone, templateId, params, apiUrl: API_URL });
  },

  /** Notify customer that bike is ready for pickup */
  async sendReadyNotification(phone: string, jobId: string): Promise<void> {
    if (!ENABLED) return;
    // TODO: Implement when WhatsApp Business API is configured
    console.log('[WhatsApp] sendReadyNotification:', { phone, jobId });
  },

  /** Send payment receipt to customer */
  async sendPaymentReceipt(
    phone: string,
    amount: number,
    method: string
  ): Promise<void> {
    if (!ENABLED) return;
    // TODO: Implement when WhatsApp Business API is configured
    console.log('[WhatsApp] sendPaymentReceipt:', { phone, amount, method });
  },
};
