import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

function sign(id: string, secret: string) {
  return createHmac("sha256", secret).update(`cadenyaception-visitor:${id}`).digest("hex");
}
export function visitorIdentity(cookie: string | undefined, secret: string) {
  const [id, signature] = (cookie ?? "").split(".");
  if (/^[a-f0-9-]{36}$/.test(id ?? "") && /^[a-f0-9]{64}$/.test(signature ?? "")) {
    if (timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(id, secret), "hex"))) return { id, cookie: `${id}.${signature}` };
  }
  const nextId = randomUUID();
  return { id: nextId, cookie: `${nextId}.${sign(nextId, secret)}` };
}
