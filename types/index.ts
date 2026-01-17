// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const APP_VERSION = "39.0.0";

export interface ContentContract {
    title: string;
    metaDescription: string;
    slug: string;
    htmlContent: string;
    excerpt: string;
    faqs?: Array<{ question: string; answer: string }>;
    wordCount: number;
    focusKeyword?: string;
    secondaryKeywords?: string[];
    categories?: string[];
    tags?: string[];
}

export interface GenerateConfig {
    topic: string;
    provider: 'google' | 'openrouter' | 'openai' | 'anthropic' | 'groq';
    model: string;
    apiKeys: {
        google?: string;
        openrouter?: string;
        openrouterModel?: string;
        openai?: string;
        anthropic?: string;
        groq?: string;
        groqModel?: string;
        serper?: string;
    };
    internalLinks?: InternalLinkTarget[];
    validatedReferences?: ValidatedReference[];
    siteContext?: SiteContext;
    geoTarget?: GeoTargetConfig;
    neuronAnalysis?: NeuronAnalysisResult;
    entityGaps?: EntityGapAnalysis;
    existingContent?: ExistingContentAnalysis;
    contentLength?: 'short' | 'medium' | 'long' | 'comprehensive';
    tone?: 'professional' | 'casual' | 'authoritative' | 'friendly';
    targetAudience?: string;
}

export interface InternalLinkTarget {
    url: string;
    title: string;
    slug?: string;
    excerpt?: string;
    categories?: string[];
    relevanceScore?: number;
}

export interface InternalLinkResult {
    url: string;
    anchorText: string;
    relevanceScore: number;
    position: number;
}

export interface ValidatedReference {
    url: string;
    title: string;
    source?: string;
    snippet?: string;
    year?: string | number;
    isAuthority?: boolean;
    authorityScore?: number;
}

export interface SiteContext {
    siteName?: string;
    siteUrl?: string;
    industry?: string;
    brandVoice?: string;
    targetKeywords?: string[];
    competitors?: string[];
}

export interface GeoTargetConfig {
    country?: string;
    region?: string;
    city?: string;
    language?: string;
    currency?: string;
}

export interface NeuronAnalysisResult {
    primaryTerms?: NeuronTerm[];
    secondaryTerms?: NeuronTerm[];
    semanticScore?: number;
    topicalCoverage?: number;
}

export interface NeuronTerm {
    term: string;
    importance: number;
    frequency?: number;
    inTitle?: boolean;
    inHeadings?: boolean;
}

export interface EntityGapAnalysis {
    missingEntities?: string[];
    weakEntities?: string[];
    strongEntities?: string[];
    recommendations?: string[];
}

export interface ExistingContentAnalysis {
    currentWordCount?: number;
    currentHeadings?: string[];
    currentKeywords?: string[];
    improvementAreas?: string[];
    contentGaps?: string[];
}

export interface CrawledPage {
    url: string;
    title: string;
    slug?: string;
    excerpt?: string;
    categories?: string[];
    wordCount?: number;
    lastModified?: string;
}

export interface BulkGenerationResult {
    url: string;
    success: boolean;
    contract?: ContentContract;
    error?: string;
    wordCount?: number;
    generationTime?: number;
}

export interface APIKeyConfig {
    google?: string;
    openrouter?: string;
    openrouterModel?: string;
    openai?: string;
    anthropic?: string;
    groq?: string;
    groqModel?: string;
    serper?: string;
    wordpress?: {
        url: string;
        username: string;
        applicationPassword: string;
    };
}

