import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { CURRENT_APP_VERSION } from '../lib/app-version';
import { shouldShowUpdate, type VersionInfo } from '../lib/update-check';

const VERSION_CHECK_URL = 'https://daycraft-six.vercel.app/version.json';

function isMobileUpdateSurface() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return isAndroid || isMobileViewport || isStandalone || isIOSStandalone;
}

async function fetchVersionInfo(url: string): Promise<VersionInfo | null> {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMobileUpdateSurface()) return;

    const checkUpdate = async () => {
      try {
        const remoteInfo = await fetchVersionInfo(VERSION_CHECK_URL);

        if (shouldShowUpdate(CURRENT_APP_VERSION, remoteInfo)) {
          setUpdateInfo(remoteInfo);
        }
      } catch {
        // Silently fail if offline
      }
    };

    // Check after a short delay to not block app startup
    const timer = setTimeout(checkUpdate, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">New version available</h4>
            <p className="text-gray-500 text-xs mt-1">
              Version {updateInfo.version} is ready to download
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <a
            href={updateInfo.apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
