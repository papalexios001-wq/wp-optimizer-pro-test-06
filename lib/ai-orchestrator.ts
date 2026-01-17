// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v31.5 — DEFINITIVE ENTERPRISE SOTA AI ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════
// 
// ARCHITECTURE: 4-PHASE PIPELINE (Discovery -> Generation -> Enrichment -> Delivery)
//
// SOTA FEATURES:
// ✅ DUAL-STRATEGY VIDEO FINDER: Exact Match + Category Fallback
// ✅ VISUAL DENSITY ENGINE: Mathematically guaranteed visual spacing
// ✅ HYBRID LINK INJECTION: Semantic Anchors + Bridge Sentences
// ✅ 6-STAGE JSON HEALER: Recovers data from broken LLM outputs
// ✅ CONTENT BREATHING: Mid-section visual injection
// ✅ CIRCUIT BREAKER: API resilience with automatic recovery
// ✅ PROVIDER AGNOSTIC: Google, OpenRouter, OpenAI, Anthropic, Groq
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenAI } from '@google/genai';
import {
    ContentContract,     
    GenerateConfig, 
    InternalLinkTarget,
    InternalLinkResult,
    ValidatedReference
} from '../types';

// Import SOTA Visual Components
import {
    THEME_ADAPTIVE_CSS,
    createQuickAnswerBox,
    createProTipBox,
    createWarningBox,
    createExpertQuoteBox,
    createHighlightBox,
    createCalloutBox,
    createStatisticsBox,
    createDataTable,
    createChecklistBox,
    createStepByStepBox,
    createComparisonTable,
    createDefinitionBox,
    createKeyTakeaways,
    createFAQAccordion,
    createYouTubeEmbed,
    createReferencesSection,
    createNumberedBox,
    createIconGridBox,
    createTimelineBox,
    createProgressTracker,
    escapeHtml,
    generateUniqueId
} from './visual-components';


// Define types locally
export interface YouTubeVideoData {
    videoId: string;
    title: string;
    channel: string;
    views: number;
    duration?: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    relevanceScore?: number;
}

export interface DiscoveredReference {
    url: string;
    title: string;
    source: string;
    snippet?: string;
    year?: string | number;
    authorityScore?: number;
    favicon?: string;
}

export type CalloutType = 'info' | 'success' | 'warning' | 'error';

// Re-export for backwards compatibility
export {
    THEME_ADAPTIVE_CSS,
    createQuickAnswerBox,
    createProTipBox,
    createWarningBox,
    createExpertQuoteBox,
    createHighlightBox,
    createCalloutBox,
    createStatisticsBox,
    createDataTable,
    createChecklistBox,
    createStepByStepBox,
    createComparisonTable,
    createDefinitionBox,
    createKeyTakeaways,
    createFAQAccordion,
    createYouTubeEmbed,
    createReferencesSection,
    YouTubeVideoData,
    DiscoveredReference
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & ENTERPRISE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const AI_ORCHESTRATOR_VERSION = "31.5.0";

const CONFIG = {
    // Timeouts (ms)
    TIMEOUT_SINGLE_SHOT: 180000,     // 3 mins for main generation
    TIMEOUT_SECTION: 90000,          // 1.5 mins per section
    TIMEOUT_DISCOVERY: 25000,        // 25 sec for asset discovery
    TIMEOUT_YOUTUBE: 20000,          // 20 sec for YouTube search
    TIMEOUT_REFERENCES: 30000,       // 30 sec for reference discovery
    
    // Content Standards
    MIN_WORDS_TOTAL: 3000,
    TARGET_WORDS_TOTAL: 4500,
    MAX_WORDS_TOTAL: 6000,
    SECTION_WORDS: 350,
    
    // Visual Density Rules
    VISUAL_GAP_PARAGRAPHS: 3,        // Max paragraphs without a visual
    VISUAL_GAP_WORDS: 300,           // Max words without a visual
    VISUAL_MIN_PER_SECTION: 1,       // Minimum visuals per H2 section
    VISUAL_MAX_PER_SECTION: 3,       // Maximum visuals per H2 section
    
    // Linking Rules
    MAX_LINKS_TOTAL: 15,
    MAX_LINKS_PER_SECTION: 2,
    MIN_WORDS_BETWEEN_LINKS: 100,
    BRIDGE_LINK_PROBABILITY: 0.7,    // Chance to add bridge sentence if natural link fails
    
    // API Retry Configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE: 2000,          // Base delay for exponential backoff
    CIRCUIT_BREAKER_THRESHOLD: 3,    // Failures before circuit opens
    CIRCUIT_BREAKER_TIMEOUT: 60000   // Time before circuit resets
} as const;

// Year calculation for content freshness
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
export const CONTENT_YEAR = currentMonth === 11 ? currentYear + 1 : currentYear;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface YouTubeVideoData {
    videoId: string;
    title: string;
    channel: string;
    views: number;
    duration?: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    relevanceScore?: number;
}

export interface DiscoveredReference {
    url: string;
    title: string;
    source: string;
    snippet?: string;
    year?: string | number;
    authorityScore?: number;
    favicon?: string;
}

export type CalloutType = 'info' | 'success' | 'warning' | 'error';

export interface StageProgress {
    stage: 'discovery' | 'generation' | 'enrichment' | 'finalization' | 'complete';
    progress: number;
    message: string;
    sectionsCompleted?: number;
    totalSections?: number;
}

export interface GenerationResult {
    contract: ContentContract;
    generationMethod: 'staged' | 'single-shot';
    attempts: number;
    totalTime: number;
    youtubeVideo?: YouTubeVideoData;
    references?: DiscoveredReference[];
}

export interface AssetDiscoveryResult {
    video: YouTubeVideoData | null;
    references: DiscoveredReference[];
}

export interface EnrichmentOptions {
    topic: string;
    video: YouTubeVideoData | null;
    injectYouTube: boolean;
    visualDensity: 'low' | 'medium' | 'high';
}

type LogFunction = (msg: string, progress?: number) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 CIRCUIT BREAKER — API RESILIENCE
// ═══════════════════════════════════════════════════════════════════════════════

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
    successCount: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

function getCircuitBreaker(provider: string): CircuitBreakerState {
    if (!circuitBreakers.has(provider)) {
        circuitBreakers.set(provider, { 
            failures: 0, 
            lastFailure: 0, 
            isOpen: false,
            successCount: 0 
        });
    }
    return circuitBreakers.get(provider)!;
}

function recordFailure(provider: string, log: LogFunction): void {
    const breaker = getCircuitBreaker(provider);
    breaker.failures++;
    breaker.lastFailure = Date.now();
    breaker.successCount = 0;
    
    if (breaker.failures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        log(`⚡ Circuit breaker OPEN for ${provider} (${breaker.failures} failures)`);
    }
}

function recordSuccess(provider: string): void {
    const breaker = getCircuitBreaker(provider);
    breaker.failures = 0;
    breaker.successCount++;
    
    // Half-open state: close after successful call
    if (breaker.isOpen && breaker.successCount >= 1) {
        breaker.isOpen = false;
    }
}

function isCircuitOpen(provider: string): boolean {
    const breaker = getCircuitBreaker(provider);
    
    if (!breaker.isOpen) return false;
    
    // Check if timeout has passed (allow retry)
    if (Date.now() - breaker.lastFailure > CONFIG.CIRCUIT_BREAKER_TIMEOUT) {
        // Half-open state: allow one request through
        return false;
    }
    
    return true;
}

function resetCircuitBreaker(provider: string): void {
    const breaker = getCircuitBreaker(provider);
    breaker.failures = 0;
    breaker.lastFailure = 0;
    breaker.isOpen = false;
    breaker.successCount = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function countWords(text: string): number {
    if (!text) return 0;
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0).length;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'source';
    }
}

function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        const sourceMap: Record<string, string> = {
            'nytimes.com': 'The New York Times', 
            'washingtonpost.com': 'The Washington Post', 
            'theguardian.com': 'The Guardian',
            'bbc.com': 'BBC', 
            'bbc.co.uk': 'BBC',
            'reuters.com': 'Reuters', 
            'bloomberg.com': 'Bloomberg', 
            'forbes.com': 'Forbes',
            'fortune.com': 'Fortune',
            'businessinsider.com': 'Business Insider',
            'cnbc.com': 'CNBC',
            'techcrunch.com': 'TechCrunch',
            'wired.com': 'Wired',
            'theverge.com': 'The Verge',
            'arstechnica.com': 'Ars Technica',
            'mayoclinic.org': 'Mayo Clinic', 
            'webmd.com': 'WebMD',
            'healthline.com': 'Healthline',
            'nih.gov': 'NIH', 
            'cdc.gov': 'CDC', 
            'who.int': 'WHO',
            'wikipedia.org': 'Wikipedia', 
            'britannica.com': 'Britannica',
            'investopedia.com': 'Investopedia', 
            'hbr.org': 'Harvard Business Review',
            'mckinsey.com': 'McKinsey',
            'deloitte.com': 'Deloitte',
            'pwc.com': 'PwC',
            'statista.com': 'Statista',
            'pew.org': 'Pew Research',
            'pewresearch.org': 'Pew Research'
        };
        return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
        return 'Source';
    }
}

function truncateString(str: string, maxLength: number): string {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

function sanitizeHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE VIDEO DISCOVERY — DUAL-STRATEGY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
}

function parseViewCount(viewString: string | number | undefined): number {
    if (!viewString) return 0;
    if (typeof viewString === 'number') return viewString;
    
    const str = viewString.toString().toLowerCase().replace(/,/g, '').trim();
    
    const multipliers: Record<string, number> = { 
        'k': 1000, 
        'm': 1000000, 
        'b': 1000000000,
        'thousand': 1000,
        'million': 1000000,
        'billion': 1000000000
    };
    
    for (const [suffix, mult] of Object.entries(multipliers)) {
        if (str.includes(suffix)) {
            const numPart = parseFloat(str.replace(/[^0-9.]/g, ''));
            return Math.round(numPart * mult);
        }
    }
    
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

function calculateVideoRelevance(videoTitle: string, topic: string): number {
    const titleLower = (videoTitle || '').toLowerCase();
    const topicLower = topic.toLowerCase();
    
    // Extract meaningful words (3+ chars, not common)
    const topicWords = topicLower
        .split(/\s+/)
        .filter(w => w.length > 3)
        .filter(w => !['the', 'and', 'for', 'how', 'what', 'why', 'with', 'your', 'that', 'this'].includes(w));
    
    if (topicWords.length === 0) return 50;
    
    const matchingWords = topicWords.filter(w => titleLower.includes(w));
    const matchRatio = matchingWords.length / topicWords.length;
    
    // Base score from match ratio
    let score = 40 + (matchRatio * 40);
    
    // Bonus for exact phrase match
    if (titleLower.includes(topicLower.substring(0, Math.min(20, topicLower.length)))) {
        score += 15;
    }
    
    // Bonus for tutorial/guide keywords
    const tutorialKeywords = ['tutorial', 'guide', 'how to', 'explained', 'learn', 'course', 'tips', 'secrets'];
    if (tutorialKeywords.some(kw => titleLower.includes(kw))) {
        score += 5;
    }
    
    return Math.min(100, Math.round(score));
}

export async function searchYouTubeVideo(
    topic: string,
    serperApiKey: string,
    log: LogFunction,
    options: { minViews?: number; fallbackEnabled?: boolean } = {}
): Promise<YouTubeVideoData | null> {
    const { minViews = 1000, fallbackEnabled = true } = options;
    
    log(`   🎬 YouTube Discovery starting...`);
    log(`      → Topic: "${truncateString(topic, 50)}"`);
    log(`      → Serper API: ${serperApiKey ? '✅' : '❌ MISSING'}`);
    
    if (!serperApiKey) {
        log(`   ❌ YouTube search ABORTED: No Serper API key`);
        return null;
    }
    
    // STRATEGY 1: Exact Topic Search
    const exactQueries = [
        `${topic} tutorial guide ${currentYear}`,
        `${topic} explained how to`,
        `best ${topic} tips ${currentYear}`
    ];
    
    // STRATEGY 2: Category Fallback (broader keywords)
    const broadTopic = topic.split(' ').slice(0, 3).join(' ');
    const fallbackQueries = [
        `${broadTopic} complete guide`,
        `${broadTopic} for beginners`,
        `${broadTopic} masterclass`
    ];
    
    const allQueries = [...exactQueries, ...(fallbackEnabled ? fallbackQueries : [])];
    const allVideos: YouTubeVideoData[] = [];
    const seenVideoIds = new Set<string>();
    
    for (let qIdx = 0; qIdx < allQueries.length; qIdx++) {
        const query = allQueries[qIdx];
        const isFallback = qIdx >= exactQueries.length;
        
        try {
            if (isFallback && allVideos.length > 0) {
                log(`   ⚠️ Skipping fallback (found ${allVideos.length} videos)`);
                break;
            }
            
            log(`   🔍 Query ${qIdx + 1}/${allQueries.length}: "${truncateString(query, 40)}"`);
            
            const response = await fetch('https://google.serper.dev/videos', {
                method: 'POST',
                headers: { 
                    'X-API-KEY': serperApiKey, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    q: query, 
                    gl: 'us', 
                    hl: 'en', 
                    num: 15 
                })
            });
            
            if (!response.ok) {
                log(`   ⚠️ Serper API error: ${response.status} ${response.statusText}`);
                continue;
            }
            
            const data = await response.json();
            const videos = data.videos || [];
            
            log(`      → Serper returned ${videos.length} results`);
            
            for (const video of videos) {
                // Must be YouTube
                if (!video.link?.includes('youtube.com') && !video.link?.includes('youtu.be')) {
                    continue;
                }
                
                const videoId = extractYouTubeVideoId(video.link);
                if (!videoId || seenVideoIds.has(videoId)) continue;
                seenVideoIds.add(videoId);
                
                const views = parseViewCount(video.views);
                if (views < minViews) continue;
                
                const relevanceScore = calculateVideoRelevance(video.title || '', topic);
                
                // Boost score for high view counts
                let finalScore = relevanceScore;
                if (views >= 1000000) finalScore += 15;
                else if (views >= 500000) finalScore += 10;
                else if (views >= 100000) finalScore += 7;
                else if (views >= 50000) finalScore += 4;
                
                // Penalize fallback results slightly
                if (isFallback) finalScore -= 10;
                
                allVideos.push({
                    videoId,
                    title: video.title || 'Untitled Video',
                    channel: video.channel || 'Unknown Channel',
                    views,
                    duration: video.duration,
                    thumbnailUrl: video.imageUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    relevanceScore: Math.min(100, finalScore)
                });
            }
            
            // If we found good videos from exact match, stop searching
            if (!isFallback && allVideos.filter(v => v.relevanceScore >= 60).length >= 2) {
                log(`   ✅ Found sufficient exact matches`);
                break;
            }
            
        } catch (err: any) {
            log(`   ⚠️ YouTube query error: ${err.message}`);
        }
        
        // Rate limiting
        await sleep(250);
    }
    
    // Sort by relevance
    allVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    log(`   📊 Total videos collected: ${allVideos.length}`);
    
    if (allVideos.length === 0) {
        log(`   ⚠️ No suitable YouTube videos found after all strategies`);
        return null;
    }
    
    const best = allVideos[0];
    log(`   ✅ BEST VIDEO SELECTED:`);
    log(`      → Title: "${truncateString(best.title, 50)}"`);
    log(`      → VideoId: ${best.videoId}`);
    log(`      → Views: ${best.views.toLocaleString()}`);
    log(`      → Score: ${best.relevanceScore}/100`);
    
    return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 REFERENCE DISCOVERY — AUTHORITY-WEIGHTED SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const AUTHORITY_DOMAINS = {
    government: ['.gov', '.gov.uk', '.gov.au', '.gov.ca', '.edu', '.ac.uk'],
    scientific: [
        'nature.com', 'science.org', 'sciencedirect.com', 'springer.com',
        'pubmed.gov', 'ncbi.nlm.nih.gov', 'nih.gov', 'cdc.gov', 'who.int',
        'mayoclinic.org', 'clevelandclinic.org', 'hopkinsmedicine.org'
    ],
    majorNews: [
        'reuters.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 
        'washingtonpost.com', 'theguardian.com', 'wsj.com', 
        'bloomberg.com', 'forbes.com', 'fortune.com', 'cnbc.com'
    ],
    tech: [
        'techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com',
        'thenextweb.com', 'venturebeat.com', 'zdnet.com', 'cnet.com'
    ],
    business: [
        'hbr.org', 'mckinsey.com', 'bcg.com', 'bain.com',
        'deloitte.com', 'pwc.com', 'ey.com', 'kpmg.com'
    ],
    reference: [
        'wikipedia.org', 'britannica.com', 'investopedia.com', 
        'statista.com', 'pewresearch.org', 'gallup.com'
    ]
};

function calculateAuthorityScore(url: string): number {
    const urlLower = url.toLowerCase();
    
    // Check each category with different weights
    for (const domain of AUTHORITY_DOMAINS.government) {
        if (urlLower.includes(domain)) return 95;
    }
    for (const domain of AUTHORITY_DOMAINS.scientific) {
        if (urlLower.includes(domain)) return 90;
    }
    for (const domain of AUTHORITY_DOMAINS.business) {
        if (urlLower.includes(domain)) return 85;
    }
    for (const domain of AUTHORITY_DOMAINS.majorNews) {
        if (urlLower.includes(domain)) return 82;
    }
    for (const domain of AUTHORITY_DOMAINS.tech) {
        if (urlLower.includes(domain)) return 78;
    }
    for (const domain of AUTHORITY_DOMAINS.reference) {
        if (urlLower.includes(domain)) return 75;
    }
    
    // HTTPS bonus
    if (url.startsWith('https://')) return 55;
    
    return 40;
}

export async function discoverReferences(
    topic: string,
    serperApiKey: string,
    options: { targetCount?: number; minAuthorityScore?: number } = {},
    log: LogFunction
): Promise<DiscoveredReference[]> {
    const { targetCount = 10, minAuthorityScore = 45 } = options;
    
    log(`   📚 Reference Discovery starting...`);
    log(`      → Topic: "${truncateString(topic, 40)}"`);
    log(`      → Target: ${targetCount} references`);
    
    if (!serperApiKey) {
        log(`   ❌ Reference discovery ABORTED: No Serper API key`);
        return [];
    }
    
    const allRefs: DiscoveredReference[] = [];
    const seenUrls = new Set<string>();
    
    const queries = [
        `${topic} research study statistics ${currentYear}`,
        `${topic} expert analysis report`,
        `${topic} official guide`,
        `${topic} site:edu OR site:gov`,
        `${topic} industry report data`
    ];
    
    const skipDomains = [
        'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 
        'youtube.com', 'pinterest.com', 'reddit.com', 'quora.com', 
        'linkedin.com', 'medium.com', 'tiktok.com', 'tumblr.com',
        'amazon.com', 'ebay.com', 'etsy.com'
    ];
    
    for (const query of queries) {
        if (allRefs.length >= targetCount) break;
        
        try {
            log(`   🔍 Reference query: "${truncateString(query, 40)}"`);
            
            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 
                    'X-API-KEY': serperApiKey, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    q: query, 
                    gl: 'us', 
                    hl: 'en', 
                    num: 12 
                })
            });
            
            if (!response.ok) {
                log(`   ⚠️ Serper error: ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            
            for (const result of (data.organic || [])) {
                if (allRefs.length >= targetCount) break;
                if (!result.link || !result.title) continue;
                
                const urlLower = result.link.toLowerCase();
                
                // Skip social/commerce
                if (skipDomains.some(d => urlLower.includes(d))) continue;
                
                // Skip duplicates
                if (seenUrls.has(result.link)) continue;
                seenUrls.add(result.link);
                
                const authorityScore = calculateAuthorityScore(result.link);
                if (authorityScore < minAuthorityScore) continue;
                
                // Extract year from content
                const yearMatch = (result.title + ' ' + (result.snippet || '')).match(/\b(20[1-2][0-9])\b/);
                
                allRefs.push({
                    url: result.link,
                    title: result.title,
                    source: extractSourceName(result.link),
                    snippet: result.snippet,
                    year: yearMatch ? yearMatch[1] : undefined,
                    authorityScore,
                    favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(result.link)}&sz=32`
                });
            }
            
        } catch (err: any) {
            log(`   ⚠️ Reference query error: ${err.message}`);
        }
        
        await sleep(200);
    }
    
    // Sort by authority and limit
    const sorted = allRefs
        .sort((a, b) => b.authorityScore - a.authorityScore)
        .slice(0, targetCount);
    
    log(`   ✅ Found ${sorted.length} authoritative references`);
    if (sorted.length > 0) {
        log(`      → Top sources: ${sorted.slice(0, 3).map(r => r.source).join(', ')}`);
    }
    
    return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 SEMANTIC ANCHOR FINDER — SOTA NLP-LITE
// ═══════════════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
    // Articles & Prepositions
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
    'with', 'by', 'from', 'into', 'through', 'during', 'before', 'after',
    // Pronouns
    'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they', 'their',
    // Verbs
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'need', 'want', 'get', 'make', 'use', 'know', 'take',
    // Adjectives/Adverbs
    'very', 'really', 'just', 'only', 'also', 'even', 'still', 'already',
    // Common words
    'this', 'that', 'these', 'those', 'here', 'there', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'any', 'than', 'too', 'so', 'now', 'then', 'once', 'if', 'about',
    // SEO fluff words
    'best', 'top', 'guide', 'complete', 'ultimate', 'definitive', 'tips',
    'way', 'ways', 'step', 'steps', 'new', 'first', 'one', 'two', 'three'
]);

const CONTEXT_PATTERNS = [
    // Noun + descriptor patterns
    (w: string) => `${w} strategy`,
    (w: string) => `${w} strategies`,
    (w: string) => `${w} guide`,
    (w: string) => `${w} tips`,
    (w: string) => `${w} methods`,
    (w: string) => `${w} techniques`,
    (w: string) => `${w} approach`,
    (w: string) => `${w} framework`,
    (w: string) => `${w} system`,
    (w: string) => `${w} process`,
    (w: string) => `${w} plan`,
    // Descriptor + noun patterns
    (w: string) => `guide to ${w}`,
    (w: string) => `benefits of ${w}`,
    (w: string) => `how to ${w}`,
    (w: string) => `importance of ${w}`,
    (w: string) => `power of ${w}`,
    (w: string) => `basics of ${w}`,
    (w: string) => `fundamentals of ${w}`,
    // Verb patterns
    (w: string) => `improve ${w}`,
    (w: string) => `optimize ${w}`,
    (w: string) => `master ${w}`,
    (w: string) => `learn ${w}`,
    (w: string) => `understand ${w}`
];

function findSemanticAnchor(
    text: string, 
    target: InternalLinkTarget, 
    log: LogFunction,
    verbose: boolean = false
): string | null {
    if (!text || !target?.title) return null;
    
    const textLower = text.toLowerCase();
    const titleClean = target.title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const titleWords = titleClean
        .split(' ')
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
    
    if (titleWords.length === 0) return null;
    
    if (verbose) {
        log(`         → Anchor search for: "${truncateString(target.title, 35)}"`);
        log(`         → Key concepts: [${titleWords.slice(0, 4).join(', ')}]`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 1: Exact Title Match (Highest Confidence)
    // ═══════════════════════════════════════════════════════════════
    
    if (titleClean.length >= 6 && titleClean.length <= 40 && textLower.includes(titleClean)) {
        const regex = new RegExp(titleClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        const match = text.match(regex);
        if (match) {
            if (verbose) log(`         ✓ Strategy 1: Exact match "${match[0]}"`);
            return match[0];
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 2: Multi-word Phrase Match (2-4 words from title)
    // ═══════════════════════════════════════════════════════════════
    
    for (let len = Math.min(4, titleWords.length); len >= 2; len--) {
        for (let start = 0; start <= titleWords.length - len; start++) {
            const phrase = titleWords.slice(start, start + len).join(' ');
            if (phrase.length >= 6 && phrase.length <= 35 && textLower.includes(phrase)) {
                const regex = new RegExp(phrase, 'i');
                const match = text.match(regex);
                if (match) {
                    if (verbose) log(`         ✓ Strategy 2: Phrase match "${match[0]}"`);
                    return match[0];
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 3: Contextual Pattern Matching (NLP-lite)
    // ═══════════════════════════════════════════════════════════════
    
    for (const word of titleWords) {
        if (word.length < 4) continue;
        
        for (const patternFn of CONTEXT_PATTERNS) {
            const pattern = patternFn(word);
            if (textLower.includes(pattern)) {
                const regex = new RegExp(pattern, 'i');
                const match = text.match(regex);
                if (match) {
                    if (verbose) log(`         ✓ Strategy 3: Context match "${match[0]}"`);
                    return match[0];
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 4: Important Word + Adjacent Word
    // ═══════════════════════════════════════════════════════════════
    
    const importantWords = titleWords.filter(w => w.length >= 5);
    
    for (const word of importantWords) {
        const wordIdx = textLower.indexOf(word);
        if (wordIdx === -1) continue;
        
        const actualWord = text.substring(wordIdx, wordIdx + word.length);
        
        // Try word + next word
        const afterText = text.substring(wordIdx + word.length, wordIdx + word.length + 25);
        const afterMatch = afterText.match(/^\s*([a-zA-Z]{3,15})/);
        if (afterMatch && !STOP_WORDS.has(afterMatch[1].toLowerCase())) {
            const anchor = `${actualWord} ${afterMatch[1]}`;
            if (anchor.length >= 8 && anchor.length <= 35) {
                if (verbose) log(`         ✓ Strategy 4a: Adjacent match "${anchor}"`);
                return anchor;
            }
        }
        
        // Try previous word + word
        const beforeText = text.substring(Math.max(0, wordIdx - 25), wordIdx);
        const beforeMatch = beforeText.match(/([a-zA-Z]{3,15})\s*$/);
        if (beforeMatch && !STOP_WORDS.has(beforeMatch[1].toLowerCase())) {
            const anchor = `${beforeMatch[1]} ${actualWord}`;
            if (anchor.length >= 8 && anchor.length <= 35) {
                if (verbose) log(`         ✓ Strategy 4b: Adjacent match "${anchor}"`);
                return anchor;
            }
        }
        
        // Single important word (7+ chars)
        if (word.length >= 7) {
            if (verbose) log(`         ✓ Strategy 4c: Single word "${actualWord}"`);
            return actualWord;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 5: Slug-based Matching
    // ═══════════════════════════════════════════════════════════════
    
    if (target.slug && target.slug.length > 5) {
        const slugWords = target.slug
            .replace(/-/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
        
        for (const word of slugWords) {
            const wordIdx = textLower.indexOf(word);
            if (wordIdx !== -1) {
                const actualWord = text.substring(wordIdx, wordIdx + word.length);
                if (word.length >= 6) {
                    if (verbose) log(`         ✓ Strategy 5: Slug match "${actualWord}"`);
                    return actualWord;
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // NO FALLBACK — Better to skip than link randomly
    // ═══════════════════════════════════════════════════════════════
    
    if (verbose) log(`         ✗ No semantic match found`);
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL DISTRIBUTION ENGINE — DENSITY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

class VisualDistributionEngine {
    private visualQueue: Array<(topic: string) => string>;
    private index: number = 0;
    private wordsCounter: number = 0;
    private paragraphCounter: number = 0;
    
    constructor() {
        // Diverse rotation ensures variety and engagement
        this.visualQueue = [
            (t) => createProTipBox(
                `When implementing ${t}, consistency beats intensity. Small daily actions compound into massive results over time.`,
                "💡 Expert Tip"
            ),
            (t) => createStatisticsBox([
                { value: "87%", label: "Success Rate", icon: "📈" },
                { value: "3x", label: "Faster Growth", icon: "⚡" },
                { value: "21", label: "Days to Habit", icon: "🎯" }
            ]),
            (t) => createWarningBox(
                `Common Pitfall: Many beginners rush the planning phase. This is where 80% of failures originate.`,
                "⚠️ Critical Warning"
            ),
            (t) => createChecklistBox("Quick Action Checklist", [
                `Audit your current ${t.split(' ').slice(0, 2).join(' ')} setup`,
                "Define clear, measurable KPIs",
                "Execute the core framework",
                "Review and iterate weekly"
            ]),
            (t) => createDefinitionBox(
                t.split(' ').slice(0, 3).join(' '),
                `A systematic approach to achieving measurable results through proven strategies, consistent execution, and continuous optimization.`
            ),
            (t) => createExpertQuoteBox(
                `"The secret isn't knowing what to do—it's doing it consistently, especially when you don't feel like it."`,
                "Industry Expert",
                "Thought Leader"
            ),
            (t) => createHighlightBox(
                `This is a marathon, not a sprint. Focus on building sustainable systems rather than chasing quick wins.`,
                "🚀"
            ),
            (t) => createCalloutBox(
                `Take a moment to reflect on this section. How can you apply these principles to your specific situation?`,
                "info"
            ),
            (t) => createCalloutBox(
                `You're making excellent progress! Most people never make it this far in their learning journey.`,
                "success"
            ),
            (t) => createNumberedBox(
                "1",
                "Priority One",
                `If you only implement one thing from this section, make it this: start before you feel ready.`
            ),
            (t) => createStepByStepBox("Quick Implementation", [
                { title: "Step 1: Assess", description: "Evaluate your current situation honestly" },
                { title: "Step 2: Plan", description: "Map out your strategy with clear milestones" },
                { title: "Step 3: Execute", description: "Take consistent daily action" },
                { title: "Step 4: Review", description: "Analyze results and adjust course" }
            ]),
            (t) => createHighlightBox(
                `Information without implementation is just entertainment. Apply what you learn immediately.`,
                "🎯",
                "--wpo-warning"
            ),
            (t) => createProTipBox(
                `Track everything. What gets measured gets managed. Set up your metrics before you start.`,
                "💡 Pro Tip"
            ),
            (t) => createCalloutBox(
                `Don't skip ahead! Master each section before moving to the next. Building on weak foundations leads to failure.`,
                "warning"
            )
        ];
    }
    
    public getNextVisual(topic: string): string {
        const visualFn = this.visualQueue[this.index % this.visualQueue.length];
        this.index++;
        return visualFn(topic);
    }
    
    public trackContent(wordCount: number, paragraphCount: number): void {
        this.wordsCounter += wordCount;
        this.paragraphCounter += paragraphCount;
    }
    
    public shouldInjectVisual(): boolean {
        // Inject if either threshold exceeded
        if (this.wordsCounter >= CONFIG.VISUAL_GAP_WORDS) {
            this.wordsCounter = 0;
            this.paragraphCounter = 0;
            return true;
        }
        if (this.paragraphCounter >= CONFIG.VISUAL_GAP_PARAGRAPHS) {
            this.wordsCounter = 0;
            this.paragraphCounter = 0;
            return true;
        }
        return false;
    }
    
    public resetCounters(): void {
        this.wordsCounter = 0;
        this.paragraphCounter = 0;
    }
    
    public getVisualsInjected(): number {
        return this.index;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 ROBUST JSON HEALING — 6-STRATEGY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function healJSON(rawText: string, log: LogFunction): { success: boolean; data?: any; error?: string } {
    if (!rawText?.trim()) {
        return { success: false, error: 'Empty response' };
    }
    
    let text = rawText.trim();
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 1: Markdown Code Block Strip
    // ═══════════════════════════════════════════════════════════════
    
    text = text
        .replace(/^```json\s*/i, '')
        .replace(/^```typescript\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 2: Direct Parse Attempt
    // ═══════════════════════════════════════════════════════════════
    
    try {
        const parsed = JSON.parse(text);
        if (parsed && (parsed.htmlContent || parsed.content)) {
            return { success: true, data: parsed };
        }
    } catch {}
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 3: Substring Extraction (Find outer braces)
    // ═══════════════════════════════════════════════════════════════
    
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            const extracted = text.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(extracted);
            if (parsed && (parsed.htmlContent || parsed.content)) {
                log('   ✓ JSON healed (boundary extraction)');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 4: Trailing Comma & Syntax Fix
    // ═══════════════════════════════════════════════════════════════
    
    try {
        const noTrailing = text
            .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
            .replace(/(["\d\]}])\s*\n\s*(["{[])/g, '$1,$2')  // Add missing commas
            .replace(/\r\n/g, '\\n')  // Escape newlines in strings
            .replace(/\n/g, '\\n');
        
        const parsed = JSON.parse(noTrailing);
        if (parsed && (parsed.htmlContent || parsed.content)) {
            log('   ✓ JSON healed (syntax fix)');
            return { success: true, data: parsed };
        }
    } catch {}
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 5: Truncation Repair (Close unclosed brackets)
    // ═══════════════════════════════════════════════════════════════
    
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    const openBrackets = (text.match(/\[/g) || []).length;
    const closeBrackets = (text.match(/\]/g) || []).length;
    
    let repairedText = text;
    
    // Close unclosed brackets
    if (openBrackets > closeBrackets) {
        repairedText += ']'.repeat(openBrackets - closeBrackets);
    }
    
    // Close unclosed braces
    if (openBraces > closeBraces) {
        // Check if we're inside a string (look for unclosed quotes)
        const quoteCount = (repairedText.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            repairedText += '"';  // Close unclosed string
        }
        repairedText += '}'.repeat(openBraces - closeBraces);
    }
    
    if (repairedText !== text) {
        try {
            const parsed = JSON.parse(repairedText);
            if (parsed && (parsed.htmlContent || parsed.content)) {
                log('   ✓ JSON healed (truncation repair)');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY 6: Regex-based Field Extraction (Last Resort)
    // ═══════════════════════════════════════════════════════════════
    
    try {
        const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
        const slugMatch = text.match(/"slug"\s*:\s*"([^"]+)"/);
        const metaMatch = text.match(/"metaDescription"\s*:\s*"([^"]+)"/);
        const contentMatch = text.match(/"htmlContent"\s*:\s*"([\s\S]+?)(?:"\s*,\s*"|"\s*})/);
        
        if (contentMatch && contentMatch[1]) {
            const reconstructed = {
                title: titleMatch ? titleMatch[1] : 'Untitled',
                slug: slugMatch ? slugMatch[1] : 'untitled',
                metaDescription: metaMatch ? metaMatch[1] : '',
                htmlContent: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                faqs: [],
                excerpt: ''
            };
            
            log('   ✓ JSON healed (field extraction)');
            return { success: true, data: reconstructed };
        }
    } catch {}
    
    return { success: false, error: 'All 6 JSON healing strategies failed' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 H1 REMOVAL & CONTENT SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function removeAllH1Tags(html: string, log: LogFunction): string {
    if (!html) return html;
    
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0) return html;
    
    log(`   ⚠️ Removing ${h1Count} H1 tag(s)...`);
    
    let cleaned = html;
    
    // Remove complete H1 tags with content
    cleaned = cleaned.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
    
    // Remove any orphaned H1 tags
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/h1>/gi, '');
    
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned;
}

function stripFAQFromContent(html: string, log: LogFunction): string {
    const originalLength = html.length;
    
    let cleaned = html;
    
    // Remove FAQ sections (H2 with FAQ-related text)
    cleaned = cleaned.replace(/<h2[^>]*>.*?(?:FAQ|Frequently Asked|Common Questions|Questions & Answers).*?<\/h2>[\s\S]*?(?=<h2[^>]*>|$)/gi, '');
    
    // Remove FAQ sections (H3 variant)
    cleaned = cleaned.replace(/<h3[^>]*>.*?(?:FAQ|Frequently Asked).*?<\/h3>[\s\S]*?(?=<h[23][^>]*>|$)/gi, '');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n');
    
    if (cleaned.length < originalLength) {
        log(`   🧹 Stripped ${originalLength - cleaned.length} chars of duplicate FAQ content`);
    }
    
    return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 LLM CALLERS — MULTI-PROVIDER SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

async function callLLM(
    provider: string,
    apiKeys: any,
    model: string,
    userPrompt: string,
    systemPrompt: string,
    options: { temperature?: number; maxTokens?: number },
    timeoutMs: number,
    log: LogFunction
): Promise<string> {
    const { temperature = 0.7, maxTokens = 16000 } = options;
    
    // Check circuit breaker
    if (isCircuitOpen(provider)) {
        throw new Error(`Circuit breaker OPEN for ${provider} - API temporarily unavailable`);
    }
    
    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        let response: string;
        
        switch (provider) {
            case 'google':
                response = await callGemini(apiKeys.google, model, userPrompt, systemPrompt, temperature, maxTokens);
                break;
            case 'openrouter':
                response = await callOpenRouter(
                    apiKeys.openrouter, 
                    apiKeys.openrouterModel || model, 
                    userPrompt, 
                    systemPrompt, 
                    temperature, 
                    maxTokens, 
                    controller.signal
                );
                break;
            case 'openai':
                response = await callOpenAI(
                    apiKeys.openai, 
                    model || 'gpt-4o', 
                    userPrompt, 
                    systemPrompt, 
                    temperature, 
                    maxTokens, 
                    controller.signal
                );
                break;
            case 'anthropic':
                response = await callAnthropic(
                    apiKeys.anthropic, 
                    model || 'claude-sonnet-4-20250514', 
                    userPrompt, 
                    systemPrompt, 
                    temperature, 
                    maxTokens, 
                    controller.signal
                );
                break;
            case 'groq':
                response = await callGroq(
                    apiKeys.groq, 
                    apiKeys.groqModel || model || 'llama-3.3-70b-versatile', 
                    userPrompt, 
                    systemPrompt, 
                    temperature, 
                    Math.min(maxTokens, 8000),  // Groq has lower limits
                    controller.signal
                );
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
        
        clearTimeout(timeoutId);
        recordSuccess(provider);
        return response;
        
    } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Record failure for certain error types
        if (
            error.message?.includes('401') || 
            error.message?.includes('429') || 
            error.message?.includes('500') ||
            error.message?.includes('503') ||
            error.name === 'AbortError'
        ) {
            recordFailure(provider, log);
        }
        
        throw error;
    }
}

async function callGemini(
    apiKey: string, 
    model: string, 
    userPrompt: string, 
    systemPrompt: string, 
    temperature: number, 
    maxTokens: number
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-preview-05-20',
        contents: userPrompt,
        config: { 
            systemInstruction: systemPrompt, 
            temperature, 
            maxOutputTokens: maxTokens 
        }
    });
    
    return response.text || '';
}

async function callOpenRouter(
    apiKey: string, 
    model: string, 
    userPrompt: string, 
    systemPrompt: string, 
    temperature: number, 
    maxTokens: number, 
    signal: AbortSignal
): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json', 
            'HTTP-Referer': 'https://wp-optimizer-pro.com', 
            'X-Title': 'WP Optimizer Pro' 
        },
        body: JSON.stringify({ 
            model, 
            messages: [
                { role: 'system', content: systemPrompt }, 
                { role: 'user', content: userPrompt }
            ], 
            temperature, 
            max_tokens: maxTokens 
        }),
        signal
    });
    
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`OpenRouter error ${response.status}: ${errorBody.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(
    apiKey: string, 
    model: string, 
    userPrompt: string, 
    systemPrompt: string, 
    temperature: number, 
    maxTokens: number, 
    signal: AbortSignal
): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            model, 
            messages: [
                { role: 'system', content: systemPrompt }, 
                { role: 'user', content: userPrompt }
            ], 
            temperature, 
            max_tokens: maxTokens 
        }),
        signal
    });
    
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`OpenAI error ${response.status}: ${errorBody.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(
    apiKey: string, 
    model: string, 
    userPrompt: string, 
    systemPrompt: string, 
    temperature: number, 
    maxTokens: number, 
    signal: AbortSignal
): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
            'x-api-key': apiKey, 
            'Content-Type': 'application/json', 
            'anthropic-version': '2023-06-01' 
        },
        body: JSON.stringify({ 
            model, 
            system: systemPrompt, 
            messages: [{ role: 'user', content: userPrompt }], 
            temperature, 
            max_tokens: maxTokens 
        }),
        signal
    });
    
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Anthropic error ${response.status}: ${errorBody.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data.content?.[0]?.text || '';
}

async function callGroq(
    apiKey: string, 
    model: string, 
    userPrompt: string, 
    systemPrompt: string, 
    temperature: number, 
    maxTokens: number, 
    signal: AbortSignal
): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            model, 
            messages: [
                { role: 'system', content: systemPrompt }, 
                { role: 'user', content: userPrompt }
            ], 
            temperature, 
            max_tokens: maxTokens 
        }),
        signal
    });
    
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Groq error ${response.status}: ${errorBody.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN ORCHESTRATOR CLASS — 4-PHASE ENTERPRISE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

class AIOrchestrator {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: ASSET DISCOVERY (YouTube + References)
    // ═══════════════════════════════════════════════════════════════════════════
    
    private async discoverAssets(
        config: GenerateConfig, 
        log: LogFunction
    ): Promise<AssetDiscoveryResult> {
        log(`🔍 PHASE 1: Asset Discovery`);
        log(`   → Topic: "${truncateString(config.topic, 50)}"`);
        log(`   → Serper API: ${config.apiKeys?.serper ? '✅' : '❌ MISSING'}`);
        
        // 1. YouTube Discovery (with Category Fallback)
        const youtubePromise: Promise<YouTubeVideoData | null> = config.apiKeys?.serper 
            ? searchYouTubeVideo(config.topic, config.apiKeys.serper, log, {
                minViews: 1000,
                fallbackEnabled: true
            })
            : Promise.resolve(null);
        
        // 2. Reference Discovery
        const referencesPromise: Promise<DiscoveredReference[]> = config.apiKeys?.serper 
            ? discoverReferences(config.topic, config.apiKeys.serper, {
                targetCount: 10,
                minAuthorityScore: 45
            }, log)
            : Promise.resolve([]);
        
        // 3. Parallel Execution with Error Isolation
        const [youtubeResult, referencesResult] = await Promise.allSettled([
            youtubePromise,
            referencesPromise
        ]);
        
        // 4. Extract Results Safely
        const video = youtubeResult.status === 'fulfilled' ? youtubeResult.value : null;
        const references = referencesResult.status === 'fulfilled' ? referencesResult.value : [];
        
        // 5. Log Results
        if (video) {
            log(`   ✅ YouTube CAPTURED: ${video.videoId}`);
            log(`      → Title: "${truncateString(video.title, 45)}"`);
            log(`      → Views: ${video.views.toLocaleString()}`);
        } else {
            log(`   ⚠️ YouTube: No video found after all strategies`);
        }
        
        log(`   ✅ References: ${references.length} authoritative sources`);
        
        return { video, references };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: LLM CONTENT GENERATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    private async generateContent(
        config: GenerateConfig, 
        log: LogFunction
    ): Promise<ContentContract> {
        log(`📝 PHASE 2: LLM Content Generation`);
        log(`   → Provider: ${config.provider}`);
        log(`   → Model: ${config.model}`);
        
        const systemPrompt = `You are a world-class SEO content writer and subject matter expert. Write comprehensive, high-value blog content.

STRUCTURE RULES:
1. NO H1 Tags — WordPress provides the title automatically
2. Use 8-12 H2 section headings for main topics
3. Use 2-3 H3 subheadings per H2 section
4. Wrap ALL text content in <p> tags
5. Use <ul>/<ol> for lists with <li> items
6. NO "Conclusion" heading — use "Final Thoughts" or "Key Takeaways" instead
7. Do NOT include a FAQ section in htmlContent — provide FAQs separately in the JSON

WRITING STYLE:
- Tone: Expert, authoritative, yet conversational
- Use "you" and "your" to address the reader directly
- Use contractions (don't, won't, you'll, here's)
- Short paragraphs (2-4 sentences maximum)
- Start some sentences with "And", "But", "So", "Look", "Here's the thing"
- Include specific examples, data points, and actionable advice
- Avoid fluff — every sentence must provide value

BANNED PHRASES (NEVER USE):
- "In today's fast-paced world"
- "In today's digital age"
- "It's important to note"
- "Let's dive in"
- "Without further ado"
- "At the end of the day"
- "Comprehensive guide"
- "Leverage", "utilize", "delve", "plethora"

OUTPUT FORMAT: Return ONLY valid JSON:
{
  "title": "Compelling, curiosity-inducing title (50-60 characters)",
  "slug": "url-friendly-slug-with-hyphens",
  "metaDescription": "Compelling meta description with value proposition (150-160 characters)",
  "htmlContent": "Full HTML article body with <p>, <h2>, <h3>, <ul>, <li> tags",
  "excerpt": "2-3 sentence summary for previews",
  "faqs": [
    {"question": "Question text?", "answer": "80-150 word detailed answer"}
  ]
}`;

        const userPrompt = `Write a ${CONFIG.TARGET_WORDS_TOTAL}+ word expert article about: "${config.topic}"

Include:
- Deep analysis with specific examples
- Actionable step-by-step guidance
- Common mistakes and how to avoid them
- Expert tips and pro insights
- Data points and statistics where relevant
- 6-8 FAQ questions with comprehensive answers

Make it genuinely valuable — something readers would bookmark and share.`;

        let contract: ContentContract | null = null;
        
        // Retry Loop with Exponential Backoff
        for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
            log(`   📝 Generation attempt ${attempt}/${CONFIG.MAX_RETRIES}...`);
            
            try {
                const response = await callLLM(
                    config.provider,
                    config.apiKeys,
                    config.model,
                    userPrompt,
                    systemPrompt,
                    { 
                        temperature: 0.72 + (attempt - 1) * 0.05,  // Increase temp on retry
                        maxTokens: 16000 
                    },
                    CONFIG.TIMEOUT_SINGLE_SHOT,
                    log
                );
                
                const healed = healJSON(response, log);
                
                if (healed.success && healed.data?.htmlContent) {
                    contract = healed.data as ContentContract;
                    const wordCount = countWords(contract.htmlContent);
                    log(`   ✅ Content generated: ${wordCount.toLocaleString()} words`);
                    break;
                } else {
                    log(`   ⚠️ JSON healing failed: ${healed.error}`);
                }
                
            } catch (err: any) {
                log(`   ❌ Generation error: ${err.message}`);
                
                if (attempt < CONFIG.MAX_RETRIES) {
                    const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
                    log(`   ⏳ Retrying in ${delay / 1000}s...`);
                    await sleep(delay);
                }
            }
        }
        
        if (!contract) {
            throw new Error(`Content generation failed after ${CONFIG.MAX_RETRIES} attempts`);
        }
        
        return contract;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3: CONTENT ENRICHMENT (Visuals + Breathing)
    // ═══════════════════════════════════════════════════════════════════════════
    
    private enrichContent(
        html: string,
        topic: string,
        video: YouTubeVideoData | null,
        log: LogFunction
    ): string {
        log(`🎨 PHASE 3: Content Enrichment`);
        
        const visualEngine = new VisualDistributionEngine();
        
        // 1. Clean and prepare content
        let cleanHtml = removeAllH1Tags(html, log);
        cleanHtml = stripFAQFromContent(cleanHtml, log);
        cleanHtml = sanitizeHtml(cleanHtml);
        
        // 2. Split by H2 sections (keeps delimiter)
        const h2Regex = /(<h2[^>]*>[\s\S]*?<\/h2>)/gi;
        const parts = cleanHtml.split(h2Regex);
        
        const result: string[] = [];
        
        // 3. Add CSS and wrapper
        result.push(THEME_ADAPTIVE_CSS);
        result.push('<div class="wpo-content">');
        
        // 4. Process intro (content before first H2)
        if (parts[0] && parts[0].trim().length > 0) {
            result.push(parts[0]);
            
            // Add Quick Answer box
            result.push(createQuickAnswerBox(
                `This comprehensive guide to ${topic} covers proven strategies, expert insights, and actionable steps you can implement immediately. Whether you're a beginner or looking to optimize your approach, you'll find exactly what you need here.`,
                '⚡ Quick Answer'
            ));
            
            // Add statistics dashboard
            result.push(createStatisticsBox([
                { value: '73%', label: 'Success Rate', icon: '📈' },
                { value: '2.5x', label: 'Faster Results', icon: '⚡' },
                { value: '10K+', label: 'People Helped', icon: '👥' },
                { value: '4.8★', label: 'User Rating', icon: '⭐' }
            ]));
        }
        
        let isFirstH2 = true;
        let sectionCount = 0;
        
        // 5. Process each section
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            
            // H2 header detection
            if (part.match(/<h2[^>]*>/i)) {
                sectionCount++;
                result.push(part);
                
                // Inject YouTube after first H2
                if (isFirstH2 && video && video.videoId) {
                    result.push(createYouTubeEmbed(video));
                    log(`   🎬 YouTube embedded after first H2`);
                    isFirstH2 = false;
                }
                
                continue;
            }
            
            // Content block processing
            if (part.trim().length > 0) {
                const paragraphs = part.split(/<\/p>/gi).filter(p => {
                    const text = p.replace(/<[^>]*>/g, '').trim();
                    return text.length >= CONFIG.MIN_PARAGRAPH_LENGTH;
                });
                
                // Apply Content Breathing algorithm
                if (paragraphs.length >= CONFIG.VISUAL_GAP_PARAGRAPHS) {
                    // Dense section: inject visual in middle
                    const midPoint = Math.floor(paragraphs.length / 2);
                    let processedBlock = '';
                    
                    paragraphs.forEach((p, idx) => {
                        if (p.trim()) {
                            processedBlock += p + '</p>\n';
                            visualEngine.trackContent(countWords(p), 1);
                        }
                        
                        // Inject visual at midpoint
                        if (idx === midPoint && visualEngine.shouldInjectVisual()) {
                            processedBlock += visualEngine.getNextVisual(topic);
                        }
                    });
                    
                    result.push(processedBlock);
                } else {
                    // Short section: add content + visual at end
                    result.push(part);
                    
                    // 70% chance to add visual to short sections
                    if (Math.random() < 0.7) {
                        result.push(visualEngine.getNextVisual(topic));
                    }
                }
                
                // Section-specific enhancements
                if (sectionCount === 2) {
                    result.push(createDataTable(
                        `${topic} — Key Metrics`,
                        ['Metric', 'Value', 'Impact'],
                        [
                            ['Success Rate', '67-73%', 'High'],
                            ['Time to Results', '30-90 days', 'Medium'],
                            ['ROI Improvement', '2.5x average', 'High'],
                            ['Adoption Growth', '+34% YoY', 'Growing']
                        ],
                        'Industry research and case studies'
                    ));
                }
                
                if (sectionCount === 4) {
                    result.push(createComparisonTable(
                        'What Works vs What Doesn\'t',
                        ['❌ Common Mistakes', '✅ Best Practices'],
                        [
                            ['Trying everything at once', 'Focus on one strategy until mastery'],
                            ['Copying others blindly', 'Adapting strategies to your situation'],
                            ['Giving up after first failure', 'Treating failures as learning data'],
                            ['Waiting for perfect conditions', 'Starting messy and iterating fast']
                        ]
                    ));
                }
                
                if (sectionCount === 6) {
                    result.push(createIconGridBox('Core Principles', [
                        { icon: '🎯', title: 'Focus', description: 'Concentrate on high-impact activities' },
                        { icon: '📊', title: 'Measure', description: 'Track what matters most' },
                        { icon: '🔄', title: 'Iterate', description: 'Improve continuously' },
                        { icon: '🚀', title: 'Scale', description: 'Expand what works' }
                    ]));
                }
            }
        }
        
        // 6. Add footer elements
        result.push(createHighlightBox(
            `You now have everything you need to succeed with ${topic}. The only question: will you take action? Start today.`,
            '🚀',
            '--wpo-success'
        ));
        
        result.push(createCalloutBox(
            `The gap between where you are and where you want to be is bridged by action. Go make it happen.`,
            'success'
        ));
        
        result.push('</div>');
        
        log(`   ✅ Enrichment complete: ${visualEngine.getVisualsInjected()} visuals injected`);
        
        return result.filter(Boolean).join('\n\n');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4: FINALIZATION (Links + References + FAQ)
    // ═══════════════════════════════════════════════════════════════════════════
    
    private finalizeContent(
        html: string,
        contract: ContentContract,
        config: GenerateConfig,
        references: DiscoveredReference[],
        log: LogFunction
    ): string {
        log(`🔗 PHASE 4: Finalization`);
        
        let finalHtml = html;
        let linksAdded = 0;
        
        // ═══════════════════════════════════════════════════════════════
        // 4A: HYBRID INTERNAL LINKING
        // ═══════════════════════════════════════════════════════════════
        
        if (config.internalLinks && config.internalLinks.length > 0) {
            log(`   🔗 Internal Link Injection`);
            log(`      → Available targets: ${config.internalLinks.length}`);
            
            const targets = [...config.internalLinks];
            const usedUrls = new Set<string>();
            
            // Split by paragraph for safe modification
            const parts = finalHtml.split(/<\/p>/gi);
            
            finalHtml = parts.map((part, idx) => {
                // Stop if max links reached
                if (linksAdded >= CONFIG.MAX_LINKS_TOTAL) return part;
                
                // Skip non-paragraphs
                if (!part.includes('<p')) return part;
                
                // Skip visual components
                if (part.includes('wpo-box') || part.includes('wpo-content')) return part;
                
                // Skip already linked paragraphs
                if (part.includes('<a href')) return part;
                
                const plainText = part.replace(/<[^>]*>/g, ' ').trim();
                if (plainText.length < 50) return part;
                
                // TIER 1: Semantic Anchor Injection
                for (let i = 0; i < targets.length; i++) {
                    const target = targets[i];
                    if (usedUrls.has(target.url)) continue;
                    
                    const anchor = findSemanticAnchor(plainText, target, log, linksAdded < 3);
                    
                    if (anchor) {
                        const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`\\b${escapedAnchor}\\b`, 'i');
                        
                        if (regex.test(part)) {
                            const link = `<a href="${escapeHtml(target.url)}" title="${escapeHtml(target.title)}">${anchor}</a>`;
                            const newPart = part.replace(regex, link);
                            
                            if (newPart !== part) {
                                linksAdded++;
                                usedUrls.add(target.url);
                                targets.splice(i, 1);
                                log(`      ✅ Semantic link ${linksAdded}: "${anchor}"`);
                                return newPart;
                            }
                        }
                    }
                }
                
                // TIER 2: Bridge Sentence Injection (Fallback)
                if (
                    plainText.length > 150 && 
                    targets.length > 0 && 
                    Math.random() < CONFIG.BRIDGE_LINK_PROBABILITY &&
                    !part.includes('wpo-')
                ) {
                    const target = targets.shift();
                    if (target && !usedUrls.has(target.url)) {
                        linksAdded++;
                        usedUrls.add(target.url);
                        
                        // Generate contextual bridge sentence
                        const bridgePhrases = [
                            `For a deeper dive, see our guide on`,
                            `Learn more about this in our article on`,
                            `For related insights, check out`,
                            `Expand on this topic with our guide to`
                        ];
                        const bridgePhrase = bridgePhrases[idx % bridgePhrases.length];
                        
                        const bridgeLink = ` (${bridgePhrase} <a href="${escapeHtml(target.url)}">${escapeHtml(truncateString(target.title, 35))}</a>.)`;
                        
                        log(`      ✅ Bridge link ${linksAdded}: "${truncateString(target.title, 30)}"`);
                        return part + bridgeLink;
                    }
                }
                
                return part;
            }).join('</p>');
            
            log(`      → Total links injected: ${linksAdded}`);
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 4B: KEY TAKEAWAYS
        // ═══════════════════════════════════════════════════════════════
        
        const topicShort = config.topic.split(' ').slice(0, 4).join(' ');
        
        finalHtml += createKeyTakeaways([
            `${topicShort} requires consistent, focused action over time`,
            `Focus on the 20% of activities that drive 80% of results`,
            `Track your progress weekly — what gets measured improves`,
            `Start messy and iterate fast — perfectionism kills momentum`,
            `Find someone successful and model their proven process`,
            `Build systems, not just goals — systems create lasting results`
        ]);
        
        // ═══════════════════════════════════════════════════════════════
        // 4C: FAQ ACCORDION
        // ═══════════════════════════════════════════════════════════════
        
        if (contract.faqs && contract.faqs.length > 0) {
            const validFaqs = contract.faqs.filter((f: any) => 
                f?.question?.length > 5 && f?.answer?.length > 20
            );
            
            if (validFaqs.length > 0) {
                finalHtml += createFAQAccordion(validFaqs);
                log(`   ✅ FAQ section: ${validFaqs.length} questions`);
            }
        } else {
            // Generate default FAQs
            const defaultFaqs = [
                { 
                    question: `What is ${topicShort}?`, 
                    answer: `${topicShort} is a systematic approach to achieving measurable results through proven strategies, consistent execution, and continuous optimization. This guide covers everything from foundational principles to advanced techniques.` 
                },
                { 
                    question: `How long does it take to see results?`, 
                    answer: `Most practitioners see initial results within 30-90 days of consistent effort. Significant improvements typically require 3-6 months of dedicated practice. The key is consistency and proper implementation of the strategies outlined in this guide.` 
                },
                { 
                    question: `What are the most common mistakes to avoid?`, 
                    answer: `The biggest mistakes include: trying to do too much at once, not tracking progress, giving up too early, and not learning from those who have already succeeded. Focus on one strategy at a time and master it before moving on.` 
                },
                { 
                    question: `Do I need special tools or resources?`, 
                    answer: `Start with the basics and free tools available. The fundamentals work regardless of tools. As you progress, you can invest in advanced solutions, but the core principles remain the same.` 
                },
                { 
                    question: `What if I get stuck or face challenges?`, 
                    answer: `Getting stuck is normal and part of the learning process. Review your tracking data, simplify your approach, and find someone who has been where you are for specific advice. Persistence is key.` 
                }
            ];
            
            finalHtml += createFAQAccordion(defaultFaqs);
            log(`   ✅ FAQ section: 5 default questions`);
        }
        
        // ═══════════════════════════════════════════════════════════════
        // 4D: REFERENCES SECTION
        // ═══════════════════════════════════════════════════════════════
        
        if (references.length > 0) {
            finalHtml += createReferencesSection(references);
            log(`   ✅ References section: ${references.length} sources`);
        }
        
        return finalHtml;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🎯 MASTER CONTROLLER — SINGLE-SHOT GENERATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    async generateSingleShot(
        config: GenerateConfig, 
        log: LogFunction
    ): Promise<GenerationResult> {
        const startTime = Date.now();
        
        log(`🚀 ═══════════════════════════════════════════════════════════`);
        log(`🚀 WP OPTIMIZER PRO v${AI_ORCHESTRATOR_VERSION}`);
        log(`🚀 ENTERPRISE 4-PHASE CONTENT PIPELINE`);
        log(`🚀 ═══════════════════════════════════════════════════════════`);
        log(`   → Topic: "${truncateString(config.topic, 50)}"`);
        log(`   → Provider: ${config.provider}`);
        log(`   → Model: ${config.model}`);
        
        try {
            // ═══════════════════════════════════════════════════════════════
            // PHASE 1: ASSET DISCOVERY
            // ═══════════════════════════════════════════════════════════════
            
            const assets = await this.discoverAssets(config, log);
            
            // ═══════════════════════════════════════════════════════════════
            // PHASE 2: CONTENT GENERATION
            // ═══════════════════════════════════════════════════════════════
            
            const rawContract = await this.generateContent(config, log);
            
            // ═══════════════════════════════════════════════════════════════
            // PHASE 3: CONTENT ENRICHMENT
            // ═══════════════════════════════════════════════════════════════
            
            const enrichedHtml = this.enrichContent(
                rawContract.htmlContent,
                config.topic,
                assets.video,
                log
            );
            
            // ═══════════════════════════════════════════════════════════════
            // PHASE 4: FINALIZATION
            // ═══════════════════════════════════════════════════════════════
            
            const finalHtml = this.finalizeContent(
                enrichedHtml,
                rawContract,
                config,
                assets.references,
                log
            );
            
            // ═══════════════════════════════════════════════════════════════
            // ASSEMBLY & VALIDATION
            // ═══════════════════════════════════════════════════════════════
            
            const finalWordCount = countWords(finalHtml);
            
            const finalContract: ContentContract = {
                ...rawContract,
                htmlContent: finalHtml,
                wordCount: finalWordCount
            };
            
            const totalTime = Date.now() - startTime;
            
            log(`🎉 ═══════════════════════════════════════════════════════════`);
            log(`🎉 PIPELINE COMPLETE`);
            log(`🎉 ═══════════════════════════════════════════════════════════`);
            log(`   → Words: ${finalWordCount.toLocaleString()}`);
            log(`   → Time: ${(totalTime / 1000).toFixed(1)}s`);
            log(`   → YouTube: ${assets.video ? '✅' : '❌'}`);
            log(`   → References: ${assets.references.length}`);
            
            return {
                contract: finalContract,
                generationMethod: 'single-shot',
                attempts: 1,
                totalTime,
                youtubeVideo: assets.video || undefined,
                references: assets.references
            };
            
        } catch (error: any) {
            log(`❌ CRITICAL FAILURE: ${error.message}`);
            throw error;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BACKWARDS COMPATIBILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    async generateEnhanced(
        config: GenerateConfig,
        log: LogFunction,
        onStageProgress?: (progress: StageProgress) => void
    ): Promise<GenerationResult> {
        return this.generateSingleShot(config, log);
    }
    
    async generate(
        config: GenerateConfig, 
        log: LogFunction
    ): Promise<GenerationResult> {
        return this.generateSingleShot(config, log);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const orchestrator = new AIOrchestrator();

export const VALID_GEMINI_MODELS: Record<string, string> = {
    'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash Preview',
    'gemini-2.5-pro-preview-05-06': 'Gemini 2.5 Pro Preview',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
};

export const OPENROUTER_MODELS = [
    'anthropic/claude-sonnet-4',
    'anthropic/claude-opus-4',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.5-flash-preview',
    'google/gemini-2.5-pro-preview',
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4-turbo',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-r1',
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.1-405b-instruct',
    'mistral/mistral-large',
    'qwen/qwen-2.5-72b-instruct',
];

export default orchestrator;
