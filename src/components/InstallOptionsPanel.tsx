import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallOptionsPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWindows = /Windows/i.test(ua);
  const isElectron = /Electron/i.test(ua);

  const windowsInstallerUrl = import.meta.env.VITE_WINDOWS_INSTALLER_URL;
  const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL;

  const canInstallPwa = useMemo(() => deferredPrompt !== null && !installed && !isElectron, [deferredPrompt, installed, isElectron]);

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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="card space-y-3 p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Desktop Windows (Electron)</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">
          Instalacao nativa para Windows, sem depender do menu do navegador.
        </div>
        {windowsInstallerUrl ? (
          <a className="btn-primary" href={windowsInstallerUrl} target="_blank" rel="noreferrer">
            Baixar instalador .exe
          </a>
        ) : (
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Defina `VITE_WINDOWS_INSTALLER_URL` no `.env` para habilitar o download.
          </div>
        )}
        {isWindows && !isElectron ? (
          <div className="text-[11px] text-gray-500 dark:text-slate-400">Ambiente detectado: Windows no navegador.</div>
        ) : null}
      </div>

      <div className="card space-y-3 p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Android (APK da PWA)</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">
          Gere e publique um APK usando Trusted Web Activity para distribuicao fora do navegador.
        </div>
        {androidApkUrl ? (
          <a className="btn-primary" href={androidApkUrl} target="_blank" rel="noreferrer">
            Baixar APK
          </a>
        ) : (
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Defina `VITE_ANDROID_APK_URL` no `.env` quando o APK estiver publicado.
          </div>
        )}
        {canInstallPwa ? (
          <button type="button" className="btn-ghost" onClick={installPwa} disabled={installing}>
            {installing ? 'Abrindo...' : 'Instalar PWA neste dispositivo'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
