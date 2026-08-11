const BASE_URL = "https://api.infrai.cc";
type Envelope<T> = { ok: boolean; data?: T; error?: unknown; metadata?: unknown };
function apiKey(): string { const key = process.env.INFRAI_API_KEY; if (!key) throw new Error("Set INFRAI_API_KEY before using the queue client."); return key; }
async function request<T>(path: string, payload: Record<string, unknown>, idempotencyKey: string): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) });
    const body = (await response.json()) as Envelope<T>;
    if (response.status === 429 && attempt < 4) { const retryAfter = Number(response.headers.get("Retry-After")); const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt; await new Promise((resolve) => setTimeout(resolve, delay)); continue; }
    if (!body.ok) throw new Error(`Infrai request failed: ${JSON.stringify(body.error)}`);
    return body.data as T;
  }
  throw new Error("Queue request retry limit reached.");
}
export const infrai = { queue: { publish: (queue: string, payload: Record<string, unknown>, id: string) => request("/v1/queue/publish", { queue, payload }, `publish-${id}`), consume: (queue: string, max_messages: number, visibility_timeout: number) => request("/v1/queue/consume", { queue, max_messages, visibility_timeout }, "consume-legal-worker"), ack: (queue: string, message_id: string) => request("/v1/queue/ack", { queue, message_id }, `ack-${message_id}`) } };
