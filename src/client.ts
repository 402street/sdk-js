import { deriveWsUrl, headersToString } from "./utils.js";
import type {
  Currency,
  PayResponse,
  PaymentRequest,
  SDKOptions,
  UnlockEvent,
  VerifyBody,
  VerifyResult
} from "./types.js";

export class X402Client {
  private gatewayBase: string;
  private wsBase: string;
  private F: typeof fetch;
  private WS: typeof WebSocket;
  private defCurrency: Currency;
  private defAmount: number;

  constructor(opts: SDKOptions) {
    this.gatewayBase = opts.gatewayBase.replace(/\/+$/, "");
    this.wsBase = opts.wsBase ?? deriveWsUrl(this.gatewayBase, "/ws");
    this.F = opts.fetchImpl ?? (globalThis as any).fetch;
    if (!this.F) throw new Error("fetch not available; provide fetchImpl in SDKOptions");
    this.WS = opts.WebSocketImpl ?? (globalThis as any).WebSocket;
    if (!this.WS) throw new Error("WebSocket not available; provide WebSocketImpl in SDKOptions");
    this.defCurrency = opts.defaultCurrency ?? "USDC";
    this.defAmount = opts.defaultAmount ?? 0.25;
  }

  /**
   * Request a payment from gateway (expects HTTP 402)
   */
  async requestPayment(deviceId: string, amount = this.defAmount, currency: Currency = this.defCurrency): Promise<PayResponse> {
    const url = `${this.gatewayBase}/pay/${encodeURIComponent(deviceId)}?amount=${amount}&currency=${encodeURIComponent(
      currency
    )}`;
    const r = await this.F(url, { method: "GET" });
    // Gateway returns 402 with a JSON body. We still parse it.
    const body = await r.json().catch(() => ({} as any));
    const hdr = r.headers.get("X-Payment-Request");
    if (!hdr && body?.payment) {
      return { ...(body as PayResponse), rawHeaders: headersToString(r.headers) };
    }
    const payment = hdr ? (JSON.parse(hdr) as PaymentRequest) : (body?.payment as PaymentRequest);
    return {
      ok: false,
      message: "Payment Required (x402)",
      payment,
      rawHeaders: headersToString(r.headers)
    };
  }

  /**
   * Verify payment on gateway (which calls verifier and emits unlock)
   */
  async verifyPayment(body: VerifyBody): Promise<VerifyResult> {
    const r = await this.F(`${this.gatewayBase}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = (await r.json()) as VerifyResult;
    return json;
  }

  /**
   * Wait for unlock event via WebSocket; resolves when unlock delivered or times out.
   */
  waitForUnlock(deviceId: string, { timeoutMs = 15000 }: { timeoutMs?: number } = {}): Promise<UnlockEvent> {
    const url = `${this.wsBase}?deviceId=${encodeURIComponent(deviceId)}`;
    return new Promise((resolve, reject) => {
      const ws = new this.WS(url);
      const t = setTimeout(() => {
        try { ws.close(); } catch {}
        reject(new Error("timeout waiting for unlock"));
      }, timeoutMs);

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const data = JSON.parse(typeof ev.data === "string" ? ev.data : "");
          if (data?.type === "unlock") {
            clearTimeout(t);
            try { ws.close(); } catch {}
            resolve(data as UnlockEvent);
          }
        } catch {}
      };
      ws.onerror = () => {
        clearTimeout(t);
        try { ws.close(); } catch {}
        reject(new Error("websocket error"));
      };
    });
  }

  /**
   * High-level flow: request -> (wallet pays) -> verify -> wait unlock
   */
  async payAndUnlock(opts: {
    deviceId: string;
    amount?: number;
    currency?: Currency;
    /** transaction signature from wallet */
    txid: string;
    /** payment reference returned by requestPayment */
    reference: string;
    timeoutMs?: number;
  }) {
    const { deviceId, amount = this.defAmount, currency = this.defCurrency, txid, reference, timeoutMs } = opts;
    // Optionally, you could re-request to ensure the reference still valid; omitted here
    const verifyRes = await this.verifyPayment({ txid, deviceId, reference });
    if (!verifyRes.ok) return { ok: false as const, verifyRes };

    const ev = await this.waitForUnlock(deviceId, { timeoutMs });
    return { ok: true as const, unlock: ev, verifyRes };
  }
}
