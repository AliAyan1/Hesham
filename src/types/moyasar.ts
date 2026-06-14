export interface MoyasarApiPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  source?: { message?: string };
}

export interface MoyasarPaymentResult {
  id: string;
  status: string;
  amount: number;
  source?: { message?: string };
}

export interface MoyasarInitConfig {
  element: string;
  amount: number;
  currency: string;
  description: string;
  publishable_api_key: string;
  callback_url: string;
  methods: string[];
  metadata: Record<string, string>;
  on_completed: (payment: MoyasarPaymentResult) => Promise<boolean>;
  on_failure: (error: MoyasarPaymentResult | string) => void;
}

declare global {
  interface Window {
    Moyasar?: {
      init: (config: MoyasarInitConfig) => void;
    };
  }
}

export {};
