import { tmdb, type DiscoverFilters } from '../api/tmdb';
import type { MediaSummary, MediaType, Paged } from '../types/media';

/**
 * Ana sayfadaki her şeridin "Tümü" sayfası ve küratörlü koleksiyonlar.
 * Küratörlü koleksiyonlar elle seçilmiş veriler değil, TMDB keşif filtreleriyle tanımlanmış
 * şeffaf listelerdir (ör. "Türkiye yapımı, en çok oylanan filmler").
 */
export interface ListDef {
  slug: string;
  title: string;
  description: string;
  fetch: (page: number) => Promise<Paged<MediaSummary>>;
}

const discover = (type: MediaType, f: DiscoverFilters) => (page: number) => tmdb.discover(type, f, page);

export const LISTS: ListDef[] = [
  { slug: 'populer-filmler', title: 'Popüler Filmler', description: 'Şu anda en çok ilgi gören filmler', fetch: tmdb.popularMovies },
  { slug: 'trend-filmler', title: 'Bu Haftanın Trend Filmleri', description: 'Son 7 günün trend filmleri', fetch: (p) => tmdb.trending('movie', 'week', p) },
  { slug: 'trend-diziler', title: 'Bu Haftanın Trend Dizileri', description: 'Son 7 günün trend dizileri', fetch: (p) => tmdb.trending('tv', 'week', p) },
  { slug: 'populer-diziler', title: 'Popüler Diziler', description: 'Şu anda en çok ilgi gören diziler', fetch: tmdb.popularTv },
  { slug: 'belgeseller', title: 'Popüler Belgeseller', description: 'En çok izlenen belgesel filmler', fetch: tmdb.popularDocumentaries },
  { slug: 'en-iyi-filmler', title: 'En Yüksek Puanlı Filmler', description: 'TMDB topluluk puanına göre', fetch: tmdb.topRatedMovies },
  { slug: 'en-iyi-diziler', title: 'En Yüksek Puanlı Diziler', description: 'TMDB topluluk puanına göre', fetch: tmdb.topRatedTv },
  { slug: 'yakinda', title: 'Yakında Vizyonda', description: 'Türkiye’de yakında gösterime girecek filmler', fetch: tmdb.upcomingMovies },
  { slug: 'yeni-cikanlar', title: 'Yeni Çıkanlar', description: 'Türkiye’de şu anda vizyonda olan filmler', fetch: tmdb.nowPlayingMovies },
];

export interface CuratedDef extends ListDef {
  type: MediaType;
}

export const CURATED: CuratedDef[] = [
  { slug: 'turk-sinemasi', type: 'movie', title: 'Türk Sineması', description: 'Türkiye yapımı, en çok oylanan filmler', fetch: discover('movie', { country: 'TR', sort: 'votes' }) },
  { slug: 'bilim-kurgu', type: 'movie', title: 'Bilim Kurgu Başyapıtları', description: 'Bilim kurgu türünde en yüksek puanlı filmler', fetch: discover('movie', { genreId: 878, sort: 'rating', minVotes: 1500 }) },
  { slug: 'doksanlar', type: 'movie', title: '90’ların Klasikleri', description: '1990–1999 arası en çok oylanan filmler', fetch: discover('movie', { decade: 1990, sort: 'votes' }) },
  { slug: 'kore-dizileri', type: 'tv', title: 'Kore Dizileri', description: 'Güney Kore yapımı popüler diziler', fetch: discover('tv', { country: 'KR', sort: 'popularity', minVotes: 50 }) },
  { slug: 'animasyon', type: 'movie', title: 'Animasyon Dünyası', description: 'En çok oylanan animasyon filmleri', fetch: discover('movie', { genreId: 16, sort: 'votes' }) },
  { slug: 'gerilim', type: 'movie', title: 'Nefes Kesen Gerilimler', description: 'Gerilim türünde en yüksek puanlı filmler', fetch: discover('movie', { genreId: 53, sort: 'rating', minVotes: 1500 }) },
  { slug: 'belgesel-diziler', type: 'tv', title: 'Belgesel Diziler', description: 'Popüler belgesel dizileri', fetch: discover('tv', { genreId: 99, sort: 'popularity', minVotes: 20 }) },
  { slug: 'komedi', type: 'movie', title: 'Kahkaha Garantili', description: 'Komedi türünde en çok oylanan filmler', fetch: discover('movie', { genreId: 35, sort: 'votes' }) },
];

export function findList(slug: string): ListDef | undefined {
  return LISTS.find((l) => l.slug === slug) ?? CURATED.find((c) => c.slug === slug);
}
