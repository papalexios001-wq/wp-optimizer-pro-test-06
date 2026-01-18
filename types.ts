// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v27.0 — ENTERPRISE SOTA TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
// 
// CRITICAL FIXES v27.0:
// ✅ Staged pipeline types for chunked generation
// ✅ Circuit breaker state types
// ✅ Enhanced job state with phase tracking
// ✅ Content contract with all required fields
// ✅ NLP/Neuron analysis types
// ✅ Entity gap analysis types
// ✅ Internal linking types
// ✅ QA validation result types
// ✅ WordPress integration types
// ✅ Bulk optimization types
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — ROOT TYPES (RE-EXPORT FROM types/index.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export * from './types/index';


// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const APP_VERSION = "27.0.0";
export const TYPES_VERSION = "27.0.0";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 OPTIMIZATION MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type OptimizationMode = 'surgical' | 'full_rewrite' | 'writer';

export type PublishMode = 'draft' | 'autopublish';

export type AIProvider = 'google' | 'openrouter' | 'openai' | 'anthropic' | 'groq';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 GOD MODE PHASE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export type GodModePhase = 
    | 'idle'
    | 'initializing'
    | 'crawling'
    | 'resolving_post'
    | 'analyzing_existing'
    | 'collect_intel'
    | 'strategic_intel'
    | 'entity_gap_analysis'
    | 'reference_discovery'
    | 'reference_validation'
    | 'neuron_analysis'
    | 'competitor_deep_dive'
    | 'outline_generation'
    | 'section_drafts'
    | 'link_plan'
    | 'section_finalize'
    | 'merge_content'
    | 'prompt_assembly'
    | 'content_synthesis'
    | 'qa_validation'
    | 'auto_fix_loop'
    | 'self_improvement'
    | 'internal_linking'
    | 'youtube_integration'
    | 'schema_generation'
    | 'final_polish'
    | 'publishing'
    | 'completed'
    | 'failed';

export type JobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 STAGED PIPELINE TYPES (NEW v27.0)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContentOutline {
    title: string;
    metaDescription: string;
    slug: string;
    sections: SectionOutline[];
    faqTopics: string[];
    keyTakeaways: string[];
    estimatedWordCount?: number;
}

export interface SectionOutline {
    heading: string;
    type: 'h2';
    keyPoints: string[];
    subsections: SubsectionOutline[];
    visualComponents: VisualComponentType[];
    targetWordCount?: number;
}

export interface SubsectionOutline {
    heading: string;
    keyPoints: string[];
}

export type VisualComponentType = 
    | 'quickAnswer'
    | 'proTip'
    | 'warning'
    | 'statsDashboard'
    | 'expertQuote'
    | 'table'
    | 'checklist'
    | 'keyTakeaways'
    | 'cta'
    | 'comparisonTable'
    | 'prosConsTable';

export interface GeneratedSection {
    index: number;
    heading: string;
    html: string;
    wordCount: number;
    success: boolean;
    error?: string;
}

export interface StageProgress {
    stage: 'outline' | 'sections' | 'merge' | 'polish' | 'validation';
    progress: number;
    message: string;
    sectionsCompleted?: number;
    totalSections?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 CONTENT CONTRACT — THE CORE OUTPUT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContentContract {
    // Required fields
    title: string;
    htmlContent: string;
    
    // SEO metadata
    metaDescription: string;
    slug: string;
    excerpt?: string;
    
    // Content metrics
    wordCount: number;
    
    // FAQ data
    faqs?: FAQ[];
    
    // Internal linking
    internalLinks?: InternalLinkResult[];
    
    // Schema markup
    schemaMarkup?: string;
    schemaTypes?: string[];
    
    // References
    references?: ValidatedReference[];
    
    // Generation metadata
    generatedAt?: number;
    generationMethod?: 'staged' | 'single-shot' | 'continuation';
    attempts?: number;
    
    // Quality scores
    qualityScore?: number;
    nlpCoverage?: number;
    
    // YouTube integration
    youtubeVideo?: YouTubeVideoData;
}

export interface FAQ {
    question: string;
    answer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 INTERNAL LINKING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface InternalLinkTarget {
    url: string;
    title: string;
    slug: string;
    keywords?: string[];
    categories?: string[];
    relevanceScore?: number;
}

export interface InternalLinkResult {
    url: string;
    anchorText: string;
    relevanceScore: number;
    position: number;
    sectionIndex?: number;
}

export interface InternalLinkInjectionOptions {
    minLinks?: number;
    maxLinks?: number;
    minRelevance?: number;
    minDistanceBetweenLinks?: number;
    maxLinksPerSection?: number;
    excludeUrls?: string[];
}

export interface InternalLinkInjectionResult {
    html: string;
    linksAdded: InternalLinkResult[];
    totalLinks: number;
    skippedReasons?: Map<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ENTITY GAP ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityGapAnalysis {
    // Entity data
    competitorEntities: string[];
    missingEntities: string[];
    
    // Keywords
    topKeywords: string[];
    semanticTerms: string[];
    topicClusters: string[];
    
    // Questions
    paaQuestions: string[];
    
    // Content gaps
    contentGaps: string[];
    
    // Metrics
    avgWordCount: number;
    recommendedWordCount: number;
    
    // SERP features
    serpFeatures: SerpFeature[];
    featuredSnippetOpportunity: boolean;
    localPackPresent: boolean;
    
    // Competitor data
    competitorUrls: string[];
    competitors: CompetitorAnalysis[];
    
    // References
    validatedReferences: ValidatedReference[];
    
    // Knowledge graph
    knowledgeGraphData?: KnowledgeGraphData;
}

export interface SerpFeature {
    type: 'featured_snippet' | 'knowledge_panel' | 'paa' | 'video' | 'local_pack' | 'image_pack';
    present: boolean;
    targetable: boolean;
}

export interface CompetitorAnalysis {
    url: string;
    title: string;
    wordCount: number;
    headings: string[];
    entities: string[];
    snippet?: string;
    position: number;
    domain: string;
    hasSchema: boolean;
    hasFAQ: boolean;
}

export interface KnowledgeGraphData {
    title: string;
    type: string;
    description: string;
    attributes?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 REFERENCE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidatedReference {
    url: string;
    title: string;
    source: string;
    year: string | number;
    status: number;
    isValid: boolean;
    domain?: string;
    isAuthority?: boolean;
    snippet?: string;
    author?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧬 NEURONWRITER / NLP TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NeuronTerm {
    term: string;
    type: 'title' | 'header' | 'body' | 'critical';
    importance: number;
    recommended: number;
    count?: number;
    inTitle?: boolean;
    inHeaders?: boolean;
    inContent?: boolean;
}

export interface NeuronAnalysisResult {
    terms: NeuronTerm[];
    targetWordCount: number;
    contentScore?: number;
    titleScore?: number;
    headerScore?: number;
    recommendations?: string[];
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

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ QA VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type QACategory = 'critical' | 'seo' | 'aeo' | 'geo' | 'enhancement';
export type QAStatus = 'passed' | 'failed' | 'warning';

export interface QAValidationResult {
    agent: string;
    category: QACategory;
    status: QAStatus;
    score: number;
    feedback: string;
    fixSuggestion?: string;
    details?: Record<string, any>;
}

export interface QASwarmResult {
    score: number;
    results: QAValidationResult[];
    passed: boolean;
    criticalFails: number;
    timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 SEO METRICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SeoMetrics {
    wordCount: number;
    contentDepth: number;
    readability: number;
    headingStructure: number;
    aeoScore: number;
    geoScore: number;
    eeatSignals: number;
    internalLinkScore: number;
    schemaDetected: boolean;
    schemaTypes?: string[];
    h2Count?: number;
    h3Count?: number;
    imageCount?: number;
    faqCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 SITEMAP PAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SitemapPage {
    id: string;
    title: string;
    slug: string;
    lastMod: string | null;
    wordCount: number | null;
    crawledContent: string | null;
    healthScore: number | null;
    status: PageStatus;
    opportunity: OpportunityScore | null;
    improvementHistory: ImprovementRecord[];
    
    // WordPress data
    wpPostId?: number;
    lastPublishedAt?: number;
    
    // Target keyword
    targetKeyword?: string;
    
    // SEO metrics
    seoMetrics?: SeoMetrics;
    
    // Job state
    jobState?: JobState;
}

export type PageStatus = 
    | 'idle' 
    | 'queued' 
    | 'analyzing' 
    | 'analyzed' 
    | 'optimizing' 
    | 'publishing' 
    | 'error';

export interface OpportunityScore {
    total: number;
    titleScore: number;
    lengthScore: number;
    freshness: number;
}

export interface ImprovementRecord {
    timestamp: number;
    score: number;
    action: string;
    wordCount?: number;
    qaScore?: number;
    version?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 JOB STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface JobState {
    status: JobStatus;
    phase: GodModePhase;
    progress?: number;
    startTime?: number;
    endTime?: number;
    processingTime?: number;
    attempts?: number;
    error?: string;
    
    // Post data
    postId?: number;
    
    // Analysis data
    existingAnalysis?: ExistingContentAnalysis;
    entityGapData?: EntityGapAnalysis;
    neuronData?: NeuronAnalysisResult;
    
    // Generated content
    contract?: ContentContract;
    
    // QA results
    qaResults?: QAValidationResult[];
    
    // Improvement feedback
    allFeedback?: string[];
    
    // Job logs
    logs?: string[];
    
    // Last updated timestamp
    lastUpdated?: number;
}

export interface ExistingContentAnalysis {
    wordCount: number;
    imageCount: number;
    hasFAQ: boolean;
    hasSchema: boolean;
    headingCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
    readabilityScore?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE INTEGRATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface YouTubeVideoData {
    videoId: string;
    title: string;
    channel: string;
    views: number;
    duration?: string;
    thumbnailUrl: string;
    embedUrl: string;
    publishedAt?: string;
}

export interface YouTubeSearchResult {
    video: YouTubeVideoData | null;
    source: 'serper' | 'fallback';
    searchQuery: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenerateConfig {
    // Core settings
    prompt: string;
    topic: string;
    mode: 'surgical' | 'writer';
    
    // Site context
    siteContext: SiteContext;
    
    // AI settings
    model: string;
    provider: AIProvider;
    apiKeys: ApiKeys;
    temperature?: number;
    
    // Target settings
    targetWords?: number;
    targetKeyword?: string;
    
    // Data inputs
    entityGapData?: EntityGapAnalysis;
    neuronData?: NeuronAnalysisResult;
    existingAnalysis?: ExistingContentAnalysis;
    internalLinks?: InternalLinkTarget[];
    validatedReferences?: ValidatedReference[];
    
    // Options
    geoConfig?: GeoTargetConfig;
    
    // Pipeline settings
    useStagedPipeline?: boolean;
    useSERPGenerators?: boolean;
    useNLPInjector?: boolean;
    targetNLPCoverage?: number;
    
    // Retry settings
    previousAttempts?: number;
    allFeedback?: string[];
    maxTokens?: number;
}

export interface SiteContext {
    orgName: string;
    url: string;
    authorName: string;
    logoUrl?: string;
    authorPageUrl?: string;
    industry?: string;
    targetAudience?: string;
}

export interface ApiKeys {
    google: string;
    openrouter: string;
    openai: string;
    anthropic: string;
    groq: string;
    serper: string;
    neuronwriter: string;
    neuronProject: string;
    openrouterModel: string;
    groqModel: string;
    [key: string]: string;
}

export interface GeoTargetConfig {
    enabled: boolean;
    country: string;
    region: string;
    city: string;
    language: string;
}

export interface WpConfig {
    url: string;
    username: string;
    password?: string;
    orgName: string;
    authorName: string;
    logoUrl?: string;
    authorPageUrl?: string;
    industry?: string;
    targetAudience?: string;
}

export interface AutonomousConfig {
    enabled: boolean;
    targetScore: number;
    maxParallel: number;
    minInterval: number;
    maxRuntime: number;
    stopOnError: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 GLOBAL STATS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GlobalStats {
    totalProcessed: number;
    totalImproved: number;
    totalFailed: number;
    totalWordsGenerated: number;
    avgScore: number;
    lastRunTime: number;
    successRate: number;
    sessionStartTime?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 TOAST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 BULK OPTIMIZATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BulkJob {
    id: string;
    url: string;
    status: JobStatus;
    progress: number;
    error?: string;
    startTime?: number;
    endTime?: number;
    score?: number;
    phase?: string;
    wordCount?: number;
    attempts?: number;
}

export interface BulkProcessingState {
    isRunning: boolean;
    jobs: BulkJob[];
    concurrency: number;
    completed: number;
    failed: number;
    totalTime: number;
    avgScore: number;
    totalWords: number;
}

export interface BulkResult {
    url: string;
    success: boolean;
    score: number;
    time: number;
    wordCount: number;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ IMAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PostImageData {
    src: string;
    alt: string;
    title?: string;
    id?: string;
    mediaId?: number;
    classes?: string;
}

export interface FeaturedImageData {
    id: number;
    url: string;
    alt: string;
    title: string;
    width?: number;
    height?: number;
}

export interface PostPreservationData {
    originalSlug: string | null;
    originalLink: string | null;
    originalCategories: number[];
    originalTags: number[];
    featuredImageId: number | null;
    contentImages: PostImageData[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 CIRCUIT BREAKER TYPES (NEW v27.0)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
    provider: string;
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 SERP LENGTH POLICY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SerpLengthPolicy {
    minWords: number;
    maxWords: number;
    targetWords: number;
    competitorAverage: number;
    recommendation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL VALIDATION TYPES
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
// 🔧 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createDefaultSeoMetrics(): SeoMetrics {
    return {
        wordCount: 0,
        contentDepth: 0,
        readability: 0,
        headingStructure: 0,
        aeoScore: 0,
        geoScore: 0,
        eeatSignals: 0,
        internalLinkScore: 0,
        schemaDetected: false,
        schemaTypes: [],
        h2Count: 0,
        h3Count: 0,
        imageCount: 0,
        faqCount: 0
    };
}

export function createDefaultJobState(): JobState {
    return {
        status: 'idle',
        phase: 'idle',
        progress: 0,
        attempts: 0,
        logs: []
    };
}

export function createDefaultGlobalStats(): GlobalStats {
    return {
        totalProcessed: 0,
        totalImproved: 0,
        totalFailed: 0,
        totalWordsGenerated: 0,
        avgScore: 0,
        lastRunTime: 0,
        successRate: 100
    };
}





// ═══════════════════════════════════════════════════════════════════════════════
// 📤 DEFAULT EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    APP_VERSION,
    TYPES_VERSION
};
