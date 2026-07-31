/**
 * SSRF (Server-Side Request Forgery) guard.
 *
 * Validates that an outbound fetch target is safe before the server follows
 * it — blocking private/link-local/reserved IP ranges and cloud metadata
 * hostnames, including after DNS resolution and across redirect hops.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAME_SUFFIXES = [
  'metadata.google',
  'metadata.internal',
  'metadata.aws',
  '.internal',
  '.local',
];

// Inclusive [start, end] IPv4 ranges that must never be fetched server-side.
const PRIVATE_IPV4_RANGES: ReadonlyArray<readonly [string, string]> = [
  ['0.0.0.0', '0.255.255.255'],        // "this" network
  ['10.0.0.0', '10.255.255.255'],      // RFC 1918
  ['100.64.0.0', '100.127.255.255'],   // CGNAT
  ['127.0.0.0', '127.255.255.255'],    // loopback
  ['169.254.0.0', '169.254.255.255'],  // link-local (incl. cloud metadata)
  ['172.16.0.0', '172.31.255.255'],    // RFC 1918
  ['192.0.0.0', '192.0.0.255'],        // IETF protocol assignments
  ['192.168.0.0', '192.168.255.255'],  // RFC 1918
  ['198.18.0.0', '198.19.255.255'],    // benchmarking
  ['224.0.0.0', '239.255.255.255'],    // multicast
  ['240.0.0.0', '255.255.255.255'],    // reserved
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) | parseInt(octet, 10)) >>> 0, 0);
}

export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    const value = ipv4ToInt(ip);
    return PRIVATE_IPV4_RANGES.some(
      ([start, end]) => value >= ipv4ToInt(start) && value <= ipv4ToInt(end)
    );
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 ULA
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
    if (lower.startsWith('::ffff:')) {
      return isPrivateIp(lower.slice(7)); // IPv4-mapped
    }
  }

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAME_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(suffix)
  );
}

/**
 * Throws if `urlString` is not safe to fetch from the server.
 * Checks protocol, hostname blocklist, literal IPs, and — critically —
 * resolves the hostname via DNS to catch names that point at internal
 * addresses (the classic DNS-rebinding / metadata-service bypass).
 */
export async function assertSafeOutboundUrl(urlString: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Access to localhost is blocked');
  }

  if (isBlockedHostname(hostname)) {
    throw new Error('Access to this hostname is blocked');
  }

  // Literal IP address — check directly.
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('Access to private IP addresses is blocked');
    }
    return;
  }

  // Resolve hostname; reject if ANY returned address is private.
  let addresses: { address: string; family: number }[] = [];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }

  const blocked = addresses.find(({ address }) => isPrivateIp(address));
  if (blocked) {
    throw new Error(`Hostname resolves to a blocked address: ${blocked.address}`);
  }
}

export function isSafeOutboundUrl(urlString: string): Promise<boolean> {
  return assertSafeOutboundUrl(urlString).then(
    () => true,
    () => false
  );
}

const DEFAULT_MAX_REDIRECTS = 5;

/**
 * Fetch a URL while validating every hop (initial target + redirects) against
 * the SSRF guard. Returns the final non-redirect response.
 */
export async function safeFetch(
  urlString: string,
  init: RequestInit = {},
  maxRedirects: number = DEFAULT_MAX_REDIRECTS
): Promise<Response> {
  let currentUrl = urlString;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeOutboundUrl(currentUrl);
    const response = await fetch(currentUrl, { ...init, redirect: 'manual' });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error('Too many redirects');
}
