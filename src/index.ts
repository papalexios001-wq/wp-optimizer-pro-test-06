/**
 * WP Optimizer Pro v40.0 - Main Entry Point
 * 
 * Enterprise SOTA AI-Powered WordPress Content Intelligence Platform
 * 
 * @module wp-optimizer-pro
 */

// =============================================================================
// Core Exports
// =============================================================================

// API Service - Multi-provider AI client with enterprise patterns
export { apiService, APIService } from './core/services/api-service';
export type {
  APIRequestConfig,
  APIResponse,
  APIError,
  StreamChunk,
} from './core/services/api-service';

// Content Engine - Multi-stage generation pipeline
export { contentEngine, ContentEngine, PromptBuilder, QualityAnalyzer } from './core/engine/content-engine';
export type {
  GenerationPipeline,
  PipelineStage,
  GenerationContext,
  PipelineConfig,
  ContentTone,
  ContentFormat,
  GenerationResult,
  ContentOutline,
  OutlineSection,
} from './core/engine/content-engine';

// State Management - Zustand-inspired store
export { store, actions, selectors, createStore } from './core/store/app-store';
export type {
  GenerationStatus,
  GenerationProgress,
  GenerationHistory,
  AppState,
} from './core/store/app-store';

// =============================================================================
// Utility Exports
// =============================================================================

export {
  // String utilities
  slugify,
  truncate,
  titleCase,
  sentenceCase,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  
  // Text analysis
  countWords,
  countCharacters,
  countSentences,
  countParagraphs,
  calculateReadingTime,
  extractKeywords,
  
  // WordPress helpers
  formatForWordPress,
  generateExcerpt,
  generateMetaDescription,
  createImageTag,
  
  // Validation
  isValidEmail,
  isValidUrl,
  isEmpty,
  isValidLength,
  
  // Formatting
  formatNumber,
  formatBytes,
  formatDate,
  formatRelativeTime,
  
  // Performance
  debounce,
  throttle,
  memoize,
  delay,
  retry,
  
  // Misc
  generateId,
  deepClone,
  pick,
  omit,
  deepEqual,
} from './utils';

// =============================================================================
// Type Re-exports
// =============================================================================

export type {
  APIKeyConfig,
  ApiKeys,
  ContentContract,
  FAQItem,
  TOCItem,
  SchemaMarkup,
  GenerateConfig,
  InternalLinkTarget,
  InternalLinkResult,
  CrawledPage,
  SitemapPage,
  JobState,
  OpportunityScore,
  SeoMetrics,
  QAValidationResult,
  EntityGapAnalysis,
  CompetitorAnalysis,
  SerpFeature,
  ValidatedReference,
  YouTubeVideoData,
  YouTubeSearchResult,
  NeuronTerm,
  GodModePhase,
  BulkGenerationResult,
  Toast,
} from '../types';

// =============================================================================
// Version & Constants
// =============================================================================

export const VERSION = '40.0.0';
export const APP_NAME = 'WP Optimizer Pro';

// Default configuration
export const DEFAULT_CONFIG = {
  provider: 'openai' as const,
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 4096,
  enableStreaming: true,
  enableCaching: true,
  enableRateLimiting: true,
};

// =============================================================================
// Quick Start Functions
// =============================================================================

/**
 * Initialize the WP Optimizer Pro with API keys
 */
export function initialize(apiKeys: Partial<import('../types').APIKeyConfig>): void {
  apiService.setAPIKeys(apiKeys);
}

/**
 * Generate content with default settings
 */
export async function generateContent(
  topic: string,
  options?: Partial<import('./core/engine/content-engine').GenerationContext>
): Promise<import('./core/engine/content-engine').GenerationResult> {
  return contentEngine.generate({
    topic,
    keywords: options?.keywords || [],
    targetWordCount: options?.targetWordCount || 1500,
    tone: options?.tone || 'professional',
    format: options?.format || 'blog-post',
    metadata: options?.metadata || {},
  });
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  VERSION,
  APP_NAME,
  DEFAULT_CONFIG,
  apiService: apiService
  contentEngine: contentEngine
  store: store
  actions: actions
  selectors: selectors
  initialize,
  generateContent,
};
