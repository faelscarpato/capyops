import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWindows = /Windows/i.test(ua);
  const isElectron = /Electron/i.test(ua);
  const windowsInstallerUrl = import.meta.env.VITE_WINDOWS_INSTALLER_URL;

  const canShow = useMemo(() => {
    if (installed || isElectron) return false;
    if (isWindows) return Boolean(windowsInstallerUrl);
    return deferredPrompt !== null;
  }, [deferredPrompt, installed, isElectron, isWindows, windowsInstallerUrl]);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    if (media.matches) {
      setInstalled(true);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function installPwa() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (!canShow) return null;

  return (
    <div className="mb-4 rounded-xl border p-3 text-xs bg-[color:var(--surface-2)] border-[color:var(--border)] text-[color:var(--text)]">
      {isWindows ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>No Windows, instale a versao desktop para usar como aplicativo nativo.</span>
          <a
            className="btn-primary"
            href={windowsInstallerUrl}
            target="_blank"
            rel="noreferrer"
          >
            Instalar para Windows
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Instale o CapyOps neste dispositivo para acesso rapido.</span>
          <button type="button" className="btn-primary" onClick={installPwa} disabled={installing}>
            {installing ? 'Abrindo...' : 'Instalar app'}
          </button>
        </div>
      )}
    </div>
  );
}
