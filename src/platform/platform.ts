/**
 * Platform adaptörü: Web, Windows (Electron) ve Android (Capacitor) arasındaki küçük
 * farkları tek yerde toplar. Uygulamanın geri kalanı platformu bilmek zorunda kalmaz.
 */
interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
    filmhubDesktop?: { platform: string; version: string };
  }
}

export type PlatformName = 'web' | 'windows' | 'android';

export function platform(): PlatformName {
  if (typeof window === 'undefined') return 'web';
  if (window.filmhubDesktop || /Electron/i.test(navigator.userAgent)) return 'windows';
  if (window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.() === 'android') return 'android';
  return 'web';
}

export const PLATFORM_LABEL: Record<PlatformName, string> = {
  web: 'Web',
  windows: 'Windows',
  android: 'Android',
};

/** Dış bağlantıyı sistem tarayıcısında açar. */
export function openExternal(url: string) {
  if (!/^https:\/\//.test(url)) return;
  if (platform() === 'android') {
    // Capacitor, uygulama dışı adresleri otomatik olarak sistem tarayıcısına yönlendirir
    window.location.href = url;
  } else {
    // Electron'da ana süreç bu isteği yakalayıp varsayılan tarayıcıda açar
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
