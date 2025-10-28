export function headersToString(headers: Headers): string {
  const lines: string[] = [];
  headers.forEach((v, k) => lines.push(`${k}: ${v}`));
  return lines.join("\n");
}

export function deriveWsUrl(httpBase: string, wsPath = "/ws"): string {
  const u = new URL(httpBase);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = wsPath.replace(/^\/*/, "/");
  u.search = "";
  u.hash = "";
  return u.toString();
}
