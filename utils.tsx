// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v28.0 — ENTERPRISE SOTA UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 v28.0 CRITICAL FIXES:
// • HARD MINIMUM 3 WORDS for all anchor text
// • Quality scoring (0-100) for every anchor
// • Validation at EVERY stage
// • calculateNLPCoverage function INCLUDED
// ═══════════════════════════════════════════════════════════════════════════════

import { 
    SeoMetrics, ContentContract, QAValidationResult, QASwarmResult, 
    NeuronTerm, ExistingContentAnalysis, EntityGapAnalysis, InternalLinkTarget,
    OpportunityScore, SerpLengthPolicy, ScoreBreakdown,
    CURRENT_SCORE_WEIGHTS, QARuleContext, QADetectionResult,
    InternalLinkResult, ValidatedReference, SiteContext
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const UTILS_VERSION = "28.0.0";
export const SCORE_ALGORITHM_VERSION = "3.3.0";

const CURRENT_YEAR = new Date().getFullYear();

const POWER_WORDS = [
    'proven', 'guaranteed', 'exclusive', 'secret', 'revolutionary', 'breakthrough',
    'ultimate', 'essential', 'comprehensive', 'definitive', 'expert', 'professional',
    'advanced', 'complete', 'powerful', 'effective', 'instant', 'free', 'new',
    'best', 'top', 'amazing', 'incredible', 'remarkable', 'outstanding', 'critical'
];

const EEAT_SIGNALS = [
    'according to', 'research shows', 'studies indicate', 'experts recommend',
    'data suggests', 'evidence shows', 'scientific', 'clinical', 'peer-reviewed',
    'published in', 'certified', 'licensed', 'experienced', 'years of experience'
];

const TRANSITION_WORDS = [
    'furthermore', 'moreover', 'however', 'consequently', 'therefore', 
    'as a result', 'for example', 'in addition', 'on the other hand',
    'meanwhile', 'subsequently', 'conversely', 'similarly', 'notably'
];

const AUTHORITY_DOMAINS = [
    '.gov', '.edu', '.org', 'reuters.com', 'bbc.com', 'nytimes.com',
    'forbes.com', 'bloomberg.com', 'nature.com', 'pubmed', 'wikipedia.org'
];

export const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'what', 'which', 'who', 'whom', 'your', 'his', 'her', 'its',
    'our', 'their', 'my', 'how', 'why', 'when', 'where', 'here', 'there',
    'check', 'out', 'click', 'link', 'visit', 'view', 'get', 'make', 'go',
    'see', 'look', 'come', 'think', 'know', 'take', 'give', 'use', 'find'
]);

export const BANNED_SINGLE_WORDS = new Set([
    'click', 'here', 'read', 'more', 'learn', 'see', 'find', 'get', 'try',
    'view', 'check', 'visit', 'go', 'start', 'begin', 'continue', 'discover',
    'explore', 'download', 'access', 'open', 'link', 'page', 'article', 'post'
]);

export const BANNED_PHRASE_REGEXES: RegExp[] = [
    /^click\s+(here|now|this|to|on)/i,
    /click\s+here$/i,
    /^read\s+(more|this|the|our|about)/i,
    /read\s+more$/i,
    /^learn\s+(more|about|how)/i,
    /^find\s+(out|more)/i,
    /^check\s+(out|this|our|the)/i,
    /^this\s+(article|post|guide|page|resource|link)/i,
    /^here\s+(is|are|you)/i,
    /^see\s+(here|more|this|our|the)/i,
    /^go\s+(here|to|now)/i,
    /^view\s+(all|more|the|our)/i,
    /^get\s+(started|more|the|your)/i,
    /^(http|www|https)/i,
    /^link\s+(to|here)/i,
    /^visit\s+(our|the|this|website|site)/i,
    /^continue\s+(reading|to|here)/i,
    /^[a-z]+$/i,
    /^(the|a|an)\s+\w+$/i,
];

export const WEAK_STARTER_WORDS = new Set([
    'the', 'a', 'an', 'this', 'that', 'these', 'those',
    'our', 'your', 'my', 'their', 'his', 'her', 'its',
    'here', 'there', 'click', 'read', 'learn', 'see', 'view',
    'check', 'visit', 'go', 'get', 'find', 'discover', 'explore',
    'just', 'simply', 'also', 'and', 'but', 'or', 'so', 'then'
]);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const ANCHOR_CONFIG = {
    MIN_WORDS: 3,
    MAX_WORDS: 7,
    IDEAL_MIN_WORDS: 4,
    IDEAL_MAX_WORDS: 6,
    MIN_CHARS: 15,
    MAX_CHARS: 75,
    MIN_MEANINGFUL_WORDS: 2,
    MIN_QUALITY_SCORE: 50,
    RELEVANCE_THRESHOLD: 0.45,
    MIN_LINK_DISTANCE: 400,
    MAX_LINKS_PER_SECTION: 3,
    MAX_SAME_ANCHOR_USES: 1,
    PREFER_NOUN_PHRASES: true,
    EXPAND_TO_CONTEXT: true,
};

export const DEFAULT_THRESHOLDS = {
    WORD_COUNT_MIN: 4500,
    WORD_COUNT_IDEAL: 5000,
    H1_COUNT: 0,
    H2_COUNT_MIN: 10,
    H3_COUNT_MIN: 18,
    FAQ_COUNT_MIN: 7,
    FAQ_COUNT_IDEAL: 10,
    INTERNAL_LINKS_MIN: 15,
    INTERNAL_LINKS_IDEAL: 20,
    EXTERNAL_REFS_MIN: 8,
    EXTERNAL_REFS_IDEAL: 12,
    TABLES_MIN: 2,
    BLOCKQUOTES_MIN: 2,
    LISTS_MIN: 5,
    VISUAL_BOXES_MIN: 10,
    NLP_COVERAGE_MIN: 70,
    TITLE_MIN_LENGTH: 45,
    TITLE_MAX_LENGTH: 65,
    META_MIN_LENGTH: 145,
    META_MAX_LENGTH: 160,
    READABILITY_MIN: 50,
    READABILITY_IDEAL: 65,
    PARAGRAPH_MAX_WORDS: 100,
    SENTENCE_MAX_WORDS: 30,
    ANCHOR_MIN_WORDS: 3,
    ANCHOR_MAX_WORDS: 7,
    ANCHOR_IDEAL_WORDS: 5,
    ANCHOR_MIN_QUALITY_SCORE: 50,
};

const NICHE_PRESETS: Record<string, Partial<typeof DEFAULT_THRESHOLDS>> = {
    health: { WORD_COUNT_MIN: 5000, EXTERNAL_REFS_MIN: 12, FAQ_COUNT_MIN: 10 },
    finance: { WORD_COUNT_MIN: 5500, EXTERNAL_REFS_MIN: 15, TABLES_MIN: 3 },
    legal: { WORD_COUNT_MIN: 6000, EXTERNAL_REFS_MIN: 15, H2_COUNT_MIN: 12 },
    tech: { WORD_COUNT_MIN: 4000, TABLES_MIN: 3, LISTS_MIN: 8 },
    ecommerce: { WORD_COUNT_MIN: 3500, TABLES_MIN: 4, FAQ_COUNT_MIN: 8 },
    blog: { WORD_COUNT_MIN: 4000, READABILITY_IDEAL: 70 },
    ymyl: { WORD_COUNT_MIN: 5500, EXTERNAL_REFS_MIN: 15, FAQ_COUNT_MIN: 10 },
};

export function computeDynamicThresholds(
    serpPolicy?: SerpLengthPolicy,
    niche?: string
): typeof DEFAULT_THRESHOLDS {
    let thresholds = { ...DEFAULT_THRESHOLDS };
    
    if (niche && NICHE_PRESETS[niche.toLowerCase()]) {
        thresholds = { ...thresholds, ...NICHE_PRESETS[niche.toLowerCase()] };
    }
    
    if (serpPolicy && serpPolicy.confidenceScore >= 60) {
        thresholds.WORD_COUNT_MIN = Math.max(
            thresholds.WORD_COUNT_MIN,
            Math.round(serpPolicy.targetWordCount * 0.9)
        );
        thresholds.WORD_COUNT_IDEAL = serpPolicy.targetWordCount;
        thresholds.H2_COUNT_MIN = Math.max(thresholds.H2_COUNT_MIN, serpPolicy.minH2Count);
        thresholds.H3_COUNT_MIN = Math.max(thresholds.H3_COUNT_MIN, serpPolicy.minH3Count);
        thresholds.FAQ_COUNT_MIN = Math.max(thresholds.FAQ_COUNT_MIN, serpPolicy.minFAQCount);
    }
    
    return thresholds;
}

// ═══════════════════════════════════════════════════════════════════════════════
// READABILITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(1, matches.length) : 1;
}

function countComplexWords(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.filter(word => countSyllables(word) >= 3).length;
}

export function calculateFleschKincaid(text: string): { score: number; grade: number } {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) {
        return { score: 0, grade: 0 };
    }
    
    const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = totalSyllables / words.length;
    
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    const grade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
    
    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        grade: Math.max(0, Math.round(grade * 10) / 10)
    };
}

export function calculateSMOGIndex(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 30) {
        const complexWords = countComplexWords(text);
        const sentenceCount = Math.max(1, sentences.length);
        return Math.round(1.0430 * Math.sqrt(complexWords * (30 / sentenceCount)) + 3.1291);
    }
    const complexWords = countComplexWords(text);
    return Math.round(1.0430 * Math.sqrt(complexWords * (30 / sentences.length)) + 3.1291);
}

export function calculateGunningFog(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const complexWords = countComplexWords(text);
    const avgWordsPerSentence = words.length / sentences.length;
    const complexWordPercentage = (complexWords / words.length) * 100;
    
    return Math.round((avgWordsPerSentence + complexWordPercentage) * 0.4 * 10) / 10;
}

export function calculateColemanLiau(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (words.length === 0 || sentences.length === 0) return 0;
    
    const letters = text.replace(/[^a-zA-Z]/g, '').length;
    const L = (letters / words.length) * 100;
    const S = (sentences.length / words.length) * 100;
    
    return Math.round(0.0588 * L - 0.296 * S - 15.8);
}

export function calculateARI(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (words.length === 0 || sentences.length === 0) return 0;
    
    const characters = text.replace(/\s/g, '').length;
    return Math.round(4.71 * (characters / words.length) + 0.5 * (words.length / sentences.length) - 21.43);
}

export function getReadabilityInterpretation(score: number): string {
    if (score >= 90) return 'Very Easy (5th grade)';
    if (score >= 80) return 'Easy (6th grade)';
    if (score >= 70) return 'Fairly Easy (7th grade)';
    if (score >= 60) return 'Standard (8-9th grade) ✓';
    if (score >= 50) return 'Fairly Difficult (10-12th grade)';
    if (score >= 30) return 'Difficult (College)';
    return 'Very Difficult (Graduate)';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 NLP COVERAGE CALCULATOR — CRITICAL FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateNLPCoverage(
    html: string,
    terms: NeuronTerm[]
): { coverage: number; weightedCoverage: number; usedTerms: string[]; missingTerms: string[] } {
    if (!html || terms.length === 0) {
        return { coverage: 100, weightedCoverage: 100, usedTerms: [], missingTerms: [] };
    }
    
    const textLower = html.toLowerCase().replace(/<[^>]+>/g, ' ');
    const usedTerms: string[] = [];
    const missingTerms: string[] = [];
    
    let totalWeight = 0;
    let usedWeight = 0;
    
    for (const term of terms) {
        const termLower = term.term.toLowerCase();
        const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        const matches = textLower.match(regex) || [];
        
        const weight = term.importance || 50;
        totalWeight += weight;
        
        if (matches.length > 0) {
            usedTerms.push(term.term);
            usedWeight += weight;
        } else {
            missingTerms.push(term.term);
        }
    }
    
    const coverage = Math.round((usedTerms.length / terms.length) * 100);
    const weightedCoverage = totalWeight > 0 ? Math.round((usedWeight / totalWeight) * 100) : 100;
    
    return { coverage, weightedCoverage, usedTerms, missingTerms };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANCHOR VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnchorValidationResult {
    valid: boolean;
    score: number;
    qualityTier: 'excellent' | 'good' | 'acceptable' | 'rejected';
    wordCount: number;
    meaningfulWordCount: number;
    reason?: string;
    suggestedFix?: string;
}

export function validateAnchorQuality(
    phrase: string, 
    targetTitle?: string
): AnchorValidationResult {
    if (!phrase || typeof phrase !== 'string') {
        return {
            valid: false, score: 0, qualityTier: 'rejected',
            wordCount: 0, meaningfulWordCount: 0, reason: 'Empty or invalid input'
        };
    }
    
    const trimmed = phrase.trim().replace(/\s+/g, ' ');
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // HARD REJECTIONS
    if (wordCount < ANCHOR_CONFIG.MIN_WORDS) {
        return {
            valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount: 0,
            reason: `Only ${wordCount} word(s) — MINIMUM is ${ANCHOR_CONFIG.MIN_WORDS}`,
            suggestedFix: targetTitle ? `Try: "${targetTitle.split(' ').slice(0, 5).join(' ')}"` : undefined
        };
    }
    
    if (wordCount > ANCHOR_CONFIG.MAX_WORDS) {
        return {
            valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount: 0,
            reason: `${wordCount} words — MAXIMUM is ${ANCHOR_CONFIG.MAX_WORDS}`,
            suggestedFix: `Shorten to: "${words.slice(0, 5).join(' ')}"`
        };
    }
    
    const phraseLower = trimmed.toLowerCase();
    for (const pattern of BANNED_PHRASE_REGEXES) {
        if (pattern.test(phraseLower)) {
            return {
                valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount: 0,
                reason: `Matches banned pattern`
            };
        }
    }
    
    const firstWordLower = words[0].toLowerCase();
    if (WEAK_STARTER_WORDS.has(firstWordLower)) {
        return {
            valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount: 0,
            reason: `Starts with weak word: "${words[0]}"`,
            suggestedFix: `Remove "${words[0]}": "${words.slice(1).join(' ')}"`
        };
    }
    
    if (BANNED_SINGLE_WORDS.has(firstWordLower)) {
        return {
            valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount: 0,
            reason: `Starts with banned word: "${words[0]}"`
        };
    }
    
    const lastWordLower = words[words.length - 1].toLowerCase();
    if (STOP_WORDS.has(lastWordLower)) {
        return {
            valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount: 0,
            reason: `Ends with stopword: "${words[words.length - 1]}"`,
            suggestedFix: `Remove trailing: "${words.slice(0, -1).join(' ')}"`
        };
    }
    
    const meaningfulWords = words.filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
    const meaningfulWordCount = meaningfulWords.length;
    
    if (meaningfulWordCount < ANCHOR_CONFIG.MIN_MEANINGFUL_WORDS) {
        return {
            valid: false, score: 0, qualityTier: 'rejected', wordCount, meaningfulWordCount,
            reason: `Only ${meaningfulWordCount} meaningful word(s) — need at least ${ANCHOR_CONFIG.MIN_MEANINGFUL_WORDS}`
        };
    }
    
    // QUALITY SCORING
    let score = 50;
    
    if (wordCount === 4 || wordCount === 5) score += 25;
    else if (wordCount === 3 || wordCount === 6) score += 15;
    else score += 5;
    
    const meaningfulRatio = meaningfulWordCount / wordCount;
    score += Math.round(meaningfulRatio * 20);
    
    const avgMeaningfulLength = meaningfulWords.reduce((sum, w) => sum + w.length, 0) / meaningfulWordCount;
    if (avgMeaningfulLength >= 6) score += 5;
    
    const hasProperNouns = words.slice(1).some(w => /^[A-Z][a-z]/.test(w));
    if (hasProperNouns) score += 5;
    
    if (targetTitle) {
        const targetWords = targetTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchingWords = words.filter(w => 
            targetWords.some(tw => tw.includes(w.toLowerCase()) || w.toLowerCase().includes(tw))
        ).length;
        score += Math.min(matchingWords * 4, 15);
    }
    
    const hasPowerWord = words.some(w => POWER_WORDS.includes(w.toLowerCase()));
    if (hasPowerWord) score += 3;
    
    score = Math.min(100, score);
    
    let qualityTier: 'excellent' | 'good' | 'acceptable' | 'rejected';
    if (score >= 85) qualityTier = 'excellent';
    else if (score >= 70) qualityTier = 'good';
    else if (score >= ANCHOR_CONFIG.MIN_QUALITY_SCORE) qualityTier = 'acceptable';
    else qualityTier = 'rejected';
    
    return { valid: qualityTier !== 'rejected', score, qualityTier, wordCount, meaningfulWordCount };
}

export function validateAnchorStrict(
    phrase: string, 
    targetTitle?: string
): { valid: boolean; score: number; qualityTier: string; reason?: string } {
    const result = validateAnchorQuality(phrase, targetTitle);
    return { valid: result.valid, score: result.score, qualityTier: result.qualityTier, reason: result.reason };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL LINK ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function validateWordBoundaries(html: string, start: number, end: number): boolean {
    if (start > 0) {
        const charBefore = html[start - 1];
        if (/[a-zA-Z0-9]/.test(charBefore)) return false;
        const preceding = html.substring(Math.max(0, start - 30), start);
        if (preceding.match(/=[^>]*$/)) return false;
    }
    
    if (end < html.length) {
        const charAfter = html[end];
        if (/[a-zA-Z0-9]/.test(charAfter)) return false;
    }
    
    const beforeText = html.substring(0, start);
    const lastOpenIndex = beforeText.lastIndexOf('<');
    const lastCloseIndex = beforeText.lastIndexOf('>');
    if (lastOpenIndex > lastCloseIndex) return false;
    
    const lastAnchorOpen = beforeText.lastIndexOf('<a ');
    const lastAnchorClose = beforeText.lastIndexOf('</a>');
    if (lastAnchorOpen > lastAnchorClose) return false;
    
    return true;
}

function expandToNounPhrase(
    html: string, 
    start: number, 
    end: number,
    targetTitle?: string
): { start: number; end: number; text: string; expanded: boolean } {
    let newStart = start;
    let newEnd = end;
    const originalText = html.substring(start, end);
    
    const lookback = html.substring(Math.max(0, start - 60), start);
    const lookahead = html.substring(end, Math.min(html.length, end + 60));
    
    const prePatterns = [
        /(?:(?:the|a|an)\s+)?(?:(?:advanced|best|top|comprehensive|ultimate|essential|effective|complete|professional|modern|basic|fundamental|critical|strategic|practical|proven|successful|innovative|powerful)\s+)+$/i,
        /(?:(?:your|our|their|this|that|every|each|any)\s+)?(?:(?:complete|full|detailed|quick|easy|simple|step-by-step|in-depth|expert|beginner)\s+)?$/i,
    ];
    
    for (const pattern of prePatterns) {
        const preMatch = lookback.match(pattern);
        if (preMatch && preMatch[0].length > 3) {
            const expansionStart = start - preMatch[0].length;
            if (validateWordBoundaries(html, expansionStart, start)) {
                newStart = expansionStart;
                break;
            }
        }
    }
    
    const postPatterns = [
        /^(?:\s+(?:guide|tutorial|tips|strategies|techniques|methods|approach|system|framework|process|steps|checklist|template|examples|solutions|tactics|practices|principles|fundamentals|basics|essentials|overview|introduction|review|comparison|analysis))+(?![a-zA-Z])/i,
        /^(?:\s+(?:for|to|of)\s+(?:beginners|experts|professionals|businesses|developers|marketers|success|growth|improvement))+(?![a-zA-Z])/i,
    ];
    
    for (const pattern of postPatterns) {
        const postMatch = lookahead.match(pattern);
        if (postMatch && postMatch[0].length > 3) {
            const expansionEnd = end + postMatch[0].length;
            if (validateWordBoundaries(html, end, expansionEnd)) {
                newEnd = expansionEnd;
                break;
            }
        }
    }
    
    const expandedText = html.substring(newStart, newEnd).trim();
    const validation = validateAnchorQuality(expandedText, targetTitle);
    
    if (validation.valid && validation.score >= 50) {
        return { start: newStart, end: newEnd, text: expandedText, expanded: newStart !== start || newEnd !== end };
    }
    
    const originalValidation = validateAnchorQuality(originalText, targetTitle);
    if (originalValidation.valid) {
        return { start, end, text: originalText, expanded: false };
    }
    
    return { start: newStart, end: newEnd, text: expandedText, expanded: newStart !== start || newEnd !== end };
}

function simpleStem(word: string): string {
    return word.toLowerCase()
        .replace(/(?:ing|ed|s|es|ly|ment|tion|ness|able|ible|ful|less|ive|al|ous|ious)$/, '')
        .replace(/^(?:un|re|de|in|dis|mis|non|pre|post)/, '');
}

function fuzzyMatchScore(text: string, pattern: string): number {
    const textWords = text.toLowerCase().split(/\s+/).map(simpleStem).filter(w => w.length > 2);
    const patternWords = pattern.toLowerCase().split(/\s+/).map(simpleStem).filter(w => w.length > 2);
    
    if (patternWords.length === 0) return 0;
    
    let matchCount = 0;
    for (const pWord of patternWords) {
        if (pWord.length < 3) continue;
        if (textWords.some(tWord => tWord.includes(pWord) || pWord.includes(tWord))) {
            matchCount++;
        }
    }
    
    return matchCount / patternWords.length;
}

export function generateSemanticAnchorCandidates(
    title: string, 
    maxCandidates: number = 30
): string[] {
    if (!title || typeof title !== 'string' || title.length < 10) return [];
    
    let clean = title
        .replace(/[|–—:;\[\](){}""''«»<>]/g, ' ')
        .replace(/\s*[-–—|]\s*(complete\s+)?guide\s*$/i, '')
        .replace(/\s*[-–—|]\s*\d{4}\s*$/i, '')
        .replace(/\s*[-–—|]\s*[a-z\s]+blog\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    const words = clean.split(/\s+/).filter(w => w.length >= 2);
    
    if (words.length < 3) return [];
    
    const candidates: Array<{ phrase: string; score: number }> = [];
    const seen = new Set<string>();
    
    const addCandidate = (phrase: string, bonus: number = 0) => {
        const cleanPhrase = phrase.trim().replace(/\s+/g, ' ');
        const lowerPhrase = cleanPhrase.toLowerCase();
        
        if (seen.has(lowerPhrase)) return;
        
        const validation = validateAnchorQuality(cleanPhrase, title);
        if (!validation.valid) return;
        
        seen.add(lowerPhrase);
        candidates.push({ phrase: cleanPhrase, score: validation.score + bonus });
    };
    
    const topicPatterns = [
        /(?:complete|ultimate|essential|comprehensive|definitive)\s+(?:guide\s+(?:to|for|on)\s+)?(.{15,60})/i,
        /(?:guide|tutorial|introduction)\s+(?:to|for|on)\s+(.{10,50})/i,
        /how\s+to\s+(.{15,50})/i,
        /(?:best|top)\s+(.{15,50})\s+(?:tips|strategies|methods)/i,
        /(.{15,40})\s+for\s+(?:beginners|experts|professionals)/i,
        /understanding\s+(.{10,40})/i,
        /mastering\s+(.{10,40})/i,
    ];
    
    for (const pattern of topicPatterns) {
        const match = clean.match(pattern);
        if (match && match[1]) {
            const extracted = match[1].trim();
            addCandidate(extracted, 20);
            addCandidate(`${extracted} strategies`, 18);
            addCandidate(`${extracted} techniques`, 16);
            addCandidate(`${extracted} best practices`, 15);
            addCandidate(`effective ${extracted}`, 14);
            addCandidate(`${extracted} guide`, 12);
        }
    }
    
    const windowSizes = [5, 4, 6, 3];
    for (const windowSize of windowSizes) {
        for (let i = 0; i <= words.length - windowSize; i++) {
            const phrase = words.slice(i, i + windowSize).join(' ');
            const bonus = windowSize === 5 ? 15 : windowSize === 4 ? 12 : windowSize === 6 ? 8 : 5;
            addCandidate(phrase, bonus);
        }
    }
    
    const coreWords = words.filter(w => !STOP_WORDS.has(w.toLowerCase()) && w.length > 3);
    
    if (coreWords.length >= 2) {
        const corePhrase = coreWords.slice(0, Math.min(3, coreWords.length)).join(' ');
        const expansions = [
            `effective ${corePhrase}`,
            `${corePhrase} techniques`,
            `${corePhrase} strategies`,
            `advanced ${corePhrase}`,
            `${corePhrase} best practices`,
            `mastering ${corePhrase}`,
            `${corePhrase} fundamentals`,
            `essential ${corePhrase}`,
            `${corePhrase} optimization`,
            `professional ${corePhrase}`,
            `${corePhrase} methods`,
            `complete ${corePhrase}`,
        ];
        expansions.forEach(exp => addCandidate(exp, 10));
    }
    
    if (words.length >= 3 && words.length <= 6) {
        addCandidate(clean, 25);
    }
    
    const withoutSuffix = clean.replace(/\s*[-–—|:]\s*.{0,30}$/, '').trim();
    if (withoutSuffix.length >= 15 && withoutSuffix !== clean) {
        addCandidate(withoutSuffix, 18);
    }
    
    return candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, maxCandidates)
        .map(c => c.phrase);
}

interface SemanticLinkMatch {
    startIndex: number;
    endIndex: number;
    matchedText: string;
    score: number;
    context: string;
    type: 'exact' | 'semantic' | 'contextual';
    qualityTier: 'excellent' | 'good' | 'acceptable';
}

function findSemanticMatchInContent(
    html: string,
    targetPhrase: string,
    linkTitle: string,
    usedPositions: Set<number>,
    minDistance: number = ANCHOR_CONFIG.MIN_LINK_DISTANCE
): SemanticLinkMatch | null {
    const targetLower = targetPhrase.toLowerCase();
    
    let searchPos = 0;
    while (searchPos < html.length) {
        const index = html.toLowerCase().indexOf(targetLower, searchPos);
        if (index === -1) break;
        searchPos = index + 1;
        
        if (!validateWordBoundaries(html, index, index + targetPhrase.length)) continue;
        
        let collision = false;
        for (const used of usedPositions) {
            if (Math.abs(index - used) < minDistance) {
                collision = true;
                break;
            }
        }
        if (collision) continue;
        
        const expanded = expandToNounPhrase(html, index, index + targetPhrase.length, linkTitle);
        const validation = validateAnchorQuality(expanded.text, linkTitle);
        
        if (validation.valid && validation.qualityTier !== 'rejected') {
            return {
                startIndex: expanded.start,
                endIndex: expanded.end,
                matchedText: expanded.text,
                score: validation.score / 100,
                context: 'Exact match' + (expanded.expanded ? ' (expanded)' : ''),
                type: 'exact',
                qualityTier: validation.qualityTier as 'excellent' | 'good' | 'acceptable'
            };
        }
    }
    
    const coreWords = targetPhrase.split(/\s+/).filter(w => 
        !STOP_WORDS.has(w.toLowerCase()) && w.length > 3
    );
    
    if (coreWords.length === 0) return null;
    
    const primaryKeyword = coreWords.reduce((a, b) => a.length > b.length ? a : b);
    const primaryRegex = new RegExp(`\\b${primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    let bestMatch: SemanticLinkMatch | null = null;
    let bestScore = 0;
    
    let match;
    while ((match = primaryRegex.exec(html)) !== null) {
        const idx = match.index;
        
        if (!validateWordBoundaries(html, idx, idx + primaryKeyword.length)) continue;
        
        let collision = false;
        for (const used of usedPositions) {
            if (Math.abs(idx - used) < minDistance) {
                collision = true;
                break;
            }
        }
        if (collision) continue;
        
        const contextStart = Math.max(0, idx - 80);
        const contextEnd = Math.min(html.length, idx + 80);
        const context = html.substring(contextStart, contextEnd);
        const contextScore = fuzzyMatchScore(context, targetPhrase);
        
        if (contextScore < 0.5) continue;
        
        const expanded = expandToNounPhrase(html, idx, idx + primaryKeyword.length, linkTitle);
        const validation = validateAnchorQuality(expanded.text, linkTitle);
        
        if (validation.valid && validation.qualityTier !== 'rejected' && contextScore > bestScore) {
            bestMatch = {
                startIndex: expanded.start,
                endIndex: expanded.end,
                matchedText: expanded.text,
                score: contextScore,
                context: context.replace(/</g, '').replace(/>/g, '').substring(0, 60),
                type: 'semantic',
                qualityTier: validation.qualityTier as 'excellent' | 'good' | 'acceptable'
            };
            bestScore = contextScore;
        }
    }
    
    return bestMatch;
}

function createBridgeSentenceWithAnchor(
    link: InternalLinkTarget
): { sentence: string; anchorText: string } {
    const candidates = generateSemanticAnchorCandidates(link.title, 5);
    let anchorText = candidates[0] || link.title;
    
    const validation = validateAnchorQuality(anchorText, link.title);
    
    if (!validation.valid) {
        const titleValidation = validateAnchorQuality(link.title);
        if (titleValidation.valid) {
            anchorText = link.title;
        } else {
            const words = link.title.split(/\s+/).filter(w => 
                w.length > 2 && !WEAK_STARTER_WORDS.has(w.toLowerCase())
            );
            if (words.length >= 3) {
                anchorText = words.slice(0, 5).join(' ');
            } else {
                anchorText = `comprehensive guide to ${link.title.split(' ').slice(0, 3).join(' ')}`;
            }
        }
    }
    
    const templates = [
        `For more details, see our comprehensive resource on ANCHOR_PLACEHOLDER.`,
        `We've covered this topic extensively in our article about ANCHOR_PLACEHOLDER.`,
        `To dive deeper into this subject, explore our guide on ANCHOR_PLACEHOLDER.`,
        `Related reading: check out our detailed breakdown of ANCHOR_PLACEHOLDER.`,
        `This concept is further explained in our analysis of ANCHOR_PLACEHOLDER.`,
        `For practical applications, refer to our resource on ANCHOR_PLACEHOLDER.`,
        `Learn more about this in our featured article covering ANCHOR_PLACEHOLDER.`,
    ];
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const sentence = template.replace('ANCHOR_PLACEHOLDER', `<LINK_ANCHOR>${anchorText}</LINK_ANCHOR>`);
    
    return { sentence, anchorText };
}

function injectBridgeSentence(
    html: string,
    link: InternalLinkTarget,
    usedPositions: Set<number>,
    linkStyle: string,
    minDistance: number = ANCHOR_CONFIG.MIN_LINK_DISTANCE
): { html: string; insertedAt: number; anchorText: string } | null {
    const keywords = link.title.split(' ').filter(w => 
        !STOP_WORDS.has(w.toLowerCase()) && w.length > 3
    );
    
    let bestPos = -1;
    let maxScore = 0;
    
    const pEndRegex = /<\/p>/gi;
    let match;
    
    while ((match = pEndRegex.exec(html)) !== null) {
        const pEndIndex = match.index;
        
        let collision = false;
        for (const used of usedPositions) {
            if (Math.abs(pEndIndex - used) < minDistance) {
                collision = true;
                break;
            }
        }
        if (collision) continue;
        
        const pStart = Math.max(0, pEndIndex - 500);
        const content = html.substring(pStart, pEndIndex).toLowerCase();
        
        let score = 0;
        keywords.forEach(kw => {
            if (content.includes(kw.toLowerCase())) score += 2;
        });
        
        const relativePosition = pEndIndex / html.length;
        if (relativePosition > 0.2 && relativePosition < 0.8) {
            score += 3;
        }
        
        if (score > maxScore) {
            maxScore = score;
            bestPos = pEndIndex + 4;
        }
    }
    
    if (bestPos === -1 || maxScore < 2) return null;
    
    const { sentence, anchorText } = createBridgeSentenceWithAnchor(link);
    
    const finalValidation = validateAnchorQuality(anchorText, link.title);
    if (!finalValidation.valid) return null;
    
    const linkHtml = `<a href="${link.url}" title="${link.title.replace(/"/g, '&quot;')}" style="${linkStyle}" data-internal-link="true" data-bridge="true">${anchorText}</a>`;
    const finalSentence = sentence.replace(/<LINK_ANCHOR>.*?<\/LINK_ANCHOR>/, linkHtml);
    const bridgeHtml = `\n<p class="bridge-sentence" style="margin-top: 1em; font-style: italic; color: #64748b;">${finalSentence}</p>`;
    
    const newHtml = html.substring(0, bestPos) + bridgeHtml + html.substring(bestPos);
    
    return { html: newHtml, insertedAt: bestPos, anchorText };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INTERNAL LINK INJECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface LinkInjectionOptions {
    minLinks?: number;
    maxLinks?: number;
    minRelevance?: number;
    linkStyle?: string;
    minDistanceBetweenLinks?: number;
    maxLinksPerSection?: number;
    enableBridgeSentences?: boolean;
    logQuality?: boolean;
}

export interface LinkInjectionResult {
    html: string;
    linksAdded: InternalLinkResult[];
    skippedReasons: Map<string, string>;
    qualityReport: {
        excellent: number;
        good: number;
        acceptable: number;
        rejected: number;
        avgScore: number;
    };
}

export function injectInternalLinks(
    html: string,
    links: InternalLinkTarget[],
    currentUrl: string,
    options: LinkInjectionOptions = {}
): LinkInjectionResult {
    const {
        minLinks = 12,
        maxLinks = 25,
        linkStyle = 'color: #3b82f6; text-decoration: none; font-weight: 600; border-bottom: 2px solid rgba(59, 130, 246, 0.3); transition: all 0.2s ease; padding-bottom: 1px;',
        minDistanceBetweenLinks = ANCHOR_CONFIG.MIN_LINK_DISTANCE,
        maxLinksPerSection = ANCHOR_CONFIG.MAX_LINKS_PER_SECTION,
        enableBridgeSentences = true,
    } = options;
    
    if (!html || !links.length) {
        return { 
            html, 
            linksAdded: [], 
            skippedReasons: new Map(),
            qualityReport: { excellent: 0, good: 0, acceptable: 0, rejected: 0, avgScore: 0 }
        };
    }
    
    const linksAdded: InternalLinkResult[] = [];
    const skippedReasons = new Map<string, string>();
    const usedUrls = new Set<string>();
    const usedPositions = new Set<number>();
    const usedAnchors = new Set<string>();
    
    const qualityCounts = { excellent: 0, good: 0, acceptable: 0, rejected: 0 };
    let totalScore = 0;
    
    const sortedLinks = [...links]
        .filter(l => {
            if (l.url === currentUrl) return false;
            if (!l.title || l.title.length < 10) return false;
            return true;
        })
        .sort((a, b) => b.title.length - a.title.length);
    
    let modifiedHtml = html;
    
    const h2Regex = /<h2[^>]*>/gi;
    const h2Positions: number[] = [];
    let h2Match;
    while ((h2Match = h2Regex.exec(html)) !== null) {
        h2Positions.push(h2Match.index);
    }
    
    const sectionCounts = new Map<number, number>();
    const getSection = (pos: number): number => {
        for (let i = h2Positions.length - 1; i >= 0; i--) {
            if (pos >= h2Positions[i]) return i;
        }
        return -1;
    };
    
    // PASS 1: Semantic Matching
    for (const link of sortedLinks) {
        if (usedUrls.size >= maxLinks) break;
        if (usedUrls.has(link.url)) continue;
        
        const candidates = generateSemanticAnchorCandidates(link.title, 20);
        
        if (candidates.length === 0) {
            skippedReasons.set(link.url, 'No valid anchor candidates generated');
            qualityCounts.rejected++;
            continue;
        }
        
        let bestMatch: SemanticLinkMatch | null = null;
        
        for (const candidate of candidates) {
            const match = findSemanticMatchInContent(
                modifiedHtml, 
                candidate, 
                link.title, 
                usedPositions,
                minDistanceBetweenLinks
            );
            
            if (match && (!bestMatch || match.score > bestMatch.score)) {
                const section = getSection(match.startIndex);
                if ((sectionCounts.get(section) || 0) < maxLinksPerSection) {
                    const anchorLower = match.matchedText.toLowerCase();
                    if (!usedAnchors.has(anchorLower)) {
                        bestMatch = match;
                    }
                }
            }
        }
        
        if (bestMatch) {
            const finalValidation = validateAnchorQuality(bestMatch.matchedText, link.title);
            
            if (!finalValidation.valid) {
                skippedReasons.set(link.url, `Final validation failed: ${finalValidation.reason}`);
                qualityCounts.rejected++;
                continue;
            }
            
            const safeTitle = link.title.replace(/"/g, '&quot;');
            const linkTag = `<a href="${link.url}" title="${safeTitle}" style="${linkStyle}" data-internal-link="true" data-quality="${finalValidation.qualityTier}" data-score="${finalValidation.score}">${bestMatch.matchedText}</a>`;
            
            modifiedHtml = modifiedHtml.substring(0, bestMatch.startIndex) + 
                           linkTag + 
                           modifiedHtml.substring(bestMatch.endIndex);
            
            usedPositions.add(bestMatch.startIndex);
            usedUrls.add(link.url);
            usedAnchors.add(bestMatch.matchedText.toLowerCase());
            
            const section = getSection(bestMatch.startIndex);
            sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
            
            qualityCounts[finalValidation.qualityTier]++;
            totalScore += finalValidation.score;
            
            linksAdded.push({
                url: link.url,
                anchorText: bestMatch.matchedText,
                context: bestMatch.context,
                relevanceScore: bestMatch.score,
                matchType: bestMatch.type,
                insertedAt: bestMatch.startIndex
            });
        } else {
            skippedReasons.set(link.url, 'No suitable text match found');
        }
    }
    
    // PASS 2: Bridge Sentence Injection
    if (enableBridgeSentences && linksAdded.length < minLinks) {
        for (const link of sortedLinks) {
            if (linksAdded.length >= minLinks) break;
            if (usedUrls.has(link.url)) continue;
            
            const result = injectBridgeSentence(
                modifiedHtml, 
                link, 
                usedPositions, 
                linkStyle,
                minDistanceBetweenLinks
            );
            
            if (result) {
                const validation = validateAnchorQuality(result.anchorText, link.title);
                
                if (!validation.valid) {
                    skippedReasons.set(link.url, `Bridge anchor failed: ${validation.reason}`);
                    qualityCounts.rejected++;
                    continue;
                }
                
                modifiedHtml = result.html;
                usedPositions.add(result.insertedAt);
                usedUrls.add(link.url);
                usedAnchors.add(result.anchorText.toLowerCase());
                
                qualityCounts[validation.qualityTier]++;
                totalScore += validation.score;
                
                linksAdded.push({
                    url: link.url,
                    anchorText: result.anchorText,
                    context: 'Bridge sentence injection',
                    relevanceScore: 0.85,
                    matchType: 'contextual',
                    insertedAt: result.insertedAt
                });
            } else {
                skippedReasons.set(link.url, 'Bridge injection failed — no suitable position');
            }
        }
    }
    
    const avgScore = linksAdded.length > 0 ? Math.round(totalScore / linksAdded.length) : 0;
    
    return {
        html: modifiedHtml,
        linksAdded,
        skippedReasons,
        qualityReport: {
            excellent: qualityCounts.excellent,
            good: qualityCounts.good,
            acceptable: qualityCounts.acceptable,
            rejected: qualityCounts.rejected,
            avgScore
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeExistingContent(html: string): ExistingContentAnalysis {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.innerText || '';
    const htmlLower = html.toLowerCase();
    
    const headings: { level: number; text: string; hasKeyword?: boolean }[] = [];
    for (let i = 1; i <= 6; i++) {
        doc.querySelectorAll(`h${i}`).forEach(h => {
            headings.push({ level: i, text: h.textContent?.trim() || '', hasKeyword: false });
        });
    }
    
    const internalLinks = doc.querySelectorAll('a[href^="/"], a[href*="' + (doc.baseURI || '') + '"]');
    const allLinks = doc.querySelectorAll('a[href^="http"]');
    const internalLinkCount = internalLinks.length;
    const externalLinkCount = allLinks.length - internalLinkCount;
    
    const imageCount = doc.querySelectorAll('img').length;
    const tableCount = doc.querySelectorAll('table').length;
    const listCount = doc.querySelectorAll('ul, ol').length;
    const blockquoteCount = doc.querySelectorAll('blockquote').length;
    
    const hasSchema = html.includes('application/ld+json');
    const hasFAQ = htmlLower.includes('faq') || htmlLower.includes('frequently asked');
    const hasConclusion = htmlLower.includes('conclusion') || htmlLower.includes('key takeaway');
    const hasReferences = htmlLower.includes('reference') || htmlLower.includes('source');
    const hasQuickAnswer = htmlLower.includes('quick answer') || htmlLower.includes('tldr');
    
    const { score: readabilityScore } = calculateFleschKincaid(text);
    const mainTopics = headings.filter(h => h.level === 2).map(h => h.text);
    
    const weakSections: string[] = [];
    const missingElements: string[] = [];
    
    if (!hasFAQ) missingElements.push('FAQ Section');
    if (!hasConclusion) missingElements.push('Conclusion/Takeaways');
    if (!hasReferences) missingElements.push('References Section');
    if (!hasQuickAnswer) missingElements.push('Quick Answer Box');
    if (!hasSchema) missingElements.push('Schema Markup');
    if (tableCount === 0) missingElements.push('Comparison Tables');
    if (blockquoteCount === 0) missingElements.push('Expert Quotes');
    if (internalLinkCount < 10) missingElements.push('Internal Links (need 15+)');
    
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    let strengthScore = 0;
    if (hasFAQ) strengthScore += 15;
    if (hasConclusion) strengthScore += 10;
    if (hasReferences) strengthScore += 15;
    if (hasSchema) strengthScore += 15;
    if (hasQuickAnswer) strengthScore += 10;
    if (tableCount > 0) strengthScore += 10;
    if (blockquoteCount > 0) strengthScore += 5;
    if (internalLinkCount >= 10) strengthScore += 10;
    if (wordCount >= 3000) strengthScore += 10;
    
    const preserveableContent: string[] = [];
    if (html.includes('border-left:') || html.includes('border-radius:')) {
        preserveableContent.push('Styled content boxes');
    }
    if (tableCount > 0) preserveableContent.push(`${tableCount} data table(s)`);
    if (blockquoteCount > 0) preserveableContent.push(`${blockquoteCount} expert quote(s)`);
    
    const entities: string[] = [];
    const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g) || [];
    const uniqueNouns = [...new Set(properNouns)].filter(n => n.length > 3 && !STOP_WORDS.has(n.toLowerCase()));
    entities.push(...uniqueNouns.slice(0, 30));
    
    return {
        wordCount, headings, hasSchema, hasFAQ, hasConclusion, hasReferences, hasQuickAnswer,
        internalLinkCount, externalLinkCount, imageCount, tableCount, listCount, readabilityScore,
        preserveableContent, weakSections, entities, mainTopics, missingElements, strengthScore: Math.min(100, strengthScore)
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateSeoMetrics(
    html: string, 
    title: string, 
    slug: string,
    targetKeyword?: string
): SeoMetrics {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.innerText || '';
    const htmlLower = html.toLowerCase();
    const textLower = text.toLowerCase();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    const { score: readability, grade: readabilityGrade } = calculateFleschKincaid(text);
    
    const h1Count = doc.querySelectorAll('h1').length;
    const h2Count = doc.querySelectorAll('h2').length;
    const h3Count = doc.querySelectorAll('h3').length;
    
    const internalLinks = doc.querySelectorAll('a[data-internal-link], a[href^="/"]');
    const allLinks = doc.querySelectorAll('a[href^="http"]');
    const externalLinks = Array.from(allLinks).filter(a => {
        const href = a.getAttribute('href') || '';
        return !href.includes(slug) && href.startsWith('http');
    });
    
    const tableCount = doc.querySelectorAll('table').length;
    const listCount = doc.querySelectorAll('ul, ol').length;
    const blockquoteCount = doc.querySelectorAll('blockquote').length;
    
    const hasSchema = html.includes('application/ld+json');
    const schemaTypes: string[] = [];
    if (hasSchema) {
        const matches = html.match(/"@type"\s*:\s*"([^"]+)"/g) || [];
        matches.forEach(m => {
            const type = m.match(/"@type"\s*:\s*"([^"]+)"/)?.[1];
            if (type && !schemaTypes.includes(type)) schemaTypes.push(type);
        });
    }
    
    const hasFAQ = htmlLower.includes('faq') || htmlLower.includes('frequently asked');
    const hasReferences = htmlLower.includes('references') || htmlLower.includes('sources');
    const hasConclusion = htmlLower.includes('conclusion') || htmlLower.includes('takeaway');
    const hasQuickAnswer = htmlLower.includes('quick answer') || htmlLower.includes('tldr');
    
    const titleLen = title?.length || 0;
    const titleScore = titleLen >= 45 && titleLen <= 65 ? 100 :
                       titleLen >= 40 && titleLen <= 70 ? 80 :
                       titleLen >= 35 && titleLen <= 75 ? 60 : 40;
    
    const keywordInTitle = targetKeyword ? title.toLowerCase().includes(targetKeyword.toLowerCase()) : true;
    const titleOptimization = titleScore * (keywordInTitle ? 1 : 0.7);
    
    const headingScore = h1Count === 0 && h2Count >= 10 && h3Count >= 15 ? 100 :
                         h1Count <= 1 && h2Count >= 8 && h3Count >= 12 ? 85 :
                         h1Count <= 1 && h2Count >= 5 && h3Count >= 8 ? 70 : 50;
    
    const metaOptimization = 80;
    
    const internalLinkScore = Math.min(100, internalLinks.length * 5);
    const externalLinkScore = Math.min(100, externalLinks.length * 8);
    const linkDensity = Math.round((internalLinkScore * 0.6) + (externalLinkScore * 0.4));
    
    const semanticDensity = Math.min(100, (tableCount * 15) + (listCount * 5) + (blockquoteCount * 10) + (h2Count * 3) + (h3Count * 2));
    
    const aeoScore = Math.round(
        (hasFAQ ? 25 : 0) +
        (hasSchema ? 20 : 0) +
        (schemaTypes.includes('FAQPage') ? 10 : 0) +
        (hasQuickAnswer ? 15 : 0) +
        (hasConclusion ? 10 : 0) +
        Math.min(20, (wordCount / 4000) * 20)
    );
    
    const geoScore = Math.round(
        (hasReferences ? 25 : 0) +
        Math.min(25, (externalLinks.length / 8) * 25) +
        (hasSchema ? 15 : 0) +
        Math.min(20, (wordCount / 4000) * 20) +
        Math.min(15, (h2Count / 10) * 15)
    );
    
    let eeatScore = 0;
    EEAT_SIGNALS.forEach(signal => {
        if (textLower.includes(signal)) eeatScore += 5;
    });
    eeatScore = Math.min(100, eeatScore + (hasSchema ? 20 : 0) + (hasReferences ? 20 : 0));
    
    let keywordDensity = 75;
    if (targetKeyword) {
        const keywordLower = targetKeyword.toLowerCase();
        const keywordCount = (textLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const density = (keywordCount / wordCount) * 100;
        keywordDensity = density >= 0.5 && density <= 2.5 ? 100 :
                         density >= 0.3 && density <= 3 ? 80 :
                         density > 0 ? 60 : 30;
    }
    
    const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) || [];
    const entityDensity = Math.min(100, (properNouns.length / Math.max(1, wordCount / 100)) * 10);
    
    const serpFeatureTargeting = hasFAQ && hasSchema ? 90 :
                                  hasFAQ || hasSchema ? 70 :
                                  hasQuickAnswer ? 50 : 30;
    
    const powerWordsUsed = POWER_WORDS.filter(pw => textLower.includes(pw));
    
    const contentDepth = Math.min(100, 
        (wordCount / 50) + 
        (h2Count * 4) + 
        (h3Count * 2) + 
        (tableCount * 10) + 
        (hasFAQ ? 15 : 0) +
        (hasReferences ? 10 : 0)
    );
    
    const topicalAuthority = Math.min(100,
        (h2Count * 5) +
        (h3Count * 2) +
        (internalLinks.length * 2) +
        (hasReferences ? 20 : 0) +
        (externalLinks.length * 3)
    );
    
    return {
        titleOptimization: Math.round(titleOptimization),
        metaOptimization,
        headingStructure: headingScore,
        readability,
        readabilityGrade,
        linkDensity,
        semanticDensity: Math.round(semanticDensity),
        eeatSignals: Math.min(100, eeatScore),
        aeoScore: Math.min(100, aeoScore),
        geoScore: Math.min(100, geoScore),
        keywordDensity,
        entityDensity: Math.round(entityDensity),
        serpFeatureTargeting,
        answerEngineVisibility: aeoScore,
        schemaDetected: hasSchema,
        schemaTypes,
        mobileOptimized: true,
        powerWordsUsed,
        wordCount,
        uniquenessScore: 85,
        contentDepth: Math.round(contentDepth),
        topicalAuthority: Math.round(topicalAuthority),
        internalLinkScore: Math.min(100, internalLinks.length * 5),
        externalLinkScore: Math.min(100, externalLinks.length * 8)
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QA RULE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

interface QARuleDefinition {
    id: string;
    name: string;
    category: 'critical' | 'seo' | 'aeo' | 'geo' | 'enhancement';
    severity: 'error' | 'warning' | 'info';
    description: string;
    scoreImpact: number;
    weight: number;
    enabled: boolean;
    detect: (contract: ContentContract, context: QARuleContext, thresholds: typeof DEFAULT_THRESHOLDS) => QADetectionResult;
    fix?: (contract: ContentContract, detection: QADetectionResult) => ContentContract;
}

const QA_RULES: QARuleDefinition[] = [
    {
        id: 'no-h1-tags',
        name: 'H1 Tags (WordPress)',
        category: 'critical',
        severity: 'error',
        description: 'Content must have zero H1 tags',
        scoreImpact: 100,
        weight: 1.0,
        enabled: true,
        detect: (contract) => {
            const h1Count = (contract.htmlContent.match(/<h1/gi) || []).length;
            return { 
                passed: h1Count === 0, 
                score: h1Count === 0 ? 100 : 0, 
                message: h1Count === 0 ? '✓ Zero H1 tags' : `✗ Found ${h1Count} H1 tag(s)`, 
                details: { h1Count }, 
                autoFixable: true 
            };
        },
        fix: (contract) => ({ ...contract, htmlContent: removeAllH1Tags(contract.htmlContent) })
    },
    {
        id: 'word-count',
        name: 'Word Count',
        category: 'critical',
        severity: 'error',
        description: 'Content must meet minimum word count',
        scoreImpact: 80,
        weight: 1.0,
        enabled: true,
        detect: (contract, _, thresholds) => {
            const doc = new DOMParser().parseFromString(contract.htmlContent, 'text/html');
            const text = doc.body?.innerText || '';
            const wordCount = text.split(/\s+/).filter(Boolean).length;
            return { 
                passed: wordCount >= thresholds.WORD_COUNT_MIN, 
                score: wordCount >= thresholds.WORD_COUNT_MIN ? 100 : Math.round((wordCount / thresholds.WORD_COUNT_MIN) * 100), 
                message: `${wordCount} words (min: ${thresholds.WORD_COUNT_MIN})`, 
                details: { wordCount }, 
                autoFixable: false 
            };
        }
    },
    {
        id: 'h2-headings',
        name: 'H2 Headings',
        category: 'critical',
        severity: 'error',
        description: 'Content must have sufficient H2 sections',
        scoreImpact: 60,
        weight: 0.9,
        enabled: true,
        detect: (contract, _, thresholds) => {
            const count = (contract.htmlContent.match(/<h2/gi) || []).length;
            return { 
                passed: count >= thresholds.H2_COUNT_MIN, 
                score: count >= thresholds.H2_COUNT_MIN ? 100 : Math.round((count / thresholds.H2_COUNT_MIN) * 100), 
                message: `${count} H2s (min: ${thresholds.H2_COUNT_MIN})`, 
                details: { count }, 
                autoFixable: false 
            };
        }
    },
    {
        id: 'faq-section',
        name: 'FAQ Section',
        category: 'critical',
        severity: 'error',
        description: 'Content must include FAQ section',
        scoreImpact: 70,
        weight: 0.9,
        enabled: true,
        detect: (contract, _, thresholds) => {
            const hasFAQ = contract.htmlContent.toLowerCase().includes('faq') || 
                           contract.htmlContent.toLowerCase().includes('frequently asked');
            const count = contract.faqs?.length || 0;
            return { 
                passed: hasFAQ && count >= thresholds.FAQ_COUNT_MIN, 
                score: hasFAQ ? Math.min(100, (count / thresholds.FAQ_COUNT_MIN) * 100) : 0, 
                message: hasFAQ ? `${count} FAQs` : 'Missing FAQ section', 
                details: { hasFAQ, count }, 
                autoFixable: false 
            };
        }
    },
    {
        id: 'internal-links',
        name: 'Internal Links',
        category: 'seo',
        severity: 'warning',
        description: 'Sufficient internal links with quality anchors',
        scoreImpact: 60,
        weight: 0.8,
        enabled: true,
        detect: (contract, _, thresholds) => {
            const links = contract.htmlContent.match(/<a[^>]*data-internal-link[^>]*>/gi) || [];
            const count = links.length;
            return { 
                passed: count >= thresholds.INTERNAL_LINKS_MIN, 
                score: Math.min(100, (count / thresholds.INTERNAL_LINKS_MIN) * 100), 
                message: `${count} internal links (min: ${thresholds.INTERNAL_LINKS_MIN})`, 
                details: { count }, 
                autoFixable: false 
            };
        }
    },
    {
        id: 'nlp-coverage',
        name: 'NLP Coverage',
        category: 'seo',
        severity: 'warning',
        description: 'NeuronWriter term coverage',
        scoreImpact: 60,
        weight: 0.8,
        enabled: true,
        detect: (contract, ctx, thresholds) => {
            if (!ctx.neuronTerms || ctx.neuronTerms.length === 0) {
                return { passed: true, score: 100, message: 'N/A (no NLP terms)', details: {}, autoFixable: false };
            }
            const { coverage } = calculateNLPCoverage(contract.htmlContent, ctx.neuronTerms);
            return { 
                passed: coverage >= thresholds.NLP_COVERAGE_MIN, 
                score: coverage, 
                message: `${coverage}% NLP coverage (min: ${thresholds.NLP_COVERAGE_MIN}%)`, 
                details: { coverage }, 
                autoFixable: false 
            };
        }
    },
    {
        id: 'readability',
        name: 'Readability Score',
        category: 'seo',
        severity: 'warning',
        description: 'Content should be easy to read',
        scoreImpact: 50,
        weight: 0.7,
        enabled: true,
        detect: (contract, _, thresholds) => {
            const doc = new DOMParser().parseFromString(contract.htmlContent, 'text/html');
            const text = doc.body?.innerText || '';
            const { score } = calculateFleschKincaid(text);
            return { 
                passed: score >= thresholds.READABILITY_MIN, 
                score: Math.min(100, score), 
                message: `Flesch-Kincaid: ${score} (${getReadabilityInterpretation(score)})`, 
                details: { score }, 
                autoFixable: false 
            };
        }
    }
];

export function runQASwarm(
    contract: ContentContract, 
    entityGapData?: EntityGapAnalysis, 
    neuronTerms: NeuronTerm[] = [], 
    serpPolicy?: SerpLengthPolicy, 
    niche?: string, 
    siteContext?: SiteContext
): QASwarmResult {
    const results: QAValidationResult[] = [];
    const thresholds = computeDynamicThresholds(serpPolicy, niche);
    const context: QARuleContext = { 
        neuronTerms, 
        serpPolicy, 
        siteContext,
        targetKeyword: contract.title?.split(' ').slice(0, 3).join(' ')
    };
    
    for (const rule of QA_RULES) {
        if (!rule.enabled) continue;
        
        try {
            const detection = rule.detect(contract, context, thresholds);
            results.push({
                agent: rule.name,
                ruleId: rule.id,
                category: rule.category,
                status: detection.passed ? 'passed' : (rule.severity === 'error' ? 'failed' : 'warning'),
                feedback: detection.message,
                score: detection.score,
                details: detection.details,
                fixSuggestion: !detection.passed ? rule.description : undefined,
                autoFixed: false
            });
        } catch (e) {
            console.warn(`[QA] Rule ${rule.id} failed:`, e);
        }
    }
    
    const criticalResults = results.filter(r => r.category === 'critical');
    const seoResults = results.filter(r => r.category === 'seo');
    const aeoResults = results.filter(r => r.category === 'aeo');
    const geoResults = results.filter(r => r.category === 'geo');
    const enhResults = results.filter(r => r.category === 'enhancement');
    
    const avgScore = (arr: QAValidationResult[]) => 
        arr.length > 0 ? Math.round(arr.reduce((s, r) => s + r.score, 0) / arr.length) : 100;
    
    const criticalFailures = criticalResults.filter(r => r.status === 'failed').length;
    const totalScore = avgScore(results);
    
    return {
        passed: criticalFailures === 0 && totalScore >= 70,
        results,
        score: totalScore,
        criticalFailures,
        recommendations: results
            .filter(r => r.status !== 'passed')
            .map(r => r.fixSuggestion || r.feedback)
            .filter(Boolean),
        seoScore: avgScore(seoResults),
        aeoScore: avgScore(aeoResults),
        geoScore: avgScore(geoResults),
        contentQualityScore: avgScore(enhResults),
        scoreBreakdown: calculateScoreBreakdown(results),
        rulesRun: results.length,
        rulesPassed: results.filter(r => r.status === 'passed').length
    };
}

function calculateScoreBreakdown(results: QAValidationResult[]): ScoreBreakdown {
    const breakdown = createEmptyScoreBreakdown();
    
    results.forEach(r => {
        const cat = r.category as keyof ScoreBreakdown['categories'];
        if (breakdown.categories[cat]) {
            breakdown.categories[cat].checks++;
            if (r.status === 'passed') breakdown.categories[cat].passed++;
            breakdown.categories[cat].score += r.score;
        }
    });
    
    Object.keys(breakdown.categories).forEach(k => {
        const cat = breakdown.categories[k as keyof ScoreBreakdown['categories']];
        if (cat.checks > 0) {
            cat.score = Math.round(cat.score / cat.checks);
        }
    });
    
    const weights = CURRENT_SCORE_WEIGHTS.weights;
    let weightedTotal = 0;
    let totalWeight = 0;
    
    Object.entries(breakdown.categories).forEach(([key, cat]) => {
        const weight = weights[key as keyof typeof weights] || 0;
        weightedTotal += cat.score * weight;
        totalWeight += weight;
    });
    
    breakdown.weightedScore = totalWeight > 0 ? Math.round(weightedTotal / totalWeight) : 0;
    breakdown.totalScore = Math.round(results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length));
    breakdown.criticalFailures = results.filter(r => r.category === 'critical' && r.status === 'failed').length;
    breakdown.passed = breakdown.criticalFailures === 0 && breakdown.weightedScore >= CURRENT_SCORE_WEIGHTS.thresholds.pass;
    
    return breakdown;
}

function createEmptyScoreBreakdown(): ScoreBreakdown {
    return {
        version: SCORE_ALGORITHM_VERSION,
        timestamp: Date.now(),
        categories: {
            critical: { score: 0, weight: CURRENT_SCORE_WEIGHTS.weights.critical, checks: 0, passed: 0 },
            seo: { score: 0, weight: CURRENT_SCORE_WEIGHTS.weights.seo, checks: 0, passed: 0 },
            aeo: { score: 0, weight: CURRENT_SCORE_WEIGHTS.weights.aeo, checks: 0, passed: 0 },
            geo: { score: 0, weight: CURRENT_SCORE_WEIGHTS.weights.geo, checks: 0, passed: 0 },
            enhancement: { score: 0, weight: CURRENT_SCORE_WEIGHTS.weights.enhancement, checks: 0, passed: 0 }
        },
        totalScore: 0,
        weightedScore: 0,
        passed: false,
        criticalFailures: 0
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function removeAllH1Tags(html: string): string {
    if (!html) return html;
    
    let cleaned = html;
    
    for (let pass = 0; pass < 3; pass++) {
        cleaned = cleaned.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
        cleaned = cleaned.replace(/<h1[^>]*\/>/gi, '');
        cleaned = cleaned.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
    }
    
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/h1>/gi, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
}

export function removeDuplicateFAQSections(html: string, log?: (msg: string) => void): string {
    if (!html) return html;
    
    const faqPatterns = [
        /<section[^>]*class="[^"]*(?:faq|wp-opt-faq)[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
        /<section[^>]*id="[^"]*faq[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
        /<div[^>]*class="[^"]*faq-(?:section|accordion|container)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ];
    
    const allMatches: Array<{ match: string; index: number; length: number }> = [];
    
    faqPatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(html)) !== null) {
            allMatches.push({ 
                match: match[0], 
                index: match.index,
                length: match[0].length 
            });
        }
    });
    
    if (allMatches.length <= 1) return html;
    
    log?.(`   → Found ${allMatches.length} FAQ sections, keeping best one...`);
    
    allMatches.sort((a, b) => {
        if (b.length !== a.length) return b.length - a.length;
        return b.index - a.index;
    });
    
    const toKeep = allMatches[0];
    let cleaned = html;
    
    for (let i = allMatches.length - 1; i >= 0; i--) {
        const item = allMatches[i];
        if (item.index !== toKeep.index) {
            cleaned = cleaned.substring(0, item.index) + 
                      '<!-- DUPLICATE FAQ REMOVED -->' + 
                      cleaned.substring(item.index + item.length);
            log?.(`   ✓ Removed duplicate FAQ at position ${item.index}`);
        }
    }
    
    return cleaned.replace(/<!-- DUPLICATE FAQ REMOVED -->\s*/g, '');
}

export function validateNoH1(html: string): { valid: boolean; count: number } {
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    return { valid: h1Count === 0, count: h1Count };
}

export function countFAQSections(html: string): number {
    const patterns = [
        /<section[^>]*class="[^"]*faq[^"]*"/gi,
        /<div[^>]*id="[^"]*faq[^"]*"/gi,
        /itemtype="https?:\/\/schema\.org\/FAQPage"/gi,
    ];
    
    let count = 0;
    patterns.forEach(p => {
        const matches = html.match(p);
        if (matches) count += matches.length;
    });
    
    return Math.min(count, 10);
}

export function sanitizeSlug(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
}

export function sanitizeTitle(title: string, slug: string): string {
    if (title && title.length > 2 && title.toLowerCase() !== 'home') {
        return title;
    }
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim() || 'New Page';
}

export function extractSlugFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/').filter(Boolean);
        return sanitizeSlug(parts[parts.length - 1] || 'home');
    } catch {
        return 'home';
    }
}

export function calculateOpportunityScore(
    title: string, 
    lastMod: string | null, 
    healthScore?: number | null
): OpportunityScore {
    let temporalDecay = 70;
    if (lastMod) {
        const days = Math.floor((Date.now() - new Date(lastMod).getTime()) / (1000 * 60 * 60 * 24));
        temporalDecay = Math.min(100, 50 + Math.min(days / 2, 50));
    }
    
    const titleLower = title.toLowerCase();
    const commercialPatterns = /best|buy|review|price|cost|cheap|affordable|deal|sale|compare/i;
    const commercialIntent = commercialPatterns.test(titleLower) ? 80 : 40;
    
    const strikingDistance = healthScore !== null && healthScore !== undefined 
        ? Math.max(0, 100 - healthScore) 
        : 50;
    
    return { 
        total: Math.round((temporalDecay + commercialIntent + strikingDistance) / 3), 
        commercialIntent, 
        temporalDecay, 
        strikingDistance, 
        competitionLevel: 50, 
        trafficPotential: 50, 
        aeoOpportunity: 50, 
        geoOpportunity: 50 
    };
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

export function formatNumber(num: number): string {
    return num.toLocaleString();
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function isEmpty(v: unknown): boolean {
    return v === null || v === undefined || v === '' || 
           (Array.isArray(v) && v.length === 0) ||
           (typeof v === 'object' && Object.keys(v as object).length === 0);
}

export function truncate(str: string, len: number): string {
    if (!str) return '';
    return str.length > len ? str.substring(0, len - 3) + '...' : str;
}

export function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function isValidUrl(str: string): boolean {
    try { 
        new URL(str); 
        return true; 
    } catch { 
        return false; 
    }
}

export function getDomain(url: string): string {
    try { 
        return new URL(url).hostname.replace('www.', ''); 
    } catch { 
        return ''; 
    }
}

export function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: unknown[]) => unknown>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function registerQARule(rule: QARuleDefinition): void {
    const existing = QA_RULES.findIndex(r => r.id === rule.id);
    if (existing >= 0) {
        QA_RULES[existing] = rule;
    } else {
        QA_RULES.push(rule);
    }
}

export function setQARuleEnabled(id: string, enabled: boolean): void {
    const rule = QA_RULES.find(r => r.id === id);
    if (rule) rule.enabled = enabled;
}

export function getQARule(id: string): QARuleDefinition | undefined {
    return QA_RULES.find(r => r.id === id);
}

export function getQARulesByCategory(category: string): QARuleDefinition[] {
    return QA_RULES.filter(r => r.category === category);
}

export function getAllQARules(): QARuleDefinition[] {
    return [...QA_RULES];
}


    // ═══════════════════════════════════════════════════════════════════════════════
// 🚀 SOTA BLOG QUALITY ENHANCEMENTS v30.0
// Enhanced Readability, E-E-A-T, Schema, Internal Links, AEO
// ═══════════════════════════════════════════════════════════════════════════════

// EEAT Signal Phrases for Enhanced Authority
const EEAT_SIGNAL_PHRASES = [
  'according to',
  'research shows',
  'studies indicate',
  'experts recommend',
  'data demonstrates',
  'evidence suggests',
  'scientific research',
  'peer-reviewed',
  'published in',
  'licensed professional',
  'certified',
  'years of experience',
  'industry leader',
  'authoritative source',
  'proven method'
];

// Enhanced Readability Optimization
export function enhanceReadability(html: string): { html: string; improvements: string[] } {
  const improvements: string[] = [];
  let enhanced = html;
  
  // Break long paragraphs into smaller chunks
  enhanced = enhanced.replace(/<p>([^<]{800,}?[.!?])\s+/g, (match, content) => {
    improvements.push('Split long paragraph for better readability');
    const sentences = content.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let chunk = '';
    
    for (const sentence of sentences) {
      if ((chunk + ' ' + sentence).split(/\s+/).length > 20) {
        chunks.push(chunk.trim());
        chunk = sentence;
      } else {
        chunk += ' ' + sentence;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks.map(c => `<p>${c}</p>`).join('');
  });
  
  // Add transition words at section starts
  const transitions = ['Furthermore,', 'Moreover,', 'Additionally,', 'Importantly,', 'Notably,'];
  let transIndex = 0;
  enhanced = enhanced.replace(/<h[2-3][^>]*>[^<]+<\/h[2-3]>\s*<p>/g, (match) => {
    const trans = transitions[transIndex % transitions.length];
    transIndex++;
    if (!match.includes(trans)) {
      improvements.push(`Added transition word: ${trans}`);
      return match.replace(/<p>/, `<p>${trans} `);
    }
    return match;
  });
  
  return { html: enhanced, improvements };
}

// EEAT Signal Injection
export function injectEEATSignals(html: string, authorityDomains?: string[]): { html: string; signalsAdded: number } {
  const domains = authorityDomains || [
    '.gov', '.edu', 'forbes.com', 'bloomberg.com', 'reuters.com',
    'bbc.com', 'nytimes.com', 'nature.com', 'sciencedirect.com'
  ];
  
  let enhanced = html;
  let signalsAdded = 0;
  const usedPhrases = new Set<string>();
  
  // Find appropriate places to inject E-E-A-T signals
  const paragraphs = enhanced.match(/<p>([^<]{100,300})<\/p>/g) || [];
  
  for (let i = 0; i < paragraphs.length && signalsAdded < 12; i++) {
    const para = paragraphs[i];
    if (!EEAT_SIGNAL_PHRASES.some(phrase => para.toLowerCase().includes(phrase))) {
      const phrases = EEAT_SIGNAL_PHRASES.filter(p => !usedPhrases.has(p));
      if (phrases.length > 0) {
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        usedPhrases.add(phrase);
        
        const enhanced_para = para.replace(
          /(<p>)/,
          `$1Research indicates that `
        );
        
        if (enhanced_para !== para) {
          enhanced = enhanced.replace(para, enhanced_para);
          signalsAdded++;
        }
      }
    }
  }
  
  return { html: enhanced, signalsAdded };
}

// Schema Markup Generation
export function generateArticleSchema(
  title: string,
  description: string,
  author: string = 'WP Optimizer Pro',
  url: string = 'https://example.com',
  imageUrl: string = ''
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': title,
    'description': description,
    'datePublished': new Date().toISOString(),
    'dateModified': new Date().toISOString(),
    'author': {
      '@type': 'Person',
      'name': author
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'WP Optimizer Pro',
      'logo': 'https://wp-optimizer-pro.com/logo.png'
    },
    'image': imageUrl || 'https://wp-optimizer-pro.com/default-image.png',
    'url': url
  };
  
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

// FAQ Schema Generation
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
  
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

// AEO Quick Answer Box
export function createQuickAnswerBox(question: string, answer: string): string {
  return `
    <div class="quick-answer-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #fff;">
      <h3 style="margin-top: 0; font-size: 18px; color: #fff;">Quick Answer</h3>
      <p style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.6;">${answer}</p>
    </div>
  `;
}

// Enhanced FAQ Accordion
export function createFAQAccordion(faqs: Array<{ question: string; answer: string }>): string {
  return `
    <div class="faq-accordion" style="margin: 30px 0;">
      <h2>Frequently Asked Questions</h2>
      ${faqs.map((faq, i) => `
        <details style="margin: 15px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer;">
          <summary style="font-weight: 600; font-size: 16px; color: #333; padding: 10px 0;">${faq.question}</summary>
          <p style="margin: 15px 0 0 0; color: #666; line-height: 1.6;">${faq.answer}</p>
        </details>
      `).join('')}
    </div>
  `;
}

// Validate Content Quality Score
export function calculateContentQualityScore(
  html: string,
  metrics: { readability?: number; eeatSignals?: number; internalLinks?: number; schema?: boolean; faqs?: number }
): { score: number; breakdown: Record<string, number>; recommendations: string[] } {
  const breakdown: Record<string, number> = {
    readability: metrics.readability || 0,
    eeatSignals: Math.min(100, (metrics.eeatSignals || 0) * 8),
    internalLinks: Math.min(100, (metrics.internalLinks || 0) * 5),
    schema: metrics.schema ? 100 : 0,
    faqs: Math.min(100, (metrics.faqs || 0) * 10)
  };
  
  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b) / Object.keys(breakdown).length);
  const recommendations: string[] = [];
  
  if ((metrics.readability || 0) < 60) recommendations.push('Improve readability to 60+');
  if ((metrics.eeatSignals || 0) < 10) recommendations.push('Add 10+ E-E-A-T signals');
  if ((metrics.internalLinks || 0) < 15) recommendations.push('Include 15+ quality internal links');
  if (!metrics.schema) recommendations.push('Add NewsArticle and FAQ schema markup');
  if ((metrics.faqs || 0) < 7) recommendations.push('Create 7+ FAQ items');
  
  return { score, breakdown, recommendations };
}

// SOTA Content Enhancement Pipeline
export function applySOTAEnhancements(html: string, config?: {
  enableReadability?: boolean;
  enableEEAT?: boolean;
  enableSchema?: boolean;
  enableAEO?: boolean;
  title?: string;
  description?: string;
  author?: string;
  faqs?: Array<{ question: string; answer: string }>;
}): { enhanced: string; changes: string[]; qualityScore: number } {
  const defaults = { enableReadability: true, enableEEAT: true, enableSchema: true, enableAEO: true, ...config };
  const changes: string[] = [];
  let enhanced = html;
  
  // Apply readability enhancement
  if (defaults.enableReadability) {
    const { html: readableHtml, improvements } = enhanceReadability(enhanced);
    enhanced = readableHtml;
    changes.push(...improvements);
  }
  
  // Inject E-E-A-T signals
  if (defaults.enableEEAT) {
    const { html: eeatHtml, signalsAdded } = injectEEATSignals(enhanced);
    enhanced = eeatHtml;
    changes.push(`Added ${signalsAdded} E-E-A-T signals`);
  }
  
  // Add schema markup
  if (defaults.enableSchema && defaults.title) {
    const articleSchema = generateArticleSchema(
      defaults.title,
      defaults.description || '',
      defaults.author
    );
    enhanced = articleSchema + enhanced;
    changes.push('Added NewsArticle schema markup');
    
    if (defaults.faqs && defaults.faqs.length > 0) {
      const faqSchema = generateFAQSchema(defaults.faqs);
      enhanced = faqSchema + enhanced;
      changes.push('Added FAQPage schema markup');
    }
  }
  
  // Add AEO optimizations
  if (defaults.enableAEO && defaults.faqs && defaults.faqs.length > 0) {
    const quickAnswer = defaults.faqs[0];
    const quickAnswerBox = createQuickAnswerBox(quickAnswer.question, quickAnswer.answer);
    const faqAccordion = createFAQAccordion(defaults.faqs);
    enhanced = quickAnswerBox + enhanced + faqAccordion;
    changes.push('Added quick answer box and FAQ accordion');
  }
  
  // Calculate quality score
  const qualityScore = Math.min(100, 70 + changes.length * 3);
  
  return { enhanced, changes, qualityScore };
}
export default {
  enhanceReadability,
  injectEEATSignals,
  generateArticleSchema,
  generateFAQSchema,
  createQuickAnswerBox,
  createFAQAccordion,
  calculateContentQualityScore,
  applySOTAEnhancements
      };
