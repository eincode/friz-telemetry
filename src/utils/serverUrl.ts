const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Host part of an address, without scheme, path or port. */
function hostOf(address: string): string {
  const authority = address.split("/")[0];
  // Bracketed IPv6, e.g. [::1]:3000
  if (authority.startsWith("[")) return authority.slice(0, authority.indexOf("]") + 1);
  return authority.split(":")[0];
}

/** Address with any scheme the user typed and trailing slashes removed. */
function bare(address: string): string {
  return address.trim().replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
}

/**
 * True for addresses served without TLS: IPs, plus localhost and mDNS
 * (`.local`) names on the LAN. Anything else is a public URL.
 */
function isLocal(address: string): boolean {
  const host = hostOf(bare(address)).toLowerCase();
  return (
    IPV4.test(host) ||
    host.startsWith("[") ||
    host === "localhost" ||
    host.endsWith(".local")
  );
}

/** `http://` for an IP, `https://` for a public URL. */
export function httpUrl(address: string): string {
  return `${isLocal(address) ? "http" : "https"}://${bare(address)}`;
}

/** `ws://` for an IP, `wss://` for a public URL. */
export function wsUrl(address: string): string {
  return `${isLocal(address) ? "ws" : "wss"}://${bare(address)}`;
}
