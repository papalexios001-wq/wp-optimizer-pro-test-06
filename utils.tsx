// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — ENTERPRISE UTILITY LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

import { NeuronTerm, ContentContract, QAValidationResult } from './types';

export const UTILS_VERSION = "39.0.0";

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SEO METRICS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateFleschKincaid(text: string): number {
    if (!text) return 0;
    
    const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    // Count syllables (simplified)
    const countSyllables = (word: string): number => {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const syllables = word.match(/[aeiouy]{1,2}/g);
        return syllables ? syllables.length : 1;
    };
    
    const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = totalSyllables / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateContentDepth(html: string): number {
    if (!html) return 0;
    
    const wordCount = countWords(html);
    const h2Count = (html.match(/<h2/gi) || []).length;
    const h3Count = (html.match(/<h3/gi) || []).length;
    const listCount = (html.match(/<(ul|ol)/gi) || []).length;
    const tableCount = (html.match(/<table/gi) || []).length;
    
    let score = 0;
    
    // Word count scoring
    if (wordCount >= 4500) score += 40;
    else if (wordCount >= 3000) score += 30;
    else if (wordCount >= 2000) score += 20;
    else score += 10;
    
    // Structure scoring
    score += Math.min(20, h2Count * 2);
    score += Math.min(15, h3Count * 1.5);
    score += Math.min(10, listCount * 2);
    score += Math.min(15, tableCount * 5);
    
    return Math.min(100, Math.round(score));
}

export function calculateHeadingStructure(html: string): number {
    if (!html) return 0;
    
    const h1Count = (html.match(/<h1/gi) || []).length;
    const h2Count = (html.match(/<h2/gi) || []).length;
    const h3Count = (html.match(/<h3/gi) || []).length;
    
    let score = 100;
    
    // Penalize H1 tags (WordPress should handle title)
    if (h1Count > 0) score -= h1Count * 10;
    
    // Check H2 count
    if (h2Count < 5) score -= 15;
    else if (h2Count > 15) score -= 10;
    
    // Check H3 count
    if (h3Count < 3) score -= 10;
    
    // Hierarchy check
    if (h2Count > 0 && h3Count < h2Count / 2) score -= 10;
    
    return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧬 NLP COVERAGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NLPCoverageResult {
    score: number;
    weightedScore: number;
    totalTerms: number;
    usedTerms: number;
    missingTerms: NeuronTerm[];
    usedDetails: Array<NeuronTerm & { count: number }>;
}

export function calculateNLPCoverage(
    content: string,
    terms: NeuronTerm[]
): NLPCoverageResult {
    if (!content || terms.length === 0) {
        return {
            score: 100,
            weightedScore: 100,
            totalTerms: 0,
            usedTerms: 0,
            missingTerms: [],
            usedDetails: []
        };
    }
    
    const contentLower = content.toLowerCase();
    const usedDetails: Array<NeuronTerm & { count: number }> = [];
    const missingTerms: NeuronTerm[] = [];
    
    let totalWeight = 0;
    let usedWeight = 0;
    
    for (const term of terms) {
        const termLower = term.term.toLowerCase();
        const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        const matches = contentLower.match(regex);
        const count = matches?.length || 0;
        
        const weight = term.importance || 50;
        totalWeight += weight;
        
        if (count > 0) {
            usedDetails.push({ ...term, count });
            usedWeight += weight;
        } else {
            missingTerms.push(term);
        }
    }
    
    const score = terms.length > 0
        ? Math.round((usedDetails.length / terms.length) * 100)
        : 100;
    
    const weightedScore = totalWeight > 0
        ? Math.round((usedWeight / totalWeight) * 100)
        : 100;
    
    return {
        score,
        weightedScore,
        totalTerms: terms.length,
        usedTerms: usedDetails.length,
        missingTerms,
        usedDetails
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 ANCHOR TEXT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const BAD_ANCHORS = [
    'click here', 'read more', 'learn more', 'check out', 'find out',
    'this article', 'this post', 'this guide', 'click this', 'see here',
    'more info', 'details here', 'link', 'here', 'this'
];

export function validateAnchorQuality(anchorText: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;
    
    if (!anchorText) {
        return { score: 0, issues: ['Empty anchor text'] };
    }
    
    const wordCount = anchorText.trim().split(/\s+/).length;
    
    // Word count check (3-7 words ideal)
    if (wordCount < 3) {
        score -= 30;
        issues.push('Too few words (minimum 3)');
    } else if (wordCount > 7) {
        score -= 15;
        issues.push('Too many words (maximum 7)');
    }
    
    // Character length check (15-60 chars)
    if (anchorText.length < 15) {
        score -= 20;
        issues.push('Too short (minimum 15 chars)');
    } else if (anchorText.length > 60) {
        score -= 10;
        issues.push('Too long (maximum 60 chars)');
    }
    
    // Bad anchor patterns
    const anchorLower = anchorText.toLowerCase();
    for (const bad of BAD_ANCHORS) {
        if (anchorLower.includes(bad)) {
            score -= 40;
            issues.push(`Contains generic phrase: "${bad}"`);
            break;
        }
    }
    
    // Starts with stop word
    const firstWord = anchorText.split(/\s+/)[0]?.toLowerCase();
    const stopWords = ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'to', 'for'];
    if (stopWords.includes(firstWord)) {
        score -= 15;
        issues.push('Starts with stop word');
    }
    
    return { score: Math.max(0, score), issues };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 CONTENT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function countWords(text: string): number {
    if (!text) return 0;
    return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
}

export function stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function truncate(str: string, max: number): string {
    if (!str || str.length <= max) return str || '';
    return str.substring(0, max - 3) + '...';
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function extractExcerpt(html: string, maxLength: number = 160): string {
    const text = stripHtml(html);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let excerpt = '';
    for (const sentence of sentences) {
        if ((excerpt + sentence).length > maxLength) break;
        excerpt += sentence.trim() + '. ';
    }
    
    return excerpt.trim() || truncate(text, maxLength);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SCHEMA GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export function generateArticleSchema(
    title: string,
    description: string,
    author: string,
    url: string,
    imageUrl?: string,
    datePublished?: string,
    dateModified?: string
): object {
    const now = new Date().toISOString();
    
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "author": {
            "@type": "Person",
            "name": author
        },
        "datePublished": datePublished || now,
        "dateModified": dateModified || now,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
        },
        ...(imageUrl && {
            "image": {
                "@type": "ImageObject",
                "url": imageUrl
            }
        })
    };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): object {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer.replace(/<[^>]*>/g, '')
            }
        }))
    };
}

export function generateBreadcrumbSchema(
    items: Array<{ name: string; url: string }>
): object {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ QA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function runQAValidation(
    contract: ContentContract,
    neuronTerms: NeuronTerm[] = []
): QAValidationResult[] {
    const results: QAValidationResult[] = [];
    const html = contract.htmlContent || '';
    const wordCount = countWords(html);
    
    // Critical: Word Count
    results.push({
        agent: 'Word Count',
        category: 'critical',
        status: wordCount >= 3000 ? 'passed' : wordCount >= 2000 ? 'warning' : 'failed',
        score: Math.min(100, Math.round((wordCount / 4500) * 100)),
        feedback: `Content has ${wordCount.toLocaleString()} words (target: 4,500+)`,
        fixSuggestion: wordCount < 3000 ? 'Add more comprehensive content sections' : undefined
    });
    
    // Critical: No H1 Tags
    const h1Count = (html.match(/<h1/gi) || []).length;
    results.push({
        agent: 'H1 Tags',
        category: 'critical',
        status: h1Count === 0 ? 'passed' : 'failed',
        score: h1Count === 0 ? 100 : 0,
        feedback: h1Count === 0 ? 'No H1 tags (correct - WordPress handles title)' : `Found ${h1Count} H1 tag(s) - should be removed`,
        fixSuggestion: h1Count > 0 ? 'Remove all H1 tags from content' : undefined
    });
    
    // SEO: Heading Structure
    const h2Count = (html.match(/<h2/gi) || []).length;
    const h3Count = (html.match(/<h3/gi) || []).length;
    results.push({
        agent: 'Heading Structure',
        category: 'seo',
        status: h2Count >= 8 && h3Count >= 5 ? 'passed' : 'warning',
        score: Math.min(100, (h2Count * 8) + (h3Count * 5)),
        feedback: `${h2Count} H2 headings, ${h3Count} H3 headings`,
        fixSuggestion: h2Count < 8 ? 'Add more H2 section headings' : undefined
    });
    
    // SEO: Readability
    const readability = calculateFleschKincaid(html);
    results.push({
        agent: 'Readability',
        category: 'seo',
        status: readability >= 60 ? 'passed' : readability >= 40 ? 'warning' : 'failed',
        score: readability,
        feedback: `Flesch Reading Ease: ${readability}% (target: 60+)`,
        fixSuggestion: readability < 60 ? 'Simplify sentence structure and use shorter words' : undefined
    });
    
    // AEO: FAQ Presence
    const hasFAQ = html.includes('FAQPage') || html.includes('Frequently Asked');
    results.push({
        agent: 'FAQ Section',
        category: 'aeo',
        status: hasFAQ ? 'passed' : 'warning',
        score: hasFAQ ? 100 : 40,
        feedback: hasFAQ ? 'FAQ section with schema detected' : 'No FAQ section found',
        fixSuggestion: !hasFAQ ? 'Add a FAQ section with schema markup' : undefined
    });
    
    // GEO: Schema Markup
    const hasSchema = html.includes('application/ld+json');
    results.push({
        agent: 'Schema Markup',
        category: 'geo',
        status: hasSchema ? 'passed' : 'failed',
        score: hasSchema ? 100 : 0,
        feedback: hasSchema ? 'Structured data detected' : 'No schema markup found',
        fixSuggestion: !hasSchema ? 'Add JSON-LD schema markup' : undefined
    });
    
    // NLP Coverage (if terms provided)
    if (neuronTerms.length > 0) {
        const nlpResult = calculateNLPCoverage(html, neuronTerms);
        results.push({
            agent: 'NLP Coverage',
            category: 'seo',
            status: nlpResult.score >= 70 ? 'passed' : nlpResult.score >= 50 ? 'warning' : 'failed',
            score: nlpResult.score,
            feedback: `${nlpResult.usedTerms}/${nlpResult.totalTerms} terms used (${nlpResult.score}%)`,
            fixSuggestion: nlpResult.score < 70 ? `Add missing terms: ${nlpResult.missingTerms.slice(0, 5).map(t => t.term).join(', ')}` : undefined
        });
    }
    
    return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    UTILS_VERSION,
    calculateFleschKincaid,
    calculateContentDepth,
    calculateHeadingStructure,
    calculateNLPCoverage,
    validateAnchorQuality,
    countWords,
    stripHtml,
    escapeHtml,
    truncate,
    slugify,
    extractExcerpt,
    generateArticleSchema,
    generateFAQSchema,
    generateBreadcrumbSchema,
    runQAValidation
};
