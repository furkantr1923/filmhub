/**
 * API anahtarı yönetimi.
 * Öncelik: kullanıcının Ayarlar'dan girdiği anahtar → derleme sırasında .env ile verilen anahtar.
 * Kaynak kodda hiçbir gizli anahtar bulunmaz.
 */
declare const __BUILD_TMDB_KEY__: string;

let userKey: string | null = null;

export const buildKey: string = typeof __BUILD_TMDB_KEY__ === 'string' ? __BUILD_TMDB_KEY__ : '';

export function setUserApiKey(key: string | null) {
  userKey = key?.trim() || null;
}

export function getApiKey(): string | null {
  return userKey || buildKey || null;
}

export function hasApiKey() {
  return !!getApiKey();
}

export function keySource(): 'user' | 'build' | 'none' {
  if (userKey) return 'user';
  if (buildKey) return 'build';
  return 'none';
}
