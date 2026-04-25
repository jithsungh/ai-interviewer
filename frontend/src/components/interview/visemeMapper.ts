export const visemeMap = {
  rest: 'viseme_PP',
  aa: 'viseme_AA',
  oh: 'viseme_O',
  oo: 'viseme_U',
  ee: 'viseme_I',
  pp: 'viseme_PP',
  ff: 'viseme_FF',
  th: 'viseme_TH',
  kk: 'viseme_kk',
} as const;

export function getVisemeFromWord(word: string): string {
  if (!word) return visemeMap.rest;

  const lowerWord = word.toLowerCase();

  if (/oo|ew|ue/i.test(lowerWord)) return visemeMap.oo;
  if (/ee|ea|ie/i.test(lowerWord)) return visemeMap.ee;
  if (/ou|ow/i.test(lowerWord)) return visemeMap.oh;
  if (/uh|ug|un/i.test(lowerWord)) return visemeMap.oo;
  if (/ah|aw/i.test(lowerWord)) return visemeMap.aa;
  if (/th/i.test(lowerWord)) return visemeMap.th;
  if (/ng/i.test(lowerWord)) return visemeMap.kk;
  if (/sh|ch/i.test(lowerWord)) return visemeMap.ee;
  if (/wh/i.test(lowerWord)) return visemeMap.oo;

  const vowelCounts = {
    aa: (lowerWord.match(/[a]/g) || []).length,
    oh: (lowerWord.match(/[o]/g) || []).length,
    oo: (lowerWord.match(/[u]/g) || []).length,
    ee: (lowerWord.match(/[ei]/g) || []).length,
  };

  const dominantVowel = Object.entries(vowelCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantVowel && dominantVowel[1] > 0) {
    return visemeMap[dominantVowel[0] as keyof typeof vowelCounts];
  }

  if (/^[bpm]/i.test(lowerWord) || /[bpm]$/i.test(lowerWord)) return visemeMap.pp;
  if (/[fv]/i.test(lowerWord)) return visemeMap.ff;
  if (/[kgq]/i.test(lowerWord)) return visemeMap.kk;
  if (/[lr]/i.test(lowerWord)) return visemeMap.aa;
  if (/[w]/i.test(lowerWord)) return visemeMap.oo;

  return visemeMap.aa;
}

export function getVisemeFromChar(char: string): string {
  const lower = char.toLowerCase();
  if (/[bpm]/.test(lower)) return visemeMap.pp;
  if (/[fv]/.test(lower)) return visemeMap.ff;
  if (/[td]/.test(lower)) return visemeMap.th;
  if (/[kgq]/.test(lower)) return visemeMap.kk;
  if (/[a]/.test(lower)) return visemeMap.aa;
  if (/[o]/.test(lower)) return visemeMap.oh;
  if (/[u]/.test(lower)) return visemeMap.oo;
  if (/[ei]/.test(lower)) return visemeMap.ee;
  return visemeMap.aa;
}

export function getAllVisemeTargets() {
  return [
    'viseme_PP',
    'viseme_kk',
    'viseme_I',
    'viseme_AA',
    'viseme_O',
    'viseme_U',
    'viseme_FF',
    'viseme_TH',
  ];
}
