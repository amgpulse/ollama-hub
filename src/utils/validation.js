export function normalizeHost(value) {
  let host = value.trim();
  if (!host) return '';

  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `http://${host}`;
  }

  if (host.endsWith('/')) {
    host = host.slice(0, -1);
  }

  return host;
}
