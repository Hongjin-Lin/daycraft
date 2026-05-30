import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

const CURRENT_VERSION = '1.0.0';
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/Hongjin-Lin/daycraft/master/public/version.json';

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; apkUrl: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only check on native platforms (Android app)
    const isNative = window.location.protocol === 'file:';
    if (!isNative) return;

    fetch(VERSION_CHECK_URL)
      .then(res => res.json())
      .then(data => {
        if (data.version && data.version !== CURRENT_VERSION) {
          setUpdateInfo(data);
        }
      })
      .catch(() => {}); // Silently fail if offline
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-w-md mx-auto">
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
          <Button
            asChild
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <a href={updateInfo.apkUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Download Update
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissed(true)}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
