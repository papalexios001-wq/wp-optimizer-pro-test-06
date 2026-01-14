// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO — COMPLETE TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const APP_VERSION = "22.15.0";

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Provider = 'google' | 'openrouter' | 'anthropic' | 'openai' | 'groq';
export type OptimizationMode = 'surgical' | 'writer' | 'hybrid' | 'full_rewrite';
export type PublishMode = 'draft' | 'publish' | 'pending' | 'autopublish';

export interface FAQ {
    question: string;
    answer: string;
}

export interface FAQItem {
    question: string;
    answer: string;
    category?: string;
}

export interface HeadingInfo {
    level: number;
    text: string;
    id?: string;
}

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORDPRESS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface WpConfig {
    siteUrl?: string;
    url: string;
    username: string;
    password: string;
    applicationPassword?: string;
    restEndpoint?: string;
    orgName: string;
    authorName: string;
    logoUrl?: string;
    authorPageUrl?: string;
    industry?: string;
    targetAudience?: string;
    defaultCategory?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiKeys {
    google: string;
    openrouter: string;
    anthropic: string;
    openai: string;
    groq: string;
    serper: string;
    neuronwriter?: string;
    neuronProject?: string;
    openrouterModel?: string;
    groqModel?: string;
    geminiModel?: string;
    [key: string]: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEO TARGET CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeoTargetConfig {
    enabled: boolean;
    country: string;
    language: string;
    region?: string;
    city?: string;
    localKeywords?: string[];
    currencySymbol?: string;
    measurementSystem?: 'metric' | 'imperial';
    serviceAreas?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY SCORE
// ═══════════════════════════════════════════════════════════════════════════════

export interface OpportunityScore {
    total: number;
    factors: Record<string, number>;
    commercialIntent?: number;
    temporalDecay?: number;
    strikingDistance?: number;
    competitionLevel?: number;
    contentGap?: number;
    trafficPotential?: number;
    conversionPotential?: number;
    aeoOpportunity?: number;
    geoOpportunity?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPROVEMENT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImprovementHistoryEntry {
    date?: string;
    timestamp: number;
    wordsBefore?: number;
    wordsAfter?: number;
    wordCount: number;
    scoreBefore?: number;
    scoreAfter?: number;
    score: number;
    qaScore: number;
    changes?: string[];
    action: string;
    version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOD MODE PHASES & JOB STATE
// ═══════════════════════════════════════════════════════════════════════════════

export type GodModePhase = 
    | 'idle'
    | 'initializing'
    | 'crawling'
    | 'fetching_sitemap'
    | 'resolving_post'
    | 'analyzing'
    | 'analyzing_content'
    | 'analyzing_existing'
    | 'entity_gap_analysis'
    | 'neuron_analysis'
    | 'reference_validation'
    | 'reference_discovery'
    | 'prompt_assembly'
    | 'content_generation'
    | 'content_synthesis'
    | 'youtube_integration'
    | 'nlp_injection'
    | 'internal_linking'
    | 'faq_upgrade'
    | 'qa_validation'
    | 'self_improvement'
    | 'final_polish'
    | 'publishing'
    | 'completed'
    | 'failed'
    | 'error'
    | 'collect_intel'
    | 'strategic_intel'
    | 'running';

export interface GodModeJobState {
    id: string;
    targetId: string;
    phase: GodModePhase;
    status?: 'idle' | 'processing' | 'completed' | 'failed' | 'queued' | 'analyzing' | 'analyzed' | 'error' | 'running';
    progress: number;
    logs: string[];
    log: string[];
    startTime: number;
    endTime?: number;
    error?: string;
    result?: ContentContract;
    postId?: number;
    existingAnalysis?: ExistingContentAnalysis;
    targetKeyword?: string;
    entityGapData?: EntityGapAnalysis;
    neuronData?: NeuronAnalysisResult;
    contract?: ContentContract;
    qaResults?: QAValidationResult[];
    allFeedback?: string[];
    attempts?: number;
    processingTime?: number;
    lastUpdated?: number;
    previousScores?: number[];
    checkpoints?: any[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEO METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoreWebVitals {
    lcp: number;
    fid: number;
    cls: number;
}

export interface SeoMetrics {
    wordCount: number;
    readability: number;
    contentDepth: number;
    headingStructure: number;
    aeoScore: number;
    geoScore: number;
    eeatSignals: number;
    internalLinkScore: number;
    schemaDetected: boolean;
    schemaTypes: string[];
    titleOptimization?: number;
    metaOptimization?: number;
    readabilityGrade?: string | number;
    linkDensity?: number;
    keywordDensity?: number;
    imageOptimization?: number;
    mobileScore?: number;
    pageSpeed?: number;
    coreWebVitals?: CoreWebVitals;
    structuredDataScore?: number;
    socialSignals?: number;
    freshness?: number;
    authorityScore?: number;
    semanticDensity?: number;
    entityDensity?: number;
    serpFeatureTargeting?: number;
    answerEngineVisibility?: number;
    mobileOptimized?: boolean;
    powerWordsUsed?: string[];
    uniquenessScore?: number;
    topicalAuthority?: number;
    externalLinkScore?: number;
}

export function createDefaultSeoMetrics(): SeoMetrics {
    return {
        wordCount: 0,
        readability: 0,
        contentDepth: 0,
        headingStructure: 0,
        aeoScore: 0,
        geoScore: 0,
        eeatSignals: 0,
        internalLinkScore: 0,
        schemaDetected: false,
        schemaTypes: [],
        titleOptimization: 0,
        metaOptimization: 0,
        readabilityGrade: 'N/A',
        linkDensity: 0,
        keywordDensity: 0,
        imageOptimization: 0,
        mobileScore: 0,
        pageSpeed: 0,
        coreWebVitals: { lcp: 0, fid: 0, cls: 0 },
        structuredDataScore: 0,
        socialSignals: 0,
        freshness: 0,
        authorityScore: 0,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITEMAP PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SitemapPage {
    id: string;
    title: string;
    slug: string;
    url?: string;
    lastMod: string | null;
    wordCount: number | null;
    crawledContent: string | null;
    healthScore: number | null;
    status: 'idle' | 'processing' | 'completed' | 'failed' | 'queued' | 'analyzing' | 'analyzed' | 'error' | 'running';
    opportunity: OpportunityScore;
    improvementHistory: ImprovementHistoryEntry[];
    jobState?: GodModeJobState;
    seoMetrics?: SeoMetrics;
    targetKeyword?: string;
    priority?: number;
    changefreq?: string;
    excerpt?: string;
    categories?: string[];
    tags?: string[];
    postId?: number;
    wpPostId?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL LINK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface InternalLinkTarget {
    url: string;
    title: string;
    slug?: string;
    keywords?: string[];
    relevance?: number;
    category?: string;
}

export interface InternalLinkResult {
    url: string;
    anchorText: string;
    relevanceScore: number;
    position?: number;
    context?: string;
    matchType?: string;
    insertedAt?: number;
}

export interface InternalLinkInjectionResult {
    html: string;
    linksAdded: InternalLinkResult[];
    totalLinks: number;
    skippedReasons?: Map<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface QAValidationResult {
    ruleId: string;
    agent: string;
    category: 'critical' | 'seo' | 'aeo' | 'geo' | 'enhancement';
    score: number;
    feedback: string;
    fixSuggestion?: string;
    status: 'passed' | 'warning' | 'failed';
    details?: any;
    autoFixed?: boolean;
}

export interface QASwarmResult {
    passed: boolean;
    results: QAValidationResult[];
    score: number;
    criticalFailures: number;
    recommendations: string[];
    seoScore: number;
    aeoScore: number;
    geoScore: number;
    contentQualityScore: number;
    scoreBreakdown: ScoreBreakdown;
    rulesRun: number;
    rulesPassed: number;
}

export interface ScoreBreakdown {
    version: string;
    timestamp: number;
    categories: {
        critical: { score: number; weight: number; checks: number; passed: number };
        seo: { score: number; weight: number; checks: number; passed: number };
        aeo: { score: number; weight: number; checks: number; passed: number };
        geo: { score: number; weight: number; checks: number; passed: number };
        enhancement: { score: number; weight: number; checks: number; passed: number };
    };
    totalScore: number;
    weightedScore: number;
    passed: boolean;
    criticalFailures: number;
}

export interface QARuleContext {
    neuronTerms?: NeuronTerm[];
    serpPolicy?: SerpLengthPolicy;
    siteContext?: SiteContext;
    targetKeyword?: string;
}

export interface QADetectionResult {
    passed: boolean;
    score: number;
    message: string;
    details?: any;
    autoFixable?: boolean;
}

export const CURRENT_SCORE_WEIGHTS = {
    weights: {
        critical: 0.35,
        seo: 0.25,
        aeo: 0.15,
        geo: 0.15,
        enhancement: 0.10
    },
    thresholds: {
        pass: 70,
        excellent: 90
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING CONTENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExistingContentAnalysis {
    wordCount: number;
    headings: HeadingInfo[] | { level: number; text: string; hasKeyword?: boolean }[];
    imageCount: number;
    linkCount?: number;
    hasFAQ: boolean;
    hasSchema: boolean;
    quality: 'low' | 'medium' | 'high';
    readabilityScore?: number;
    keywordDensity?: number;
    lastModified?: string;
    contentAge?: number;
    internalLinks?: number;
    internalLinkCount?: number;
    externalLinks?: number;
    externalLinkCount?: number;
    images?: Array<{ src: string; alt: string }>;
    videos?: number;
    tables?: number;
    tableCount?: number;
    lists?: number;
    listCount?: number;
    blockquoteCount?: number;
    hasConclusion?: boolean;
    hasReferences?: boolean;
    hasQuickAnswer?: boolean;
    preserveableContent?: string[];
    weakSections?: string[];
    entities?: string[];
    mainTopics?: string[];
    missingElements?: string[];
    strengthScore?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroundingSource {
    uri: string;
    title: string;
    snippet?: string;
}

export interface ContentContract {
    title: string;
    slug: string;
    excerpt: string;
    metaDescription: string;
    htmlContent: string;
    wordCount?: number;
    faqs?: FAQ[];
    schema?: any;
    groundingSources?: GroundingSource[];
    internalLinks?: InternalLinkResult[];
    expertInsight?: string;
    internalLinkSuggestions?: string[];
    featuredImagePrompt?: string;
    categoryNames?: string[];
    structureVerified?: boolean;
    generatedAt?: string;
    generationTime?: number;
    provider?: string;
    model?: string;
    qualityScore?: number;
    nlpCoverage?: number;
    visualComponentCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITOR & ENTITY GAP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompetitorAnalysis {
    url: string;
    title: string;
    wordCount: number;
    headings: string[];
    entities: string[];
    score?: number;
    snippet?: string;
    domain?: string;
    position?: number;
    hasSchema?: boolean;
}

export interface EntityGapAnalysis {
    missingEntities: string[];
    paaQuestions: string[];
    topKeywords: string[];
    contentGaps: string[];
    competitorEntities?: string[];
    suggestedTopics?: string[];
    serpFeatures?: string[];
    validatedReferences?: ValidatedReference[];
    competitors?: CompetitorAnalysis[];
    competitorUrls?: string[];
    recommendedWordCount?: number;
    avgWordCount?: number;
    featuredSnippetOpportunity?: boolean;
    topicClusters?: string[];
    semanticTerms?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERP FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SerpFeature {
    type: 'featured_snippet' | 'people_also_ask' | 'knowledge_panel' | 'local_pack' | 'video_carousel' | 'image_pack';
    present: boolean;
    opportunity: boolean;
    data?: any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEURONWRITER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NeuronTerm {
    term: string;
    type: 'title' | 'header' | 'basic' | 'extended';
    importance: number;
    recommended: number;
    current?: number;
    count?: number;
    isUsed?: boolean;
}

export interface NeuronAnalysisResult {
    terms: NeuronTerm[];
    targetWordCount: number;
    recommendations?: string[];
    competitorAnalysis?: any;
    competitors?: any[];
    contentScore?: number;
    status?: 'success' | 'error' | 'pending' | 'ready';
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATED REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidatedReference {
    url: string;
    title: string;
    source: string;
    year: number | string;
    isValid: boolean;
    isAuthority: boolean;
    domain?: string;
    snippet?: string;
    citationCount?: number;
    trustScore?: number | string;
    status?: 'valid' | 'invalid' | 'pending' | number | string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITE CONTEXT & GENERATE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface SiteContext {
    url: string;
    orgName: string;
    authorName: string;
    language?: string;
    country?: string;
    industry?: string;
    targetAudience?: string;
    brandVoice?: string;
}

export interface GenerateConfig {
    topic: string;
    mode: OptimizationMode;
    provider: Provider;
    model?: string;
    temperature?: number;
    siteContext: SiteContext;
    apiKeys: ApiKeys;
    entityGapData?: EntityGapAnalysis;
    neuronData?: NeuronAnalysisResult;
    existingAnalysis?: ExistingContentAnalysis;
    allFeedback?: string[];
    targetKeyword?: string;
    validatedReferences?: ValidatedReference[];
    internalLinks?: InternalLinkTarget[];
    geoConfig?: GeoTargetConfig;
    previousAttempts?: number;
    useStagedPipeline?: boolean;
    useSERPGenerators?: boolean;
    useNLPInjector?: boolean;
    targetNLPCoverage?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERP LENGTH POLICY & CONTENT OUTLINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SerpLengthPolicy {
    minWords: number;
    maxWords: number;
    targetWords: number;
    targetWordCount: number;
    competitorAverage?: number;
    topRankerAverage?: number;
    confidenceScore: number;
    minH2Count: number;
    minH3Count: number;
    minFAQCount: number;
}

export interface ContentOutline {
    title: string;
    sections: SectionOutline[];
    estimatedWordCount: number;
    targetKeywords: string[];
}

export interface SectionOutline {
    id: string;
    heading: string;
    level: 2 | 3 | 4;
    targetWords: number;
    keyPoints: string[];
    subsections?: SectionOutline[];
}

export interface GeneratedSection {
    id: string;
    heading: string;
    content: string;
    wordCount: number;
    visualComponents: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTONOMOUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface AutonomousConfig {
    enabled: boolean;
    maxConcurrent: number;
    delayBetweenJobs: number;
    delayBetweenPages?: number;
    autoPublish: boolean;
    minQualityScore: number;
    maxRetries: number;
    skipOnError: boolean;
    pauseOnError?: boolean;
    targetScore?: number;
    maxRetriesPerPage?: number;
    processNewPagesOnly?: boolean;
    prioritizeByOpportunity?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE & LOCKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    expiresAt?: number;
    key?: string;
    ttl?: number;
}

export interface ProcessingLock {
    id?: string;
    lockedAt: number;
    lockedBy: string;
    expiresAt?: number;
    isLocked?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE PROGRESS & NLP TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StageProgress {
    stage: 'outline' | 'sections' | 'merge' | 'polish' | 'enhancement';
    progress: number;
    message: string;
    sectionsCompleted?: number;
    totalSections?: number;
}

export interface NLPInjectionResult {
    html: string;
    termsAdded: string[];
    termsFailed: string[];
    initialCoverage: number;
    finalCoverage: number;
    insertionDetails: Array<{
        term: string;
        location: 'paragraph' | 'list' | 'heading' | 'callout';
        template: string;
        contextScore: number;
    }>;
}

export interface NLPCoverageAnalysis {
    score: number;
    weightedScore: number;
    usedTerms: Array<NeuronTerm & { count: number; positions: number[] }>;
    missingTerms: NeuronTerm[];
    criticalMissing: NeuronTerm[];
    headerMissing: NeuronTerm[];
    bodyMissing: NeuronTerm[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERP CONTENT BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SERPContentBlocks {
    quickAnswer?: string;
    featuredSnippetBait?: string;
    paaFAQs?: Array<{ question: string; answer: string }>;
    paaHTML?: string;
    comparisonTable?: string;
    statsDashboard?: string;
    prosConsTable?: string;
    definitionBox?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VisualValidationResult {
    passed: boolean;
    score: number;
    missing: string[];
    found: Record<string, number>;
}

export interface HumanWritingValidation {
    score: number;
    issues: string[];
    suggestions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// YOUTUBE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface YouTubeVideo {
    videoId: string;
    title: string;
    channel: string;
    views: number;
    duration: string;
    thumbnail: string;
    relevanceScore: number;
}

export interface YouTubeSearchResult {
    video: YouTubeVideo | null;
    searchQuery: string;
    alternates: YouTubeVideo[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORDPRESS API TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WordPressCredentials {
    siteUrl: string;
    username: string;
    applicationPassword: string;
}

export interface YoastMeta {
    title?: string;
    description?: string;
    robots?: { index?: string; follow?: string };
    og_title?: string;
    og_description?: string;
    og_image?: Array<{ url: string }>;
    schema?: any;
}

export interface WordPressPost {
    id?: number;
    title: { rendered?: string; raw?: string };
    content: { rendered?: string; raw?: string };
    excerpt: { rendered?: string; raw?: string };
    slug: string;
    status: 'publish' | 'draft' | 'pending' | 'private';
    categories?: number[];
    tags?: number[];
    featured_media?: number;
    meta?: Record<string, any>;
    yoast_head_json?: YoastMeta;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    defaultProvider: string;
    defaultModel: string;
    autoSave: boolean;
    showAdvancedOptions: boolean;
    maxConcurrentJobs: number;
    enableLogging: boolean;
}

export interface AppState {
    apiKeys: ApiKeys;
    setApiKey: (key: keyof ApiKeys, value: string) => void;
    siteContext: SiteContext;
    setSiteContext: (ctx: Partial<SiteContext>) => void;
    pages: SitemapPage[];
    setPages: (pages: SitemapPage[]) => void;
    updatePage: (id: string, updates: Partial<SitemapPage>) => void;
    jobStates: Map<string, GodModeJobState>;
    updateJobState: (id: string, updates: Partial<GodModeJobState>) => void;
    selectedPageId: string | null;
    setSelectedPageId: (id: string | null) => void;
    settings: AppSettings;
    updateSettings: (settings: Partial<AppSettings>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    APP_VERSION,
    createDefaultSeoMetrics,
    CURRENT_SCORE_WEIGHTS
};
