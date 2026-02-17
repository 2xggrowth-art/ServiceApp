// ============================================================
// Zoho Books Integration Stub
// Enable by setting VITE_ZOHO_ENABLED=true in .env
// ============================================================

const ENABLED = import.meta.env.VITE_ZOHO_ENABLED === 'true';
const API_URL = import.meta.env.VITE_ZOHO_API_URL || '';

export const zohoService = {
  /** Sync a customer record to Zoho Books */
  async syncCustomer(customer: {
    name: string;
    phone: string;
    email?: string;
  }): Promise<void> {
    if (!ENABLED) return;
    // TODO: Implement when Zoho Books API is configured
    console.log('[Zoho] syncCustomer:', { customer, apiUrl: API_URL });
  },

  /** Create an invoice in Zoho Books for a completed job */
  async createInvoice(job: {
    id: string;
    customerName: string;
    customerPhone?: string;
    totalCost: number;
    paymentMethod: string;
    serviceType: string;
  }): Promise<void> {
    if (!ENABLED) return;
    // TODO: Implement when Zoho Books API is configured
    console.log('[Zoho] createInvoice:', { job });
  },

  /** Sync parts inventory with Zoho Inventory */
  async syncInventory(parts: Array<{
    name: string;
    stock: number;
    price: number;
  }>): Promise<void> {
    if (!ENABLED) return;
    // TODO: Implement when Zoho Inventory API is configured
    console.log('[Zoho] syncInventory:', { partsCount: parts.length });
  },
};
