/**
 * Translation Service — manages multilingual translation with LRU caching.
 *
 * CRITICAL SAFETY NOTE:
 * Safety-critical strings (evacuation notices, emergency messages) use the
 * STATIC_SAFETY_DICTIONARY and NEVER depend on a live LLM call. This ensures
 * emergency communications are always available regardless of API status.
 *
 * Non-critical content uses the Claude API, with an in-memory LRU cache
 * (keyed by text+targetLanguage) to avoid redundant API calls and control costs.
 */

import { LRUCache } from 'lru-cache';
import { callClaude, buildTranslationPrompt } from '../ai/claudeClient.js';

// ─── Static Safety Dictionary ─────────────────────────────────────────────────

/**
 * Pre-translated safety strings that must NEVER depend on a live LLM.
 * Maps: SafetyKey → { langCode → translation }
 *
 * These cover critical operational messages. Extend this dictionary for
 * production deployment with professional translator review.
 */
export const STATIC_SAFETY_DICTIONARY: Record<string, Record<string, string>> = {
  EMERGENCY_EVACUATE: {
    en: 'Emergency: Please evacuate calmly through the nearest exit.',
    es: 'Emergencia: Por favor evacúe calmadamente por la salida más cercana.',
    fr: "Urgence: Veuillez évacuer calmement par la sortie la plus proche.",
    ar: 'طارئ: يرجى الإخلاء بهدوء من خلال أقرب مخرج.',
    pt: 'Emergência: Por favor, evacue calmamente pela saída mais próxima.',
    de: 'Notfall: Bitte verlassen Sie das Gebäude ruhig durch den nächsten Ausgang.',
    zh: '紧急情况：请通过最近的出口冷静疏散。',
    ja: '緊急：最寄りの出口から落ち着いて避難してください。',
  },
  HOLD_IN_PLACE: {
    en: 'Please remain in your seats and await further instructions from staff.',
    es: 'Por favor permanezca en su asiento y espere más instrucciones del personal.',
    fr: "Veuillez rester à votre place et attendre d'autres instructions du personnel.",
    ar: 'يرجى البقاء في مقاعدكم وانتظار مزيد من التعليمات من الطاقم.',
    pt: 'Por favor, permaneça em seu assento e aguarde mais instruções da equipe.',
    de: 'Bitte bleiben Sie auf Ihrem Platz und warten Sie auf weitere Anweisungen des Personals.',
    zh: '请留在座位上，等待工作人员的进一步指示。',
    ja: 'お席に留まり、スタッフからの追加指示をお待ちください。',
  },
  GATES_NOW_OPEN: {
    en: 'Stadium gates are now open. Please proceed to your assigned gate.',
    es: 'Las puertas del estadio ya están abiertas. Diríjase a su puerta asignada.',
    fr: 'Les portes du stade sont maintenant ouvertes. Veuillez vous diriger vers votre porte désignée.',
    ar: 'أبواب الملعب مفتوحة الآن. يرجى التوجه إلى البوابة المخصصة لك.',
    pt: 'As portas do estádio já estão abertas. Dirija-se ao seu portão designado.',
    de: 'Die Stadionore sind jetzt geöffnet. Bitte begeben Sie sich zu Ihrem zugewiesenen Eingang.',
    zh: '体育场大门现已开放。请前往您指定的入口。',
    ja: 'スタジアムのゲートが開きました。指定されたゲートにお進みください。',
  },
  NO_REENTRY: {
    en: 'No re-entry is permitted once you have exited the stadium.',
    es: 'No se permite el reingreso una vez que haya salido del estadio.',
    fr: "La réentrée n'est pas autorisée une fois que vous avez quitté le stade.",
    ar: 'لا يُسمح بإعادة الدخول بمجرد مغادرة الملعب.',
    pt: 'Não é permitida a reentrada após sair do estádio.',
    de: 'Ein erneuter Einlass ist nach dem Verlassen des Stadions nicht gestattet.',
    zh: '一旦离开体育场，不允许重新入场。',
    ja: 'スタジアムを退場後の再入場は許可されていません。',
  },
};

// ─── LRU Cache ────────────────────────────────────────────────────────────────

/**
 * In-memory LRU cache for translation results.
 * Key: `${targetLanguage}:${text.slice(0, 200)}` (truncated for key length)
 * TTL: 10 minutes — translations don't change, but we don't want stale entries forever
 * Max: 500 entries — sufficient for a session without consuming excessive memory
 */
const translationCache = new LRUCache<string, string>({
  max: 500,
  ttl: 10 * 60 * 1000, // 10 minutes
});

/**
 * Generates a cache key for a translation request.
 * Truncates text to 200 chars for key length manageability.
 */
function makeCacheKey(text: string, targetLanguage: string): string {
  return `${targetLanguage}:${text.slice(0, 200)}`;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Looks up a safety-critical string from the static dictionary.
 *
 * This function NEVER calls the LLM. It is the only approved method
 * for translating safety-critical content.
 *
 * @param key - A key from STATIC_SAFETY_DICTIONARY
 * @param language - BCP-47 language code
 * @returns Translated string, or English fallback if language is unsupported
 */
export function getSafetyString(key: string, language: string = 'en'): string {
  const dict = STATIC_SAFETY_DICTIONARY[key];
  if (!dict) return key; // Unknown key — return as-is
  return dict[language] ?? dict['en'] ?? key;
}

/**
 * Translates arbitrary text using Claude API with LRU caching.
 *
 * Should NOT be used for safety-critical strings — use getSafetyString() instead.
 * Returns cached result if available, otherwise calls Claude API.
 *
 * @param text - Text to translate
 * @param targetLanguage - BCP-47 language code (e.g., "es", "fr", "ar")
 * @param context - Optional context hint (e.g., "stadium announcement", "wayfinding")
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  context: string = 'stadium announcement'
): Promise<string> {
  // No-op if target is English
  if (targetLanguage === 'en') return text;

  const cacheKey = makeCacheKey(text, targetLanguage);
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const promptOptions = buildTranslationPrompt(text, targetLanguage, context);
  const translated = await callClaude(promptOptions);

  translationCache.set(cacheKey, translated);
  return translated;
}

/**
 * Returns cache statistics for monitoring/debugging.
 */
export function getTranslationCacheStats(): { size: number; calculatedSize: number | undefined } {
  return {
    size: translationCache.size,
    calculatedSize: translationCache.calculatedSize,
  };
}
