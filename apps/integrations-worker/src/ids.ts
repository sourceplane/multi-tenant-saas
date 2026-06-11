import { hexToUuid, uuidToHex, uuidFromPublicId, type Uuid } from "@saas/db/ids";

export function generateRequestId(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return `req_${hex}`;
}

export function parseOrgPublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "org");
}

export function parseProjectPublicId(publicId: string): Uuid | null {
  return uuidFromPublicId(publicId, "prj");
}

export function orgPublicId(uuid: string): string {
  return `org_${uuidToHex(uuid)}`;
}

export function projectPublicId(uuid: string): string {
  return `prj_${uuidToHex(uuid)}`;
}

export function connectionPublicId(uuid: string): string {
  return `int_${uuidToHex(uuid)}`;
}

export function parseConnectionPublicId(publicId: string): string | null {
  if (!publicId.startsWith("int_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function repoLinkPublicId(uuid: string): string {
  return `repl_${uuidToHex(uuid)}`;
}

export function parseRepoLinkPublicId(publicId: string): string | null {
  if (!publicId.startsWith("repl_")) return null;
  return hexToUuid(publicId.slice(5));
}

export function inboundDeliveryPublicId(uuid: string): string {
  return `igd_${uuidToHex(uuid)}`;
}

export function parseInboundDeliveryPublicId(publicId: string): string | null {
  if (!publicId.startsWith("igd_")) return null;
  return hexToUuid(publicId.slice(4));
}
