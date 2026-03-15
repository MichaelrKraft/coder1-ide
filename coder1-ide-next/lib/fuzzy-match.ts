/**
 * Fuzzy Matching Utilities
 *
 * Levenshtein distance and fuzzy matching for service name disambiguation.
 * Used by the Deployment Assistant when users mistype service names.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses the iterative matrix approach with O(min(a,b)) space.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  // Ensure a is the shorter string for space optimisation
  const [short, long] =
    aLower.length <= bLower.length ? [aLower, bLower] : [bLower, aLower];

  let prev = new Array<number>(short.length + 1);
  let curr = new Array<number>(short.length + 1);

  for (let i = 0; i <= short.length; i++) {
    prev[i] = i;
  }

  for (let j = 1; j <= long.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= short.length; i++) {
      const cost = short[i - 1] === long[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[short.length];
}

export interface FuzzyMatchResult {
  option: string;
  confidence: number;
}

/**
 * Score a query against a single target string (0 = no match, 1 = perfect).
 * Substring match scores higher than scattered char match.
 * Used by SlashCommandTypeahead for real-time command filtering.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 0.8 + (q.length / t.length) * 0.2;
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { score++; qi++; }
  }
  return qi < q.length ? 0 : (score / t.length) * 0.7;
}

/**
 * Find the best fuzzy matches for a query from a list of options.
 *
 * Returns matches sorted by confidence (descending).
 * Confidence is computed as `1 - (distance / maxLength)`.
 *
 * @param query     - The user's input string
 * @param options   - Available options to match against
 * @param threshold - Minimum confidence to include (default 0.4)
 */
export function fuzzyMatch(
  query: string,
  options: string[],
  threshold: number = 0.4
): FuzzyMatchResult[] {
  if (!query || options.length === 0) return [];

  const results: FuzzyMatchResult[] = [];

  for (const option of options) {
    const distance = levenshteinDistance(query, option);
    const maxLen = Math.max(query.length, option.length);
    const confidence = maxLen === 0 ? 1 : 1 - distance / maxLen;

    if (confidence >= threshold) {
      results.push({ option, confidence });
    }
  }

  // Sort by confidence descending, then alphabetically for stable ordering
  results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.option.localeCompare(b.option);
  });

  return results;
}
