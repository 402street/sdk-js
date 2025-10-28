# 402Street — JavaScript SDK (x402)

Small client library to integrate **x402** payments and unlock flow in web or Node apps.

## Install
```bash
npm i @402street/sdk
# or
pnpm add @402street/sdk
```
**Usage (browser / Node 18+)**
```ts
import { X402Client } from "@402street/sdk";

const sdk = new X402Client({
  gatewayBase: "https://gateway.example.com",   // your backend-gateway
  // wsBase: "wss://gateway.example.com/ws",    // optional; auto-derived
});

// 1) Ask device for payment
const p = await sdk.requestPayment("DEVICE_1", 0.25, "USDC");
// show p.payment to the user/wallet; wallet sends on-chain tx with memo=reference

// 2) After wallet returns signature:
const verify = await sdk.verifyPayment({
  txid: "<signature>",
  deviceId: "DEVICE_1",
  reference: p.payment.reference
});
if (!verify.ok) throw new Error("verification failed");

// 3) Wait for unlock event (WebSocket)
const unlock = await sdk.waitForUnlock("DEVICE_1", { timeoutMs: 15000 });
console.log("Unlocked:", unlock);
```
**High-level helper**
```ts
const res = await sdk.payAndUnlock({
  deviceId: "DEVICE_1",
  txid: "<signature>",
  reference: "<ref-from-step-1>"
});
if (res.ok) console.log("UNLOCKED", res.unlock);
```
**Options**

- gatewayBase — base URL of 402Street backend-gateway
- wsBase — optional WebSocket URL (auto-derived from gatewayBase)
- defaultAmount, defaultCurrency — optional defaults
- fetchImpl, WebSocketImpl — inject polyfills for Node < 18

**Build**
```bash
npm run build
```
**License**
MIT © 402Street
