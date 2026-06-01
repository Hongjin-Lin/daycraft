export interface VersionInfo {
  version: string;
  apkUrl: string;
}

export const VERSION_CHECK_URL = 'https://daycraft-six.vercel.app/version.json';

export function compareVersions(a: string, b: string) {
  const aParts = a.split('.').map(part => Number.parseInt(part, 10) || 0);
  const bParts = b.split('.').map(part => Number.parseInt(part, 10) || 0);
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (aParts[index] ?? 0) - (bParts[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function shouldShowUpdate(currentVersion: string, remoteInfo: VersionInfo | null) {
  return Boolean(
    remoteInfo?.version &&
    remoteInfo.apkUrl &&
    compareVersions(remoteInfo.version, currentVersion) > 0
  );
}

export async function fetchLatestVersionInfo(): Promise<VersionInfo | null> {
  const response = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}
