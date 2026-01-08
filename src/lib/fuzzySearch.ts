/**
 * Simple fuzzy search implementation
 * Returns a score between 0 and 1, where 1 is a perfect match
 */
export function fuzzyMatch(pattern: string, text: string): number {
  if (!pattern || !text) return 0;
  
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();
  
  // Exact match
  if (text === pattern) return 1;
  
  // Contains match
  if (text.includes(pattern)) return 0.9;
  
  let patternIdx = 0;
  let textIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;
  
  while (patternIdx < pattern.length && textIdx < text.length) {
    if (pattern[patternIdx] === text[textIdx]) {
      score += 1 + consecutiveMatches * 0.5; // Bonus for consecutive matches
      consecutiveMatches++;
      patternIdx++;
    } else {
      consecutiveMatches = 0;
    }
    textIdx++;
  }
  
  // Pattern fully matched
  if (patternIdx === pattern.length) {
    // Normalize score
    const maxScore = pattern.length + (pattern.length - 1) * 0.5;
    return Math.min(0.8, score / maxScore);
  }
  
  return 0;
}

/**
 * Search through an array of items using fuzzy matching
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string | string[],
  threshold: number = 0.3
): T[] {
  if (!query.trim()) return items;
  
  const results = items
    .map((item) => {
      const searchableText = getSearchableText(item);
      const texts = Array.isArray(searchableText) ? searchableText : [searchableText];
      
      // Get the best match score across all searchable fields
      const bestScore = Math.max(
        ...texts.map((text) => fuzzyMatch(query, text || ''))
      );
      
      return { item, score: bestScore };
    })
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score);
  
  return results.map(({ item }) => item);
}

/**
 * Highlight matching parts of text
 */
export function highlightMatch(text: string, query: string): { text: string; highlight: boolean }[] {
  if (!query || !text) return [{ text, highlight: false }];
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return [{ text, highlight: false }];
  }
  
  const result: { text: string; highlight: boolean }[] = [];
  
  if (index > 0) {
    result.push({ text: text.slice(0, index), highlight: false });
  }
  
  result.push({ text: text.slice(index, index + query.length), highlight: true });
  
  if (index + query.length < text.length) {
    result.push({ text: text.slice(index + query.length), highlight: false });
  }
  
  return result;
}