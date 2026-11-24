export type ApiErrorKind =
  | 'missing-key'
  | 'invalid-key'
  | 'not-found'
  | 'rate-limited'
  | 'offline'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

const MESSAGES: Record<ApiErrorKind, { title: string; hint: string }> = {
  'missing-key': {
    title: 'TMDB API anahtarı gerekli',
    hint: 'İçerikleri görmek için Ayarlar bölümünden ücretsiz TMDB API anahtarınızı girin.',
  },
  'invalid-key': {
    title: 'API anahtarı geçersiz',
    hint: 'Girdiğiniz TMDB anahtarı reddedildi. Ayarlar bölümünden anahtarı kontrol edin.',
  },
  'not-found': { title: 'İçerik bulunamadı', hint: 'Aradığınız içerik TMDB’de mevcut değil ya da kaldırılmış olabilir.' },
  'rate-limited': { title: 'Çok fazla istek', hint: 'TMDB kısa süreliğine istekleri sınırladı. Birkaç saniye sonra tekrar deneyin.' },
  offline: { title: 'İnternet bağlantısı yok', hint: 'FILMHUB içerikleri internetten getirir. Bağlantınızı kontrol edip tekrar deneyin.' },
  network: { title: 'Bağlantı hatası', hint: 'TMDB sunucularına ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.' },
  timeout: { title: 'İstek zaman aşımına uğradı', hint: 'Sunucu yanıt vermedi. Lütfen tekrar deneyin.' },
  server: { title: 'TMDB sunucu hatası', hint: 'Sorun TMDB tarafında görünüyor. Biraz sonra tekrar deneyin.' },
  unknown: { title: 'Beklenmeyen bir hata oluştu', hint: 'Lütfen tekrar deneyin.' },
};

export class ApiError extends Error {
  readonly title: string;
  readonly hint: string;
  constructor(readonly kind: ApiErrorKind, readonly status?: number, detail?: string) {
    super(detail ?? MESSAGES[kind].title);
    this.name = 'ApiError';
    this.title = MESSAGES[kind].title;
    this.hint = MESSAGES[kind].hint;
  }
  get retryable() {
    return ['rate-limited', 'network', 'timeout', 'server', 'offline'].includes(this.kind);
  }
}

export function describeError(e: unknown): { title: string; hint: string; kind: ApiErrorKind } {
  if (e instanceof ApiError) return { title: e.title, hint: e.hint, kind: e.kind };
  return { ...MESSAGES.unknown, kind: 'unknown' };
}
