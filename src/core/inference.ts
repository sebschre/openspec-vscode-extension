import * as vscode from 'vscode';

export interface InferredChangeNameResult {
  name: string;
  isAi: boolean;
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  // Common intent filler words
  'please', 'want', 'need', 'like'
]);

/**
 * Sanitizes arbitrary text into a valid kebab-case slug.
 * Returns empty string if invalid.
 */
export function sanitizeKebabSlug(raw: string): string {
  if (!raw) {
    return '';
  }
  // Strip code blocks, quotes, and punctuation
  let cleaned = raw
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/[`"']/g, '')
    .trim();

  // Pick first non-empty line
  const firstLine = cleaned.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
  
  cleaned = firstLine
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleaned.length < 2) {
    return '';
  }

  // Ensure it fits reasonable slug length
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50).replace(/-+$/, '');
  }

  return cleaned;
}

/**
 * Offline rule-based slugifier that strips stop words and derives a 2-4 word kebab slug.
 */
export function heuristicSlugify(description: string): string {
  if (!description || !description.trim()) {
    return 'new-change';
  }

  const rawWords = description
    .toLowerCase()
    .match(/[a-z0-9]+/g);

  if (!rawWords || rawWords.length === 0) {
    return 'new-change';
  }

  // Filter out stop words
  const filteredWords = rawWords.filter((w) => !STOP_WORDS.has(w));
  const wordsToUse = filteredWords.length > 0 ? filteredWords : rawWords;

  // Take first 4 keywords
  const selected = wordsToUse.slice(0, 4);
  const slug = selected.join('-');

  return sanitizeKebabSlug(slug) || 'new-change';
}

/**
 * Infers a kebab-case change name from a user description using vscode.lm with fallback to heuristicSlugify.
 */
export async function inferChangeName(
  description: string,
  token?: vscode.CancellationToken
): Promise<InferredChangeNameResult> {
  const trimmed = description ? description.trim() : '';
  if (!trimmed) {
    return { name: 'new-change', isAi: false };
  }

  // Try vscode.lm if available
  if (vscode.lm && typeof vscode.lm.selectChatModels === 'function') {
    try {
      const models = await vscode.lm.selectChatModels();
      if (models && models.length > 0) {
        const model = models[0];
        const messages = [
          vscode.LanguageModelChatMessage.User(
            `You are an expert software developer naming an OpenSpec change based on this description:\n"${trimmed}"\n\nReturn ONLY a concise 2-4 word kebab-case slug (e.g. "add-user-auth", "fix-nav-contrast", "update-table-styling"). Do not include explanations, markdown formatting, or quotes.`
          ),
        ];

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Inference timed out')), 3500)
        );

        const requestPromise = (async () => {
          const response = await model.sendRequest(messages, {}, token);
          let fullText = '';
          for await (const chunk of response.text) {
            fullText += chunk;
          }
          return fullText;
        })();

        const rawResult = await Promise.race([requestPromise, timeoutPromise]);
        const cleaned = sanitizeKebabSlug(rawResult);
        if (cleaned && cleaned.length >= 3) {
          return { name: cleaned, isAi: true };
        }
      }
    } catch {
      // Fall through to heuristic on any LM failure or timeout
    }
  }

  return { name: heuristicSlugify(trimmed), isAi: false };
}
