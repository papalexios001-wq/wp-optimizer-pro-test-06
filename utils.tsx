// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v26.0 — ENTERPRISE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

import { 
    ContentContract, 
    QAValidationResult, 
    SeoMetrics, 
    InternalLinkTarget,
    NeuronTerm,
    EntityGapAnalysis,
    ExistingContentAnalysis,
    ValidatedReference,
    HeadingInfo,
    InternalLinkAddedItem,
    InternalLinkInjectionResult,
    createDefaultSeoMetrics
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const UTILS_VERSION = "26.0.0";

const CURRENT_YEAR = new Date().getFullYear();
const CONTENT_YEAR = new Date().getMonth() === 11 ? CURRENT_YEAR + 1 : CURRENT_YEAR;

// Internal linking constants
const MIN_ANCHOR_WORDS = 3;
const MAX_ANCHOR_WORDS = 7;
const MIN_LINK_DISTANCE_CHARS = 400;
const DEFAULT_MIN_LINKS = 12;
const DEFAULT_MAX_LINKS = 20;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 CORE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function extractSlugFromUrl(url: string): string {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1] || '';
        return lastPart
            .replace(/\.(html?|php|aspx?)$/i, '')
            .replace(/[#?].*$/, '')
            .trim();
    } catch {
        return url.split('/').filter(Boolean).pop() || url;
    }
}

export function sanitizeSlug(slug: string): string {
    if (!slug) return '';
    return slug
        .toLowerCase()
        .replace(/[^a-z0-9\-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 200);
}

export function sanitizeTitle(title: string, slug?: string): string {
    if (!title && slug) {
        return slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .substring(0, 100);
    }
    return (title || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .trim()
        .substring(0, 150);
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
}

export function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isStopWord(word: string): boolean {
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'under', 'again',
        'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
        'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
        'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
        'can', 'will', 'just', 'should', 'now', 'also', 'your', 'our', 'their',
        'its', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom'
    ]);
    return stopWords.has(word.toLowerCase());
}

function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SEO METRICS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateSeoMetrics(
    htmlContent: string, 
    title: string, 
    slug: string
): SeoMetrics {
    const baseMetrics = createDefaultSeoMetrics();
    
    if (!htmlContent) {
        return baseMetrics;
    }
    
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const text = doc.body?.textContent || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // Readability (Flesch-Kincaid approximation)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
    const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
    const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    const readability = Math.max(0, Math.min(100, Math.round(fleschScore)));
    
    // Heading structure
    const h1Count = doc.querySelectorAll('h1').length;
    const h2Count = doc.querySelectorAll('h2').length;
    const h3Count = doc.querySelectorAll('h3').length;
    
    let headingScore = 100;
    if (h1Count > 0) headingScore -= 30;
    if (h2Count < 5) headingScore -= (5 - h2Count) * 5;
    if (h3Count < 8) headingScore -= (8 - h3Count) * 2;
    const headingStructure = Math.max(0, headingScore);
    
    // Content depth
    const listCount = doc.querySelectorAll('ul, ol').length;
    const tableCount = doc.querySelectorAll('table').length;
    const imageCount = doc.querySelectorAll('img').length;
    const blockquoteCount = doc.querySelectorAll('blockquote').length;
    
    let contentDepth = 50;
    contentDepth += Math.min(20, listCount * 4);
    contentDepth += Math.min(15, tableCount * 5);
    contentDepth += Math.min(10, imageCount * 2);
    contentDepth += Math.min(5, blockquoteCount * 2);
    contentDepth = Math.min(100, contentDepth);
    
    // AEO Score
    let aeoScore = 0;
    if (/quick\s*answer|tldr|summary/i.test(htmlContent)) aeoScore += 25;
    if (/faq|frequently\s*asked/i.test(htmlContent)) aeoScore += 25;
    if (doc.querySelectorAll('ol').length > 0) aeoScore += 15;
    if (h2Count >= 8) aeoScore += 10;
    if (wordCount >= 4000) aeoScore += 10;
    aeoScore = Math.min(100, aeoScore);
    
    // GEO Score
    let geoScore = 0;
    if (/references?|sources?|citations?/i.test(htmlContent)) geoScore += 25;
    if (doc.querySelectorAll('a[href^="http"]').length >= 3) geoScore += 20;
    if (/schema\.org|application\/ld\+json/i.test(htmlContent)) geoScore += 20;
    if (/according\s+to|expert|study\s+(shows?|found)|research/i.test(htmlContent)) geoScore += 20;
    geoScore = Math.min(100, geoScore);
    
    // E-E-A-T Signals
    let eeatSignals = 0;
    const eeatPatterns = [
        /according\s+to\s+\w+/i,
        /research\s+(shows?|indicates?|suggests?)/i,
        /study\s+(published|conducted|found)/i,
        /expert(s)?\s+(recommend|suggest|say)/i,
        /data\s+(from|shows?)/i,
        /\d+%\s+of\s+\w+/i,
    ];
    eeatPatterns.forEach(pattern => {
        if (pattern.test(text)) eeatSignals += 12;
    });
    eeatSignals = Math.min(100, eeatSignals);
    
    // Internal link score
    const internalLinks = doc.querySelectorAll('a[href^="/"]');
    const internalLinkScore = Math.min(100, internalLinks.length * 6);
    
    // Schema detection
    const schemaScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const schemaDetected = schemaScripts.length > 0 || /schema\.org/i.test(htmlContent);
    const schemaTypes: string[] = [];
    if (/FAQPage/i.test(htmlContent)) schemaTypes.push('FAQPage');
    if (/NewsArticle|Article/i.test(htmlContent)) schemaTypes.push('Article');
    
    return {
        ...baseMetrics,
        wordCount,
        readability,
        contentDepth: Math.round(contentDepth),
        headingStructure,
        aeoScore,
        geoScore,
        eeatSignals,
        internalLinkScore,
        schemaDetected,
        schemaTypes: [...new Set(schemaTypes)]
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 OPPORTUNITY SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateOpportunityScore(
    title: string, 
    wordCount: number | null
): { total: number; factors: Record<string, number> } {
    const factors: Record<string, number> = {};
    
    const titleLength = (title || '').length;
    factors.titleQuality = titleLength >= 30 && titleLength <= 60 ? 25 : 
                           titleLength >= 20 && titleLength <= 70 ? 15 : 5;
    
    if (wordCount === null) {
        factors.contentDepth = 25;
    } else if (wordCount < 1000) {
        factors.contentDepth = 25;
    } else if (wordCount < 2500) {
        factors.contentDepth = 15;
    } else {
        factors.contentDepth = 5;
    }
    
    const hasKeywordSignals = /\b(guide|how|what|best|top|tips|review)\b/i.test(title);
    factors.keywordPotential = hasKeywordSignals ? 25 : 10;
    
    const yearMatch = title.match(/20\d{2}/);
    if (!yearMatch) {
        factors.freshness = 20;
    } else {
        const year = parseInt(yearMatch[0]);
        factors.freshness = year >= CURRENT_YEAR ? 5 : 25;
    }
    
    const total = Object.values(factors).reduce((a, b) => a + b, 0);
    
    return { total, factors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 INTERNAL LINK INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface InternalLinkOptions {
    minLinks?: number;
    maxLinks?: number;
    minRelevance?: number;
    minDistanceBetweenLinks?: number;
    maxLinksPerSection?: number;
    linkStyle?: string;
}

export function injectInternalLinks(
    html: string,
    linkTargets: InternalLinkTarget[],
    currentUrl: string,
    options: InternalLinkOptions = {}
): InternalLinkInjectionResult {
    const {
        minLinks = DEFAULT_MIN_LINKS,
        maxLinks = DEFAULT_MAX_LINKS,
        minRelevance = 0.5,
        minDistanceBetweenLinks = MIN_LINK_DISTANCE_CHARS,
        maxLinksPerSection = 3
    } = options;
    
    if (!html || !linkTargets || linkTargets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }
    
    const linksAdded: InternalLinkAddedItem[] = [];
    const usedUrls = new Set<string>();
    const usedAnchors = new Set<string>();
    
    const validTargets = linkTargets.filter(t => {
        if (!t.url || !t.title) return false;
        if (t.url.toLowerCase() === currentUrl.toLowerCase()) return false;
        if (t.title.length < 10) return false;
        return true;
    });
    
    if (validTargets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const paragraphs = Array.from(doc.querySelectorAll('p'));
    
    let lastLinkPosition = -minDistanceBetweenLinks;
    
    for (const paragraph of paragraphs) {
        if (linksAdded.length >= maxLinks) break;
        
        const paragraphText = paragraph.textContent || '';
        const paragraphHtml = paragraph.innerHTML;
        
        if (paragraphHtml.includes('<a ')) continue;
        if (paragraphText.length < 100) continue;
        
        const position = html.indexOf(paragraphHtml);
        if (position - lastLinkPosition < minDistanceBetweenLinks) continue;
        
        const match = findBestLinkMatch(
            paragraphText,
            validTargets,
            usedUrls,
            usedAnchors,
            minRelevance
        );
        
        if (match) {
            const newHtml = injectLinkSafely(
                paragraphHtml,
                match.anchor,
                match.target.url
            );
            
            if (newHtml !== paragraphHtml) {
                paragraph.innerHTML = newHtml;
                lastLinkPosition = position;
                usedUrls.add(match.target.url.toLowerCase());
                usedAnchors.add(match.anchor.toLowerCase());
                
                linksAdded.push({
                    url: match.target.url,
                    anchorText: match.anchor,
                    relevanceScore: match.relevance,
                    position
                });
            }
        }
    }
    
    const resultHtml = doc.body?.innerHTML || html;
    
    return {
        html: resultHtml,
        linksAdded,
        totalLinks: linksAdded.length
    };
}

function findBestLinkMatch(
    paragraphText: string,
    targets: InternalLinkTarget[],
    usedUrls: Set<string>,
    usedAnchors: Set<string>,
    minRelevance: number
): { target: InternalLinkTarget; anchor: string; relevance: number } | null {
    const paragraphLower = paragraphText.toLowerCase();
    let bestMatch: { target: InternalLinkTarget; anchor: string; relevance: number } | null = null;
    
    for (const target of targets) {
        if (usedUrls.has(target.url.toLowerCase())) continue;
        
        const relevance = calculateSemanticRelevance(paragraphText, target.title, target.keywords);
        if (relevance < minRelevance) continue;
        
        const anchors = generateRichAnchorCandidates(target.title, paragraphText);
        
        for (const anchor of anchors) {
            const anchorLower = anchor.toLowerCase();
            if (usedAnchors.has(anchorLower)) continue;
            if (!paragraphLower.includes(anchorLower)) continue;
            if (!validateAnchorQuality(anchor)) continue;
            
            if (!bestMatch || relevance > bestMatch.relevance) {
                bestMatch = { target, anchor, relevance };
                break;
            }
        }
    }
    
    return bestMatch;
}

function calculateSemanticRelevance(
    paragraphText: string,
    targetTitle: string,
    targetKeywords?: string[]
): number {
    const paragraphLower = paragraphText.toLowerCase();
    const titleWords = targetTitle
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !isStopWord(w));
    
    let score = 0;
    let matches = 0;
    
    for (const word of titleWords) {
        if (paragraphLower.includes(word)) {
            matches++;
        }
    }
    
    score = titleWords.length > 0 ? (matches / titleWords.length) : 0;
    
    if (targetKeywords?.length) {
        const keywordMatches = targetKeywords.filter(k => 
            paragraphLower.includes(k.toLowerCase())
        ).length;
        score += (keywordMatches / targetKeywords.length) * 0.3;
    }
    
    return Math.min(1, score);
}

export function generateRichAnchorCandidates(
    title: string,
    contextText: string
): string[] {
    const anchors: string[] = [];
    const contextLower = contextText.toLowerCase();
    
    const cleanTitle = title
        .replace(/\b(the|a|an|in|on|at|to|for|of|with|by|how|what|why|when|where)\b/gi, ' ')
        .replace(/[|–—:;\[\](){}""''«»<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const words = cleanTitle.split(' ').filter(w => w.length > 2);
    
    for (let len = MAX_ANCHOR_WORDS; len >= MIN_ANCHOR_WORDS; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            if (phrase.length >= 15 && phrase.length <= 60) {
                if (contextLower.includes(phrase.toLowerCase())) {
                    anchors.push(phrase);
                }
            }
        }
    }
    
    return [...new Set(anchors)].slice(0, 8);
}

export function validateAnchorQuality(anchor: string): boolean {
    if (!anchor) return false;
    
    const wordCount = anchor.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < MIN_ANCHOR_WORDS || wordCount > MAX_ANCHOR_WORDS) {
        return false;
    }
    
    const forbiddenPatterns = [
        /^(click|read|learn|see|find|check|view)\s/i,
        /^(here|this|that|more)\b/i,
        /^(the|a|an|our|your|my)\s/i,
        /(click\s+here|read\s+more|learn\s+more|find\s+out)/i,
        /^(guide|tips|article|post|page)$/i,
    ];
    
    for (const pattern of forbiddenPatterns) {
        if (pattern.test(anchor)) {
            return false;
        }
    }
    
    const substantiveWords = anchor
        .split(/\s+/)
        .filter(w => w.length > 4 && !isStopWord(w.toLowerCase()));
    
    return substantiveWords.length >= 1;
}

function injectLinkSafely(html: string, anchor: string, url: string): string {
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escaped})\\b`, 'i');
    
    if (html.includes(`>${anchor}<`) || html.includes(`">${anchor}</a>`)) {
        return html;
    }
    
    const linkHtml = `<a href="${escapeHtml(url)}" style="color: #3b82f6 !important; text-decoration: none !important; font-weight: 600 !important; border-bottom: 2px solid rgba(59,130,246,0.3) !important;">$1</a>`;
    
    return html.replace(regex, linkHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 H1 REMOVAL
// ═══════════════════════════════════════════════════════════════════════════════

export function removeAllH1Tags(html: string, log?: (msg: string) => void): string {
    if (!html) return html;
    
    const h1CountBefore = (html.match(/<h1/gi) || []).length;
    
    if (h1CountBefore === 0) {
        log?.(`   ✓ No H1 tags found — content is clean`);
        return html;
    }
    
    log?.(`   ⚠️ Found ${h1CountBefore} H1 tag(s) — removing...`);
    
    let cleaned = html;
    
    for (let pass = 0; pass < 3; pass++) {
        cleaned = cleaned.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
        cleaned = cleaned.replace(/<h1[^>]*\/>/gi, '');
    }
    
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/h1>/gi, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    const h1CountAfter = (cleaned.match(/<h1/gi) || []).length;
    
    if (h1CountAfter > 0) {
        log?.(`   ❌ WARNING: ${h1CountAfter} H1 tag(s) still present — converting to H2`);
        cleaned = cleaned.replace(/<h1/gi, '<h2').replace(/<\/h1>/gi, '</h2>');
    } else {
        log?.(`   ✓ Successfully removed ${h1CountBefore} H1 tag(s)`);
    }
    
    return cleaned;
}

export function validateNoH1(html: string): { valid: boolean; count: number } {
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    return { valid: h1Count === 0, count: h1Count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 CONTENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeExistingContent(html: string): ExistingContentAnalysis {
    if (!html) {
        return {
            wordCount: 0,
            headings: [],
            imageCount: 0,
            linkCount: 0,
            hasFAQ: false,
            hasSchema: false,
            quality: 'low'
        };
    }
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.textContent || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    const headings: HeadingInfo[] = [];
    doc.querySelectorAll('h1, h2, h3, h4').forEach(h => {
        headings.push({
            level: parseInt(h.tagName[1]),
            text: h.textContent?.trim() || '',
            id: h.id || undefined
        });
    });
    
    const imageCount = doc.querySelectorAll('img').length;
    const linkCount = doc.querySelectorAll('a').length;
    const hasFAQ = /faq|frequently\s*asked/i.test(html);
    const hasSchema = /application\/ld\+json|schema\.org/i.test(html);
    
    let quality: 'low' | 'medium' | 'high' = 'low';
    if (wordCount >= 3000 && headings.length >= 8 && (hasFAQ || imageCount >= 3)) {
        quality = 'high';
    } else if (wordCount >= 1500 && headings.length >= 5) {
        quality = 'medium';
    }
    
    return {
        wordCount,
        headings,
        imageCount,
        linkCount,
        hasFAQ,
        hasSchema,
        quality
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ QA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function createResult(
    agent: string,
    category: 'critical' | 'seo' | 'aeo' | 'geo' | 'enhancement',
    score: number,
    feedback: string,
    fixSuggestion?: string
): QAValidationResult {
    return {
        ruleId: `${category.toUpperCase()}_${agent}`,
        agent,
        category,
        score,
        feedback,
        fixSuggestion,
        status: score >= 70 ? 'passed' : score >= 40 ? 'warning' : 'failed'
    };
}

export function runQASwarm(
    contract: ContentContract,
    entityData?: EntityGapAnalysis,
    neuronTerms?: NeuronTerm[]
): { score: number; results: QAValidationResult[] } {
    const results: QAValidationResult[] = [];
    const html = contract.htmlContent || '';
    
    if (!html) {
        return { score: 0, results: [createResult('EMPTY_CONTENT', 'critical', 0, 'No content to validate')] };
    }
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.textContent || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    // H1 Check
    const h1Count = doc.querySelectorAll('h1').length;
    results.push(createResult(
        'H1_COUNT',
        'critical',
        h1Count === 0 ? 100 : 0,
        h1Count === 0 ? 'No H1 tags in content' : `Found ${h1Count} H1 tag(s) — must be removed`,
        h1Count > 0 ? 'Remove all H1 tags. WordPress theme provides the title.' : undefined
    ));
    
    // Word Count
    const TARGET_WORD_COUNT = 4500;
    const MIN_WORD_COUNT = 4000;
    const wordScore = Math.min(100, Math.round((wordCount / TARGET_WORD_COUNT) * 100));
    results.push(createResult(
        'WORD_COUNT',
        'critical',
        wordCount >= MIN_WORD_COUNT ? wordScore : Math.round(wordScore * 0.5),
        `${wordCount.toLocaleString()} words (target: ${TARGET_WORD_COUNT.toLocaleString()}+)`,
        wordCount < MIN_WORD_COUNT ? `Add ${(MIN_WORD_COUNT - wordCount).toLocaleString()} more words` : undefined
    ));
    
    // H2 Count
    const h2Count = doc.querySelectorAll('h2').length;
    const h2Score = h2Count >= 10 ? 100 : h2Count >= 7 ? 75 : h2Count >= 5 ? 50 : 25;
    results.push(createResult(
        'H2_SECTIONS',
        'critical',
        h2Score,
        `${h2Count} H2 sections (target: 10-12)`,
        h2Count < 10 ? `Add ${10 - h2Count} more H2 sections` : undefined
    ));
    
    // H3 Count
    const h3Count = doc.querySelectorAll('h3').length;
    const h3Score = h3Count >= 18 ? 100 : h3Count >= 12 ? 75 : h3Count >= 8 ? 50 : 25;
    results.push(createResult(
        'H3_SUBSECTIONS',
        'critical',
        h3Score,
        `${h3Count} H3 subsections (target: 18+)`,
        h3Count < 18 ? `Add ${18 - h3Count} more H3 subsections` : undefined
    ));
    
    // FAQ Check
    const faqCount = (contract.faqs || []).length;
    const hasFAQSection = /faq|frequently\s*asked/i.test(html);
    const faqScore = faqCount >= 8 && hasFAQSection ? 100 : faqCount >= 5 ? 75 : faqCount >= 3 ? 50 : 25;
    results.push(createResult(
        'FAQ_SECTION',
        'aeo',
        faqScore,
        `${faqCount} FAQs ${hasFAQSection ? 'with section' : 'without section'}`,
        faqCount < 7 ? 'Add more FAQ items (target: 7-10)' : undefined
    ));
    
    // Quick Answer
    const hasQuickAnswer = /quick\s*answer|tldr|at\s*a\s*glance/i.test(html);
    results.push(createResult(
        'QUICK_ANSWER',
        'aeo',
        hasQuickAnswer ? 100 : 30,
        hasQuickAnswer ? 'Quick Answer box present' : 'Missing Quick Answer box',
        !hasQuickAnswer ? 'Add a Quick Answer box after the introduction' : undefined
    ));
    
    // References
    const hasReferences = /references?|sources?|citations?/i.test(html);
    const refCount = (entityData?.validatedReferences || []).length;
    results.push(createResult(
        'REFERENCES',
        'geo',
        hasReferences && refCount >= 5 ? 100 : hasReferences ? 70 : 30,
        `${refCount} references ${hasReferences ? 'with section' : 'without section'}`,
        !hasReferences ? 'Add a References section at the end' : undefined
    ));
    
    // Internal Links
    const internalLinks = contract.internalLinks?.length || 0;
    const linkScore = internalLinks >= 15 ? 100 : internalLinks >= 10 ? 75 : internalLinks >= 5 ? 50 : 25;
    results.push(createResult(
        'INTERNAL_LINKS',
        'seo',
        linkScore,
        `${internalLinks} internal links (target: 15-20)`,
        internalLinks < 15 ? `Add ${15 - internalLinks} more internal links` : undefined
    ));
    
    // Calculate overall score
    const score = Math.round(
        results.reduce((sum, r) => sum + r.score, 0) / results.length
    );
    
    return { score, results };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE INTEGRATION
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

export async function searchYouTubeVideo(
    topic: string,
    serperApiKey: string,
    options: { minViews?: number } = {},
    log?: (msg: string) => void
): Promise<YouTubeSearchResult> {
    const { minViews = 10000 } = options;
    
    log?.(`🎬 Searching YouTube for: "${topic}"`);
    
    const searchQueries = [
        `${topic} tutorial guide ${CONTENT_YEAR}`,
        `${topic} explained step by step`
    ];
    
    const allVideos: YouTubeVideo[] = [];
    
    for (const query of searchQueries) {
        try {
            const response = await fetch('https://google.serper.dev/videos', {
                method: 'POST',
                headers: {
                    'X-API-KEY': serperApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: query, gl: 'us', hl: 'en', num: 10 })
            });
            
            if (!response.ok) continue;
            
            const result = await response.json();
            const videos = result.videos || [];
            
            for (const video of videos) {
                if (!video.link?.includes('youtube.com/watch')) continue;
                
                const videoIdMatch = video.link.match(/[?&]v=([^&]+)/);
                if (!videoIdMatch) continue;
                
                const viewsMatch = video.views?.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(K|M|B)?/i);
                let views = 0;
                if (viewsMatch) {
                    views = parseFloat(viewsMatch[1].replace(/,/g, ''));
                    const multiplierKey = viewsMatch[2]?.toUpperCase() as 'K' | 'M' | 'B' | undefined;
                    const multiplier = multiplierKey ? { K: 1000, M: 1000000, B: 1000000000 }[multiplierKey] : 1;
                    views *= multiplier;
                }
                
                if (views < minViews) continue;
                
                const titleLower = (video.title || '').toLowerCase();
                const topicWords = topic.toLowerCase().split(/\s+/);
                const matchedWords = topicWords.filter(w => titleLower.includes(w));
                const relevanceScore = (matchedWords.length / topicWords.length) * 100;
                
                allVideos.push({
                    videoId: videoIdMatch[1],
                    title: video.title || 'Untitled',
                    channel: video.channel || 'Unknown',
                    views,
                    duration: video.duration || '',
                    thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
                    relevanceScore
                });
            }
        } catch (e: any) {
            log?.(`   ⚠️ Search failed: ${e.message}`);
        }
    }
    
    allVideos.sort((a, b) => {
        const scoreA = a.relevanceScore * Math.log10(a.views + 1);
        const scoreB = b.relevanceScore * Math.log10(b.views + 1);
        return scoreB - scoreA;
    });
    
    const uniqueVideos = allVideos.filter((v, i, arr) => 
        arr.findIndex(x => x.videoId === v.videoId) === i
    );
    
    if (uniqueVideos.length === 0) {
        log?.(`   ❌ No suitable videos found`);
        return { video: null, searchQuery: searchQueries[0], alternates: [] };
    }
    
    const bestVideo = uniqueVideos[0];
    log?.(`   ✅ Found: "${bestVideo.title}" (${formatNumber(bestVideo.views)} views)`);
    
    return {
        video: bestVideo,
        searchQuery: searchQueries[0],
        alternates: uniqueVideos.slice(1, 5)
    };
}

export function generateYouTubeEmbed(video: YouTubeVideo, topic: string): string {
    return `
<!-- YouTube Video: ${escapeHtml(video.title)} -->
<div style="margin: clamp(32px, 8vw, 64px) 0 !important; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important; border-radius: 20px !important; padding: clamp(20px, 5vw, 32px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important; border: 1px solid rgba(255,255,255,0.08) !important;">
  <div style="display: flex !important; align-items: center !important; gap: clamp(12px, 3vw, 16px) !important; margin-bottom: clamp(16px, 4vw, 24px) !important;">
    <div style="width: clamp(44px, 11vw, 52px) !important; height: clamp(44px, 11vw, 52px) !important; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; border-radius: 14px !important; display: flex !important; align-items: center !important; justify-content: center !important;">
      <span style="font-size: clamp(20px, 5vw, 26px) !important;">▶️</span>
    </div>
    <div>
      <div style="color: #f1f5f9 !important; font-size: clamp(14px, 3.5vw, 18px) !important; font-weight: 700 !important;">${escapeHtml(video.title.substring(0, 60))}${video.title.length > 60 ? '...' : ''}</div>
      <div style="color: #94a3b8 !important; font-size: clamp(11px, 2.8vw, 13px) !important; margin-top: 4px !important;">${escapeHtml(video.channel)} • ${formatNumber(video.views)} views</div>
    </div>
  </div>
  <div style="position: relative !important; width: 100% !important; padding-bottom: 56.25% !important; height: 0 !important; overflow: hidden !important; border-radius: 12px !important;">
    <iframe style="position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: none !important; border-radius: 12px !important;" src="https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1" title="${escapeHtml(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    UTILS_VERSION,
    extractSlugFromUrl,
    sanitizeSlug,
    sanitizeTitle,
    formatDuration,
    formatNumber,
    calculateOpportunityScore,
    calculateSeoMetrics,
    injectInternalLinks,
    generateRichAnchorCandidates,
    validateAnchorQuality,
    searchYouTubeVideo,
    generateYouTubeEmbed,
    runQASwarm,
    removeAllH1Tags,
    validateNoH1,
    analyzeExistingContent
};
