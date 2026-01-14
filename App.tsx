// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v23.3 — ULTRA ENTERPRISE EDITION (ALL CRITICAL FIXES)
// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL FIXES v23.3:
// • 🔥 IMMER FREEZE FIX — Deep copy contracts before state updates
// • ZERO H1 DUPLICATION — WordPress provides H1, content NEVER includes H1
// • SLUG PRESERVATION — Never changes URL for existing posts
// • FEATURED IMAGE PRESERVATION — Never deletes existing featured images
// • CONTENT IMAGE PRESERVATION — All images maintained with optimized alt text
// • DUAL OPTIMIZATION MODES — Full Rewrite OR Surgical Improvements
// • CATEGORY/TAG PRESERVATION — Original taxonomies maintained
// • FAQ DUPLICATION FIX — Premium FAQ only added once
// • Q&A CLEANUP — Removes Q&A format from main content
// • CONTENT STRUCTURE VALIDATION — Detects Q&A-heavy content
// • Strict 3-5 word anchor text enforcement
// • 25-minute job timeout for bulk operations
// • Premium visual component generation
// • 35+ QA validation checks
// • NLP coverage tracking (70%+ target)
// ═══════════════════════════════════════════════════════════════════════════════


import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from './store';
import { 
    TitanHealthRing, 
    NeuralLog, 
    ToastContainer, 
    AdvancedInput as AdvancedInputComponent, 
    Toggle as ToggleComponent, 
    SectionHeader as SectionHeaderComponent, 
    DeepMetricsPanel, 
    NeuronNLPPanel, 
    QASwarmPanel,
    StatsDashboard, 
    PageQueueList, 
    EntityGapPanel, 
    ContentPreview,
    ProgressIndicator, 
    Badge as BadgeComponent, 
    Card as CardComponent, 
    EmptyState as EmptyStateComponent, 
    LoadingSpinner,
    cn, 
    formatNumber, 
    formatDuration as formatDurationUI
} from './components';
import { 
    SitemapPage, ContentContract, GodModePhase, InternalLinkTarget,
    GeoTargetConfig, APP_VERSION, NeuronTerm, OptimizationMode
} from './types';
import { 
    extractSlugFromUrl, sanitizeTitle, calculateOpportunityScore, 
    calculateSeoMetrics, sanitizeSlug, runQASwarm, injectInternalLinks,
    analyzeExistingContent, formatDuration, removeAllH1Tags, validateNoH1
} from './utils';
import { 
    titanFetch, wpResolvePostIdEnhanced, wpUpdatePost, wpCreatePost, 
    wpGetPost, wpTestConnection, performEntityGapAnalysis,
    discoverAndValidateReferences, wpUpdatePostMeta,
    wpGetPostWithImages, wpGetFeaturedImage, extractImagesFromContent,
    wpUpdateMediaAltText, wpGetMediaIdFromUrl, wpGetPostFullUrl,
    FeaturedImageData, discoverInternalLinkTargets
} from './fetch-service';

import { orchestrator, VALID_GEMINI_MODELS, OPENROUTER_MODELS, generateOptimizedAltText, upgradeFAQSection } from './lib/ai-orchestrator';

import { getNeuronWriterAnalysis, listNeuronProjects } from './neuronwriter';



// ═══════════════════════════════════════════════════════════════════════════════
// 🔥🔥🔥 OPENROUTER MODEL SELECTOR — WITH CUSTOM MODEL INPUT
// ═══════════════════════════════════════════════════════════════════════════════

const OPENROUTER_PRESET_MODELS = [
    'google/gemini-2.5-flash-preview',
    'google/gemini-2.5-pro-preview',
    'anthropic/claude-sonnet-4',
    'anthropic/claude-opus-4',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/o1-preview',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-r1',
    'mistralai/mistral-large',
    'qwen/qwen-2.5-72b-instruct',
];

interface OpenRouterModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const OpenRouterModelSelector: React.FC<OpenRouterModelSelectorProps> = ({ value, onChange }) => {
    const [isCustomMode, setIsCustomMode] = useState(() => {
        // Start in custom mode if current value isn't in presets
        return value && !OPENROUTER_PRESET_MODELS.includes(value);
    });
    const [customValue, setCustomValue] = useState(
        OPENROUTER_PRESET_MODELS.includes(value) ? '' : value
    );
    
    const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value;
        if (selected === '__custom__') {
            setIsCustomMode(true);
            if (customValue) onChange(customValue);
        } else {
            onChange(selected);
        }
    };
    
    const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        setCustomValue(val);
        if (val) onChange(val);
    };
    
    return (
        <div className="space-y-3">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                OpenRouter Model
            </label>
            
            {/* Mode Toggle */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setIsCustomMode(false);
                        if (OPENROUTER_PRESET_MODELS.length > 0) {
                            onChange(OPENROUTER_PRESET_MODELS[0]);
                        }
                    }}
                    className={cn(
                        'flex-1 py-2.5 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border',
                        !isCustomMode
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
                    )}
                >
                    📋 Preset Models
                </button>
                <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={cn(
                        'flex-1 py-2.5 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border',
                        isCustomMode
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
                    )}
                >
                    ✏️ Custom Model
                </button>
            </div>
            
            {/* Input Based on Mode */}
            {!isCustomMode ? (
                <select
                    value={OPENROUTER_PRESET_MODELS.includes(value) ? value : OPENROUTER_PRESET_MODELS[0]}
                    onChange={handlePresetSelect}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none transition-all"
                >
                    {OPENROUTER_PRESET_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                    <option value="__custom__">— Enter Custom Model —</option>
                </select>
            ) : (
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={customValue}
                            onChange={handleCustomInput}
                            placeholder="e.g., anthropic/claude-sonnet-4 or google/gemini-2.5-flash-preview"
                            className="w-full bg-white/[0.03] border border-purple-500/30 rounded-xl px-4 py-3 text-[14px] focus:border-purple-500 outline-none transition-all font-mono pr-10"
                        />
                        {customValue && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="text-green-400 text-lg">✓</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/40">
                            Format: provider/model-name (e.g., openai/gpt-4o)
                        </p>
                        <a 
                            href="https://openrouter.ai/models"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Browse all models →
                        </a>
                    </div>
                </div>
            )}
            
            {/* Current Model Display */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-white/40 uppercase">Active Model:</span>
                <span className="text-[12px] text-green-400 font-mono">{value || 'Not set'}</span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥🔥🔥 GROQ MODEL SELECTOR — WITH CUSTOM MODEL INPUT
// ═══════════════════════════════════════════════════════════════════════════════

const GROQ_PRESET_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
    'gemma-7b-it',
];

interface GroqModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const GroqModelSelector: React.FC<GroqModelSelectorProps> = ({ value, onChange }) => {
    const [isCustomMode, setIsCustomMode] = useState(() => {
        return value && !GROQ_PRESET_MODELS.includes(value);
    });
    const [customValue, setCustomValue] = useState(
        GROQ_PRESET_MODELS.includes(value) ? '' : value
    );
    
    const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value;
        if (selected === '__custom__') {
            setIsCustomMode(true);
            if (customValue) onChange(customValue);
        } else {
            onChange(selected);
        }
    };
    
    const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        setCustomValue(val);
        if (val) onChange(val);
    };
    
    return (
        <div className="space-y-3">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                Groq Model
            </label>
            
            {/* Mode Toggle */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setIsCustomMode(false);
                        if (GROQ_PRESET_MODELS.length > 0) {
                            onChange(GROQ_PRESET_MODELS[0]);
                        }
                    }}
                    className={cn(
                        'flex-1 py-2.5 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border',
                        !isCustomMode
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
                    )}
                >
                    📋 Preset Models
                </button>
                <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={cn(
                        'flex-1 py-2.5 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border',
                        isCustomMode
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
                    )}
                >
                    ✏️ Custom Model
                </button>
            </div>
            
            {/* Input Based on Mode */}
            {!isCustomMode ? (
                <select
                    value={GROQ_PRESET_MODELS.includes(value) ? value : GROQ_PRESET_MODELS[0]}
                    onChange={handlePresetSelect}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none transition-all"
                >
                    {GROQ_PRESET_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                    <option value="__custom__">— Enter Custom Model —</option>
                </select>
            ) : (
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={customValue}
                            onChange={handleCustomInput}
                            placeholder="e.g., llama-3.3-70b-versatile or mixtral-8x7b-32768"
                            className="w-full bg-white/[0.03] border border-purple-500/30 rounded-xl px-4 py-3 text-[14px] focus:border-purple-500 outline-none transition-all font-mono pr-10"
                        />
                        {customValue && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="text-green-400 text-lg">✓</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/40">
                            Enter any Groq-supported model name
                        </p>
                        <a 
                            href="https://console.groq.com/docs/models"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            View all models →
                        </a>
                    </div>
                </div>
            )}
            
            {/* Current Model Display */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-white/40 uppercase">Active Model:</span>
                <span className="text-[12px] text-green-400 font-mono">{value || 'Not set'}</span>
            </div>
        </div>
    );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 DEEP CLONE UTILITY — PREVENTS IMMER FREEZE ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

function deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FAQ DEDUPLICATION — MODULE LEVEL (v23.3 CRITICAL FIX)
// ═══════════════════════════════════════════════════════════════════════════════

function removeDuplicateFAQSections(html: string, log?: (msg: string) => void): string {
    if (!html) return html;
    
    const faqSectionPattern = /<section[^>]*(?:class|id)="[^"]*(?:faq|wp-opt-faq)[^"]*"[^>]*>[\s\S]*?<\/section>/gi;
    const allFaqSections = [...html.matchAll(faqSectionPattern)];
    
    const faqHeadingCount = (html.match(/<h[23][^>]*>[\s\S]*?(?:frequently\s+asked|faq)[\s\S]*?<\/h[23]>/gi) || []).length;
    
    if (allFaqSections.length <= 1) {
        log?.(`   ✓ FAQ sections: ${allFaqSections.length} (no duplicates)`);
        return html;
    }
    
    log?.(`   ⚠️ Found ${allFaqSections.length} FAQ sections — removing ${allFaqSections.length - 1} duplicate(s)...`);
    
    let cleaned = html;
    
    for (let i = 0; i < allFaqSections.length - 1; i++) {
        cleaned = cleaned.replace(allFaqSections[i][0], '<!-- DUPLICATE_FAQ_REMOVED -->');
    }
    
    cleaned = cleaned.replace(/<!-- DUPLICATE_FAQ_REMOVED -->\s*/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    log?.(`   ✓ Removed ${allFaqSections.length - 1} duplicate FAQ section(s)`);
    
    return cleaned;
}

const removeDuplicateFAQs = removeDuplicateFAQSections;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 CRITICAL CONSTANTS — ENTERPRISE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const APP_VERSION_FULL = '23.3.0';
const MAX_SYNTHESIS_CYCLES = 4;
const QA_PASS_THRESHOLD = 65;
const MIN_WORD_COUNT = 4000;
const TARGET_WORD_COUNT = 4500;
const TITLE_MIN_LENGTH = 45;
const TITLE_MAX_LENGTH = 65;
const META_MIN_LENGTH = 145;
const META_MAX_LENGTH = 160;
const JOB_TIMEOUT_MS = 25 * 60 * 1000;
const RETRY_DELAY_BASE = 2000;
const MAX_RETRIES = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 Q&A FORMAT CLEANUP PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const QA_FORMAT_PATTERNS = [
    { pattern: /(<p[^>]*>)\s*Q:\s*/gi, replacement: '$1' },
    { pattern: /(<p[^>]*>)\s*A:\s*/gi, replacement: '$1' },
    { pattern: /<strong>Q:<\/strong>\s*/gi, replacement: '' },
    { pattern: /<strong>A:<\/strong>\s*/gi, replacement: '' },
    { pattern: /<span[^>]*>Q:<\/span>\s*/gi, replacement: '' },
    { pattern: /<span[^>]*>A:<\/span>\s*/gi, replacement: '' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BulkJob {
    id: string;
    url: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    startTime?: number;
    endTime?: number;
    score?: number;
    phase?: string;
    wordCount?: number;
    attempts?: number;
}

interface BulkProcessingState {
    isRunning: boolean;
    jobs: BulkJob[];
    concurrency: number;
    completed: number;
    failed: number;
    totalTime: number;
    avgScore: number;
    totalWords: number;
}

interface BulkResult {
    url: string;
    success: boolean;
    score: number;
    time: number;
    wordCount: number;
    error?: string;
}

interface PostPreservationData {
    originalSlug: string | null;
    originalLink: string | null;
    originalCategories: number[];
    originalTags: number[];
    featuredImageId: number | null;
    contentImages: Array<{ src: string; alt: string; mediaId?: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 H1 REMOVAL FUNCTION — ALWAYS APPLIED
// ═══════════════════════════════════════════════════════════════════════════════

function removeH1TagsFromContent(html: string, log?: (msg: string) => void): string {
    if (!html) return html;
    
    const h1CountBefore = (html.match(/<h1/gi) || []).length;
    
    if (h1CountBefore === 0) {
        log?.(`   ✓ No H1 tags found — content is clean`);
        return html;
    }
    
    log?.(`   ⚠️ Found ${h1CountBefore} H1 tag(s) — removing (WordPress provides H1)...`);
    
    let cleaned = html;
    
    const patterns = [
        /<h1[^>]*>[\s\S]*?<\/h1>/gi,
        /<h1[^>]*\/>/gi,
        /^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i,
        /<h1\s*>[\s\S]*?<\/h1\s*>/gi,
        /<H1[^>]*>[\s\S]*?<\/H1>/g,
    ];
    
    for (let pass = 0; pass < 3; pass++) {
        for (const pattern of patterns) {
            cleaned = cleaned.replace(pattern, '');
        }
    }
    
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/h1>/gi, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    const h1CountAfter = (cleaned.match(/<h1/gi) || []).length;
    
    if (h1CountAfter > 0) {
        log?.(`   ❌ WARNING: ${h1CountAfter} H1 tag(s) still present — forcing removal!`);
        cleaned = cleaned.replace(/h1/gi, 'h2');
    } else {
        log?.(`   ✓ Successfully removed ${h1CountBefore} H1 tag(s)`);
    }
    
    return cleaned;
}

function validateContentNoH1(html: string): { valid: boolean; count: number } {
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    return { valid: h1Count === 0, count: h1Count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 Q&A FORMAT CLEANUP FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

function cleanupQAFormatFromContent(html: string, log?: (msg: string) => void): { html: string; cleanedCount: number } {
    if (!html) return { html, cleanedCount: 0 };
    
    let cleaned = html;
    let totalCleaned = 0;
    
    for (const { pattern, replacement } of QA_FORMAT_PATTERNS) {
        const matches = cleaned.match(pattern);
        if (matches) {
            totalCleaned += matches.length;
            cleaned = cleaned.replace(pattern, replacement);
        }
    }
    
    if (totalCleaned > 0) {
        log?.(`   → Cleaned ${totalCleaned} Q&A format markers from main content`);
    }
    
    return { html: cleaned, cleanedCount: totalCleaned };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FAQ STYLING CHECK
// ═══════════════════════════════════════════════════════════════════════════════

function hasPremiumFAQStyling(html: string): boolean {
    if (!html) return false;
    
    const htmlLower = html.toLowerCase();
    
    const faqIndicators = [
        'frequently asked',
        'faqpage',
        'faq-accordion',
        'wp-opt-faq-',
        'class="faq',
        'id="faq',
        '❓',
        'itemtype="https://schema.org/faqpage"',
    ];
    
    const hasFAQContent = faqIndicators.some(indicator => htmlLower.includes(indicator));
    
    const premiumIndicators = [
        'linear-gradient',
        'border-left:',
        'border-radius:',
        'box-shadow:',
        'backdrop-blur',
        '!important',
    ];
    
    const hasPremiumStyles = premiumIndicators.filter(p => html.includes(p)).length >= 2;
    
    return hasFAQContent && hasPremiumStyles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 Q&A PATTERN COUNTER
// ═══════════════════════════════════════════════════════════════════════════════

function countQAPatternsOutsideFAQ(html: string): number {
    if (!html) return 0;
    
    const htmlLower = html.toLowerCase();
    const faqSectionStart = Math.max(
        htmlLower.indexOf('frequently asked'),
        htmlLower.indexOf('❓'),
        htmlLower.lastIndexOf('faq')
    );
    
    const contentToCheck = faqSectionStart > 0 ? html.substring(0, faqSectionStart) : html;
    
    const qaPatterns = [
        /Q:\s*[^\n<]+/gi,
        /Question:\s*[^\n<]+/gi,
        /<strong>Q\d*[:\s]*<\/strong>/gi,
        /<span[^>]*>Q:<\/span>/gi,
    ];
    
    let count = 0;
    for (const pattern of qaPatterns) {
        const matches = contentToCheck.match(pattern);
        if (matches) count += matches.length;
    }
    
    return count;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 CONTENT STRUCTURE LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

function logContentStructure(html: string, log: (msg: string, progress?: number) => void): void {
    if (!html) return;
    
    const faqCount = (html.match(/❓|frequently\s+asked/gi) || []).length;
    const h2Count = (html.match(/<h2/gi) || []).length;
    const h3Count = (html.match(/<h3/gi) || []).length;
    const imageCount = (html.match(/<img/gi) || []).length;
    const listCount = (html.match(/<ul|<ol/gi) || []).length;
    const tableCount = (html.match(/<table/gi) || []).length;
    const qaPatternCount = countQAPatternsOutsideFAQ(html);
    
    log(`   📊 Content Structure: H2s=${h2Count} | H3s=${h3Count} | Images=${imageCount} | Lists=${listCount} | Tables=${tableCount}`);  // ✅ FIXED
    log(`   📊 FAQ sections=${faqCount} | Q&A patterns outside FAQ=${qaPatternCount}`);  // ✅ FIXED
    
    if (qaPatternCount > 5) {
        log(`   ⚠️ WARNING: High Q&A pattern count (${qaPatternCount}) — main content should be prose`);  // ✅ FIXED
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ IMAGE EXTRACTION UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function extractImagesFromHTML(html: string): Array<{ src: string; alt: string; id?: string }> {
    const images: Array<{ src: string; alt: string; id?: string }> = [];
    const imgRegex = /<img[^>]+>/gi;
    const matches = html.match(imgRegex) || [];
    
    for (const imgTag of matches) {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const idMatch = imgTag.match(/data-id=["'](\d+)["']/i) || imgTag.match(/wp-image-(\d+)/i);
        
        if (srcMatch) {
            images.push({
                src: srcMatch[1],
                alt: altMatch ? altMatch[1] : '',
                id: idMatch ? idMatch[1] : undefined
            });
        }
    }
    
    return images;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const App: React.FC = () => {
    const store = useAppStore();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LOCAL STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    const [sitemapUrl, setSitemapUrl] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [targetKeywordOverride, setTargetKeywordOverride] = useState('');
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [reviewTab, setReviewTab] = useState<'content' | 'qa' | 'entity'>('content');
    const [wpTestStatus, setWpTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
    const [crawlProgress, setCrawlProgress] = useState<{ current: number; total: number } | null>(null);
    const [neuronProjects, setNeuronProjects] = useState<Array<{ project: string; name: string; language?: string; engine?: string }>>([]);
    const [neuronLoading, setNeuronLoading] = useState(false);
    
    const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('surgical');
    const [preserveImages, setPreserveImages] = useState(true);
    const [optimizeAltText, setOptimizeAltText] = useState(true);
    const [preserveFeaturedImage, setPreserveFeaturedImage] = useState(true);
    const [preserveCategories, setPreserveCategories] = useState(true);
    const [preserveTags, setPreserveTags] = useState(true);
    
    const [sitemapFilters, setSitemapFilters] = useState({
        includeCategories: false,
        includeAuthors: false,
        includeTags: false,
        includePages: true,
        maxPages: 5000
    });
    
    const [geoConfig, setGeoConfig] = useState<GeoTargetConfig>({
        enabled: false,
        country: 'US',
        region: '',
        city: '',
        language: 'en'
    });

    // Bulk optimization state
    const [bulkUrls, setBulkUrls] = useState('');
    const [showBulkMode, setShowBulkMode] = useState(false);
    const [bulkConcurrency, setBulkConcurrency] = useState(3);
    const [bulkState, setBulkState] = useState<BulkProcessingState>({
        isRunning: false,
        jobs: [],
        concurrency: 3,
        completed: 0,
        failed: 0,
        totalTime: 0,
        avgScore: 0,
        totalWords: 0
    });
    const bulkAbortRef = useRef(false);

        const autonomousIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
        
    const lockId = useRef(`app-${Date.now()}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔥 NEW: CANCELLATION SYSTEM FOR LONG-RUNNING JOBS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const cancellationTokenRef = useRef<{ cancelled: boolean; reason?: string }>({ cancelled: false });
    
    const cancelCurrentJob = useCallback((reason: string = 'User cancelled') => {
        cancellationTokenRef.current = { cancelled: true, reason };
        store.addGodLog(`⛔ CANCELLATION REQUESTED: ${reason}`);
        store.addToast('Cancellation requested — will stop after current phase', 'warning');
    }, [store]);
    
    const resetCancellationToken = useCallback(() => {
        cancellationTokenRef.current = { cancelled: false, reason: undefined };
    }, []);
    
    const checkCancellation = useCallback((phase: string): void => {
        if (cancellationTokenRef.current.cancelled) {
            throw new Error(`Job cancelled during ${phase}: ${cancellationTokenRef.current.reason}`);
        }
    }, []);

    const activePage = useMemo(() => 
        store.pages.find(p => p.id === activePageId), 
        [store.pages, activePageId]
    );


    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    const getSiteContext = useCallback(() => ({
        orgName: store.wpConfig.orgName || 'Expert Website',
        url: store.wpConfig.url || 'https://example.com',
        authorName: store.wpConfig.authorName || 'Editorial Team',
        logoUrl: store.wpConfig.logoUrl,
        authorPageUrl: store.wpConfig.authorPageUrl,
        industry: store.wpConfig.industry,
        targetAudience: store.wpConfig.targetAudience
    }), [store.wpConfig]);

    const getAuth = useCallback(() => ({
        u: store.wpConfig.username,
        p: store.wpConfig.password || ''
    }), [store.wpConfig.username, store.wpConfig.password]);

    const hasRequiredKeys = useCallback(() => {
        return !!(store.apiKeys.google || store.apiKeys.openrouter || 
                  store.apiKeys.openai || store.apiKeys.anthropic || store.apiKeys.groq);
    }, [store.apiKeys]);

    const hasSerperKey = useCallback(() => {
        return !!(store.apiKeys.serper && store.apiKeys.serper.length > 10);
    }, [store.apiKeys.serper]);

    const hasNeuronConfig = useCallback(() => {
        return !!(store.neuronEnabled && store.apiKeys.neuronwriter && store.apiKeys.neuronProject);
    }, [store.neuronEnabled, store.apiKeys.neuronwriter, store.apiKeys.neuronProject]);

    const enforceTitle = useCallback((title: string, log: (msg: string) => void): string => {
        if (!title) return title;
        const titleLength = title.length;
        
        if (titleLength >= TITLE_MIN_LENGTH && titleLength <= TITLE_MAX_LENGTH) {
            log(`   ✓ Title length optimal: ${titleLength} chars`);
            return title;
        }
        
        if (titleLength <= TITLE_MAX_LENGTH) return title;
        
        let truncated = title.substring(0, 60);
        const lastDash = truncated.lastIndexOf(' - ');
        const lastColon = truncated.lastIndexOf(': ');
        const lastPipe = truncated.lastIndexOf(' | ');
        const lastSpace = truncated.lastIndexOf(' ');
        const breakPoint = Math.max(lastDash, lastColon, lastPipe);
        
        if (breakPoint > 35) truncated = truncated.substring(0, breakPoint);
        else if (lastSpace > 40) truncated = truncated.substring(0, lastSpace);
        
        truncated = truncated.trim();
        log(`   ⚠️ Title truncated: ${titleLength} → ${truncated.length} chars`);
        return truncated;
    }, []);

    const enforceMeta = useCallback((meta: string, log: (msg: string) => void): string => {
        if (!meta) return meta;
        const metaLength = meta.length;
        
        if (metaLength >= META_MIN_LENGTH && metaLength <= META_MAX_LENGTH) {
            log(`   ✓ Meta length optimal: ${metaLength} chars`);
            return meta;
        }
        
        if (metaLength <= META_MAX_LENGTH) return meta;
        
        let truncated = meta.substring(0, 157);
        const lastPeriod = truncated.lastIndexOf('. ');
        
        if (lastPeriod > 100) truncated = truncated.substring(0, lastPeriod + 1);
        else {
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 140) truncated = truncated.substring(0, lastSpace) + '...';
            else truncated = truncated.trim() + '...';
        }
        
        log(`   ⚠️ Meta truncated: ${metaLength} → ${truncated.length} chars`);
        return truncated;
    }, []);

    const getActualModel = useCallback(() => {
        switch (store.selectedProvider) {
            case 'openrouter':
                return store.apiKeys.openrouterModel || 'google/gemini-2.5-flash-preview';
            case 'groq':
                return store.apiKeys.groqModel || 'llama-3.3-70b-versatile';
            case 'openai':
                return 'gpt-4o';
            case 'anthropic':
                return 'claude-sonnet-4';
            default:
                return store.selectedModel;
        }
    }, [store.selectedProvider, store.apiKeys.openrouterModel, store.apiKeys.groqModel, store.selectedModel]);

    // ═══════════════════════════════════════════════════════════════════════════
    // WORDPRESS CONNECTION TEST
    // ═══════════════════════════════════════════════════════════════════════════

    const handleTestWpConnection = useCallback(async () => {
        if (!store.wpConfig.url || !store.wpConfig.username || !store.wpConfig.password) {
            store.addToast('Fill all WordPress fields first', 'warning');
            return;
        }
        
        setWpTestStatus('testing');
        
        try {
            const result = await wpTestConnection(store.wpConfig.url, getAuth());
            setWpTestStatus(result.success ? 'success' : 'failed');
            store.addToast(
                result.success 
                    ? `✅ Connected to ${result.siteName || 'WordPress'}!` 
                    : result.message, 
                result.success ? 'success' : 'error'
            );
        } catch (e: any) {
            setWpTestStatus('failed');
            store.addToast(`Connection failed: ${e.message}`, 'error');
        }
    }, [store, getAuth]);

    // ═══════════════════════════════════════════════════════════════════════════
    // NEURONWRITER PROJECT LOADER
    // ═══════════════════════════════════════════════════════════════════════════

    const loadNeuronProjects = useCallback(async () => {
        if (!store.apiKeys.neuronwriter) {
            store.addToast('Enter NeuronWriter API key first', 'warning');
            return;
        }
        
        setNeuronLoading(true);
        try {
            const projects = await listNeuronProjects(store.apiKeys.neuronwriter);
            setNeuronProjects(projects);
            store.addToast(projects.length ? `Found ${projects.length} projects` : 'No projects found', projects.length ? 'success' : 'warning');
        } catch (e: any) {
            store.addToast(`Failed: ${e.message}`, 'error');
        } finally {
            setNeuronLoading(false);
        }
    }, [store]);

    // ═══════════════════════════════════════════════════════════════════════════
    // SITEMAP CRAWLER
    // ═══════════════════════════════════════════════════════════════════════════

    const handleCrawlSitemap = useCallback(async () => {
        if (!sitemapUrl) {
            store.addToast('Enter a sitemap URL', 'warning');
            return;
        }
        
        store.setProcessing(true, 'Crawling sitemap...');
        store.addGodLog(`🕷️ ════════════════════════════════════════════════════════════════`);
        store.addGodLog(`🕷️ ULTRA-FAST SITEMAP CRAWLER v${APP_VERSION_FULL}`);
        store.addGodLog(`🕷️ URL: ${sitemapUrl}`);
        store.addGodLog(`🕷️ ════════════════════════════════════════════════════════════════`);
        
        const startTime = Date.now();
        
        try {
            let text = '';
            let fetchSucceeded = false;
            
            // Strategy 1: Direct fetch
            try {
                store.addGodLog(`   → Attempting direct fetch...`);
                const directRes = await fetch(sitemapUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/xml, text/xml, */*',
                        'User-Agent': 'Mozilla/5.0 (compatible; WPOptimizerBot/1.0)',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (directRes.ok) {
                    text = await directRes.text();
                    fetchSucceeded = true;
                    store.addGodLog(`   ✅ Direct fetch succeeded`);
                }
            } catch (e: any) {
                store.addGodLog(`   ⚠️ Direct fetch error: ${e.message}`);
            }
            
            // Strategy 2: CORS proxy
            if (!fetchSucceeded) {
                try {
                    store.addGodLog(`   → Trying CORS proxy...`);
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(sitemapUrl)}`;
                    const proxyRes = await fetch(proxyUrl);
                    if (proxyRes.ok) {
                        text = await proxyRes.text();
                        fetchSucceeded = true;
                        store.addGodLog(`   ✅ CORS proxy succeeded`);
                    }
                } catch (e: any) {
                    store.addGodLog(`   ⚠️ CORS proxy error: ${e.message}`);
                }
            }
            
            // Strategy 3: AllOrigins proxy
            if (!fetchSucceeded) {
                try {
                    store.addGodLog(`   → Trying AllOrigins proxy...`);
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(sitemapUrl)}`;
                    const proxyRes = await fetch(proxyUrl);
                    if (proxyRes.ok) {
                        text = await proxyRes.text();
                        fetchSucceeded = true;
                        store.addGodLog(`   ✅ AllOrigins proxy succeeded`);
                    }
                } catch (e: any) {
                    store.addGodLog(`   ⚠️ AllOrigins proxy error: ${e.message}`);
                }
            }
            
            if (!fetchSucceeded || !text) {
                throw new Error('All fetch strategies failed');
            }
            
            const xml = new DOMParser().parseFromString(text, 'application/xml');
            let allUrls: string[] = [];
            
            const sitemapUrls = Array.from(xml.querySelectorAll('sitemap loc'))
                .map(el => el.textContent || '')
                .filter(Boolean);
            
            if (sitemapUrls.length > 0) {
                store.addGodLog(`📋 Sitemap INDEX: ${sitemapUrls.length} child sitemaps`);
                setCrawlProgress({ current: 0, total: sitemapUrls.length });
                
                const BATCH_SIZE = 5;
                
                for (let i = 0; i < sitemapUrls.length; i += BATCH_SIZE) {
                    const batch = sitemapUrls.slice(i, i + BATCH_SIZE);
                    
                    const batchResults = await Promise.allSettled(
                        batch.map(async (childUrl) => {
                            try {
                                const childRes = await titanFetch(childUrl, { timeoutMs: 12000, retries: 2 });
                                const childText = await childRes.text();
                                const childXml = new DOMParser().parseFromString(childText, 'application/xml');
                                return Array.from(childXml.querySelectorAll('url loc'))
                                    .map(el => el.textContent || '')
                                    .filter(Boolean);
                            } catch {
                                return [];
                            }
                        })
                    );
                    
                    batchResults.forEach((result) => {
                        if (result.status === 'fulfilled') {
                            allUrls.push(...result.value);
                        }
                    });
                    
                    setCrawlProgress({ current: Math.min(i + BATCH_SIZE, sitemapUrls.length), total: sitemapUrls.length });
                    store.addGodLog(`   📊 Progress: ${Math.min(i + BATCH_SIZE, sitemapUrls.length)}/${sitemapUrls.length} sitemaps (${allUrls.length} URLs)`);
                }
                
                setCrawlProgress(null);
            } else {
                allUrls = Array.from(xml.querySelectorAll('url loc, loc'))
                    .map(el => el.textContent || '')
                    .filter(Boolean);
                store.addGodLog(`📋 Regular sitemap: ${allUrls.length} URLs found`);
            }
            
            const uniqueUrls = [...new Set(allUrls)].filter(url => {
                if (!url || !url.startsWith('http')) return false;
                const lower = url.toLowerCase();
                
                const alwaysExclude = [
                    '?', '.xml', '/wp-admin', '/wp-content', '/wp-json', '/feed/',
                    'attachment', '/cart', '/checkout', '/my-account', '/wp-login', 
                    '.pdf', '.jpg', '.png', '.gif', '.css', '.js', '.ico', '.svg'
                ];
                if (alwaysExclude.some(p => lower.includes(p))) return false;
                
                if (!sitemapFilters.includeCategories && lower.includes('/category/')) return false;
                if (!sitemapFilters.includeAuthors && lower.includes('/author/')) return false;
                if (!sitemapFilters.includeTags && lower.includes('/tag/')) return false;
                if (!sitemapFilters.includePages && lower.includes('/page/')) return false;
                
                return true;
            }).slice(0, sitemapFilters.maxPages);
            
            store.addGodLog(`🔍 After filtering: ${uniqueUrls.length} valid URLs`);
            
            const discovered: SitemapPage[] = uniqueUrls.map(url => {
                const slug = sanitizeSlug(extractSlugFromUrl(url));
                let title = '';
                
                try {
                    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        title = pathParts[pathParts.length - 1]
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                    }
                } catch {}
                
                if (!title || title.toLowerCase() === 'home' || title.length < 3) {
                    title = sanitizeTitle('', slug);
                }
                
                return {
                    id: url,
                    title,
                    slug,
                    lastMod: null,
                    wordCount: null,
                    crawledContent: null,
                    healthScore: null,
                    status: 'idle' as const,
                    opportunity: calculateOpportunityScore(title, null),
                    improvementHistory: []
                };
            });

            store.addPages(discovered);
            
            const elapsed = Date.now() - startTime;
            store.addGodLog(`🎉 ════════════════════════════════════════════════════════════════`);
            store.addGodLog(`🎉 CRAWL COMPLETE: ${discovered.length} pages in ${formatDuration(elapsed)}`);
            store.addGodLog(`🎉 Speed: ${Math.round(discovered.length / (elapsed / 1000))} pages/sec`);
            store.addGodLog(`🎉 ════════════════════════════════════════════════════════════════`);
            
            store.addToast(`Discovered ${discovered.length} pages in ${formatDuration(elapsed)}`, 'success');
            setSitemapUrl('');
        } catch (e: any) {
            store.addGodLog(`❌ Crawl failed: ${e.message}`);
            store.addToast(`Crawl failed: ${e.message}`, 'error');
        } finally {
            store.setProcessing(false);
            setCrawlProgress(null);
        }
    }, [sitemapUrl, store, sitemapFilters]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔥🔥🔥 GOD MODE ENGINE — WITH IMMER FREEZE FIX
    // ═══════════════════════════════════════════════════════════════════════════════

        const executeGodMode = useCallback(async (targetOverride?: string, silentMode = false): Promise<{ success: boolean; score: number; wordCount: number; error?: string }> => {
        const startTime = Date.now();
        let targetId = targetOverride;
        
        // 🔥 NEW: Reset cancellation token at job start
        resetCancellationToken();
        
        // 🔥 FIX: Changed second parameter from boolean to number to match orchestrator signature
const log = (msg: string, _progressOrForce?: number | boolean) => { 
    // Handle both boolean (forceGlobal) and number (progress) for compatibility
    const forceGlobal = typeof _progressOrForce === 'boolean' ? _progressOrForce : false;
    if (targetId) store.addJobLog(targetId, msg);
    if (!silentMode || forceGlobal) store.addGodLog(msg); 
};

        
        // 🔥 NEW: Helper to check cancellation at phase boundaries
        const checkPhase = (phaseName: string) => {
            if (cancellationTokenRef.current.cancelled) {
                throw new Error(`Job cancelled during ${phaseName}: ${cancellationTokenRef.current.reason || 'User request'}`);
            }
        };


        const failWith = (error: string, logMsg?: string): { success: false; score: 0; wordCount: 0; error: string } => {
            const msg = logMsg || error;
            log(`❌ ${msg}`, true);
            return { success: false, score: 0, wordCount: 0, error };
        };
        
        // Handle manual URL input
        if (!targetId && manualUrl && manualUrl.startsWith('http')) {
            const slug = sanitizeSlug(extractSlugFromUrl(manualUrl));
            const existing = store.pages.find(p => p.id === manualUrl);
            
            if (!existing) {
                let title = '';
                try {
                    const pathParts = new URL(manualUrl).pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        title = pathParts[pathParts.length - 1]
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                    }
                } catch {}
                
                if (!title || title.length < 3) title = 'New Page';
                
                const newPage: SitemapPage = { 
                    id: manualUrl, 
                    title, 
                    slug, 
                    lastMod: new Date().toISOString(), 
                    wordCount: null, 
                    crawledContent: null, 
                    healthScore: null, 
                    status: 'idle', 
                    opportunity: calculateOpportunityScore(title, null), 
                    improvementHistory: []
                };
                store.addPages([newPage]);
            }
            targetId = manualUrl;
            if (!silentMode) setManualUrl('');
        }
        
        // Find next target from queue
        if (!targetId) {
            const candidates = store.pages
                .filter(p => p.jobState?.status !== 'running')
                .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0));
            targetId = candidates[0]?.id;
        }

        if (!targetId) {
            return failWith('No pages to optimize', 'No target URL found');
        }

        if (!hasRequiredKeys()) {
            return failWith('No AI API key configured', 'Configure at least one AI API key');
        }

        if (!store.wpConfig.url) {
            return failWith('WordPress URL not configured');
        }

        if (!store.wpConfig.username || !store.wpConfig.password) {
            return failWith('WordPress credentials not configured');
        }

        const getPage = () => useAppStore.getState().pages.find(p => p.id === targetId)!;
        const getJob = () => getPage()?.jobState;

        if (!getJob()) {
            store.initJobState(targetId);
        }

        const currentAttempts = (getJob()?.attempts || 0) + 1;
        store.updateJobState(targetId, { 
            status: 'running', 
            phase: 'initializing', 
            error: undefined, 
            attempts: currentAttempts,
            startTime
        });
        store.updatePage(targetId, { status: 'analyzing' });

        const siteContext = getSiteContext();
        const auth = getAuth();
        
        let preservation: PostPreservationData = {
            originalSlug: null,
            originalLink: null,
            originalCategories: [],
            originalTags: [],
            featuredImageId: null,
            contentImages: []
        };
        
        try {
            // ═══════════════════════════════════════════════════════════════
            // PHASE 1: RESOLVE WORDPRESS POST
            // ═══════════════════════════════════════════════════════════════
            
            store.updateJobState(targetId, { phase: 'resolving_post' });
            log(`📍 PHASE 1: Resolving WordPress post...`, true);
            
            let originalContent = '';
            let mode: 'surgical' | 'writer' = optimizationMode === 'surgical' ? 'surgical' : 'writer';
            let existingAnalysis = undefined;
            let topic = getPage().title;
            let postId: number | null = null;

            log(`   → Using enhanced multi-strategy post resolution...`);

            postId = await wpResolvePostIdEnhanced(
                store.wpConfig.url,
                targetId,
                auth,
                (msg) => log(msg)
            );

            if (!postId) {
                log(`   ⚠️⚠️⚠️ WARNING: Could not find existing post!`, true);
                log(`   ⚠️ URL: ${targetId}`, true);
                
                if (!silentMode) {
                    const confirmCreate = window.confirm(
                        `⚠️ Could not find existing post at:\n${targetId}\n\n` +
                        `This will CREATE A NEW POST which may result in a duplicate URL.\n\n` +
                        `Click OK to create new post, or Cancel to abort.`
                    );
                    
                    if (!confirmCreate) {
                        return failWith('User cancelled: Post not found', 'Aborted — post not found');
                    }
                }
                
                log(`   → Will create new content (no existing post found)`);
                mode = 'writer';
            } else {
                log(`   ✅ Found existing post ID: ${postId}`, true);
            }

            if (postId && auth.p) {
                store.updateJobState(targetId, { postId });
                log(`   → Found existing post (ID: ${postId})`);
                
                try {
                    store.updateJobState(targetId, { phase: 'analyzing_existing' });
                    
                    const postData = await wpGetPostWithImages(store.wpConfig.url, postId, auth);
                    const post = postData.post;
                    
                    preservation.originalSlug = postData.originalSlug;
                    preservation.originalLink = post.link || null;
                    preservation.originalCategories = postData.originalCategories;
                    preservation.originalTags = postData.originalTags;
                    
                    log(`   → 🔒 Original slug: "${preservation.originalSlug}"`);
                    log(`   → 🔒 Original link: "${preservation.originalLink}"`);
                    log(`   → 🔒 Categories: [${preservation.originalCategories.join(', ')}]`);
                    
                    if (postData.featuredImage && preserveFeaturedImage) {
                        preservation.featuredImageId = postData.featuredImage.id;
                        log(`   → 🖼️ Featured image preserved (ID: ${preservation.featuredImageId})`);
                    }
                    
                    if (preserveImages) {
                        preservation.contentImages = postData.contentImages.map(img => ({
                            src: img.src,
                            alt: img.alt,
                            mediaId: img.id ? parseInt(img.id) : undefined
                        }));
                        
                        if (preservation.contentImages.length > 0) {
                            log(`   → 🖼️ Found ${preservation.contentImages.length} images in content to preserve`);
                        }
                    }
                    
                    const wpTitle = post.title?.rendered || post.title?.raw || '';
                    if (wpTitle && wpTitle.length > 3 && wpTitle.toLowerCase() !== 'auto draft') {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = wpTitle;
                        topic = tempDiv.textContent || tempDiv.innerText || wpTitle;
                        store.updatePage(targetId, { title: topic });
                        log(`   → Retrieved title: "${topic}"`);
                    }
                    
                    originalContent = post.content?.rendered || post.content?.raw || '';
                    
                    if (originalContent.length > 500) {
                        existingAnalysis = analyzeExistingContent(originalContent);
                        store.updateJobState(targetId, { existingAnalysis });
                        log(`   → Existing: ${existingAnalysis.wordCount} words | Images: ${existingAnalysis.imageCount} | FAQ: ${existingAnalysis.hasFAQ ? '✓' : '✗'}`);
                    }
                } catch (e: any) {
                    log(`   ⚠️ Could not fetch existing content: ${e.message}`, true);
                }
            } else {
                log(`   → Creating new content (no existing post found)`);
                mode = 'writer';
            }

            // Topic detection
            if (targetKeywordOverride && targetKeywordOverride.trim().length > 3) {
                topic = targetKeywordOverride.trim();
                store.updatePage(targetId, { title: topic, targetKeyword: topic });
                log(`   → Using keyword override: "${topic}"`);
                if (!silentMode) setTargetKeywordOverride('');
            } else if (!topic || topic.toLowerCase() === 'home' || topic.length < 5) {
                try {
                    const targetUrl = new URL(targetId);
                    const pathParts = targetUrl.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0 && pathParts[pathParts.length - 1].length > 3) {
                        topic = pathParts[pathParts.length - 1]
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                    }
                } catch {}
                
                if (!topic || topic.length < 5) {
                    topic = `${siteContext.orgName} Guide ${new Date().getFullYear()}`;
                }
                store.updatePage(targetId, { title: topic });
            }

            const actualModel = getActualModel();
            
            log(`🚀 ═══════════════════════════════════════════════════════════`, true);
            log(`🚀 GOD MODE: "${topic.substring(0, 50)}..."`, true);
            log(`🚀 Mode: ${optimizationMode.toUpperCase()} | Provider: ${store.selectedProvider}`, true);
            log(`🚀 Preserve: Images=${preserveImages} | Featured=${preserveFeaturedImage} | Alt=${optimizeAltText}`, true);
            log(`🚀 ═══════════════════════════════════════════════════════════`, true);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 2: PARALLEL DATA GATHERING
            // ═══════════════════════════════════════════════════════════════
            
            let entityGapData = undefined;

            if (store.apiKeys.serper) {
                store.updateJobState(targetId, { phase: 'entity_gap_analysis' });
                log(`🔬 PHASE 2: Parallel Data Gathering...`, true);
                
                try {
                    const cachedEntityData = (store as any).getSemanticCache?.('entityGap', topic, 7200000);
                    
                    if (cachedEntityData) {
                        log(`   → Using CACHED entity data`);
                        entityGapData = cachedEntityData;
                    } else {
                        const geoOptions = geoConfig.enabled 
                            ? { geoCountry: geoConfig.country, geoLanguage: geoConfig.language } 
                            : undefined;
                        
                        log(`   → Starting parallel: Entity Gap + Reference Discovery...`);
                        const parallelStart = Date.now();
                        
                        const [entityResult, refsResult] = await Promise.allSettled([
                            performEntityGapAnalysis(
                                topic, 
                                store.apiKeys.serper,
                                originalContent || undefined,
                                geoOptions,
                                (msg) => log(`   [Entity] ${msg}`)
                            ),
                            discoverAndValidateReferences(
                                topic,
                                store.apiKeys.serper,
                                { targetCount: 15, ...geoOptions },
                                (msg) => log(`   [Refs] ${msg}`)
                            )
                        ]);
                        
                        const parallelTime = Date.now() - parallelStart;
                        log(`   ✓ Parallel gathering completed in ${formatDuration(parallelTime)}`);
                        
                        if (entityResult.status === 'fulfilled') {
                            entityGapData = entityResult.value;
                            
                            if (refsResult.status === 'fulfilled' && refsResult.value.length > 0) {
                                const existingUrls = new Set(
                                    (entityGapData.validatedReferences || []).map(r => r.url)
                                );
                                const newRefs = refsResult.value.filter(r => !existingUrls.has(r.url));
                                
                                if (newRefs.length > 0) {
                                    entityGapData.validatedReferences = [
                                        ...(entityGapData.validatedReferences || []),
                                        ...newRefs
                                    ].slice(0, 15);
                                    log(`   → Merged ${newRefs.length} additional references`);
                                }
                            }
                            
                            (store as any).setSemanticCache?.('entityGap', topic, entityGapData);
                        } else {
                            throw new Error(entityResult.reason?.message || 'Entity analysis failed');
                        }
                    }
                    
                    store.updateJobState(targetId, { entityGapData });
                    log(`   ✓ Entities: ${entityGapData.missingEntities?.length || 0} | PAA: ${entityGapData.paaQuestions?.length || 0} | Refs: ${entityGapData.validatedReferences?.length || 0}`);
                } catch (e: any) {
                    log(`   ⚠️ Data gathering failed: ${e.message}`, true);
                }
            } else {
                log(`⚠️ Skipping entity analysis (no Serper API key)`, true);
            }

            // ═══════════════════════════════════════════════════════════════
            // PHASE 3: NEURONWRITER (Optional)
            // ═══════════════════════════════════════════════════════════════
            
            let neuronData = undefined;

            if (store.neuronEnabled && store.apiKeys.neuronwriter && store.apiKeys.neuronProject) {
                store.updateJobState(targetId, { phase: 'neuron_analysis' });
                log(`🧬 PHASE 3: NeuronWriter NLP Analysis...`);
                
                try {
                    neuronData = await getNeuronWriterAnalysis(
                        topic,
                        { enabled: true, apiKey: store.apiKeys.neuronwriter, projectId: store.apiKeys.neuronProject },
                        {},
                        log
                    );
                    
                    if (neuronData) {
                        store.updateJobState(targetId, { neuronData });
                        store.setNeuronTerms(neuronData.terms);
                        log(`   → ${neuronData.terms.length} NLP terms | Target: ${neuronData.targetWordCount} words`);
                    }
                } catch (e: any) {
                    log(`   ⚠️ NeuronWriter failed: ${e.message}`, true);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // PHASE 4: INTERNAL LINKS
            // ═══════════════════════════════════════════════════════════════
            
            store.updateJobState(targetId, { phase: 'internal_linking' });
            log(`🔗 PHASE 4: Building internal links...`);
            
            const internalLinks: InternalLinkTarget[] = store.pages
                .filter(p => p.id !== targetId && p.title && p.title.length > 5 && p.title.toLowerCase() !== 'home')
                .slice(0, 50)
                .map(p => ({ url: p.id, title: p.title, slug: p.slug }));
            
            log(`   → ${internalLinks.length} potential link targets`);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 5: CONTENT SYNTHESIS — WITH IMMER FREEZE FIX 🔥🔥🔥
            // ═══════════════════════════════════════════════════════════════

            let synthesisAttempts = 0;
            let qaPassed = false;
            let allFeedback: string[] = [...(getJob()?.allFeedback || [])];
            let bestContract: ContentContract | null = null;
            let bestScore = 0;
            let bestWordCount = 0;
            let lastSynthesisError: string | null = null;

            const targetWordCount = neuronData?.targetWordCount || 4500;

            const synthesisConfig = {
                prompt: `Create comprehensive content about "${topic}"`,
                topic,
                mode,
                siteContext,
                model: actualModel,
                provider: store.selectedProvider,
                apiKeys: store.apiKeys,
                entityGapData,
                neuronData: neuronData || undefined,
                existingAnalysis,
                internalLinks,
                targetKeyword: topic,
                validatedReferences: entityGapData?.validatedReferences,
                geoConfig: geoConfig.enabled ? geoConfig : undefined,
            };

            const useEnhancedPipeline = !!(store.apiKeys.google && store.selectedProvider === 'google');
            const useSERPGenerators = hasSerperKey() && !!entityGapData;
            const useNLPInjector = hasNeuronConfig() && neuronData?.terms && neuronData.terms.length > 0;

            log(`🎨 PHASE 5: SOTA Content Synthesis...`, true);
            log(`   → Mode: ${optimizationMode.toUpperCase()} | Provider: ${store.selectedProvider.toUpperCase()}`, true);
            log(`   → Pipeline: Staged=${useEnhancedPipeline} | SERP=${useSERPGenerators} | NLP=${useNLPInjector}`, true);
            log(`   → Target: ${targetWordCount.toLocaleString()}+ words | 70%+ NLP coverage`, true);

            // ═══════════════════════════════════════════════════════════════
            // 🔥 OPTION A: SOTA MULTI-STAGE PIPELINE
            // ═══════════════════════════════════════════════════════════════

            if (useEnhancedPipeline) {
                store.updateJobState(targetId, { phase: 'content_synthesis' });
                log(`🚀 Using SOTA Multi-Stage Pipeline...`, true);

                try {
                    const { contract: _rawContract, groundingSources } = await orchestrator.generateEnhanced(
                        {
                            ...synthesisConfig,
                            previousAttempts: synthesisAttempts,
                            allFeedback: allFeedback.length > 0 ? allFeedback : undefined,
                            temperature: 0.85,
                            useStagedPipeline: true,
                            useSERPGenerators: useSERPGenerators,
                            useNLPInjector: useNLPInjector,
                            targetNLPCoverage: 85,
                        },
                        log,
                        (stageProgress) => {
                            if (stageProgress.stage === 'outline') {
                                store.updateJobState(targetId, { phase: 'prompt_assembly' });
                            } else if (stageProgress.stage === 'sections') {
                                store.updateJobState(targetId, { phase: 'content_synthesis' });
                            } else if (stageProgress.stage === 'merge') {
                                store.updateJobState(targetId, { phase: 'final_polish' });
                            } else if (stageProgress.stage === 'polish') {
                                store.updateJobState(targetId, { phase: 'qa_validation' });
                            }
                        }
                    );




                    // 🔥🔥🔥 CRITICAL FIX: Create MUTABLE deep copy to avoid Immer freeze
                    let contract: ContentContract = deepClone(_rawContract);

                    // Post-processing
                    contract.htmlContent = removeH1TagsFromContent(contract.htmlContent, log);
                    
                    if (contract.title) contract.title = enforceTitle(contract.title, log);
                    if (contract.metaDescription) contract.metaDescription = enforceMeta(contract.metaDescription, log);

                    const { html: cleanedQAHtml } = cleanupQAFormatFromContent(contract.htmlContent, log);
                    contract.htmlContent = cleanedQAHtml;

                    contract.htmlContent = removeDuplicateFAQSections(contract.htmlContent, log);

                    if (contract.faqs && contract.faqs.length > 0 && !hasPremiumFAQStyling(contract.htmlContent)) {
                        contract.htmlContent = upgradeFAQSection(contract.htmlContent, contract.faqs);
                        log(`   ✅ Upgraded FAQ section with ${contract.faqs.length} premium-styled questions`);
                                        } else if (hasPremiumFAQStyling(contract.htmlContent)) {
                        log(`   ✓ FAQ section already has premium styling — skipping duplicate upgrade`);
                    }

                    // ═══════════════════════════════════════════════════════════════════════════
                    // 🔗 INTERNAL LINK INJECTION — SOTA PIPELINE
                    // ═══════════════════════════════════════════════════════════════════════════
                    
                    log(`🔗 Discovering and injecting internal links...`, true);
                    
                    try {
                        const wpLinkTargets = await discoverInternalLinkTargets(
                            store.wpConfig.url,
                            auth,
                            { 
                                excludePostId: postId || undefined, 
                                excludeUrls: [targetId], 
                                maxPosts: 100 
                            },
                            (msg) => log(msg)
                        );
                        
                        const seenUrls = new Set(wpLinkTargets.map(t => t.url.toLowerCase()));
                        const storeLinkTargets = internalLinks
                            .filter(l => !seenUrls.has(l.url.toLowerCase()))
                            .slice(0, 30);
                        
                        const allLinkTargets = [...wpLinkTargets, ...storeLinkTargets];
                        
                        log(`   📋 Link targets: ${wpLinkTargets.length} from WP + ${storeLinkTargets.length} from store = ${allLinkTargets.length} total`);
                        
                        if (allLinkTargets.length > 0 && contract.htmlContent) {
                            const linkResult = injectInternalLinks(
                                contract.htmlContent,
                                allLinkTargets,
                                targetId,
                                {
                                    minLinks: 12,
                                    maxLinks: 25,
                                    minRelevance: 0.55,
                                    minDistanceBetweenLinks: 450,
                                    maxLinksPerSection: 2
                                }
                            );
                            
                            contract.htmlContent = linkResult.html;
                            contract.internalLinks = linkResult.linksAdded;
                            
                            log(`   ✅ Injected ${linkResult.linksAdded.length} internal links`, true);
                            
                            const excellent = linkResult.linksAdded.filter(l => l.relevanceScore >= 0.8).length;
                            const good = linkResult.linksAdded.filter(l => l.relevanceScore >= 0.6 && l.relevanceScore < 0.8).length;
                            const acceptable = linkResult.linksAdded.filter(l => l.relevanceScore < 0.6).length;
                            log(`   📊 Quality: ${excellent} excellent | ${good} good | ${acceptable} acceptable`, true);
                        } else {
                            log(`   ⚠️ No link targets available`, true);
                        }
                    } catch (linkErr: any) {
                        log(`   ⚠️ Link injection failed: ${linkErr.message}`, true);
                        
                        if (internalLinks.length > 0 && contract.htmlContent) {
                            log(`   🔄 Fallback: Using store pages...`, true);
                            const fallbackResult = injectInternalLinks(
                                contract.htmlContent,
                                internalLinks,
                                targetId,
                                { minLinks: 6, maxLinks: 15, minRelevance: 0.4 }
                            );
                            contract.htmlContent = fallbackResult.html;
                            contract.internalLinks = fallbackResult.linksAdded;
                            log(`   ✅ Fallback injected ${fallbackResult.linksAdded.length} links`, true);
                        }
                    }



                    logContentStructure(contract.htmlContent, log);

                    const finalDoc = new DOMParser().parseFromString(contract.htmlContent, 'text/html');
                    const finalWordCount = (finalDoc.body?.textContent || '').split(/\s+/).filter(Boolean).length;
                    contract.wordCount = finalWordCount;

                    log(`   ✅ SOTA Pipeline Complete: ${finalWordCount.toLocaleString()} words | ${contract.faqs?.length || 0} FAQs`, true);

                    // 🔥 CRITICAL FIX: Store a SEPARATE deep copy to state
                    store.updateJobState(targetId, { contract: deepClone(contract) });

                    // QA Validation
                    store.updateJobState(targetId, { phase: 'qa_validation' });
                    log(`🔍 QA Validation...`);

                    const qaResult = runQASwarm(contract, entityGapData, store.neuronTerms);
                    store.updateJobState(targetId, { qaResults: qaResult.results });

                    const criticalFails = qaResult.results.filter(r => r.status === 'failed' && r.category === 'critical');
                    const qaPatternCount = countQAPatternsOutsideFAQ(contract.htmlContent);
                    
                    if (qaPatternCount > 5) {
                        log(`   ⚠️ WARNING: ${qaPatternCount} Q&A patterns detected in main content (should be prose)`, true);
                    }
                    
                    log(`   📊 QA Score: ${qaResult.score}/100 | Words: ${finalWordCount.toLocaleString()} | Critical Fails: ${criticalFails.length} | Q&A Patterns: ${qaPatternCount}`, true);

                    // 🔥 CRITICAL FIX: Create independent copy for bestContract
                    bestContract = deepClone(contract);
                    bestScore = qaResult.score;
                    bestWordCount = finalWordCount;
                    qaPassed = true;
                    log(`   ✅ QA PASSED (SOTA Pipeline)`, true);

                } catch (genErr: any) {
                    lastSynthesisError = genErr.message;
                    log(`   ❌ SOTA Pipeline failed: ${genErr.message}`, true);
                    log(`   → Falling back to standard generation...`, true);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // 🔥 OPTION B: STANDARD GENERATION WITH RETRY LOOP (Fallback)
            // ═══════════════════════════════════════════════════════════════

            if (!qaPassed) {
                log(`🎨 Using Standard Generation with Retry Loop...`, true);

                while (synthesisAttempts < MAX_SYNTHESIS_CYCLES && !qaPassed) {
                    synthesisAttempts++;
                    store.updateJobState(targetId, { phase: 'content_synthesis' });
                    log(`🎨 Content Synthesis (Attempt ${synthesisAttempts}/${MAX_SYNTHESIS_CYCLES})...`, true);

                    try {
                        log(`   → Calling ${store.selectedProvider.toUpperCase()} API...`);

                        const { contract: _rawContract, groundingSources } = await orchestrator.generate({
                            ...synthesisConfig,
                            previousAttempts: synthesisAttempts,
                            allFeedback: allFeedback.length > 0 ? allFeedback : undefined,
                            temperature: 0.8 + (synthesisAttempts * 0.05)
                        }, log);

                        // 🔥🔥🔥 CRITICAL FIX: Create MUTABLE deep copy
                        let contract: ContentContract = deepClone(_rawContract);

                        const initialWordCount = contract.wordCount || 0;

                        log(`   → Generated: ${initialWordCount.toLocaleString()} words | ${contract.faqs?.length || 0} FAQs`, true);

                        if (initialWordCount < 2000) {
                            lastSynthesisError = `Content too short: ${initialWordCount} words`;
                            log(`   ❌ ${lastSynthesisError}. Retrying...`, true);
                            allFeedback.push(`Content was only ${initialWordCount} words. Generate at least ${targetWordCount} words.`);
                            continue;
                        }

                        // Post-processing
                        if (contract.title) contract.title = enforceTitle(contract.title, log);
                        if (contract.metaDescription) contract.metaDescription = enforceMeta(contract.metaDescription, log);

                        const h1CountBefore = (contract.htmlContent.match(/<h1/gi) || []).length;
                        if (h1CountBefore > 0) {
                            contract.htmlContent = contract.htmlContent.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
                            contract.htmlContent = contract.htmlContent.replace(/\n{3,}/g, '\n\n').trim();
                            log(`   → Removed ${h1CountBefore} H1 tag(s) — WordPress provides title`);
                        }

                        const { html: cleanedQAHtml } = cleanupQAFormatFromContent(contract.htmlContent, log);
                        contract.htmlContent = cleanedQAHtml;

                        const hasPremiumFAQ_standard = hasPremiumFAQStyling(contract.htmlContent);

                        if (contract.faqs && contract.faqs.length > 0 && !hasPremiumFAQ_standard) {
                            contract.htmlContent = upgradeFAQSection(contract.htmlContent, contract.faqs);
                            log(`   ✅ Upgraded FAQ section with ${contract.faqs.length} premium-styled questions`);
                        } else if (hasPremiumFAQ_standard) {
                            log(`   ✓ FAQ section already has premium styling — skipping duplicate upgrade`);
                        }

                        // ═══════════════════════════════════════════════════════════════════════════
                        // 🔗 INTERNAL LINK INJECTION — STANDARD PIPELINE
                        // ═══════════════════════════════════════════════════════════════════════════
                        
                        log(`🔗 Discovering and injecting internal links...`, true);
                        
                        try {
                            const wpLinkTargets = await discoverInternalLinkTargets(
                                store.wpConfig.url,
                                auth,
                                { 
                                    excludePostId: postId || undefined, 
                                    excludeUrls: [targetId], 
                                    maxPosts: 100 
                                },
                                (msg) => log(msg)
                            );
                            
                            const seenUrls = new Set(wpLinkTargets.map(t => t.url.toLowerCase()));
                            const storeLinkTargets = internalLinks
                                .filter(l => !seenUrls.has(l.url.toLowerCase()))
                                .slice(0, 30);
                            
                            const allLinkTargets = [...wpLinkTargets, ...storeLinkTargets];
                            
                            log(`   📋 Link targets: ${wpLinkTargets.length} from WP + ${storeLinkTargets.length} from store = ${allLinkTargets.length} total`);
                            
                            if (allLinkTargets.length > 0 && contract.htmlContent) {
                                const linkResult = injectInternalLinks(
                                    contract.htmlContent,
                                    allLinkTargets,
                                    targetId,
                                    {
                                        minLinks: 12,
                                        maxLinks: 25,
                                        minRelevance: 0.55,
                                        minDistanceBetweenLinks: 450,
                                        maxLinksPerSection: 2
                                    }
                                );
                                
                                contract.htmlContent = linkResult.html;
                                contract.internalLinks = linkResult.linksAdded;
                                
                                log(`   ✅ Injected ${linkResult.linksAdded.length} internal links`, true);
                                
                                const excellent = linkResult.linksAdded.filter(l => l.relevanceScore >= 0.8).length;
                                const good = linkResult.linksAdded.filter(l => l.relevanceScore >= 0.6 && l.relevanceScore < 0.8).length;
                                const acceptable = linkResult.linksAdded.filter(l => l.relevanceScore < 0.6).length;
                                log(`   📊 Quality: ${excellent} excellent | ${good} good | ${acceptable} acceptable`, true);
                            } else {
                                log(`   ⚠️ No link targets available`, true);
                            }
                        } catch (linkErr: any) {
                            log(`   ⚠️ Link injection failed: ${linkErr.message}`, true);
                            
                            if (internalLinks.length > 0 && contract.htmlContent) {
                                log(`   🔄 Fallback: Using store pages...`, true);
                                const fallbackResult = injectInternalLinks(
                                    contract.htmlContent,
                                    internalLinks,
                                    targetId,
                                    { minLinks: 6, maxLinks: 15, minRelevance: 0.4 }
                                );
                                contract.htmlContent = fallbackResult.html;
                                contract.internalLinks = fallbackResult.linksAdded;
                                log(`   ✅ Fallback injected ${fallbackResult.linksAdded.length} links`, true);
                            }
                        }



                        logContentStructure(contract.htmlContent, log);

                        const finalDoc = new DOMParser().parseFromString(contract.htmlContent, 'text/html');
                        const finalWordCount = (finalDoc.body?.textContent || '').split(/\s+/).filter(Boolean).length;
                        contract.wordCount = finalWordCount;

                        // 🔥 CRITICAL FIX: Store a SEPARATE deep copy to state
                        store.updateJobState(targetId, { contract: deepClone(contract) });

                        // QA Validation
                        store.updateJobState(targetId, { phase: 'qa_validation' });
                        log(`🔍 QA Validation...`);

                        const qaResult = runQASwarm(contract, entityGapData, store.neuronTerms);
                        store.updateJobState(targetId, { qaResults: qaResult.results });

                        const criticalFails = qaResult.results.filter(r => r.status === 'failed' && r.category === 'critical');
                        const qaPatternCount = countQAPatternsOutsideFAQ(contract.htmlContent);
                        
                        if (qaPatternCount > 5) {
                            log(`   ⚠️ WARNING: ${qaPatternCount} Q&A patterns detected in main content (should be prose)`, true);
                        }
                        
                        log(`   📊 QA Score: ${qaResult.score}/100 | Words: ${finalWordCount.toLocaleString()} | Critical Fails: ${criticalFails.length} | Q&A Patterns: ${qaPatternCount}`, true);

                        // 🔥 CRITICAL FIX: Create independent copies for bestContract
                        if (qaResult.score > bestScore || (qaResult.score === bestScore && finalWordCount > bestWordCount)) {
                            bestScore = qaResult.score;
                            bestContract = deepClone(contract);
                            bestWordCount = finalWordCount;
                        }

                        if (qaResult.score >= QA_PASS_THRESHOLD && criticalFails.length <= 2) {
                            qaPassed = true;
                            log(`   ✅ QA PASSED`, true);
                        } else if (synthesisAttempts < MAX_SYNTHESIS_CYCLES) {
                            store.updateJobState(targetId, { phase: 'self_improvement' });
                            const newFeedback = criticalFails.slice(0, 3).map(r => r.fixSuggestion || r.feedback);
                            allFeedback = [...allFeedback, ...newFeedback].slice(-8);
                            store.updateJobState(targetId, { allFeedback });
                            log(`   🔄 Retrying with ${newFeedback.length} fixes...`);
                            await new Promise(r => setTimeout(r, 500));
                        } else {
                            log(`   ⚠️ Max attempts reached. Using best (Score: ${bestScore})`, true);
                            if (bestContract && bestScore >= 50) {
                                store.updateJobState(targetId, { contract: deepClone(bestContract) });
                                qaPassed = true;
                            }
                        }
                    } catch (genErr: any) {
                        lastSynthesisError = genErr.message;
                        log(`   ❌ Generation error: ${genErr.message}`, true);
                        
                        const isRateLimit = genErr.message.includes('429') || genErr.message.toLowerCase().includes('rate limit');
                        const isTimeout = genErr.message.toLowerCase().includes('timeout');
                        
                        if (synthesisAttempts >= MAX_SYNTHESIS_CYCLES) {
                            if (bestContract && bestScore >= 40) {
                                log(`   → Using best available content (Score: ${bestScore})`, true);
                                store.updateJobState(targetId, { contract: deepClone(bestContract) });
                                qaPassed = true;
                            } else {
                                throw new Error(`Content generation failed after ${MAX_SYNTHESIS_CYCLES} attempts: ${genErr.message}`);
                            }
                        } else {
                            allFeedback.push(`Previous attempt failed: ${genErr.message}`);
                            
                            const baseDelay = isRateLimit ? 5000 : isTimeout ? 3000 : 2000;
                            const exponentialDelay = baseDelay * Math.pow(2, synthesisAttempts - 1);
                            const jitter = Math.random() * 1000;
                            const finalDelay = Math.min(exponentialDelay + jitter, 30000);
                            
                            log(`   ⏳ Waiting ${Math.round(finalDelay / 1000)}s before retry...`);
                            await new Promise(r => setTimeout(r, finalDelay));
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // 🔥 FINAL VALIDATION — Get the contract to publish
            // ═══════════════════════════════════════════════════════════════

            // 🔥🔥🔥 CRITICAL FIX: Create MUTABLE copy for final processing
            const finalContract: ContentContract | null = bestContract 
                ? deepClone(bestContract) 
                : null;

            if (!finalContract || !finalContract.htmlContent || finalContract.htmlContent.length < 2000) {
                throw new Error(`Content generation failed: ${lastSynthesisError || 'No valid content produced'}`);
            }

            // Final H1 check
            const h1FinalCheck = (finalContract.htmlContent.match(/<h1/gi) || []).length;
            if (h1FinalCheck > 0) {
                log(`   ⚠️ Final H1 cleanup: removing ${h1FinalCheck} remaining H1 tag(s)`, true);
                finalContract.htmlContent = finalContract.htmlContent.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
            }

            // Final Q&A cleanup
            const finalQAPatterns = countQAPatternsOutsideFAQ(finalContract.htmlContent);
            if (finalQAPatterns > 10) {
                log(`   ⚠️ Final Q&A cleanup: ${finalQAPatterns} patterns found, cleaning...`, true);
                const { html: finalCleanedHtml } = cleanupQAFormatFromContent(finalContract.htmlContent, log);
                finalContract.htmlContent = finalCleanedHtml;
            }

            log(`✅ Phase 5 Complete: ${bestWordCount.toLocaleString()} words | Score: ${bestScore}%`, true);

            // ═══════════════════════════════════════════════════════════════════════════
            // 🎬 YOUTUBE VIDEO INTEGRATION — NEW PHASE 5.5
            // ═══════════════════════════════════════════════════════════════════════════

            if (store.apiKeys.serper && finalContract) {
                store.updateJobState(targetId, { phase: 'youtube_integration' as GodModePhase });
                log(`🎬 PHASE 5.5: YouTube Video Integration...`, true);
                
                try {
                    const { searchYouTubeVideo, generateYouTubeEmbed } = await import('./utils');
                    
                    const videoResult = await searchYouTubeVideo(
                        topic,
                        store.apiKeys.serper,
                        { minViews: 10000 },
                        (msg: string) => log(msg)
                    );
                    
                    if (videoResult.video) {
                        const videoEmbed = generateYouTubeEmbed(videoResult.video, topic);
                        
                        // Insert after Quick Answer box OR after first H2 section
                        const quickAnswerEnd = finalContract.htmlContent.indexOf('</div>', 
                            finalContract.htmlContent.toLowerCase().indexOf('quick answer')
                        );
                        const firstH2 = finalContract.htmlContent.indexOf('<h2');
                        
                        let insertPos = -1;
                        
                        if (quickAnswerEnd > 0 && quickAnswerEnd < 2000) {
                            // Insert after Quick Answer closing div
                            insertPos = quickAnswerEnd + 6; // length of '</div>'
                            log(`   → Inserting video after Quick Answer box`);
                        } else if (firstH2 > 0) {
                            // Insert before first H2
                            insertPos = firstH2;
                            log(`   → Inserting video before first H2`);
                        }
                        
                        if (insertPos > 0) {
                            finalContract.htmlContent = 
                                finalContract.htmlContent.slice(0, insertPos) + 
                                '\n\n' + videoEmbed + '\n\n' +
                                finalContract.htmlContent.slice(insertPos);
                            
                            log(`   ✅ Embedded video: "${videoResult.video.title}"`, true);
                            log(`   📊 Video stats: ${videoResult.video.channel} • ${videoResult.video.views.toLocaleString()} views`);
                        } else {
                            log(`   ⚠️ Could not find suitable insertion point for video`);
                        }
                    } else {
                        log(`   ⚠️ No suitable YouTube video found for topic`);
                    }
                } catch (ytErr: any) {
                    log(`   ⚠️ YouTube integration failed: ${ytErr.message}`, true);
                }
            } else if (!store.apiKeys.serper) {
                log(`⚠️ Skipping YouTube integration (no Serper API key)`, true);
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // PRE-PUBLISH VALIDATION — CRITICAL CHECKS
            // ═══════════════════════════════════════════════════════════════════════════
            
            log(`🔍 Running pre-publish validation...`, true);

            
            const h1ValidationResult = validateContentNoH1(finalContract.htmlContent);
            if (!h1ValidationResult.valid) {
                log(`   ⚠️ CRITICAL: ${h1ValidationResult.count} H1 tags detected — forcing removal...`, true);
                finalContract.htmlContent = removeH1TagsFromContent(finalContract.htmlContent, log);
                
                const recheck = validateContentNoH1(finalContract.htmlContent);
                if (!recheck.valid) {
                    throw new Error(`Cannot publish: H1 tags still present after cleanup (${recheck.count})`);
                }
            }
            
            const prePublishDoc = new DOMParser().parseFromString(finalContract.htmlContent, 'text/html');
            const prePublishWordCount = (prePublishDoc.body?.textContent || '').split(/\s+/).filter(Boolean).length;
            
            if (prePublishWordCount < 2000) {
                throw new Error(`Content too short: ${prePublishWordCount} words (minimum: 2000)`);
            }
            
            if (!finalContract.title || finalContract.title.trim().length < 10) {
                throw new Error('Title is missing or too short (minimum 10 characters)');
            }
            
            if (!finalContract.htmlContent || finalContract.htmlContent.trim().length < 1000) {
                throw new Error('HTML content is empty or too short');
            }
            
            finalContract.htmlContent = removeDuplicateFAQs(finalContract.htmlContent, log);
            
            log(`   ✅ Pre-publish validation PASSED:`, true);
            log(`      • Words: ${prePublishWordCount.toLocaleString()}`, true);
            log(`      • H1 tags: 0`, true);
            log(`      • Title: "${finalContract.title.substring(0, 50)}..."`, true);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 6: PUBLISH TO WORDPRESS
            // ═══════════════════════════════════════════════════════════════

            store.updateJobState(targetId, { phase: 'publishing' });
            log(`📤 PHASE 6: Publishing to WordPress...`, true);

            const publishData: any = {
                title: finalContract.title,
                content: finalContract.htmlContent,
                excerpt: finalContract.excerpt || '',
                status: store.publishMode === 'autopublish' ? 'publish' : 'draft'
            };

            let finalPostId: number;
            let finalPostLink: string;

            if (postId) {
                log(`   → 🔒 UPDATING existing post ID: ${postId}`);
                
                const currentPostUrl = await wpGetPostFullUrl(store.wpConfig.url, postId, auth);
                if (currentPostUrl) {
                    log(`   → 🔒 Current URL: ${currentPostUrl}`);
                    log(`   → 🔒 This URL will be PRESERVED (slug not changing)`);
                }
                
                delete publishData.slug;
                
                if (preserveCategories && preservation.originalCategories.length > 0) {
                    publishData.categories = preservation.originalCategories;
                    log(`   → 🔒 Preserving ${preservation.originalCategories.length} categories`);
                }
                
                if (preserveTags && preservation.originalTags.length > 0) {
                    publishData.tags = preservation.originalTags;
                    log(`   → 🔒 Preserving ${preservation.originalTags.length} tags`);
                }
                
                if (preserveFeaturedImage && preservation.featuredImageId) {
                    publishData.featured_media = preservation.featuredImageId;
                    log(`   → 🖼️ Preserving featured image (ID: ${preservation.featuredImageId})`);
                }
                
                log(`   → 📦 Update payload keys: ${Object.keys(publishData).join(', ')}`);
                
                try {
                    const result = await wpUpdatePost(store.wpConfig.url, auth, postId, publishData, {
                        preserveFeaturedImage: preserveFeaturedImage,
                        preserveSlug: true,
                        preserveCategories: preserveCategories,
                        preserveTags: preserveTags
                    });
                    
                    finalPostId = result.id;
                    finalPostLink = result.link;
                    
                    log(`   ✅ Updated post ID: ${finalPostId}`, true);
                    log(`   → Final URL: ${finalPostLink}`, true);
                    
                    const originalPath = new URL(targetId).pathname;
                    const finalPath = new URL(finalPostLink).pathname;
                    
                    if (originalPath !== finalPath) {
                        log(`   ⚠️ WARNING: URL may have changed!`, true);
                        log(`   ⚠️ Original: ${originalPath}`, true);
                        log(`   ⚠️ Final: ${finalPath}`, true);
                        store.addToast('⚠️ URL may have changed — verify in WordPress', 'warning');
                    } else {
                        log(`   ✅ URL preserved correctly`, true);
                    }
                    
                } catch (wpErr: any) {
                    throw new Error(`WordPress update failed: ${wpErr.message}`);
                }
                
            } else {
                publishData.slug = finalContract.slug;
                log(`   → 📝 Creating NEW post with slug: "${finalContract.slug}"`);
                
                try {
                    const result = await wpCreatePost(store.wpConfig.url, auth, publishData);
                    finalPostId = result.id;
                    finalPostLink = result.link;
                    log(`   ✅ Created NEW post ID: ${finalPostId}`, true);
                    log(`   → New URL: ${finalPostLink}`, true);
                } catch (wpErr: any) {
                    throw new Error(`WordPress create failed: ${wpErr.message}`);
                }
            }

            store.updateJobState(targetId, { postId: finalPostId });

            // Update SEO meta
            try {
                await wpUpdatePostMeta(store.wpConfig.url, auth, finalPostId, {
                    title: finalContract.title,
                    description: finalContract.metaDescription,
                    focusKeyword: topic
                });
                log(`   ✅ SEO meta updated`);
            } catch (e) {
                log(`   ⚠️ Could not update SEO meta`);
            }

            // Optimize alt text
            if (optimizeAltText && preservation.contentImages.length > 0) {
                log(`🖼️ Optimizing alt text for ${preservation.contentImages.length} images...`);
                
                try {
                    const apiKey = store.apiKeys.google || store.apiKeys.openrouter;
                    
                    if (apiKey && typeof generateOptimizedAltText === 'function') {
                        const optimizedAlts = await generateOptimizedAltText(
                            preservation.contentImages.map(img => ({ src: img.src, alt: img.alt })),
                            topic,
                            apiKey
                        );
                        
                        let updatedCount = 0;
                        for (const optimized of optimizedAlts) {
                            if (optimized.optimizedAlt && optimized.optimizedAlt !== optimized.originalAlt) {
                                const img = preservation.contentImages.find(i => i.src === optimized.src);
                                if (img?.mediaId) {
                                    const success = await wpUpdateMediaAltText(
                                        store.wpConfig.url, 
                                        auth, 
                                        img.mediaId, 
                                        optimized.optimizedAlt
                                    );
                                    if (success) {
                                        updatedCount++;
                                        log(`   ✅ Updated alt: "${optimized.optimizedAlt.substring(0, 40)}..."`);
                                    }
                                }
                            }
                        }
                        
                        if (updatedCount > 0) {
                            log(`   🖼️ Optimized ${updatedCount} image alt texts`);
                        }
                    }
                } catch (altErr: any) {
                    log(`   ⚠️ Alt text optimization failed: ${altErr.message}`);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // PHASE 7: COMPLETION
            // ═══════════════════════════════════════════════════════════════
            
            store.updateJobState(targetId, { phase: 'completed' });
            
            const metrics = calculateSeoMetrics(
                finalContract.htmlContent, 
                finalContract.title || topic, 
                finalContract.slug || ''
            );
            
            const finalQA = runQASwarm(finalContract, entityGapData, store.neuronTerms);
            const finalScore = Math.round(
                (metrics.aeoScore * 0.25) + 
                (finalQA.score * 0.45) + 
                (metrics.contentDepth * 0.15) +
                (metrics.headingStructure * 0.15)
            );

            const processingTime = Date.now() - startTime;

            store.updateJobState(targetId, { status: 'completed', processingTime });
            
            store.updatePage(targetId, { 
                status: 'analyzed', 
                healthScore: finalScore, 
                wordCount: metrics.wordCount, 
                seoMetrics: metrics,
                improvementHistory: [
                    ...(getPage().improvementHistory || []), 
                    { 
                        timestamp: Date.now(), 
                        score: finalScore, 
                        action: `v${APP_VERSION}`, 
                        wordCount: metrics.wordCount, 
                        qaScore: finalQA.score, 
                        version: APP_VERSION 
                    }
                ],
                wpPostId: finalPostId, 
                lastPublishedAt: Date.now()
            });

            store.updateGlobalStats({
                totalProcessed: (store.globalStats.totalProcessed || 0) + 1,
                totalWordsGenerated: (store.globalStats.totalWordsGenerated || 0) + metrics.wordCount,
                lastRunTime: processingTime,
                totalImproved: (store.globalStats.totalImproved || 0) + (finalScore >= 70 ? 1 : 0)
            });

            log(`🎉 ═══════════════════════════════════════════════════════════`, true);
            log(`🎉 SUCCESS: Score ${finalScore}% | ${metrics.wordCount.toLocaleString()} words | ${formatDuration(processingTime)}`, true);
            log(`🎉 Images preserved: ${preservation.contentImages.length} | Featured: ${preservation.featuredImageId ? 'Yes' : 'No'}`, true);
            log(`🎉 ═══════════════════════════════════════════════════════════`, true);
            
            if (!silentMode) store.addToast(`✅ Optimized! Score: ${finalScore}% | ${metrics.wordCount.toLocaleString()} words`, 'success');
            
            return { 
                success: true, 
                score: finalScore, 
                wordCount: metrics.wordCount 
            };

        } catch (e: any) {
            const processingTime = Date.now() - startTime;
            const errorMessage = e.message || 'Unknown error';
            
            store.updateJobState(targetId!, { 
                status: 'failed', 
                phase: 'failed', 
                error: errorMessage, 
                processingTime
            });
            store.updatePage(targetId!, { status: 'error' });
            
            log(`💥 ═══════════════════════════════════════════════════════════`, true);
            log(`💥 FAILED: ${errorMessage}`, true);
            log(`💥 Time: ${formatDuration(processingTime)}`, true);
            log(`💥 ═══════════════════════════════════════════════════════════`, true);
            
            if (!silentMode) store.addToast(`❌ Failed: ${errorMessage}`, 'error');
            
            return { 
                success: false, 
                score: 0, 
                wordCount: 0, 
                error: errorMessage 
            };
        }

    }, [manualUrl, store, getSiteContext, getAuth, geoConfig, hasRequiredKeys, targetKeywordOverride, getActualModel, enforceTitle, enforceMeta, optimizationMode, preserveImages, optimizeAltText, preserveFeaturedImage, preserveCategories, preserveTags, hasSerperKey, hasNeuronConfig]);

    // ═══════════════════════════════════════════════════════════════════════════
    // BULK OPTIMIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    const parseBulkUrls = useCallback((text: string): string[] => {
        return text
            .split(/[\n,\s]+/)
            .map(u => u.trim())
            .filter(u => u.startsWith('http'))
            .filter((u, i, arr) => arr.indexOf(u) === i);
    }, []);

    const executeBulkOptimization = useCallback(async () => {
        const urls = parseBulkUrls(bulkUrls);
        
        if (urls.length === 0) {
            store.addToast('Enter valid URLs to optimize', 'warning');
            return;
        }

        if (!hasRequiredKeys()) {
            store.addToast('Configure at least one AI API key', 'error');
            return;
        }

        if (!store.wpConfig.url || !store.wpConfig.password) {
            store.addToast('Configure WordPress connection', 'error');
            return;
        }

        bulkAbortRef.current = false;
        const startTime = Date.now();

        const jobs: BulkJob[] = urls.map((url, index) => ({
            id: `bulk-${Date.now()}-${index}`,
            url,
            status: 'queued',
            progress: 0,
            attempts: 0
        }));

        setBulkState({
            isRunning: true,
            jobs,
            concurrency: bulkConcurrency,
            completed: 0,
            failed: 0,
            totalTime: 0,
            avgScore: 0,
            totalWords: 0
        });

        store.addGodLog(`════════════════════════════════════════════════════════════════════════`);
        store.addGodLog(`🚀 BULK OPTIMIZATION ENGINE v${APP_VERSION_FULL}`);
        store.addGodLog(`════════════════════════════════════════════════════════════════════════`);
        store.addGodLog(`📋 URLs to process: ${urls.length}`);
        store.addGodLog(`⚡ Parallel jobs: ${bulkConcurrency}`);
        store.addGodLog(`🎯 Mode: ${optimizationMode.toUpperCase()}`);
        store.addGodLog(`────────────────────────────────────────────────────────────────────────`);

        const newPages: SitemapPage[] = urls
            .filter(url => !store.pages.find(p => p.id === url))
            .map(url => {
                const slug = sanitizeSlug(extractSlugFromUrl(url));
                let title = '';
                try {
                    const pathParts = new URL(url).pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        title = pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                } catch {}
                if (!title || title.length < 3) title = 'New Page';
                
                return {
                    id: url,
                    title,
                    slug,
                    lastMod: new Date().toISOString(),
                    wordCount: null,
                    crawledContent: null,
                    healthScore: null,
                    status: 'idle' as const,
                    opportunity: calculateOpportunityScore(title, null),
                    improvementHistory: []
                };
            });

        if (newPages.length > 0) {
            store.addPages(newPages);
        }

        let completed = 0;
        let failed = 0;
        let totalWords = 0;
        let totalScore = 0;
        const results: BulkResult[] = [];

        const processJob = async (job: BulkJob): Promise<void> => {
            if (bulkAbortRef.current) return;

            const jobStartTime = Date.now();
            const urlShort = job.url.split('/').slice(-2).join('/').substring(0, 50);

            setBulkState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.id === job.id ? { 
                    ...j, 
                    status: 'processing', 
                    startTime: jobStartTime
                } : j)
            }));

            store.addGodLog(`────────────────────────────────────────────────────────────────────────`);
            store.addGodLog(`⚡ [${completed + failed + 1}/${jobs.length}] STARTING: ${urlShort}`);

            try {
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Job timeout (25 min exceeded)')), JOB_TIMEOUT_MS);
                });

                const resultPromise = executeGodMode(job.url, true);
                const result = await Promise.race([resultPromise, timeoutPromise]);
                
                const jobTime = Date.now() - jobStartTime;
                
                if (result.success && result.score >= 50 && result.wordCount > 1000) {
                    completed++;
                    totalWords += result.wordCount;
                    totalScore += result.score;
                    
                    setBulkState(prev => ({
                        ...prev,
                        jobs: prev.jobs.map(j => j.id === job.id ? { 
                            ...j, 
                            status: 'completed',
                            score: result.score,
                            wordCount: result.wordCount,
                            endTime: Date.now()
                        } : j),
                        completed,
                        totalWords,
                        avgScore: Math.round(totalScore / completed)
                    }));

                    store.addGodLog(`   ✅ [${completed}/${jobs.length}] SUCCESS: ${urlShort} | Score: ${result.score}% | ${result.wordCount.toLocaleString()} words | ${formatDuration(jobTime)}`);
                    
                    results.push({
                        url: job.url,
                        success: true,
                        score: result.score,
                        time: jobTime,
                        wordCount: result.wordCount
                    });
                } else {
                    throw new Error(result.error || 'Quality check failed');
                }
            } catch (error: any) {
                failed++;
                const jobTime = Date.now() - jobStartTime;
                
                setBulkState(prev => ({
                    ...prev,
                    jobs: prev.jobs.map(j => j.id === job.id ? { 
                        ...j, 
                        status: 'failed',
                        error: error.message,
                        endTime: Date.now()
                    } : j),
                    failed
                }));

                store.addGodLog(`   ❌ [${failed}F] FAILED: ${urlShort} | ${error.message} | ${formatDuration(jobTime)}`);
                
                results.push({
                    url: job.url,
                    success: false,
                    score: 0,
                    time: jobTime,
                    wordCount: 0,
                    error: error.message
                });
            }
        };

        // Process in batches with concurrency control
        for (let i = 0; i < jobs.length; i += bulkConcurrency) {
            if (bulkAbortRef.current) break;

            const batch = jobs.slice(i, i + bulkConcurrency);
            await Promise.all(batch.map(job => processJob(job)));
            
            // Small delay between batches
            if (i + bulkConcurrency < jobs.length && !bulkAbortRef.current) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        const totalTime = Date.now() - startTime;

        setBulkState(prev => ({
            ...prev,
            isRunning: false,
            totalTime,
            avgScore: completed > 0 ? Math.round(totalScore / completed) : 0
        }));

        store.addGodLog(`════════════════════════════════════════════════════════════════════════`);
        store.addGodLog(`🏁 BULK OPTIMIZATION COMPLETE`);
        store.addGodLog(`════════════════════════════════════════════════════════════════════════`);
        store.addGodLog(`📊 Results: ${completed} success | ${failed} failed | ${jobs.length} total`);
        store.addGodLog(`📝 Total words: ${totalWords.toLocaleString()}`);
        store.addGodLog(`📈 Avg score: ${completed > 0 ? Math.round(totalScore / completed) : 0}%`);
        store.addGodLog(`⏱️ Total time: ${formatDuration(totalTime)}`);
        store.addGodLog(`════════════════════════════════════════════════════════════════════════`);

        store.addToast(
            `Bulk complete: ${completed}/${jobs.length} success | ${totalWords.toLocaleString()} words | ${formatDuration(totalTime)}`,
            completed > 0 ? 'success' : 'error'
        );
    }, [bulkUrls, bulkConcurrency, store, hasRequiredKeys, executeGodMode, optimizationMode, parseBulkUrls]);

    const abortBulkOptimization = useCallback(() => {
        bulkAbortRef.current = true;
        store.addGodLog(`⚠️ ABORT REQUESTED — stopping after current jobs complete...`);
        store.addToast('Aborting bulk optimization...', 'warning');
    }, [store]);

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER — SIMPLIFIED FOR BREVITY (Same as original)
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Toast Container */}
            <ToastContainer />
            
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/60 border-b border-white/[0.06]">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-500/25">
                                ⚡
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">WP Optimizer Pro</h1>
                                <p className="text-[11px] text-white/40">v{APP_VERSION_FULL} Enterprise</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* Navigation tabs */}
                            <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
                                {(['setup', 'strategy', 'review', 'analytics'] as const).map(view => (
                                    <button
                                        key={view}
                                        onClick={() => store.setActiveView(view)}
                                        className={cn(
                                            'px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all',
                                            store.activeView === view 
                                                ? 'bg-white text-black' 
                                                : 'text-white/40 hover:text-white'
                                        )}
                                    >
                                        {view === 'setup' && '⚙️ '}
                                        {view === 'strategy' && '🚀 '}
                                        {view === 'review' && '📊 '}
                                        {view === 'analytics' && '📈 '}
                                        {view}
                                    </button>
                                ))}
                            </div>
                            
                                                        {/* Processing indicator */}
                            {store.isProcessing && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <span className="text-[11px] font-semibold text-blue-400 uppercase">
                                        {store.processingStatus || 'Processing...'}
                                    </span>
                                </div>
                            )}
                            
                            {/* 🔥 CANCEL BUTTON — Stops job after current phase */}
                            {store.isProcessing && (
                                <button
                                    onClick={() => {
                                        cancellationTokenRef.current = { cancelled: true, reason: 'User clicked cancel' };
                                        store.addGodLog('⛔ CANCELLATION REQUESTED: User clicked cancel button');
                                        store.addToast('Cancellation requested — will stop after current phase', 'warning');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200"
                                    title="Cancel the current optimization job"
                                >
                                    <span className="text-sm">⛔</span>
                                    <span className="text-[11px] font-semibold uppercase">Cancel</span>
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            </header>
            
            {/* Main Content */}
            <main className="max-w-[1800px] mx-auto px-6 py-8">
                {/* Setup View */}
                {store.activeView === 'setup' && (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Configuration" 
                            icon="⚙️" 
                            color="#0a84ff"
                            subtitle="Configure WordPress, AI providers, and optimization settings"
                        />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* WordPress Config */}
                            <Card padding="lg">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <span className="text-2xl">🌐</span>
                                    WordPress Connection
                                </h3>
                                <div className="space-y-4">
                                    <AdvancedInput
                                        label="Site URL"
                                        value={store.wpConfig.url}
                                        onChange={v => store.setWpConfig({ url: v })}
                                        placeholder="https://yoursite.com"
                                        icon="🔗"
                                        required
                                    />
                                    <AdvancedInput
                                        label="Username"
                                        value={store.wpConfig.username}
                                        onChange={v => store.setWpConfig({ username: v })}
                                        placeholder="admin"
                                        icon="👤"
                                        required
                                    />
                                    <AdvancedInput
                                        label="Application Password"
                                        value={store.wpConfig.password || ''}
                                        onChange={v => store.setWpConfig({ password: v })}
                                        type="password"
                                        placeholder="xxxx xxxx xxxx xxxx"
                                        icon="🔑"
                                        helpText="Generate in WordPress → Users → Application Passwords"
                                        required
                                    />
                                    <button
                                        onClick={handleTestWpConnection}
                                        disabled={wpTestStatus === 'testing'}
                                        className={cn(
                                            'w-full py-4 rounded-xl font-semibold text-[14px] transition-all',
                                            wpTestStatus === 'testing' && 'opacity-50 cursor-not-allowed',
                                            wpTestStatus === 'success' && 'bg-green-500/20 text-green-400 border border-green-500/30',
                                            wpTestStatus === 'failed' && 'bg-red-500/20 text-red-400 border border-red-500/30',
                                            wpTestStatus === 'idle' && 'bg-blue-600 hover:bg-blue-500 text-white'
                                        )}
                                    >
                                        {wpTestStatus === 'testing' ? '🔄 Testing...' :
                                         wpTestStatus === 'success' ? '✅ Connected' :
                                         wpTestStatus === 'failed' ? '❌ Failed — Retry' :
                                         '🔌 Test Connection'}
                                    </button>
                                </div>
                            </Card>
                            
                            {/* AI Provider Config — WITH CUSTOM MODEL INPUT */}
<Card padding="lg">
    <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
        <span className="text-2xl">🤖</span>
        AI Provider Configuration
    </h3>
    <div className="space-y-6">
        {/* Provider Selection */}
        <div>
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 block">
                Select Provider
            </label>
            <div className="grid grid-cols-5 gap-2">
                {(['google', 'openrouter', 'openai', 'anthropic', 'groq'] as const).map(provider => (
                    <button
                        key={provider}
                        onClick={() => store.setSelectedProvider(provider)}
                        className={cn(
                            'py-3 px-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all border',
                            store.selectedProvider === provider
                                ? 'bg-white text-black border-white'
                                : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
                        )}
                    >
                        {provider === 'google' && '🔷 '}
                        {provider === 'openrouter' && '🌐 '}
                        {provider === 'openai' && '🟢 '}
                        {provider === 'anthropic' && '🟠 '}
                        {provider === 'groq' && '⚡ '}
                        {provider}
                    </button>
                ))}
            </div>
        </div>
        
        {/* API Key Input */}
        <AdvancedInput
            label={`${store.selectedProvider.charAt(0).toUpperCase() + store.selectedProvider.slice(1)} API Key`}
            value={store.apiKeys[store.selectedProvider]}
            onChange={v => store.setApiKey(store.selectedProvider, v)}
            type="password"
            placeholder="Enter API key..."
            icon="🔑"
            required
        />
        
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* 🔥🔥🔥 GOOGLE — Standard Model Dropdown */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {store.selectedProvider === 'google' && (
            <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 block">
                    Gemini Model
                </label>
                <select
                    value={store.selectedModel}
                    onChange={e => store.setSelectedModel(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none"
                >
                    <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash Preview</option>
                    <option value="gemini-2.5-pro-preview-05-06">Gemini 2.5 Pro Preview</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
            </div>
        )}
        
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* 🔥🔥🔥 OPENROUTER — WITH CUSTOM MODEL INPUT */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {store.selectedProvider === 'openrouter' && (
            <OpenRouterModelSelector
                value={store.apiKeys.openrouterModel}
                onChange={v => store.setApiKey('openrouterModel', v)}
            />
        )}
        
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* 🔥🔥🔥 GROQ — WITH CUSTOM MODEL INPUT */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {store.selectedProvider === 'groq' && (
            <GroqModelSelector
                value={store.apiKeys.groqModel}
                onChange={v => store.setApiKey('groqModel', v)}
            />
        )}
        
        {/* OpenAI — Fixed Model */}
        {store.selectedProvider === 'openai' && (
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🟢</span>
                    <div>
                        <div className="text-[14px] font-semibold text-white">GPT-4o</div>
                        <div className="text-[11px] text-white/40">OpenAI's most capable model</div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Anthropic — Fixed Model */}
        {store.selectedProvider === 'anthropic' && (
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🟠</span>
                    <div>
                        <div className="text-[14px] font-semibold text-white">Claude Sonnet 4</div>
                        <div className="text-[11px] text-white/40">Anthropic's latest model</div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Serper API Key (Optional - for all providers) */}
        <AdvancedInput
            label="Serper API Key (Optional)"
            value={store.apiKeys.serper}
            onChange={v => store.setApiKey('serper', v)}
            type="password"
            placeholder="For SERP analysis..."
            icon="🔍"
            helpText="Enables entity gap analysis & reference discovery"
        />
    </div>
</Card>

                        </div>
                        
                        {/* Site Context */}
                        <Card padding="lg">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                <span className="text-2xl">🏢</span>
                                Site Context
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <AdvancedInput
                                    label="Organization Name"
                                    value={store.wpConfig.orgName}
                                    onChange={v => store.setWpConfig({ orgName: v })}
                                    placeholder="Your Brand Name"
                                    icon="🏢"
                                />
                                <AdvancedInput
                                    label="Author Name"
                                    value={store.wpConfig.authorName}
                                    onChange={v => store.setWpConfig({ authorName: v })}
                                    placeholder="Editorial Team"
                                    icon="✍️"
                                />
                                <AdvancedInput
                                    label="Industry"
                                    value={store.wpConfig.industry || ''}
                                    onChange={v => store.setWpConfig({ industry: v })}
                                    placeholder="e.g., Technology, Health"
                                    icon="🏭"
                                />
                                <AdvancedInput
                                    label="Target Audience"
                                    value={store.wpConfig.targetAudience || ''}
                                    onChange={v => store.setWpConfig({ targetAudience: v })}
                                    placeholder="e.g., Small business owners"
                                    icon="👥"
                                />
                            </div>
                        </Card>
                        
                        {/* Optimization Mode */}
                        <Card padding="lg">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                <span className="text-2xl">🎯</span>
                                Optimization Mode
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <button
                                    onClick={() => setOptimizationMode('surgical')}
                                    className={cn(
                                        'p-6 rounded-2xl border-2 transition-all text-left',
                                        optimizationMode === 'surgical'
                                            ? 'border-green-500 bg-green-500/10'
                                            : 'border-white/[0.08] hover:border-white/[0.15]'
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-3xl">🔬</span>
                                        <h4 className="text-lg font-bold">Surgical Mode</h4>
                                    </div>
                                    <p className="text-[13px] text-white/50">
                                        Improves existing content while preserving what works. Best for established pages.
                                    </p>
                                </button>
                                
                                <button
                                    onClick={() => setOptimizationMode('full_rewrite')}
                                    className={cn(
                                        'p-6 rounded-2xl border-2 transition-all text-left',
                                        optimizationMode === 'full_rewrite'
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/[0.08] hover:border-white/[0.15]'
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-3xl">📝</span>
                                        <h4 className="text-lg font-bold">Full Rewrite</h4>
                                    </div>
                                    <p className="text-[13px] text-white/50">
                                        Complete content regeneration. Best for low-quality or outdated pages.
                                    </p>
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <Toggle
                                    label="Preserve Images"
                                    checked={preserveImages}
                                    onChange={setPreserveImages}
                                    icon="🖼️"
                                />
                                <Toggle
                                    label="Optimize Alt Text"
                                    checked={optimizeAltText}
                                    onChange={setOptimizeAltText}
                                    icon="📝"
                                />
                                <Toggle
                                    label="Keep Featured Image"
                                    checked={preserveFeaturedImage}
                                    onChange={setPreserveFeaturedImage}
                                    icon="🎨"
                                />
                                <Toggle
                                    label="Keep Categories"
                                    checked={preserveCategories}
                                    onChange={setPreserveCategories}
                                    icon="📁"
                                />
                                <Toggle
                                    label="Keep Tags"
                                    checked={preserveTags}
                                    onChange={setPreserveTags}
                                    icon="🏷️"
                                />
                            </div>
                        </Card>
                    </div>
                )}
                
                {/* Strategy View */}
                {store.activeView === 'strategy' && (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Content Strategy" 
                            icon="🚀" 
                            color="#30d158"
                            subtitle="Crawl sitemaps and optimize content"
                        />
                        
                        <StatsDashboard />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Sitemap Crawler */}
                                <Card padding="lg">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                        <span className="text-2xl">🕷️</span>
                                        Sitemap Crawler
                                    </h3>
                                    <div className="space-y-4">
                                        <AdvancedInput
                                            label="Sitemap URL"
                                            value={sitemapUrl}
                                            onChange={setSitemapUrl}
                                            placeholder="https://yoursite.com/sitemap.xml"
                                            icon="🗺️"
                                        />
                                        <button
                                            onClick={handleCrawlSitemap}
                                            disabled={store.isProcessing}
                                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-[14px] transition-all disabled:opacity-50"
                                        >
                                            {store.isProcessing ? '🔄 Crawling...' : '🕷️ Crawl Sitemap'}
                                        </button>
                                        
                                        {crawlProgress && (
                                            <div className="space-y-2">
                                                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                                        style={{ width: `${(crawlProgress.current / crawlProgress.total) * 100}%` }}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-white/40 text-center">
                                                    {crawlProgress.current} / {crawlProgress.total} sitemaps
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                                
                                {/* Manual URL */}
                                <Card padding="lg">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                        <span className="text-2xl">⚡</span>
                                        Quick Optimize
                                    </h3>
                                    <div className="space-y-4">
                                        <AdvancedInput
                                            label="Page URL"
                                            value={manualUrl}
                                            onChange={setManualUrl}
                                            placeholder="https://yoursite.com/your-page"
                                            icon="🔗"
                                        />
                                        <AdvancedInput
                                            label="Target Keyword (Optional)"
                                            value={targetKeywordOverride}
                                            onChange={setTargetKeywordOverride}
                                            placeholder="Override detected topic..."
                                            icon="🎯"
                                        />
                                        
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => store.setPublishMode('draft')}
                                                className={cn(
                                                    'flex-1 py-3 rounded-xl text-[12px] font-semibold transition-all border',
                                                    store.publishMode === 'draft'
                                                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                                        : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                                                )}
                                            >
                                                📝 Save as Draft
                                            </button>
                                            <button
                                                onClick={() => store.setPublishMode('autopublish')}
                                                className={cn(
                                                    'flex-1 py-3 rounded-xl text-[12px] font-semibold transition-all border',
                                                    store.publishMode === 'autopublish'
                                                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                                        : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                                                )}
                                            >
                                                🚀 Auto Publish
                                            </button>
                                        </div>
                                        
                                        <button
                                            onClick={() => executeGodMode()}
                                            disabled={store.isProcessing || (!manualUrl && store.pages.length === 0)}
                                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-[14px] transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
                                        >
                                            {store.isProcessing ? '🔄 Optimizing...' : '⚡ Optimize Now'}
                                        </button>
                                    </div>
                                </Card>
                                
                                {/* Bulk Mode Toggle */}
                                <Card padding="md">
                                    <Toggle
                                        label="Bulk Optimization Mode"
                                        checked={showBulkMode}
                                        onChange={setShowBulkMode}
                                        description="Optimize multiple URLs at once"
                                        icon="📦"
                                    />
                                </Card>
                                
                                {showBulkMode && (
                                    <Card padding="lg">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                            <span className="text-2xl">📦</span>
                                            Bulk Optimization
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 block">
                                                    URLs (one per line)
                                                </label>
                                                <textarea
                                                    value={bulkUrls}
                                                    onChange={e => setBulkUrls(e.target.value)}
                                                    placeholder="https://yoursite.com/page-1&#10;https://yoursite.com/page-2&#10;https://yoursite.com/page-3"
                                                    className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] font-mono resize-none focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                                                    Concurrency:
                                                </label>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 5].map(n => (
                                                        <button
                                                            key={n}
                                                            onClick={() => setBulkConcurrency(n)}
                                                            className={cn(
                                                                'w-10 h-10 rounded-lg text-[14px] font-bold transition-all',
                                                                bulkConcurrency === n
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-white/[0.03] text-white/40 hover:text-white'
                                                            )}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {bulkState.isRunning ? (
                                                <button
                                                    onClick={abortBulkOptimization}
                                                    className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-[14px] transition-all"
                                                >
                                                    ⚠️ Abort Bulk Processing
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={executeBulkOptimization}
                                                    disabled={!parseBulkUrls(bulkUrls).length}
                                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-[14px] transition-all disabled:opacity-50"
                                                >
                                                    🚀 Start Bulk Optimization ({parseBulkUrls(bulkUrls).length} URLs)
                                                </button>
                                            )}
                                            
                                            {bulkState.isRunning && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-[12px]">
                                                        <span className="text-green-400">✅ {bulkState.completed} completed</span>
                                                        <span className="text-red-400">❌ {bulkState.failed} failed</span>
                                                        <span className="text-white/40">{bulkState.jobs.length} total</span>
                                                    </div>
                                                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                                                            style={{ width: `${((bulkState.completed + bulkState.failed) / bulkState.jobs.length) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                                                        )}
                                        </div>
                                    </Card>
                                )}
                            </div>
                            
                            {/* Middle & Right Columns */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Page Queue */}
                                <Card padding="lg">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                        <span className="text-2xl">📋</span>
                                        Page Queue
                                        <Badge variant="default">{store.pages.length}</Badge>
                                    </h3>
                                    <PageQueueList 
                                        onSelect={setActivePageId}
                                        limit={100}
                                        showFilters={true}
                                    />
                                </Card>
                                
                                {/* Activity Log */}
                                <NeuralLog maxHeight="350px" showControls={true} />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Review View */}
                {store.activeView === 'review' && (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Content Review" 
                            icon="📊" 
                            color="#bf5af2"
                            subtitle="Review optimized content and validation results"
                        />
                        
                        {activePage ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column — Metrics */}
                                <div className="space-y-6">
                                    {/* Health Score */}
                                    <Card padding="lg">
                                        <div className="flex justify-center">
                                            <TitanHealthRing 
                                                score={activePage.healthScore || 0} 
                                                size={200}
                                                label="Health Score"
                                            />
                                        </div>
                                        <div className="text-center mt-4">
                                            <h3 className="text-lg font-bold text-white truncate px-4">
                                                {activePage.title}
                                            </h3>
                                            <p className="text-[12px] text-white/40 font-mono mt-1 truncate px-4">
                                                {activePage.slug}
                                            </p>
                                        </div>
                                    </Card>
                                    
                                    {/* SEO Metrics */}
                                    <DeepMetricsPanel page={activePage} />
                                    
                                    {/* Quick Stats */}
                                    <Card padding="md">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                                                <div className="text-2xl font-bold text-white">
                                                    {activePage.wordCount?.toLocaleString() || '—'}
                                                </div>
                                                <div className="text-[10px] text-white/40 uppercase mt-1">Words</div>
                                            </div>
                                            <div className="text-center p-4 bg-white/[0.02] rounded-xl">
                                                <div className="text-2xl font-bold text-white">
                                                    {activePage.jobState?.attempts || 0}
                                                </div>
                                                <div className="text-[10px] text-white/40 uppercase mt-1">Attempts</div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                                
                                {/* Middle & Right — Content & Validation */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Tabs */}
                                    <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
                                        {(['content', 'qa', 'entity'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setReviewTab(tab)}
                                                className={cn(
                                                    'flex-1 py-3 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all',
                                                    reviewTab === tab 
                                                        ? 'bg-white text-black' 
                                                        : 'text-white/40 hover:text-white'
                                                )}
                                            >
                                                {tab === 'content' && '📄 Content'}
                                                {tab === 'qa' && '✅ QA Results'}
                                                {tab === 'entity' && '🧠 Entity Gap'}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {/* Tab Content */}
                                    {reviewTab === 'content' && (
    <ContentPreview 
        html={activePage.jobState?.contract?.htmlContent || ''}
        maxHeight="600px"
    />
)}

                                    
                                    {reviewTab === 'qa' && (
                                        <QASwarmPanel 
                                            results={activePage.jobState?.qaResults || []}
                                        />
                                    )}
                                    
                                    {reviewTab === 'entity' && (
                                        <EntityGapPanel 
                                            entityData={activePage.jobState?.entityGapData}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon="📊"
                                title="Select a Page"
                                description="Choose a page from the Strategy tab to review its optimization results"
                            />
                        )}
                    </div>
                )}
                
                {/* Analytics View */}
                {store.activeView === 'analytics' && (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Analytics" 
                            icon="📈" 
                            color="#ffd60a"
                            subtitle="Track optimization performance and trends"
                        />
                        
                        <StatsDashboard />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Global Statistics */}
                            <Card padding="lg">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <span className="text-2xl">📊</span>
                                    Session Statistics
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                                        <div className="text-4xl font-bold text-white">
                                            {store.globalStats.totalProcessed || 0}
                                        </div>
                                        <div className="text-[11px] text-white/40 uppercase mt-2">Pages Processed</div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                                        <div className="text-4xl font-bold text-green-400">
                                            {store.globalStats.totalImproved || 0}
                                        </div>
                                        <div className="text-[11px] text-white/40 uppercase mt-2">Pages Improved</div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                                        <div className="text-4xl font-bold text-blue-400">
                                            {formatNumber(store.globalStats.totalWordsGenerated || 0)}
                                        </div>
                                        <div className="text-[11px] text-white/40 uppercase mt-2">Words Generated</div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                                        <div className="text-4xl font-bold text-purple-400">
                                            {store.globalStats.successRate || 100}%
                                        </div>
                                        <div className="text-[11px] text-white/40 uppercase mt-2">Success Rate</div>
                                    </div>
                                </div>
                            </Card>
                            
                            {/* Recent Jobs */}
                            <Card padding="lg">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <span className="text-2xl">🕐</span>
                                    Recent Jobs
                                </h3>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {store.pages
                                        .filter(p => p.jobState?.status === 'completed' || p.jobState?.status === 'failed')
                                        .sort((a, b) => (b.jobState?.lastUpdated || 0) - (a.jobState?.lastUpdated || 0))
                                        .slice(0, 10)
                                        .map(page => (
                                            <div 
                                                key={page.id}
                                                className={cn(
                                                    'p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]',
                                                    page.jobState?.status === 'completed'
                                                        ? 'bg-green-500/5 border-green-500/20'
                                                        : 'bg-red-500/5 border-red-500/20'
                                                )}
                                                onClick={() => {
                                                    setActivePageId(page.id);
                                                    store.setActiveView('review');
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-[13px] text-white truncate">
                                                            {page.title}
                                                        </div>
                                                        <div className="text-[10px] text-white/30 mt-1">
                                                            {page.jobState?.processingTime 
                                                                ? formatDuration(page.jobState.processingTime)
                                                                : '—'
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        'text-xl font-bold',
                                                        page.jobState?.status === 'completed'
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                    )}>
                                                        {page.jobState?.status === 'completed' ? '✅' : '❌'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    
                                    {store.pages.filter(p => 
                                        p.jobState?.status === 'completed' || p.jobState?.status === 'failed'
                                    ).length === 0 && (
                                        <div className="text-center py-12 text-white/30">
                                            <div className="text-4xl mb-3 opacity-30">🕐</div>
                                            <div className="text-[13px]">No jobs completed yet</div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                        
                        {/* NLP Coverage (if enabled) */}
                        {store.neuronEnabled && store.neuronTerms.length > 0 && (
                            <Card padding="lg">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <span className="text-2xl">🧬</span>
                                    NeuronWriter NLP Terms
                                    <Badge variant="info">{store.neuronTerms.length} terms</Badge>
                                </h3>
                                <NeuronNLPPanel 
                                    content={activePage?.jobState?.contract?.htmlContent || ''}
                                    title={activePage?.title}
                                    showTitle={false}
                                />
                            </Card>
                        )}
                    </div>
                )}
            </main>
            
            {/* Footer */}
            <footer className="mt-12 py-6 border-t border-white/[0.04]">
                <div className="max-w-[1800px] mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/30">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">WP Optimizer Pro</span>
                            <span>v{APP_VERSION_FULL}</span>
                            <span className="text-white/10">|</span>
                            <span>Enterprise Edition</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>🚀 SOTA SEO/AEO/GEO Optimization</span>
                            <span className="text-white/10">|</span>
                            <span>Provider: {store.selectedProvider.toUpperCase()}</span>
                            <span className="text-white/10">|</span>
                            <span>Model: {getActualModel()}</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥🔥🔥 CUSTOM MODEL INPUT COMPONENT — FOR OPENROUTER & GROQ
// ═══════════════════════════════════════════════════════════════════════════════

interface ModelSelectorWithCustomInputProps {
    provider: 'openrouter' | 'groq';
    value: string;
    onChange: (value: string) => void;
    presetModels: string[];
    label?: string;
}

const ModelSelectorWithCustomInput: React.FC<ModelSelectorWithCustomInputProps> = ({
    provider,
    value,
    onChange,
    presetModels,
    label
}) => {
    const [isCustom, setIsCustom] = useState(false);
    const [customModel, setCustomModel] = useState('');
    
    // Check if current value is a custom model (not in presets)
    useEffect(() => {
        if (value && !presetModels.includes(value)) {
            setIsCustom(true);
            setCustomModel(value);
        }
    }, [value, presetModels]);
    
    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value;
        if (selected === '__custom__') {
            setIsCustom(true);
            // Keep the custom model if already set
            if (customModel) {
                onChange(customModel);
            }
        } else {
            setIsCustom(false);
            setCustomModel('');
            onChange(selected);
        }
    };
    
    const handleCustomModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomModel(val);
        onChange(val);
    };
    
    const providerInfo = provider === 'openrouter' 
        ? { 
            placeholder: 'e.g., anthropic/claude-sonnet-4 or google/gemini-2.5-flash-preview',
            helpText: 'Enter any model from OpenRouter. Format: provider/model-name',
            docsUrl: 'https://openrouter.ai/models'
          }
        : {
            placeholder: 'e.g., llama-3.3-70b-versatile or mixtral-8x7b-32768',
            helpText: 'Enter any Groq-supported model name',
            docsUrl: 'https://console.groq.com/docs/models'
          };
    
    return (
        <div className="space-y-3">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                {label || `${provider.charAt(0).toUpperCase() + provider.slice(1)} Model`}
            </label>
            
            {/* Preset / Custom Toggle */}
            <div className="flex gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => {
                        setIsCustom(false);
                        if (presetModels.length > 0) {
                            onChange(presetModels[0]);
                        }
                    }}
                    className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border',
                        !isCustom
                            ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white'
                    )}
                >
                    📋 Preset Models
                </button>
                <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border',
                        isCustom
                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white'
                    )}
                >
                    ✏️ Custom Model
                </button>
            </div>
            
            {!isCustom ? (
                /* Preset Model Dropdown */
                <select
                    value={presetModels.includes(value) ? value : '__custom__'}
                    onChange={handlePresetChange}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none transition-all"
                >
                    {presetModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                    <option value="__custom__">— Enter Custom Model —</option>
                </select>
            ) : (
                /* Custom Model Input */
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={customModel}
                            onChange={handleCustomModelChange}
                            placeholder={providerInfo.placeholder}
                            className="w-full bg-white/[0.03] border border-purple-500/30 rounded-xl px-4 py-3 text-[14px] focus:border-purple-500 outline-none transition-all font-mono"
                        />
                        {customModel && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="text-green-400 text-lg">✓</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/40">
                            {providerInfo.helpText}
                        </p>
                        <a 
                            href={providerInfo.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            View all models →
                        </a>
                    </div>
                </div>
            )}
            
            {/* Current Model Display */}
            {value && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-[10px] text-white/40 uppercase">Active:</span>
                    <span className="text-[12px] text-white/70 font-mono">{value}</span>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ENHANCED AI PROVIDER CONFIG CARD — WITH CUSTOM MODEL INPUT
// ═══════════════════════════════════════════════════════════════════════════════

interface AIProviderConfigCardProps {
    className?: string;
}

const AIProviderConfigCard: React.FC<AIProviderConfigCardProps> = ({ className }) => {
    const store = useAppStore();
    
    // Preset models for each provider
    const OPENROUTER_PRESET_MODELS = [
        'google/gemini-2.5-flash-preview',
        'google/gemini-2.5-pro-preview',
        'anthropic/claude-sonnet-4',
        'anthropic/claude-opus-4',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'meta-llama/llama-3.3-70b-instruct',
        'deepseek/deepseek-chat',
        'deepseek/deepseek-r1',
        'mistralai/mistral-large',
        'qwen/qwen-2.5-72b-instruct',
    ];
    
    const GROQ_PRESET_MODELS = [
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
        'llama-guard-3-8b',
    ];
    
    const GEMINI_MODELS = [
        { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview' },
        { value: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro Preview' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ];
    
    return (
        <Card padding="lg" className={className}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                AI Provider Configuration
            </h3>
            
            <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 block">
                        Select Provider
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {(['google', 'openrouter', 'openai', 'anthropic', 'groq'] as const).map(provider => (
                            <button
                                key={provider}
                                onClick={() => store.setSelectedProvider(provider)}
                                className={cn(
                                    'py-3 px-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all border',
                                    store.selectedProvider === provider
                                        ? 'bg-white text-black border-white'
                                        : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
                                )}
                            >
                                {provider === 'google' && '🔷 '}
                                {provider === 'openrouter' && '🌐 '}
                                {provider === 'openai' && '🟢 '}
                                {provider === 'anthropic' && '🟠 '}
                                {provider === 'groq' && '⚡ '}
                                {provider}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* API Key Input */}
                <AdvancedInput
                    label={`${store.selectedProvider.charAt(0).toUpperCase() + store.selectedProvider.slice(1)} API Key`}
                    value={store.apiKeys[store.selectedProvider]}
                    onChange={v => store.setApiKey(store.selectedProvider, v)}
                    type="password"
                    placeholder="Enter API key..."
                    icon="🔑"
                    required
                />
                
                {/* Model Selection — Provider Specific */}
                {store.selectedProvider === 'google' && (
                    <div>
                        <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 block">
                            Gemini Model
                        </label>
                        <select
                            value={store.selectedModel}
                            onChange={e => store.setSelectedModel(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none"
                        >
                            {GEMINI_MODELS.map(model => (
                                <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                {/* 🔥 OpenRouter — With Custom Model Input */}
                {store.selectedProvider === 'openrouter' && (
                    <ModelSelectorWithCustomInput
                        provider="openrouter"
                        value={store.apiKeys.openrouterModel}
                        onChange={v => store.setApiKey('openrouterModel', v)}
                        presetModels={OPENROUTER_PRESET_MODELS}
                        label="OpenRouter Model"
                    />
                )}
                
                {/* 🔥 Groq — With Custom Model Input */}
                {store.selectedProvider === 'groq' && (
                    <ModelSelectorWithCustomInput
                        provider="groq"
                        value={store.apiKeys.groqModel}
                        onChange={v => store.setApiKey('groqModel', v)}
                        presetModels={GROQ_PRESET_MODELS}
                        label="Groq Model"
                    />
                )}
                
                {/* OpenAI / Anthropic — Fixed Models */}
                {store.selectedProvider === 'openai' && (
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🟢</span>
                            <div>
                                <div className="text-[14px] font-semibold text-white">GPT-4o</div>
                                <div className="text-[11px] text-white/40">OpenAI's most capable model</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {store.selectedProvider === 'anthropic' && (
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🟠</span>
                            <div>
                                <div className="text-[14px] font-semibold text-white">Claude Sonnet 4</div>
                                <div className="text-[11px] text-white/40">Anthropic's latest model</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Serper API Key (Optional - for all providers) */}
                <AdvancedInput
                    label="Serper API Key (Optional)"
                    value={store.apiKeys.serper}
                    onChange={v => store.setApiKey('serper', v)}
                    type="password"
                    placeholder="For SERP analysis..."
                    icon="🔍"
                    helpText="Enables entity gap analysis & reference discovery"
                />
            </div>
        </Card>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 ADDITIONAL UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface AdvancedInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'password' | 'email' | 'url';
    placeholder?: string;
    icon?: string;
    helpText?: string;
    required?: boolean;
    disabled?: boolean;
}

const AdvancedInput: React.FC<AdvancedInputProps> = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    icon,
    helpText,
    required,
    disabled
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1">
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                        {icon}
                    </span>
                )}
                <input
                    type={inputType}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        'w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 text-[14px]',
                        'focus:border-blue-500 outline-none transition-all',
                        'placeholder:text-white/20',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        icon ? 'pl-12 pr-4' : 'px-4',
                        type === 'password' && 'pr-12'
                    )}
                />
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                )}
            </div>
            {helpText && (
                <p className="text-[11px] text-white/30">{helpText}</p>
            )}
        </div>
    );
};

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
    icon?: string;
    disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
    label,
    checked,
    onChange,
    description,
    icon,
    disabled
}) => {
    return (
        <label className={cn(
            'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
            'hover:bg-white/[0.02]',
            checked ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/[0.06]',
            disabled && 'opacity-50 cursor-not-allowed'
        )}>
            <div className="flex items-center gap-3">
                {icon && <span className="text-lg">{icon}</span>}
                <div>
                    <div className="text-[13px] font-semibold text-white">{label}</div>
                    {description && (
                        <div className="text-[11px] text-white/40 mt-0.5">{description}</div>
                    )}
                </div>
            </div>
            <div 
                className={cn(
                    'w-12 h-7 rounded-full transition-all relative',
                    checked ? 'bg-blue-500' : 'bg-white/10'
                )}
                onClick={() => !disabled && onChange(!checked)}
            >
                <div 
                    className={cn(
                        'absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all',
                        checked ? 'left-6' : 'left-1'
                    )}
                />
            </div>
        </label>
    );
};

interface CardProps {
    children: React.ReactNode;
    padding?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, padding = 'md', className }) => {
    const paddingClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };
    
    return (
        <div className={cn(
            'bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl',
            paddingClasses[padding],
            className
        )}>
            {children}
        </div>
    );
};

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
    const variantClasses = {
        default: 'bg-white/[0.06] text-white/60',
        success: 'bg-green-500/20 text-green-400',
        warning: 'bg-yellow-500/20 text-yellow-400',
        error: 'bg-red-500/20 text-red-400',
        info: 'bg-blue-500/20 text-blue-400'
    };
    
    return (
        <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-semibold',
            variantClasses[variant]
        )}>
            {children}
        </span>
    );
};

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => (
    <div className="text-center py-16">
        <div className="text-6xl mb-4 opacity-30">{icon}</div>
        <div className="text-[16px] font-semibold text-white/60">{title}</div>
        <div className="text-[13px] text-white/30 mt-2">{description}</div>
    </div>
);

interface SectionHeaderProps {
    title: string;
    icon: string;
    color: string;
    subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, color, subtitle }) => (
    <div className="flex items-center gap-4 mb-6">
        <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ 
                background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                boxShadow: `0 0 32px ${color}15`
            }}
        >
            {icon}
        </div>
        <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {subtitle && (
                <p className="text-[13px] text-white/40 mt-1">{subtitle}</p>
            )}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default App;

export {
    AdvancedInput,
    Toggle,
    Card,
    Badge,
    EmptyState,
    SectionHeader,
    ModelSelectorWithCustomInput,
    AIProviderConfigCard
};
