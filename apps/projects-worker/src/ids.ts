function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, "");
}

function hexToUuid(hex: string): string | null {
  if (hex.length !== 32 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateRequestId(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return `req_${hex}`;
}

export function orgPublicId(uuid: string): string {
  return `org_${uuidToHex(uuid)}`;
}

export function parseOrgPublicId(publicId: string): string | null {
  if (!publicId.startsWith("org_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function projectPublicId(uuid: string): string {
  return `prj_${uuidToHex(uuid)}`;
}

export function parseProjectPublicId(publicId: string): string | null {
  if (!publicId.startsWith("prj_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function environmentPublicId(uuid: string): string {
  return `env_${uuidToHex(uuid)}`;
}

export function parseEnvironmentPublicId(publicId: string): string | null {
  if (!publicId.startsWith("env_")) return null;
  return hexToUuid(publicId.slice(4));
}
