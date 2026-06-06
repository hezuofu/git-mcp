export function shouldBypassProxy(url: string, noProxy: string | undefined): boolean {
  if (!noProxy) return false;

  let hostname: string;
  let port: string;
  let protocol: string;
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    protocol = parsedUrl.protocol;
    port = parsedUrl.port || (protocol === "https:" ? "443" : "80");
  } catch {
    return false;
  }

  const patterns = noProxy.split(",").map(p => p.trim().toLowerCase()).filter(p => p.length > 0);

  for (const pattern of patterns) {
    if (pattern === "*") return true;

    const [patternHost, patternPort] = pattern.split(":");

    if (patternPort && port !== patternPort) continue;

    if (patternHost.startsWith(".")) {
      const suffix = patternHost.substring(1);
      if (hostname === suffix || hostname.endsWith("." + suffix)) return true;
    } else if (hostname === patternHost) {
      return true;
    }
  }

  return false;
}
