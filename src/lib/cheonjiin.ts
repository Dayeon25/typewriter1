/**
 * Cheonjiin Hangeul Input Logic
 * 
 * Basic Keys:
 * 1: ㅣ (Vertical)
 * 2: ㆍ (Dot)
 * 3: ㅡ (Horizontal)
 * 
 * Combinations:
 * ㅣ + ㆍ = ㅏ
 * ㆍ + ㅣ = ㅓ
 * ㅡ + ㆍ = ㅜ
 * ㆍ + ㅡ = ㅗ
 * ㅏ + ㆍ = ㅑ
 * ㆍ + ㅓ = ㅕ
 * ... and so on.
 */

// This is a simplified Hangeul composer for Cheonjiin.
// In a real app, we'd use a more comprehensive library like 'hangul-js'
// but we'll implement the core logic here.

export const CHEONJIIN_MAP: Record<string, string> = {
  "ㅣ": "ㅣ",
  "ㆍ": "ㆍ",
  "ㅡ": "ㅡ",
};

// Mapping of Cheonjiin sequences to Hangeul vowels
export const VOWEL_COMBINATIONS: Record<string, string> = {
  "ㅣㆍ": "ㅏ",
  "ㆍㅣ": "ㅓ",
  "ㅡㆍ": "ㅜ",
  "ㆍㅡ": "ㅗ",
  "ㅏㆍ": "ㅑ",
  "ㆍㅓ": "ㅕ",
  "ㅜㆍ": "ㅠ",
  "ㆍㅗ": "ㅛ",
  "ㅣㆍㅣ": "ㅐ",
  "ㆍㅣㅣ": "ㅔ",
  "ㅏㅣ": "ㅐ",
  "ㅓㅣ": "ㅔ",
  "ㅑㅣ": "ㅒ",
  "ㅕㅣ": "ㅖ",
  "ㅗㅣ": "ㅚ",
  "ㅜㅣ": "ㅟ",
  "ㅗㅏ": "ㅘ",
  "ㅗㅐ": "ㅙ",
  "ㅜㅓ": "ㅝ",
  "ㅜㅔ": "ㅞ",
  "ㅡㅣ": "ㅢ",
};

// Consonant keys (standard Cheonjiin layout)
export const CONSONANT_KEYS = [
  { label: "ㄱㅋ", chars: ["ㄱ", "ㅋ", "ㄲ"] },
  { label: "ㄴㄹ", chars: ["ㄴ", "ㄹ"] },
  { label: "ㄷㅌ", chars: ["ㄷ", "ㅌ", "ㄸ"] },
  { label: "ㅂㅍ", chars: ["ㅂ", "ㅍ", "ㅃ"] },
  { label: "ㅅㅎ", chars: ["ㅅ", "ㅎ", "ㅆ"] },
  { label: "ㅈㅊ", chars: ["ㅈ", "ㅊ", "ㅉ"] },
  { label: "ㅇㅁ", chars: ["ㅇ", "ㅁ"] },
];

export function getNextChar(current: string, chars: string[]): string {
  const idx = chars.indexOf(current);
  if (idx === -1) return chars[0];
  return chars[(idx + 1) % chars.length];
}
