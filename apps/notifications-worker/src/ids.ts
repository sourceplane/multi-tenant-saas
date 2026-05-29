function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, "");
}

function hexToUuid(hex: string): string | null {
  if (hex.length !== 32 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateRequestId(): string {
  return `req_${randomHex(12)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function notificationPublicId(uuid: string): string {
  return `ntf_${uuidToHex(uuid)}`;
}

export function parseNotificationPublicId(publicId: string): string | null {
  if (publicId.startsWith("ntf_")) {
    return hexToUuid(publicId.slice(4));
  }
  // Accept raw UUIDs too — internal callers may pass either shape.
  if (UUID_RE.test(publicId)) return publicId.toLowerCase();
  return null;
}

export function orgPublicId(uuid: string): string {
  return `org_${uuidToHex(uuid)}`;
}

export function parseOrgIdInput(value: string): string | null {
  if (value.startsWith("org_")) {
    return hexToUuid(value.slice(4));
  }
  if (UUID_RE.test(value)) return value.toLowerCase();
  return null;
}
