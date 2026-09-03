/**
 * Search normalization and alias expansion for anime queries.
 * Handles common abbreviations, Japanese/English synonyms, common typos,
 * and punctuation differences to provide robust, non-exact-matching search.
 */

// Common acronyms and abbreviations mapped to full canonical titles
export const ANIME_ABBREVIATIONS: Record<string, string> = {
  db: "Dragon Ball",
  dbz: "Dragon Ball Z",
  dbs: "Dragon Ball Super",
  dbgt: "Dragon Ball GT",
  aot: "Attack on Titan",
  snk: "Attack on Titan",
  mha: "My Hero Academia",
  bnha: "My Hero Academia",
  jjk: "Jujutsu Kaisen",
  opm: "One Punch Man",
  sao: "Sword Art Online",
  hxh: "Hunter x Hunter",
  fmab: "Fullmetal Alchemist: Brotherhood",
  fma: "Fullmetal Alchemist",
  kny: "Demon Slayer: Kimetsu no Yaiba",
  ds: "Demon Slayer",
  csm: "Chainsaw Man",
  mt: "Mushoku Tensei",
  sl: "Solo Leveling",
  onk: "Oshi no Ko",
  sxf: "Spy x Family",
  eva: "Neon Genesis Evangelion",
  nge: "Neon Genesis Evangelion",
  klk: "Kill la Kill",
  ttgl: "Tengen Toppa Gurren Lagann",
  konosuba: "KonoSuba: God's Blessing on this Wonderful World!",
  danmachi: "Is It Wrong to Try to Pick Up Girls in a Dungeon?",
  oregairu: "My Teen Romantic Comedy SNAFU",
  tensura: "That Time I Got Reincarnated as a Slime",
  bocchi: "Bocchi the Rock!",
  jjba: "JoJo's Bizarre Adventure",
  jojo: "JoJo's Bizarre Adventure",
  gto: "Great Teacher Onizuka",
  op: "One Piece",
  "86": "86 Eighty-Six",
  "tybw": "Bleach: Thousand-Year Blood War",
  "bleach tybw": "Bleach: Thousand-Year Blood War",
  "cote": "Classroom of the Elite",
  "saiki k": "The Disastrous Life of Saiki K.",
  "rezero": "Re:Zero - Starting Life in Another World",
  "re zero": "Re:Zero - Starting Life in Another World",
  "shield hero": "The Rising of the Shield Hero",
  "eminence in shadow": "The Eminence in Shadow",
  "overlord": "Overlord",
};

// Common typos and keyword replacements
export const COMMON_TYPOS: Record<string, string> = {
  nartuo: "naruto",
  narutoo: "naruto",
  jujustu: "jujutsu",
  jujitsu: "jujutsu",
  "hunter hunter": "hunter x hunter",
  "attack on titans": "attack on titan",
  "attack ontitan": "attack on titan",
  "onepiece": "one piece",
  "deathnote": "death note",
  "tokyo goul": "tokyo ghoul",
  "tokyoghoul": "tokyo ghoul",
  "stein gate": "steins;gate",
  "steins gate": "steins;gate",
  "full metal": "fullmetal",
  "full metal alchemist": "fullmetal alchemist",
  "demon slayers": "demon slayer",
  "code geas": "code geass",
  "haikyu": "haikyuu!!",
  "mob psycho": "mob psycho 100",
  "vinland": "vinland saga",
  "hero academia": "my hero academia",
  "chainsawman": "chainsaw man",
  "sololeveling": "solo leveling",
};

/**
 * Strips punctuation and collapses extra whitespace.
 */
export function cleanSearchText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes an anime search query:
 * 1. Checks for direct abbreviation match (e.g. "dbz", "aot")
 * 2. Checks for known typos (e.g. "nartuo", "jujustu")
 * 3. Strips disruptive punctuation while preserving alphanumerics
 * 4. Normalizes whitespace
 */
export function normalizeSearchQuery(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact abbreviation check
  if (ANIME_ABBREVIATIONS[lower]) {
    return ANIME_ABBREVIATIONS[lower];
  }

  // 2. Exact typo check
  if (COMMON_TYPOS[lower]) {
    return COMMON_TYPOS[lower];
  }

  // 3. Check for multi-word phrases containing typos/abbreviations
  let processed = lower;
  for (const [typo, replacement] of Object.entries(COMMON_TYPOS)) {
    if (processed.includes(typo)) {
      processed = processed.replaceAll(typo, replacement);
    }
  }

  for (const [abbr, expansion] of Object.entries(ANIME_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, "i");
    if (regex.test(processed)) {
      processed = processed.replace(regex, expansion);
    }
  }

  // If replacement occurred, return cleaned version of expansion
  if (processed !== lower) {
    return cleanSearchText(processed);
  }

  // 4. Return cleaned text without punctuation
  const cleaned = cleanSearchText(trimmed);
  return cleaned || trimmed;
}

/**
 * Removes season, part, or cour suffixes (e.g. "season 2", "part 2", "2nd season", "cour 1")
 * so searches targeting sequels don't fail when upstream databases store only the base title.
 */
export function stripSeasonSuffix(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b(season\s*\d+|part\s*\d+|cour\s*\d+|\d+(st|nd|rd|th)\s*season)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns an ordered array of candidate queries to try in fallback order.
 * Ensures that if a transformed query yields 0 results, the raw or variant
 * query can be attempted automatically without failing the user's search.
 */
export function getSearchCandidates(raw: string): string[] {
  if (!raw) return [];
  const candidates: string[] = [];
  const trimmed = raw.trim();
  const normalized = normalizeSearchQuery(trimmed);

  if (normalized) {
    candidates.push(normalized);
  }

  if (trimmed && trimmed.toLowerCase() !== normalized.toLowerCase()) {
    candidates.push(trimmed);
  }

  const cleaned = cleanSearchText(trimmed);
  if (cleaned && !candidates.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
    candidates.push(cleaned);
  }

  // Last-resort candidate: stripped query removing "season 2", "part 2", etc.
  const stripped = stripSeasonSuffix(normalized || trimmed);
  if (stripped && stripped.length >= 2 && !candidates.some((c) => c.toLowerCase() === stripped.toLowerCase())) {
    candidates.push(stripped);
  }

  return candidates;
}
