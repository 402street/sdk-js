export type Currency = "USDC" | "402ST" | string;

export interface PaymentRequest {
  amount: number;
  currency: Currency;
  recipient: string;
  reference: string;
  ttl: number;
}

export interface PayResponse {
  ok: boolean;
  message: string;
  payment: PaymentRequest;
  rawHeaders?: string;
}

export interface VerifyBody {
  txid: string;
  deviceId: string;
  reference: string;
}

export interface VerifyResult {
  ok: boolean;
  delivered?: number;
  error?: string;
  details?: unknown;
}

export interface UnlockEvent {
  type: "unlock";
  deviceId: string;
  ref: string;
  txid: string;
}

export interface SDKOptions {
  /** e.g. https://gateway.402-street.com */
  gatewayBase: string;
  /** e.g. ws://localhost:8080/ws */
  wsBase?: string; // if omitted, derived from gatewayBase
  fetchImpl?: typeof fetch;
  WebSocketImpl?: typeof WebSocket;
  defaultCurrency?: Currency;
  defaultAmount?: number;
}
