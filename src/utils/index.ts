/**
 * Enterprise Utility Functions v40.0
 * 
 * Comprehensive utility library with:
 * - String manipulation
 * - Text processing
 * - WordPress helpers
 * - Validation utilities
 * - Formatting functions
 * - Performance helpers
 * 
 * @module src/utils
 */

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Converts a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncates text to a specified length with ellipsis
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Capitalizes the first letter of each word
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts text to sentence case
 */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Strips HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Escapes HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Unescapes HTML entities
 */
export function unescapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  };
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, entity => map[entity]);
}

// =============================================================================
// Text Analysis
// =============================================================================

/**
 * Counts words in a text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Counts characters (with or without spaces)
 */
export function countCharacters(text: string, includeSpaces = true): number {
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

/**
 * Counts sentences in a text
 */
export function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

/**
 * Counts paragraphs in a text
 */
export function countParagraphs(text: string): number {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
}

/**
 * Calculates reading time in minutes
 */
export function calculateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = countWords(text);
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Extracts keywords from text
 */
export function extractKeywords(text: string, minLength = 4): string[] {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
  ]);

  const frequency: Record<string, number> = {};
  for (const word of words) {
    if (word.length >= minLength && !stopWords.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// =============================================================================
// WordPress Helpers
// =============================================================================

/**
 * Formats content for WordPress
 */
export function formatForWordPress(content: string): string {
  return content
    .replace(/\n\n/g, '</p>\n<p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>');
}

/**
 * Generates WordPress excerpt
 */
export function generateExcerpt(content: string, maxLength = 155): string {
  const plainText = stripHtml(content);
  return truncate(plainText, maxLength);
}

/**
 * Generates meta description
 */
export function generateMetaDescription(content: string, maxLength = 160): string {
  const plainText = stripHtml(content)
    .replace(/\s+/g, ' ')
    .trim();
  return truncate(plainText, maxLength);
}

/**
 * Creates WordPress-compatible image tag
 */
export function createImageTag(
  src: string,
  alt: string,
  options: { width?: number; height?: number; className?: string } = {}
): string {
  const { width, height, className } = options;
  let tag = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"`;
  if (width) tag += ` width="${width}"`;
  if (height) tag += ` height="${height}"`;
  if (className) tag += ` class="${escapeHtml(className)}"`;
  tag += ' />';
  return tag;
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if string is empty or whitespace
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Validates string length
 */
export function isValidLength(
  text: string,
  min: number,
  max: number
): boolean {
  const length = text.length;
  return length >= min && length <= max;
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Formats a number with thousands separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Formats bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats date to a readable string
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const intervals: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];

  for (const [secondsInInterval, name] of intervals) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name}${interval !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

// =============================================================================
// Performance Utilities
// =============================================================================

/**
 * Debounces a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttles a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoizes a function
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Delays execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await delay(baseDelay * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

// =============================================================================
// Miscellaneous Utilities
// =============================================================================

/**
 * Generates a unique ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Picks specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Checks if two values are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Export all utilities
export default {
  slugify,
  truncate,
  titleCase,
  sentenceCase,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  countWords,
  countCharacters,
  countSentences,
  countParagraphs,
  calculateReadingTime,
  extractKeywords,
  formatForWordPress,
  generateExcerpt,
  generateMetaDescription,
  createImageTag,
  isValidEmail,
  isValidUrl,
  isEmpty,
  isValidLength,
  formatNumber,
  formatBytes,
  formatDate,
  formatRelativeTime,
  debounce,
  throttle,
  memoize,
  delay,
  retry,
  generateId,
  deepClone,
  pick,
  omit,
  deepEqual,
};
