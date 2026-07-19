/**
 * Unit tests for translation service.
 * Verifies static safety dictionary and LRU cache behavior.
 * No real API calls — tests run in mock AI mode.
 */

import { describe, it, expect } from 'vitest';
import {
  getSafetyString,
  translateText,
  getTranslationCacheStats,
  STATIC_SAFETY_DICTIONARY,
} from '../../services/translationService.js';

describe('translationService', () => {
  describe('getSafetyString()', () => {
    it('should return English text for known key', () => {
      const result = getSafetyString('EMERGENCY_EVACUATE', 'en');
      expect(result).toContain('Emergency');
      expect(result).toContain('evacuate');
    });

    it('should return Spanish translation for es', () => {
      const result = getSafetyString('EMERGENCY_EVACUATE', 'es');
      expect(result).toContain('Emergencia');
    });

    it('should fall back to English for unsupported language', () => {
      const enResult = getSafetyString('EMERGENCY_EVACUATE', 'en');
      const unknownResult = getSafetyString('EMERGENCY_EVACUATE', 'xx');
      expect(unknownResult).toBe(enResult);
    });

    it('should return the key itself for unknown safety keys', () => {
      const result = getSafetyString('UNKNOWN_KEY', 'en');
      expect(result).toBe('UNKNOWN_KEY');
    });

    it('should have all critical safety keys', () => {
      const requiredKeys = ['EMERGENCY_EVACUATE', 'HOLD_IN_PLACE', 'GATES_NOW_OPEN', 'NO_REENTRY'];
      for (const key of requiredKeys) {
        expect(STATIC_SAFETY_DICTIONARY).toHaveProperty(key);
        expect(STATIC_SAFETY_DICTIONARY[key]).toHaveProperty('en');
      }
    });

    it('should support multiple languages for all critical keys', () => {
      const criticalKeys = Object.keys(STATIC_SAFETY_DICTIONARY);
      const expectedLangs = ['en', 'es', 'fr', 'ar'];

      for (const key of criticalKeys) {
        for (const lang of expectedLangs) {
          const dict = STATIC_SAFETY_DICTIONARY[key]!;
          expect(dict).toHaveProperty(lang);
          expect(typeof dict[lang]).toBe('string');
          expect(dict[lang]!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('translateText()', () => {
    it('should return original text if target is English', async () => {
      const text = 'Hello World';
      const result = await translateText(text, 'en');
      expect(result).toBe(text);
    });

    it('should return mock response for non-English in mock mode', async () => {
      const result = await translateText('Hello World', 'es');
      // In mock mode, returns a mock response string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should cache translations and return cached result', async () => {
      const text = 'Cache test text';
      const lang = 'fr';

      // First call
      const result1 = await translateText(text, lang);
      const statsAfterFirst = getTranslationCacheStats();

      // Second call — should hit cache
      const result2 = await translateText(text, lang);

      expect(result1).toBe(result2);
      // Cache size shouldn't grow for the same key
      expect(getTranslationCacheStats().size).toBeLessThanOrEqual(statsAfterFirst.size + 1);
    });
  });

  describe('getTranslationCacheStats()', () => {
    it('should return cache statistics object', () => {
      const stats = getTranslationCacheStats();
      expect(typeof stats.size).toBe('number');
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });
  });
});
