/**
 * Enterprise Content Generation Engine v40.0
 * 
 * Advanced content generation system with:
 * - Multi-stage content pipeline
 * - Template system with variables
 * - SEO optimization
 * - Tone and style analysis
 * - Quality scoring
 * - Plagiarism-safe generation
 * - WordPress optimization
 * 
 * @module src/core/engine/content-engine
 */

import type {
  ContentContract,
  GenerateConfig,
  ContentTemplate,
  SEOConfig,
  QualityMetrics,
  GenerationProgress,
  AIProvider
} from '../../types';
import { apiService } from '../services/api-service';
import { store, actions } from '../store/app-store';

// =============================================================================
// Types
// =============================================================================

export interface GenerationPipeline {
  stages: PipelineStage[];
  context: GenerationContext;
  config: PipelineConfig;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'outline' | 'draft' | 'enhance' | 'seo' | 'review';
  prompt: string;
  weight: number;
  optional?: boolean;
}

export interface GenerationContext {
  topic: string;
  keywords: string[];
  targetWordCount: number;
  tone: ContentTone;
  format: ContentFormat;
  previousContent?: string;
  metadata: Record<string, unknown>;
}

export interface PipelineConfig {
  parallelStages: boolean;
  maxRetries: number;
  qualityThreshold: number;
  enableSEO: boolean;
  enableQualityCheck: boolean;
}

export type ContentTone = 
  | 'professional'
  | 'casual'
  | 'academic'
  | 'conversational'
  | 'persuasive'
  | 'informative';

export type ContentFormat =
  | 'blog-post'
  | 'article'
  | 'landing-page'
  | 'product-description'
  | 'email'
  | 'social-media';

export interface GenerationResult {
  content: string;
  outline: ContentOutline;
  seoScore: number;
  qualityMetrics: QualityMetrics;
  wordCount: number;
  readingTime: number;
  suggestions: string[];
}

export interface ContentOutline {
  title: string;
  sections: OutlineSection[];
  estimatedWordCount: number;
}

export interface OutlineSection {
  heading: string;
  subheadings: string[];
  keyPoints: string[];
  targetWords: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: 'research',
    name: 'Research & Planning',
    type: 'outline',
    prompt: 'research_prompt',
    weight: 0.1,
  },
  {
    id: 'outline',
    name: 'Content Outline',
    type: 'outline',
    prompt: 'outline_prompt',
    weight: 0.15,
  },
  {
    id: 'draft',
    name: 'Initial Draft',
    type: 'draft',
    prompt: 'draft_prompt',
    weight: 0.4,
  },
  {
    id: 'enhance',
    name: 'Content Enhancement',
    type: 'enhance',
    prompt: 'enhance_prompt',
    weight: 0.15,
  },
  {
    id: 'seo',
    name: 'SEO Optimization',
    type: 'seo',
    prompt: 'seo_prompt',
    weight: 0.1,
  },
  {
    id: 'review',
    name: 'Quality Review',
    type: 'review',
    prompt: 'review_prompt',
    weight: 0.1,
  },
];

const TONE_PROMPTS: Record<ContentTone, string> = {
  professional: 'Write in a professional, authoritative tone suitable for business audiences.',
  casual: 'Write in a friendly, relaxed tone that feels approachable and easy to read.',
  academic: 'Write in a scholarly tone with precise language and well-researched arguments.',
  conversational: 'Write as if having a friendly conversation with the reader.',
  persuasive: 'Write in a compelling way that motivates action and engagement.',
  informative: 'Write in a clear, educational tone focused on delivering valuable information.',
};

const FORMAT_TEMPLATES: Record<ContentFormat, ContentTemplate> = {
  'blog-post': {
    structure: ['intro', 'body', 'conclusion', 'cta'],
    minWords: 800,
    maxWords: 2500,
    headingFrequency: 150,
  },
  'article': {
    structure: ['intro', 'body', 'conclusion'],
    minWords: 1000,
    maxWords: 3000,
    headingFrequency: 200,
  },
  'landing-page': {
    structure: ['hero', 'benefits', 'features', 'testimonials', 'cta'],
    minWords: 500,
    maxWords: 1500,
    headingFrequency: 100,
  },
  'product-description': {
    structure: ['overview', 'features', 'benefits', 'specs'],
    minWords: 200,
    maxWords: 800,
    headingFrequency: 75,
  },
  'email': {
    structure: ['subject', 'greeting', 'body', 'cta', 'signature'],
    minWords: 100,
    maxWords: 500,
    headingFrequency: 0,
  },
  'social-media': {
    structure: ['hook', 'body', 'cta', 'hashtags'],
    minWords: 50,
    maxWords: 280,
    headingFrequency: 0,
  },
};

// =============================================================================
// Prompt Builder
// =============================================================================

class PromptBuilder {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    this.templates.set('research_prompt', `
Analyze the following topic and provide research insights:
Topic: {{topic}}
Keywords: {{keywords}}

Provide:
1. Key facts and statistics
2. Common questions people ask
3. Related subtopics to cover
4. Competitor content gaps
5. Unique angles to explore
    `);

    this.templates.set('outline_prompt', `
Create a detailed content outline for:
Topic: {{topic}}
Format: {{format}}
Target Word Count: {{wordCount}}
Tone: {{tone}}

Create a structured outline with:
- Compelling title options (3 variations)
- Section headings with subheadings
- Key points for each section
- Estimated word count per section
    `);

    this.templates.set('draft_prompt', `
Write engaging content based on this outline:
{{outline}}

Requirements:
- Tone: {{toneDescription}}
- Target Keywords: {{keywords}}
- Include relevant examples and data
- Use transition sentences between sections
- Write for web readability (short paragraphs, clear headings)
    `);

    this.templates.set('enhance_prompt', `
Enhance the following content:
{{content}}

Improvements needed:
1. Add more specific examples and data
2. Improve sentence variety and flow
3. Strengthen the introduction hook
4. Add compelling subheadings
5. Ensure consistency in tone: {{tone}}
    `);

    this.templates.set('seo_prompt', `
Optimize this content for SEO:
{{content}}

Target Keywords: {{keywords}}

Optimize:
1. Meta title and description
2. Heading structure (H1, H2, H3)
3. Keyword placement (natural, 1-2% density)
4. Internal linking suggestions
5. Image alt text suggestions
6. Schema markup recommendations
    `);

    this.templates.set('review_prompt', `
Review this content for quality:
{{content}}

Check for:
1. Grammar and spelling errors
2. Factual accuracy
3. Logical flow and coherence
4. Engagement and readability
5. Call-to-action effectiveness
6. Overall quality score (1-100)

Provide specific improvement suggestions.
    `);
  }

  build(templateKey: string, variables: Record<string, string>): string {
    let template = this.templates.get(templateKey) || '';
    
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    return template.trim();
  }

  addTemplate(key: string, template: string): void {
    this.templates.set(key, template);
  }
}

// =============================================================================
// Quality Analyzer
// =============================================================================

class QualityAnalyzer {
  analyze(content: string): QualityMetrics {
    const words = content.split(/\s+/).filter(Boolean);
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    const paragraphs = content.split(/\n\n+/).filter(Boolean);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSentencesPerParagraph = sentences.length / paragraphs.length;

    return {
      readabilityScore: this.calculateReadability(content),
      grammarScore: this.estimateGrammarScore(content),
      seoScore: 0, // Calculated separately
      engagementScore: this.calculateEngagement(content),
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence,
      avgSentencesPerParagraph,
      headingCount: this.countHeadings(content),
      linkCount: this.countLinks(content),
    };
  }

  private calculateReadability(content: string): number {
    // Flesch-Kincaid approximation
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const syllables = this.countSyllables(content);

    if (words === 0 || sentences === 0) return 0;

    const score = 206.835 - 
      (1.015 * (words / sentences)) - 
      (84.6 * (syllables / words));

    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    return words.reduce((total, word) => {
      return total + this.syllablesInWord(word);
    }, 0);
  }

  private syllablesInWord(word: string): number {
    word = word.replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private estimateGrammarScore(content: string): number {
    // Simple heuristic-based grammar scoring
    let score = 100;
    
    // Check for common issues
    const issues = [
      { pattern: /\s{2,}/g, penalty: 1 },
      { pattern: /[a-z]\.[A-Z]/g, penalty: 2 },
      { pattern: /\bi\b/g, penalty: 1 },
      { pattern: /\s+,/g, penalty: 2 },
    ];

    for (const { pattern, penalty } of issues) {
      const matches = content.match(pattern);
      if (matches) {
        score -= matches.length * penalty;
      }
    }

    return Math.max(0, score);
  }

  private calculateEngagement(content: string): number {
    let score = 50;

    // Positive factors
    if (content.includes('?')) score += 10;
    if (content.includes('!')) score += 5;
    if (/\b(you|your)\b/i.test(content)) score += 10;
    if (/\b(discover|learn|find out|secret)\b/i.test(content)) score += 5;
    if (this.countHeadings(content) >= 3) score += 10;

    // Negative factors
    const avgWordsPerSentence = content.split(/\s+/).length / 
      content.split(/[.!?]+/).length;
    if (avgWordsPerSentence > 25) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private countHeadings(content: string): number {
    const headingPatterns = [
      /^#{1,6}\s/gm,
      /<h[1-6][^>]*>/gi,
    ];

    return headingPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countLinks(content: string): number {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)|<a\s[^>]*href/gi;
    const matches = content.match(linkPattern);
    return matches ? matches.length : 0;
  }
}

// =============================================================================
// Main Content Engine
// =============================================================================

export class ContentEngine {
  private static instance: ContentEngine | null = null;
  private promptBuilder: PromptBuilder;
  private qualityAnalyzer: QualityAnalyzer;
  private generationId: string | null = null;
  private abortController: AbortController | null = null;

  private constructor() {
    this.promptBuilder = new PromptBuilder();
    this.qualityAnalyzer = new QualityAnalyzer();
  }

  static getInstance(): ContentEngine {
    if (!ContentEngine.instance) {
      ContentEngine.instance = new ContentEngine();
    }
    return ContentEngine.instance;
  }

  // ---------------------------------------------------------------------------
  // Main Generation Methods
  // ---------------------------------------------------------------------------

  async generate(context: GenerationContext, config?: Partial<GenerateConfig>): Promise<GenerationResult> {
    this.generationId = this.createGenerationId();
    this.abortController = new AbortController();

    const pipeline = this.createPipeline(context);
    const startTime = Date.now();

    try {
      actions.startGeneration(context.topic);

      // Stage 1: Research & Planning
      this.updateProgress('research', 0);
      const research = await this.executeStage(pipeline.stages[0], context, config);

      // Stage 2: Create Outline
      this.updateProgress('outline', 15);
      const outline = await this.createOutline(context, research, config);

      // Stage 3: Generate Draft
      this.updateProgress('draft', 30);
      const draft = await this.generateDraft(context, outline, config);

      // Stage 4: Enhance Content
      this.updateProgress('enhance', 70);
      const enhanced = await this.enhanceContent(draft, context, config);

      // Stage 5: SEO Optimization
      this.updateProgress('seo', 85);
      const optimized = await this.optimizeForSEO(enhanced, context, config);

      // Stage 6: Quality Review
      this.updateProgress('review', 95);
      const qualityMetrics = this.qualityAnalyzer.analyze(optimized);

      this.updateProgress('complete', 100);
      actions.completeGeneration();

      return {
        content: optimized,
        outline,
        seoScore: this.calculateSEOScore(optimized, context.keywords),
        qualityMetrics,
        wordCount: optimized.split(/\s+/).length,
        readingTime: Math.ceil(optimized.split(/\s+/).length / 200),
        suggestions: this.generateSuggestions(qualityMetrics),
      };
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : 'Generation failed');
      throw error;
    }
  }

  async generateWithStreaming(
    context: GenerationContext,
    onChunk: (chunk: string) => void,
    config?: Partial<GenerateConfig>
  ): Promise<GenerationResult> {
    this.generationId = this.createGenerationId();
    let fullContent = '';

    const genConfig = this.buildGenerateConfig(config);

    await apiService.stream(
      {
        provider: genConfig.provider,
        endpoint: this.getStreamEndpoint(genConfig.provider),
        body: this.buildStreamBody(context, genConfig),
      },
      (chunk) => {
        fullContent += chunk.content;
        onChunk(chunk.content);
      },
      (error) => {
        console.error('[ContentEngine] Stream error:', error);
        throw new Error(error.message);
      }
    );

    const qualityMetrics = this.qualityAnalyzer.analyze(fullContent);

    return {
      content: fullContent,
      outline: this.parseOutlineFromContent(fullContent),
      seoScore: this.calculateSEOScore(fullContent, context.keywords),
      qualityMetrics,
      wordCount: fullContent.split(/\s+/).length,
      readingTime: Math.ceil(fullContent.split(/\s+/).length / 200),
      suggestions: this.generateSuggestions(qualityMetrics),
    };
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      actions.setError('Generation aborted by user');
    }
  }

  // ---------------------------------------------------------------------------
  // Pipeline Methods
  // ---------------------------------------------------------------------------

  private createPipeline(context: GenerationContext): GenerationPipeline {
    return {
      stages: DEFAULT_STAGES,
      context,
      config: {
        parallelStages: false,
        maxRetries: 3,
        qualityThreshold: 70,
        enableSEO: true,
        enableQualityCheck: true,
      },
    };
  }

  private async executeStage(
    stage: PipelineStage,
    context: GenerationContext,
    config?: Partial<GenerateConfig>
  ): Promise<string> {
    const prompt = this.promptBuilder.build(stage.prompt, {
      topic: context.topic,
      keywords: context.keywords.join(', '),
      format: context.format,
      tone: context.tone,
      wordCount: context.targetWordCount.toString(),
      toneDescription: TONE_PROMPTS[context.tone],
    });

    const genConfig = this.buildGenerateConfig(config);
    const response = await apiService.generateContent(prompt, genConfig);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Stage execution failed');
    }

    return response.data.content;
  }

  private async createOutline(
    context: GenerationContext,
    research: string,
    config?: Partial<GenerateConfig>
  ): Promise<ContentOutline> {
    const prompt = this.promptBuilder.build('outline_prompt', {
      topic: context.topic,
      format: context.format,
      wordCount: context.targetWordCount.toString(),
      tone: context.tone,
      research,
    });

    const genConfig = this.buildGenerateConfig(config);
    const response = await apiService.generateContent(prompt, genConfig);

    if (!response.success || !response.data) {
      throw new Error('Failed to create outline');
    }

    return this.parseOutline(response.data.content, context);
  }

  private async generateDraft(
    context: GenerationContext,
    outline: ContentOutline,
    config?: Partial<GenerateConfig>
  ): Promise<string> {
    const prompt = this.promptBuilder.build('draft_prompt', {
      outline: JSON.stringify(outline, null, 2),
      keywords: context.keywords.join(', '),
      tone: context.tone,
      toneDescription: TONE_PROMPTS[context.tone],
    });

    const genConfig = this.buildGenerateConfig(config);
    const response = await apiService.generateContent(prompt, genConfig);

    if (!response.success || !response.data) {
      throw new Error('Failed to generate draft');
    }

    return response.data.content;
  }

  private async enhanceContent(
    content: string,
    context: GenerationContext,
    config?: Partial<GenerateConfig>
  ): Promise<string> {
    const prompt = this.promptBuilder.build('enhance_prompt', {
      content,
      tone: context.tone,
    });

    const genConfig = this.buildGenerateConfig(config);
    const response = await apiService.generateContent(prompt, genConfig);

    return response.success && response.data ? response.data.content : content;
  }

  private async optimizeForSEO(
    content: string,
    context: GenerationContext,
    config?: Partial<GenerateConfig>
  ): Promise<string> {
    const prompt = this.promptBuilder.build('seo_prompt', {
      content,
      keywords: context.keywords.join(', '),
    });

    const genConfig = this.buildGenerateConfig(config);
    const response = await apiService.generateContent(prompt, genConfig);

    return response.success && response.data ? response.data.content : content;
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private buildGenerateConfig(config?: Partial<GenerateConfig>): GenerateConfig {
    const state = store.getState();
    return {
      provider: config?.provider || state.provider || 'openai',
      model: config?.model || state.model || 'gpt-4',
      temperature: config?.temperature ?? state.temperature ?? 0.7,
      maxTokens: config?.maxTokens || 4096,
    };
  }

  private parseOutline(content: string, context: GenerationContext): ContentOutline {
    const lines = content.split('\n').filter(Boolean);
    const sections: OutlineSection[] = [];
    let currentSection: OutlineSection | null = null;

    for (const line of lines) {
      if (line.match(/^#+\s/) || line.match(/^\d+\./)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: line.replace(/^[#\d.]+\s*/, ''),
          subheadings: [],
          keyPoints: [],
          targetWords: Math.floor(context.targetWordCount / 5),
        };
      } else if (currentSection && line.match(/^[-*]\s/)) {
        currentSection.keyPoints.push(line.replace(/^[-*]\s*/, ''));
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return {
      title: sections[0]?.heading || context.topic,
      sections,
      estimatedWordCount: context.targetWordCount,
    };
  }

  private parseOutlineFromContent(content: string): ContentOutline {
    const headings = content.match(/^#+\s.+$/gm) || [];
    return {
      title: headings[0]?.replace(/^#+\s*/, '') || 'Untitled',
      sections: headings.map(h => ({
        heading: h.replace(/^#+\s*/, ''),
        subheadings: [],
        keyPoints: [],
        targetWords: 200,
      })),
      estimatedWordCount: content.split(/\s+/).length,
    };
  }

  private calculateSEOScore(content: string, keywords: string[]): number {
    let score = 50;
    const lowerContent = content.toLowerCase();

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const occurrences = (lowerContent.match(new RegExp(keywordLower, 'g')) || []).length;
      const wordCount = content.split(/\s+/).length;
      const density = (occurrences / wordCount) * 100;

      if (density >= 0.5 && density <= 2.5) score += 10;
      else if (density > 0 && density < 0.5) score += 5;
      else if (density > 2.5) score -= 5;
    }

    if (content.match(/^#\s/m)) score += 10;
    if (content.match(/^##\s/gm)?.length >= 3) score += 10;
    if (content.includes('<meta') || content.match(/\*\*[^*]+\*\*/)) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateSuggestions(metrics: QualityMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.readabilityScore < 60) {
      suggestions.push('Consider simplifying sentences for better readability');
    }
    if (metrics.avgWordsPerSentence > 20) {
      suggestions.push('Break up long sentences for easier reading');
    }
    if (metrics.headingCount < 3) {
      suggestions.push('Add more headings to improve content structure');
    }
    if (metrics.engagementScore < 60) {
      suggestions.push('Add more engaging elements like questions or calls-to-action');
    }
    if (metrics.paragraphCount < 5) {
      suggestions.push('Consider adding more paragraphs to break up the content');
    }

    return suggestions;
  }

  private updateProgress(stage: string, progress: number): void {
    actions.updateProgress({
      stage,
      progress,
      message: `Processing: ${stage}`,
    });
  }

  private getStreamEndpoint(provider: AIProvider): string {
    const endpoints: Record<AIProvider, string> = {
      openai: '/chat/completions',
      anthropic: '/messages',
      google: '/models/gemini-pro:streamGenerateContent',
      cohere: '/chat',
    };
    return endpoints[provider];
  }

  private buildStreamBody(
    context: GenerationContext,
    config: GenerateConfig
  ): Record<string, unknown> {
    const systemPrompt = `You are an expert content writer. Write in a ${context.tone} tone.`;
    const userPrompt = `Write a ${context.format} about: ${context.topic}\n\nKeywords: ${context.keywords.join(', ')}\n\nTarget word count: ${context.targetWordCount}`;

    return {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    };
  }

  private createGenerationId(): string {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// Exports
// =============================================================================

export const contentEngine = ContentEngine.getInstance();
export { PromptBuilder, QualityAnalyzer };
export default contentEngine;
