import { createHmac } from 'crypto';

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  notificationDisabled?: boolean;
}

interface AsaasPayment {
  id: string;
  customer: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  netValue: number;
  dueDate: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopiaECola?: string;
  description?: string;
  externalReference?: string;
  split?: AsaasSplit[];
  transactionReceiptUrl?: string;
  subscription?: string;
  originalDueDate?: string;
  paymentDate?: string;
  fee?: number;
}

interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  totalValue: number;
}

interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'CANCELLED';
  cycle: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';
  description?: string;
  endDate?: string;
}

interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

interface AsaasWebhookEvent {
  event: string;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
  customer?: AsaasCustomer;
}

interface AsaasListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

interface AsaasApiError {
  errors: Array<{
    code: string;
    description: string;
  }>;
}

export class AsaasClient {
  private apiKey: string;
  private baseUrl: string;
  private walletId: string;

  constructor(
    apiKey?: string,
    environment?: string,
    walletId?: string
  ) {
    const env = environment ?? process.env.ASAAS_ENVIRONMENT ?? 'sandbox';
    this.apiKey = apiKey ?? process.env.ASAAS_API_KEY ?? '';
    this.walletId = walletId ?? process.env.ASAAS_WALLET_ID ?? '';

    if (process.env.ASAAS_API_URL) {
      this.baseUrl = process.env.ASAAS_API_URL;
    } else {
      this.baseUrl = env === 'production'
        ? 'https://api.asaas.com/api/v3'
        : 'https://sandbox.asaas.com/api/v3';
    }

    if (!this.apiKey) {
      console.warn('[AsaasClient] No API key configured. ASAAS_API_KEY env var is required.');
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'access_token': this.apiKey,
      'User-Agent': 'GS-VEMAPI/1.0',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as AsaasApiError | null;
      const errorMsg = errorBody?.errors?.map(e => e.description).join(', ') ?? `HTTP ${response.status}`;
      throw new Error(`[Asaas] ${method} ${path} failed: ${errorMsg}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async createCustomer(data: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  }): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('POST', '/customers', {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
      phone: data.phone?.replace(/\D/g, ''),
      notificationDisabled: false,
    });
  }

  async findCustomer(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const cleaned = cpfCnpj.replace(/\D/g, '');
    const result = await this.request<AsaasListResponse<AsaasCustomer>>(
      'GET',
      `/customers?cpfCnpj=${cleaned}&limit=1`
    );
    return result.data.length > 0 ? result.data[0] : null;
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  async createPayment(data: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    split?: Array<{
      walletId: string;
      percentualValue?: number;
      fixedValue?: number;
    }>;
  }): Promise<AsaasPayment> {
    const payload: Record<string, unknown> = {
      customer: data.customer,
      billingType: data.billingType,
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalReference,
    };

    if (data.split && data.split.length > 0) {
      payload.split = data.split.map(s => ({
        walletId: s.walletId,
        ...(s.percentualValue != null ? { percentualValue: s.percentualValue } : {}),
        ...(s.fixedValue != null ? { fixedValue: s.fixedValue } : {}),
      }));
    }

    return this.request<AsaasPayment>('POST', '/payments', payload);
  }

  async getPayment(id: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>('GET', `/payments/${id}`);
  }

  async listPayments(filters?: {
    status?: string;
    customer?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ data: AsaasPayment[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.customer) params.set('customer', filters.customer);
    if (filters?.offset != null) params.set('offset', String(filters.offset));
    if (filters?.limit != null) params.set('limit', String(filters.limit));

    const qs = params.toString();
    const result = await this.request<AsaasListResponse<AsaasPayment>>(
      'GET',
      `/payments${qs ? `?${qs}` : ''}`
    );
    return { data: result.data, total: result.total };
  }

  async refundPayment(id: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>('POST', `/payments/${id}/refund`);
  }

  async deletePayment(id: string): Promise<void> {
    await this.request<void>('DELETE', `/payments/${id}`);
  }

  // ─── Pix ───────────────────────────────────────────────────────────────────

  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string }> {
    return this.request<AsaasPixQrCode>('GET', `/payments/${paymentId}/pixQrCode`);
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async createSubscription(data: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';
    description?: string;
    split?: AsaasSplit[];
  }): Promise<AsaasSubscription> {
    const payload: Record<string, unknown> = {
      customer: data.customer,
      billingType: data.billingType,
      value: data.value,
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      description: data.description,
    };

    if (data.split && data.split.length > 0) {
      payload.split = data.split;
    }

    return this.request<AsaasSubscription>('POST', '/subscriptions', payload);
  }

  // ─── Wallet ────────────────────────────────────────────────────────────────

  async getWalletBalance(): Promise<{ balance: number }> {
    const data = await this.request<{ balance: number; totalBalance: number }>('GET', '/finance/balance');
    return { balance: data.balance ?? data.totalBalance ?? 0 };
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!signature) return false;
    const expected = createHmac('sha256', this.apiKey)
      .update(body)
      .digest('hex');
    return expected === signature;
  }

  parseWebhookEvent(body: string): AsaasWebhookEvent {
    return JSON.parse(body) as AsaasWebhookEvent;
  }
}

let clientInstance: AsaasClient | null = null;

export function getAsaasClient(): AsaasClient {
  if (!clientInstance) {
    clientInstance = new AsaasClient();
  }
  return clientInstance;
}
