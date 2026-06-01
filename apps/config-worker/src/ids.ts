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

export function parseOrgPublicId(publicId: string): string | null {
  if (!publicId.startsWith("org_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function parseProjectPublicId(publicId: string): string | null {
  if (!publicId.startsWith("prj_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function parseEnvironmentPublicId(publicId: string): string | null {
  if (!publicId.startsWith("env_")) return null;
  return hexToUuid(publicId.slice(4));
}

/**
 * Decode a public subject id (`usr_<hex>`, service-principal subject id, …) to
 * the bare UUID used by UUID columns such as `config.secret_metadata.created_by`.
 * Returns null if there is no `<prefix>_<32 hex>` shape.
 */
export function parseSubjectUuid(publicId: string): string | null {
  const sep = publicId.indexOf("_");
  if (sep < 1) return null;
  return hexToUuid(publicId.slice(sep + 1));
}

export function orgPublicId(uuid: string): string {
  return `org_${uuidToHex(uuid)}`;
}

export function settingPublicId(uuid: string): string {
  return `stg_${uuidToHex(uuid)}`;
}

export function featureFlagPublicId(uuid: string): string {
  return `flg_${uuidToHex(uuid)}`;
}

export function secretMetadataPublicId(uuid: string): string {
  return `sec_${uuidToHex(uuid)}`;
}

export function parseSettingPublicId(publicId: string): string | null {
  if (!publicId.startsWith("stg_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function parseFeatureFlagPublicId(publicId: string): string | null {
  if (!publicId.startsWith("flg_")) return null;
  return hexToUuid(publicId.slice(4));
}

export function parseSecretMetadataPublicId(publicId: string): string | null {
  if (!publicId.startsWith("sec_")) return null;
  return hexToUuid(publicId.slice(4));
}
