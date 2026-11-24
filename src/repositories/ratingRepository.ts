import { storage } from '../db';
import { emit } from '../services/events';
import type { MediaItem, PersonalRating, PersonalReview } from '../types/db';
import type { MediaKey } from '../types/media';
import { mediaRepository } from './mediaRepository';

export const MAX_REVIEW_LENGTH = 5000;

/** 0–10 aralığında, 0,5'lik adımlara yuvarlanmış geçerli bir puan mı? */
export function isValidRating(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 10 && Math.round(value * 2) === value * 2;
}

/**
 * Kişisel puan ve yorumlar. Topluluk (TMDB) puanlarından tamamen ayrı tutulur.
 */
export const ratingRepository = {
  getRating: (key: MediaKey) => storage().get<PersonalRating>('ratings', key),
  getAllRatings: () => storage().getAll<PersonalRating>('ratings'),

  async setRating(item: MediaItem, value: number) {
    if (!isValidRating(value)) throw new RangeError('Puan 0 ile 10 arasında ve 0,5 adımlarla olmalıdır');
    await mediaRepository.upsert(item);
    const existing = await storage().get<PersonalRating>('ratings', item.key);
    const now = Date.now();
    await storage().put<PersonalRating>('ratings', {
      key: item.key,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    emit('ratings');
  },

  async deleteRating(key: MediaKey) {
    await storage().delete('ratings', key);
    emit('ratings');
  },

  getReview: (key: MediaKey) => storage().get<PersonalReview>('reviews', key),
  getAllReviews: () => storage().getAll<PersonalReview>('reviews'),

  async setReview(item: MediaItem, text: string) {
    const clean = text.trim();
    if (!clean) throw new Error('Yorum boş olamaz');
    if (clean.length > MAX_REVIEW_LENGTH) throw new RangeError(`Yorum en fazla ${MAX_REVIEW_LENGTH} karakter olabilir`);
    await mediaRepository.upsert(item);
    const existing = await storage().get<PersonalReview>('reviews', item.key);
    const now = Date.now();
    await storage().put<PersonalReview>('reviews', {
      key: item.key,
      text: clean,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    emit('ratings');
  },

  async deleteReview(key: MediaKey) {
    await storage().delete('reviews', key);
    emit('ratings');
  },
};
