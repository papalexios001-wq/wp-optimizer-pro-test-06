// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v38.0 — ULTIMATE ENTERPRISE AI ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════
// 
// CRITICAL FIX: generateEnhanced() method was MISSING — now included
// 
// COMPLETE FEATURE SET:
// ✅ generateEnhanced() — Staged pipeline with outline → sections → merge
// ✅ generateSingleShot() — Single-shot generation with visual injection
// ✅ generate() — Default entry point (calls generateEnhanced)
// ✅ 25+ Visual Components — Injected via Content Breathing Engine
// ✅ YouTube Discovery — Serper.dev powered video search & embedding
// ✅ Reference Discovery — Authority-scored citation system
// ✅ Internal Link Injection — Semantic NLP-lite anchor matching
// ✅ JSON Healing — 5-strategy recovery for malformed LLM responses
// ✅ Circuit Breaker — Fails fast on repeated API errors
// ✅ Multi-Provider — Google, OpenRouter, OpenAI, Anthropic, Groq
// ✅ Schema.org — FAQ, HowTo, VideoObject structured data
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenAI } from '@google/genai';
import {
    ContentContract,     
    GenerateConfig, 
    SiteContext, 
    EntityGapAnalysis,
    NeuronAnalysisResult, 
    ExistingContentAnalysis, 
    InternalLinkTarget,
    ValidatedReference, 
    GeoTargetConfig, 
    NeuronTerm, 
    APP_VERSION,
    InternalLinkResult
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const AI_ORCHESTRATOR_VERSION = "38.0.0";

const TIMEOUTS = {
    OUTLINE_GENERATION: 60000,
    SECTION_GENERATION: 90000,
    MERGE_GENERATION: 120000,
    SINGLE_SHOT: 180000,
    REFERENCE_DISCOVERY: 30000,
    YOUTUBE_SEARCH: 20000,
} as const;

const CONTENT_TARGETS = {
    MIN_WORDS: 3000,
    TARGET_WORDS: 4500,
    MAX_WORDS: 6000,
    SECTION_WORDS: 400,
} as const;

const LINK_CONFIG = {
    MAX_TOTAL: 15,
    MAX_PER_SECTION: 2,
    MIN_WORDS_BETWEEN: 150,
} as const;

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
export const CONTENT_YEAR = currentMonth === 11 ? currentYear + 1 : currentYear;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const TOKENS = {
    colors: {
        primary: '#6366f1',
        primaryDark: '#4f46e5',
        primaryLight: '#818cf8',
        primaryBg: '#eef2ff',
        primaryBorder: '#c7d2fe',
        success: '#22c55e',
        successDark: '#16a34a',
        successBg: '#f0fdf4',
        successBorder: '#bbf7d0',
        warning: '#f59e0b',
        warningDark: '#d97706',
        warningBg: '#fffbeb',
        warningBorder: '#fde68a',
        danger: '#ef4444',
        dangerDark: '#dc2626',
        dangerBg: '#fef2f2',
        dangerBorder: '#fecaca',
        info: '#3b82f6',
        infoDark: '#2563eb',
        infoBg: '#eff6ff',
        infoBorder: '#bfdbfe',
        white: '#ffffff',
        gray50: '#f8fafc',
        gray100: '#f1f5f9',
        gray200: '#e2e8f0',
        gray300: '#cbd5e1',
        gray400: '#94a3b8',
        gray500: '#64748b',
        gray600: '#475569',
        gray700: '#334155',
        gray800: '#1e293b',
        gray900: '#0f172a',
    },
    gradients: {
        primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        teal: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        sunset: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        ocean: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        midnight: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
    },
    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        lg: '0 12px 32px rgba(0,0,0,0.12)',
        xl: '0 20px 48px rgba(0,0,0,0.15)',
        primary: '0 12px 28px rgba(99,102,241,0.35)',
        success: '0 12px 28px rgba(34,197,94,0.35)',
        danger: '0 12px 28px rgba(239,68,68,0.35)',
        info: '0 12px 28px rgba(59,130,246,0.35)',
        purple: '0 20px 40px rgba(102,126,234,0.35)',
        teal: '0 16px 36px rgba(17,153,142,0.3)'
    },
    radius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
        full: '50%'
    }
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface StageProgress {
    stage: 'outline' | 'sections' | 'youtube' | 'references' | 'merge' | 'polish' | 'validation';
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

export interface YouTubeVideoData {
    videoId: string;
    title: string;
    channel: string;
    views: number;
    duration?: string;
    thumbnailUrl: string;
    embedUrl: string;
    relevanceScore: number;
    description?: string;
}

export interface DiscoveredReference {
    url: string;
    title: string;
    source: string;
    snippet?: string;
    year?: string | number;
    authorityScore: number;
    favicon?: string;
}

interface ContentOutline {
    title: string;
    metaDescription: string;
    slug: string;
    sections: Array<{
        heading: string;
        keyPoints: string[];
        subsections: Array<{ heading: string; keyPoints: string[] }>;
    }>;
    faqTopics: string[];
    keyTakeaways: string[];
}

type LogFunction = (msg: string, progress?: number) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

const circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();

function getCircuitBreaker(provider: string) {
    if (!circuitBreakers.has(provider)) {
        circuitBreakers.set(provider, { failures: 0, lastFailure: 0, isOpen: false });
    }
    return circuitBreakers.get(provider)!;
}

function recordFailure(provider: string, log: LogFunction): void {
    const breaker = getCircuitBreaker(provider);
    breaker.failures++;
    breaker.lastFailure = Date.now();
    if (breaker.failures >= 3) {
        breaker.isOpen = true;
        log(`⚡ Circuit breaker OPEN for ${provider}`);
    }
}

function recordSuccess(provider: string): void {
    const breaker = getCircuitBreaker(provider);
    breaker.failures = 0;
    breaker.isOpen = false;
}

function isCircuitOpen(provider: string): boolean {
    const breaker = getCircuitBreaker(provider);
    if (!breaker.isOpen) return false;
    if (Date.now() - breaker.lastFailure > 60000) {
        breaker.isOpen = false;
        return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function escapeHtml(str: string): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function countWords(text: string): number {
    if (!text) return 0;
    return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUniqueId(): string {
    return `wpo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'source';
    }
}

function truncate(str: string, max: number): string {
    if (!str || str.length <= max) return str || '';
    return str.substring(0, max - 3) + '...';
}

function isValidArray<T>(arr: T[] | undefined | null): arr is T[] {
    return Array.isArray(arr) && arr.length > 0;
}

function isValidString(str: string | undefined | null): str is string {
    return typeof str === 'string' && str.trim().length > 0;
}

function extractSlugFromUrl(url: string): string {
    try {
        const parts = new URL(url).pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    } catch {
        return url.split('/').filter(Boolean).pop() || '';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 THEME-ADAPTIVE CSS
// ═══════════════════════════════════════════════════════════════════════════════

export const THEME_ADAPTIVE_CSS = `
<style>
#wpo-engine-root, #wpo-engine-root *, #wpo-engine-root *::before, #wpo-engine-root *::after {
    box-sizing: border-box !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}
#wpo-engine-root {
    line-height: 1.7 !important;
    color: ${TOKENS.colors.gray800} !important;
    font-size: 18px !important;
    max-width: 100% !important;
}
#wpo-engine-root img { max-width: 100% !important; height: auto !important; display: block !important; }
#wpo-engine-root a { text-decoration: none !important; transition: opacity 0.2s ease !important; }
#wpo-engine-root a:hover { opacity: 0.85 !important; }
#wpo-engine-root ul, #wpo-engine-root ol { list-style: none !important; padding: 0 !important; margin: 0 !important; }
#wpo-engine-root p { margin: 0 0 1rem 0 !important; }
#wpo-engine-root h2, #wpo-engine-root h3, #wpo-engine-root h4 { margin: 0 !important; line-height: 1.3 !important; }
#wpo-engine-root details summary { cursor: pointer !important; list-style: none !important; }
#wpo-engine-root details summary::-webkit-details-marker { display: none !important; }
#wpo-engine-root details summary::marker { display: none !important; }
#wpo-engine-root .wpo-video-wrap { position: relative !important; padding-bottom: 56.25% !important; height: 0 !important; overflow: hidden !important; }
#wpo-engine-root .wpo-video-wrap iframe { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: none !important; }
@media (max-width: 640px) { #wpo-engine-root { font-size: 16px !important; } }
</style>
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 1: QUICK ANSWER BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createQuickAnswerBox(answer: string, title: string = 'Quick Answer'): string {
    if (!isValidString(answer)) return '';
    
    return `
<div style="background: ${TOKENS.gradients.purple} !important; border-radius: ${TOKENS.radius.xl} !important; padding: 32px !important; margin: 40px 0 !important; color: ${TOKENS.colors.white} !important; box-shadow: ${TOKENS.shadows.purple} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 24px !important; flex-wrap: wrap !important;">
        <div style="width: 64px !important; height: 64px !important; min-width: 64px !important; background: rgba(255,255,255,0.2) !important; backdrop-filter: blur(10px) !important; border-radius: ${TOKENS.radius.lg} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
            <span style="font-size: 32px !important; line-height: 1 !important;">⚡</span>
        </div>
        <div style="flex: 1 !important; min-width: 250px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 2px !important; color: rgba(255,255,255,0.9) !important; margin-bottom: 10px !important;">${escapeHtml(title)}</div>
            <p style="font-size: 18px !important; line-height: 1.7 !important; color: ${TOKENS.colors.white} !important; margin: 0 !important; font-weight: 500 !important;">${answer}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 2: PRO TIP BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createProTipBox(tip: string, title: string = 'Pro Tip'): string {
    if (!isValidString(tip)) return '';
    
    return `
<div style="background: ${TOKENS.gradients.teal} !important; border-radius: ${TOKENS.radius.xl} !important; padding: 28px 32px !important; margin: 36px 0 !important; color: ${TOKENS.colors.white} !important; box-shadow: ${TOKENS.shadows.teal} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 20px !important; flex-wrap: wrap !important;">
        <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: rgba(255,255,255,0.2) !important; backdrop-filter: blur(10px) !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
            <span style="font-size: 28px !important; line-height: 1 !important;">💡</span>
        </div>
        <div style="flex: 1 !important; min-width: 250px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 2px !important; color: rgba(255,255,255,0.9) !important; margin-bottom: 8px !important;">${escapeHtml(title)}</div>
            <p style="font-size: 16px !important; line-height: 1.7 !important; color: ${TOKENS.colors.white} !important; margin: 0 !important;">${tip}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 3: WARNING BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createWarningBox(warning: string, title: string = 'Warning'): string {
    if (!isValidString(warning)) return '';
    
    return `
<div style="background: ${TOKENS.gradients.sunset} !important; border-radius: ${TOKENS.radius.xl} !important; padding: 28px 32px !important; margin: 36px 0 !important; color: ${TOKENS.colors.white} !important; box-shadow: 0 16px 36px rgba(245,87,108,0.3) !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 20px !important; flex-wrap: wrap !important;">
        <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: rgba(255,255,255,0.2) !important; backdrop-filter: blur(10px) !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
            <span style="font-size: 28px !important; line-height: 1 !important;">⚠️</span>
        </div>
        <div style="flex: 1 !important; min-width: 250px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 2px !important; color: rgba(255,255,255,0.9) !important; margin-bottom: 8px !important;">${escapeHtml(title)}</div>
            <p style="font-size: 16px !important; line-height: 1.7 !important; color: ${TOKENS.colors.white} !important; margin: 0 !important;">${warning}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 4: EXPERT QUOTE BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createExpertQuoteBox(quote: string, author: string, title?: string): string {
    if (!isValidString(quote) || !isValidString(author)) return '';
    
    return `
<blockquote style="background: linear-gradient(135deg, ${TOKENS.colors.primaryBg} 0%, #f0f4ff 100%) !important; border-left: 5px solid ${TOKENS.colors.primary} !important; border-radius: 0 ${TOKENS.radius.xl} ${TOKENS.radius.xl} 0 !important; padding: 32px 36px !important; margin: 40px 0 !important; box-shadow: ${TOKENS.shadows.md} !important; font-style: normal !important; overflow: hidden !important;">
    <div style="font-size: 48px !important; color: ${TOKENS.colors.primary} !important; opacity: 0.4 !important; line-height: 1 !important; margin-bottom: 12px !important; font-family: Georgia, serif !important;">"</div>
    <p style="font-size: 19px !important; line-height: 1.8 !important; font-style: italic !important; margin: 0 0 24px 0 !important; color: ${TOKENS.colors.gray800} !important;">${quote}</p>
    <footer style="display: flex !important; align-items: center !important; gap: 16px !important; flex-wrap: wrap !important;">
        <div style="width: 52px !important; height: 52px !important; min-width: 52px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.full} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important;">
            <span style="font-size: 24px !important;">👤</span>
        </div>
        <div>
            <cite style="font-style: normal !important; font-weight: 800 !important; font-size: 16px !important; display: block !important; color: ${TOKENS.colors.gray800} !important;">${escapeHtml(author)}</cite>
            ${title ? `<span style="font-size: 14px !important; color: ${TOKENS.colors.gray500} !important;">${escapeHtml(title)}</span>` : ''}
        </div>
    </footer>
</blockquote>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 5: HIGHLIGHT BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createHighlightBox(text: string, icon: string = '✨', bgColor: string = TOKENS.colors.primary): string {
    if (!isValidString(text)) return '';
    
    return `
<div style="background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%) !important; border-radius: ${TOKENS.radius.xl} !important; padding: 30px 36px !important; margin: 40px 0 !important; box-shadow: 0 16px 40px ${bgColor}40 !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 20px !important; flex-wrap: wrap !important;">
        <span style="font-size: 42px !important; line-height: 1 !important; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2)) !important;">${icon}</span>
        <p style="flex: 1 !important; font-size: 18px !important; line-height: 1.7 !important; color: ${TOKENS.colors.white} !important; margin: 0 !important; font-weight: 600 !important; min-width: 200px !important;">${text}</p>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 6: CALLOUT BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createCalloutBox(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
    if (!isValidString(text)) return '';
    
    const configs = {
        info: { bg: TOKENS.colors.infoBg, border: TOKENS.colors.info, icon: 'ℹ️', label: 'Info' },
        success: { bg: TOKENS.colors.successBg, border: TOKENS.colors.success, icon: '✅', label: 'Success' },
        warning: { bg: TOKENS.colors.warningBg, border: TOKENS.colors.warning, icon: '⚡', label: 'Note' },
        error: { bg: TOKENS.colors.dangerBg, border: TOKENS.colors.danger, icon: '🔥', label: 'Important' }
    };
    const c = configs[type];
    
    return `
<div style="background: ${c.bg} !important; border: none !important; border-left: 5px solid ${c.border} !important; border-radius: 0 ${TOKENS.radius.lg} ${TOKENS.radius.lg} 0 !important; padding: 24px 28px !important; margin: 32px 0 !important; box-shadow: ${TOKENS.shadows.sm} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 16px !important; flex-wrap: wrap !important;">
        <span style="font-size: 26px !important; line-height: 1 !important;">${c.icon}</span>
        <div style="flex: 1 !important; min-width: 200px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; color: ${c.border} !important; margin-bottom: 6px !important;">${c.label}</div>
            <p style="font-size: 15px !important; line-height: 1.7 !important; color: ${TOKENS.colors.gray700} !important; margin: 0 !important;">${text}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 7: STATISTICS BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createStatisticsBox(stats: Array<{ value: string; label: string; icon?: string }>): string {
    if (!isValidArray(stats)) return '';
    
    const items = stats.map(stat => `
        <div style="flex: 1 !important; min-width: 140px !important; text-align: center !important; padding: 28px 20px !important; background: ${TOKENS.colors.white} !important; border-radius: ${TOKENS.radius.lg} !important; box-shadow: ${TOKENS.shadows.md} !important; border: 1px solid ${TOKENS.colors.gray100} !important;">
            ${stat.icon ? `<div style="font-size: 28px !important; margin-bottom: 12px !important;">${stat.icon}</div>` : ''}
            <div style="font-size: 36px !important; font-weight: 900 !important; background: ${TOKENS.gradients.primary} !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; background-clip: text !important; margin-bottom: 8px !important; line-height: 1 !important;">${escapeHtml(stat.value)}</div>
            <div style="font-size: 12px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; color: ${TOKENS.colors.gray500} !important;">${escapeHtml(stat.label)}</div>
        </div>
    `).join('');

    return `
<div style="background: linear-gradient(135deg, ${TOKENS.colors.gray50} 0%, ${TOKENS.colors.gray100} 100%) !important; border: 1px solid ${TOKENS.colors.gray200} !important; border-radius: ${TOKENS.radius.xxl} !important; padding: 32px !important; margin: 48px 0 !important; overflow: hidden !important;">
    <div style="display: flex !important; flex-wrap: wrap !important; justify-content: center !important; gap: 20px !important;">
        ${items}
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 8: DATA TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export function createDataTable(title: string, headers: string[], rows: string[][], sourceNote?: string): string {
    if (!isValidString(title) || !isValidArray(headers) || !isValidArray(rows)) return '';
    
    const headerCells = headers.map(h => `
        <th style="padding: 16px 20px !important; text-align: left !important; font-size: 12px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; background: ${TOKENS.colors.gray100} !important; color: ${TOKENS.colors.primary} !important; border-bottom: 2px solid ${TOKENS.colors.primaryBorder} !important;">${escapeHtml(h)}</th>
    `).join('');
    
    const tableRows = rows.map((row, i) => {
        const cells = row.map((cell, j) => `
            <td style="padding: 16px 20px !important; font-size: 14px !important; border-bottom: 1px solid ${TOKENS.colors.gray100} !important; color: ${TOKENS.colors.gray700} !important; ${j === 0 ? 'font-weight: 600 !important;' : ''} background: ${i % 2 === 0 ? TOKENS.colors.white : TOKENS.colors.gray50} !important;">${escapeHtml(cell)}</td>
        `).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
<div style="border-radius: ${TOKENS.radius.xl} !important; overflow: hidden !important; margin: 48px 0 !important; box-shadow: ${TOKENS.shadows.lg} !important; border: 1px solid ${TOKENS.colors.gray200} !important;">
    <div style="padding: 24px 28px !important; background: linear-gradient(135deg, ${TOKENS.colors.gray50} 0%, ${TOKENS.colors.gray100} 100%) !important; border-bottom: 1px solid ${TOKENS.colors.gray200} !important;">
        <div style="display: flex !important; align-items: center !important; gap: 16px !important; flex-wrap: wrap !important;">
            <div style="width: 52px !important; height: 52px !important; min-width: 52px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important;">
                <span style="font-size: 24px !important;">📊</span>
            </div>
            <div>
                <h4 style="font-size: 20px !important; font-weight: 800 !important; margin: 0 !important; color: ${TOKENS.colors.gray800} !important;">${escapeHtml(title)}</h4>
                ${sourceNote ? `<p style="font-size: 13px !important; color: ${TOKENS.colors.gray500} !important; margin: 4px 0 0 0 !important;">Source: ${escapeHtml(sourceNote)}</p>` : ''}
            </div>
        </div>
    </div>
    <div style="overflow-x: auto !important;">
        <table style="width: 100% !important; border-collapse: collapse !important; min-width: 450px !important;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 9: CHECKLIST BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createChecklistBox(title: string, items: string[], icon: string = '✅'): string {
    if (!isValidString(title) || !isValidArray(items)) return '';
    
    const listItems = items.map((item, i) => `
        <li style="display: flex !important; align-items: flex-start !important; gap: 16px !important; padding: 16px 0 !important; ${i < items.length - 1 ? `border-bottom: 1px solid ${TOKENS.colors.successBorder} !important;` : ''}">
            <span style="font-size: 22px !important; line-height: 1.4 !important; flex-shrink: 0 !important;">${icon}</span>
            <span style="font-size: 15px !important; line-height: 1.7 !important; color: ${TOKENS.colors.gray700} !important;">${escapeHtml(item)}</span>
        </li>
    `).join('');

    return `
<div style="background: linear-gradient(135deg, ${TOKENS.colors.successBg} 0%, #ecfdf5 100%) !important; border: 2px solid ${TOKENS.colors.successBorder} !important; border-radius: ${TOKENS.radius.xl} !important; padding: 32px !important; margin: 40px 0 !important; box-shadow: ${TOKENS.shadows.md} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 16px !important; margin-bottom: 24px !important; flex-wrap: wrap !important;">
        <div style="width: 52px !important; height: 52px !important; min-width: 52px !important; background: ${TOKENS.gradients.success} !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.success} !important;">
            <span style="font-size: 24px !important;">📝</span>
        </div>
        <h4 style="font-size: 22px !important; font-weight: 800 !important; margin: 0 !important; color: #166534 !important;">${escapeHtml(title)}</h4>
    </div>
    <ul style="list-style: none !important; padding: 0 !important; margin: 0 !important;">${listItems}</ul>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 10: STEP-BY-STEP BOX (with HowTo Schema)
// ═══════════════════════════════════════════════════════════════════════════════

export function createStepByStepBox(title: string, steps: Array<{ title: string; description: string }>): string {
    if (!isValidString(title) || !isValidArray(steps)) return '';
    
    const howToSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": title,
        "step": steps.map((step, i) => ({
            "@type": "HowToStep",
            "position": i + 1,
            "name": step.title,
            "text": step.description
        }))
    };
    
    const stepItems = steps.map((step, i) => `
        <div style="display: flex !important; gap: 24px !important; ${i < steps.length - 1 ? `padding-bottom: 28px !important; margin-bottom: 28px !important; border-bottom: 2px dashed ${TOKENS.colors.primaryBorder} !important;` : ''}">
            <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.full} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important; flex-shrink: 0 !important;">
                <span style="font-size: 22px !important; font-weight: 900 !important; color: ${TOKENS.colors.white} !important;">${i + 1}</span>
            </div>
            <div style="flex: 1 !important; padding-top: 8px !important;">
                <h5 style="font-size: 18px !important; font-weight: 800 !important; margin: 0 0 10px 0 !important; color: ${TOKENS.colors.gray800} !important;">${escapeHtml(step.title)}</h5>
                <p style="font-size: 15px !important; line-height: 1.7 !important; color: ${TOKENS.colors.gray500} !important; margin: 0 !important;">${escapeHtml(step.description)}</p>
            </div>
        </div>
    `).join('');

    return `
<script type="application/ld+json">${JSON.stringify(howToSchema)}</script>
<div style="background: linear-gradient(135deg, ${TOKENS.colors.primaryBg} 0%, ${TOKENS.colors.primaryBorder}40 100%) !important; border: 2px solid ${TOKENS.colors.primaryBorder} !important; border-radius: ${TOKENS.radius.xxl} !important; padding: 36px !important; margin: 48px 0 !important; box-shadow: ${TOKENS.shadows.md} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 18px !important; margin-bottom: 32px !important; flex-wrap: wrap !important;">
        <div style="width: 60px !important; height: 60px !important; min-width: 60px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.xl} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important;">
            <span style="font-size: 28px !important;">📋</span>
        </div>
        <h4 style="font-size: 24px !important; font-weight: 800 !important; margin: 0 !important; color: #3730a3 !important;">${escapeHtml(title)}</h4>
    </div>
    ${stepItems}
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 11: COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export function createComparisonTable(title: string, headers: [string, string], rows: Array<[string, string]>): string {
    if (!isValidString(title) || !isValidArray(rows)) return '';
    
    const tableRows = rows.map(row => `
        <tr>
            <td style="padding: 18px 22px !important; background: ${TOKENS.colors.dangerBg} !important; width: 50% !important; vertical-align: top !important; border-bottom: 1px solid ${TOKENS.colors.dangerBorder} !important;">
                <span style="color: ${TOKENS.colors.danger} !important; margin-right: 12px !important; font-size: 18px !important;">✗</span>
                <span style="color: #7f1d1d !important; font-size: 15px !important;">${escapeHtml(row[0])}</span>
            </td>
            <td style="padding: 18px 22px !important; background: ${TOKENS.colors.successBg} !important; width: 50% !important; vertical-align: top !important; border-bottom: 1px solid ${TOKENS.colors.successBorder} !important;">
                <span style="color: ${TOKENS.colors.success} !important; margin-right: 12px !important; font-size: 18px !important;">✓</span>
                <span style="color: #166534 !important; font-size: 15px !important;">${escapeHtml(row[1])}</span>
            </td>
        </tr>
    `).join('');

    return `
<div style="border-radius: ${TOKENS.radius.xl} !important; overflow: hidden !important; margin: 48px 0 !important; box-shadow: ${TOKENS.shadows.lg} !important; border: 1px solid ${TOKENS.colors.gray200} !important;">
    <div style="padding: 22px 28px !important; background: linear-gradient(135deg, ${TOKENS.colors.gray50} 0%, ${TOKENS.colors.gray100} 100%) !important; border-bottom: 1px solid ${TOKENS.colors.gray200} !important;">
        <div style="display: flex !important; align-items: center !important; gap: 14px !important; flex-wrap: wrap !important;">
            <span style="font-size: 28px !important;">⚖️</span>
            <h4 style="font-size: 20px !important; font-weight: 800 !important; margin: 0 !important; color: ${TOKENS.colors.gray800} !important;">${escapeHtml(title)}</h4>
        </div>
    </div>
    <table style="width: 100% !important; border-collapse: collapse !important;">
        <thead>
            <tr>
                <th style="padding: 16px 22px !important; text-align: left !important; font-size: 12px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; background: ${TOKENS.colors.dangerBg} !important; color: ${TOKENS.colors.danger} !important;">${escapeHtml(headers[0])}</th>
                <th style="padding: 16px 22px !important; text-align: left !important; font-size: 12px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; background: ${TOKENS.colors.successBg} !important; color: ${TOKENS.colors.success} !important;">${escapeHtml(headers[1])}</th>
            </tr>
        </thead>
        <tbody>${tableRows}</tbody>
    </table>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 12: DEFINITION BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createDefinitionBox(term: string, definition: string): string {
    if (!isValidString(term) || !isValidString(definition)) return '';
    
    return `
<div style="background: linear-gradient(135deg, ${TOKENS.colors.infoBg} 0%, #dbeafe 100%) !important; border-left: 5px solid ${TOKENS.colors.info} !important; border-radius: 0 ${TOKENS.radius.xl} ${TOKENS.radius.xl} 0 !important; padding: 28px 32px !important; margin: 40px 0 !important; box-shadow: ${TOKENS.shadows.md} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 20px !important; flex-wrap: wrap !important;">
        <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: ${TOKENS.gradients.info} !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.info} !important; flex-shrink: 0 !important;">
            <span style="font-size: 26px !important;">📖</span>
        </div>
        <div style="flex: 1 !important; min-width: 200px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; color: ${TOKENS.colors.info} !important; margin-bottom: 6px !important;">Definition</div>
            <h5 style="font-size: 20px !important; font-weight: 800 !important; margin: 0 0 10px 0 !important; color: ${TOKENS.colors.gray800} !important;">${escapeHtml(term)}</h5>
            <p style="font-size: 15px !important; line-height: 1.7 !important; color: ${TOKENS.colors.gray600} !important; margin: 0 !important;">${definition}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 13: KEY TAKEAWAYS
// ═══════════════════════════════════════════════════════════════════════════════

export function createKeyTakeaways(takeaways: string[]): string {
    if (!isValidArray(takeaways)) return '';
    
    const items = takeaways.map((t, i) => `
        <li style="display: flex !important; align-items: flex-start !important; gap: 18px !important; padding: 20px 0 !important; ${i < takeaways.length - 1 ? `border-bottom: 1px solid ${TOKENS.colors.primaryBorder} !important;` : ''}">
            <span style="min-width: 40px !important; height: 40px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; color: ${TOKENS.colors.white} !important; font-size: 15px !important; font-weight: 900 !important; box-shadow: ${TOKENS.shadows.primary} !important; flex-shrink: 0 !important;">${i + 1}</span>
            <span style="font-size: 16px !important; line-height: 1.7 !important; color: ${TOKENS.colors.gray700} !important; padding-top: 8px !important;">${escapeHtml(t)}</span>
        </li>
    `).join('');

    return `
<div style="background: linear-gradient(135deg, ${TOKENS.colors.primaryBg} 0%, ${TOKENS.colors.primaryBorder}50 100%) !important; border: 2px solid ${TOKENS.colors.primaryBorder} !important; border-radius: ${TOKENS.radius.xxl} !important; padding: 40px !important; margin: 56px 0 !important; box-shadow: ${TOKENS.shadows.md} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 20px !important; margin-bottom: 32px !important; padding-bottom: 28px !important; border-bottom: 2px solid ${TOKENS.colors.primaryBorder} !important; flex-wrap: wrap !important;">
        <div style="width: 68px !important; height: 68px !important; min-width: 68px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.xl} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important;">
            <span style="font-size: 34px !important;">🎯</span>
        </div>
        <div>
            <h3 style="font-size: 26px !important; font-weight: 800 !important; margin: 0 !important; color: #3730a3 !important;">Key Takeaways</h3>
            <p style="font-size: 15px !important; color: ${TOKENS.colors.gray500} !important; margin: 6px 0 0 0 !important;">The essential points to remember</p>
        </div>
    </div>
    <ul style="list-style: none !important; padding: 0 !important; margin: 0 !important;">${items}</ul>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 14: FAQ ACCORDION (with Schema.org)
// ═══════════════════════════════════════════════════════════════════════════════

export function createFAQAccordion(faqs: Array<{ question: string; answer: string }>): string {
    if (!isValidArray(faqs)) return '';
    
    const validFaqs = faqs.filter(f => isValidString(f.question) && isValidString(f.answer));
    if (validFaqs.length === 0) return '';
    
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": validFaqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": { "@type": "Answer", "text": faq.answer.replace(/<[^>]*>/g, '') }
        }))
    };
    
    const items = validFaqs.map(faq => `
        <details style="border: 1px solid ${TOKENS.colors.gray200} !important; border-radius: ${TOKENS.radius.md} !important; margin-bottom: 14px !important; background: ${TOKENS.colors.white} !important; overflow: hidden !important;" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <summary style="padding: 20px 24px !important; cursor: pointer !important; font-weight: 700 !important; font-size: 16px !important; color: ${TOKENS.colors.gray800} !important; list-style: none !important; display: flex !important; justify-content: space-between !important; align-items: center !important; background: ${TOKENS.colors.white} !important;" itemprop="name">
                <span style="flex: 1 !important; padding-right: 18px !important; line-height: 1.4 !important;">${escapeHtml(faq.question)}</span>
                <span style="width: 32px !important; height: 32px !important; border-radius: ${TOKENS.radius.full} !important; background: ${TOKENS.colors.gray100} !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 12px !important; color: ${TOKENS.colors.primary} !important; flex-shrink: 0 !important;">▼</span>
            </summary>
            <div style="padding: 0 24px 24px 24px !important; font-size: 15px !important; line-height: 1.8 !important; color: ${TOKENS.colors.gray600} !important; background: ${TOKENS.colors.gray50} !important; border-top: 1px solid ${TOKENS.colors.gray200} !important;" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <div itemprop="text" style="padding-top: 20px !important;">${faq.answer}</div>
            </div>
        </details>
    `).join('');

    return `
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<section itemscope itemtype="https://schema.org/FAQPage" style="margin: 56px 0 !important;">
    <div style="display: flex !important; align-items: center !important; gap: 18px !important; margin-bottom: 32px !important; flex-wrap: wrap !important;">
        <div style="width: 64px !important; height: 64px !important; min-width: 64px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.xl} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important;">
            <span style="font-size: 30px !important;">❓</span>
        </div>
        <div>
            <h2 style="font-size: 26px !important; font-weight: 800 !important; margin: 0 !important; color: ${TOKENS.colors.gray800} !important;">Frequently Asked Questions</h2>
            <p style="font-size: 15px !important; color: ${TOKENS.colors.gray500} !important; margin: 6px 0 0 0 !important;">${validFaqs.length} questions answered</p>
        </div>
    </div>
    <div>${items}</div>
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 15: YOUTUBE EMBED (with Schema)
// ═══════════════════════════════════════════════════════════════════════════════

export function createYouTubeEmbed(video: YouTubeVideoData): string {
    if (!video?.videoId) {
        console.error('[WPO] createYouTubeEmbed: Missing videoId', video);
        return '';
    }
    
    const titleEscaped = escapeHtml(video.title || 'Watch Video');
    
    const videoSchema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": video.title || 'Video',
        "description": video.description || `Video about ${video.title}`,
        "thumbnailUrl": [`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`],
        "uploadDate": new Date().toISOString().split('T')[0],
        "embedUrl": `https://www.youtube.com/embed/${video.videoId}`,
        "contentUrl": `https://www.youtube.com/watch?v=${video.videoId}`
    };

    return `
<script type="application/ld+json">${JSON.stringify(videoSchema)}</script>
<div style="margin: 52px 0 !important; border-radius: ${TOKENS.radius.xl} !important; overflow: hidden !important; box-shadow: ${TOKENS.shadows.xl} !important; border: none !important; background: #000 !important;">
    <div class="wpo-video-wrap" style="position: relative !important; padding-bottom: 56.25% !important; height: 0 !important; overflow: hidden !important; background: #000 !important;">
        <iframe 
            src="https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1&enablejsapi=1"
            srcdoc="<style>*{padding:0;margin:0;overflow:hidden}html,body{height:100%}img,span{position:absolute;width:100%;top:0;bottom:0;margin:auto}span{height:80px;width:80px;background:rgba(255,0,0,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;left:50%;transform:translateX(-50%)}</style><a href='https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1'><img src='https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg' alt='${titleEscaped}'><span style='font-size:36px;color:white'>▶</span></a>"
            title="${titleEscaped}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            loading="lazy"
            style="position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: none !important;"
        ></iframe>
    </div>
    <div style="padding: 22px 28px !important; background: ${TOKENS.gradients.midnight} !important;">
        <div style="display: flex !important; align-items: center !important; gap: 18px !important; flex-wrap: wrap !important;">
            <div style="width: 54px !important; height: 54px !important; min-width: 54px !important; background: #ff0000 !important; border-radius: ${TOKENS.radius.md} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 6px 16px rgba(255,0,0,0.3) !important;">
                <span style="font-size: 26px !important;">▶️</span>
            </div>
            <div style="flex: 1 !important; min-width: 200px !important;">
                <h4 style="font-size: 17px !important; font-weight: 700 !important; margin: 0 0 8px 0 !important; color: ${TOKENS.colors.white} !important; line-height: 1.4 !important;">${escapeHtml(truncate(video.title, 60))}</h4>
                <div style="display: flex !important; gap: 18px !important; flex-wrap: wrap !important; font-size: 13px !important; color: rgba(255,255,255,0.75) !important;">
                    <span>📺 ${escapeHtml(video.channel)}</span>
                    <span>👁️ ${video.views?.toLocaleString() || 0} views</span>
                    ${video.duration ? `<span>⏱️ ${escapeHtml(video.duration)}</span>` : ''}
                </div>
            </div>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 16: REFERENCES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createReferencesSection(references: DiscoveredReference[]): string {
    if (!isValidArray(references)) return '';
    
    const validRefs = references.filter(r => isValidString(r.url) && isValidString(r.title)).slice(0, 10);
    if (validRefs.length === 0) return '';
    
    const items = validRefs.map((ref, i) => {
        const yearDisplay = ref.year ? ` (${ref.year})` : '';
        const authorityBadge = (ref.authorityScore && ref.authorityScore >= 80) 
            ? `<span style="background: ${TOKENS.colors.successBg} !important; color: ${TOKENS.colors.successDark} !important; padding: 3px 10px !important; border-radius: 6px !important; font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; margin-left: 10px !important;">HIGH AUTHORITY</span>` 
            : '';
        
        return `
        <li style="display: flex !important; align-items: flex-start !important; gap: 16px !important; padding: 18px 0 !important; ${i < validRefs.length - 1 ? `border-bottom: 1px solid ${TOKENS.colors.gray100} !important;` : ''}">
            <span style="min-width: 32px !important; height: 32px !important; background: ${TOKENS.colors.primaryBg} !important; border-radius: ${TOKENS.radius.sm} !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 13px !important; font-weight: 800 !important; color: ${TOKENS.colors.primary} !important; flex-shrink: 0 !important;">${i + 1}</span>
            <div style="flex: 1 !important; min-width: 0 !important;">
                <a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer nofollow" style="font-weight: 700 !important; color: ${TOKENS.colors.primary} !important; text-decoration: none !important; display: block !important; margin-bottom: 6px !important; font-size: 16px !important; line-height: 1.4 !important;">
                    ${escapeHtml(truncate(ref.title, 80))}${yearDisplay}
                </a>
                <div style="display: flex !important; align-items: center !important; gap: 10px !important; flex-wrap: wrap !important; font-size: 13px !important; color: ${TOKENS.colors.gray500} !important;">
                    ${ref.favicon ? `<img src="${escapeHtml(ref.favicon)}" alt="" width="16" height="16" style="border-radius: 4px !important;" onerror="this.style.display='none'">` : ''}
                    <span>${escapeHtml(ref.source)}</span>
                    ${authorityBadge}
                </div>
                ${ref.snippet ? `<p style="font-size: 14px !important; line-height: 1.6 !important; margin: 10px 0 0 0 !important; color: ${TOKENS.colors.gray500} !important;">${escapeHtml(truncate(ref.snippet, 150))}</p>` : ''}
            </div>
        </li>`;
    }).join('');

    return `
<section style="background: ${TOKENS.colors.gray50} !important; border-radius: ${TOKENS.radius.xl} !important; padding: 36px !important; margin: 56px 0 !important; box-shadow: ${TOKENS.shadows.md} !important; border: 1px solid ${TOKENS.colors.gray200} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 18px !important; margin-bottom: 28px !important; padding-bottom: 24px !important; border-bottom: 2px solid ${TOKENS.colors.gray200} !important; flex-wrap: wrap !important;">
        <div style="width: 60px !important; height: 60px !important; min-width: 60px !important; background: ${TOKENS.gradients.primary} !important; border-radius: ${TOKENS.radius.lg} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${TOKENS.shadows.primary} !important;">
            <span style="font-size: 28px !important;">📚</span>
        </div>
        <div>
            <h2 style="font-size: 24px !important; font-weight: 800 !important; margin: 0 !important; color: ${TOKENS.colors.gray800} !important;">References & Sources</h2>
            <p style="font-size: 15px !important; color: ${TOKENS.colors.gray500} !important; margin: 6px 0 0 0 !important;">${validRefs.length} authoritative sources</p>
        </div>
    </div>
    <ul style="list-style: none !important; padding: 0 !important; margin: 0 !important;">${items}</ul>
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE VIDEO DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════════

function extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
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
    const str = viewString.toString().toLowerCase().replace(/,/g, '');
    const multipliers: Record<string, number> = { 'k': 1000, 'm': 1000000, 'b': 1000000000 };
    for (const [suffix, mult] of Object.entries(multipliers)) {
        if (str.includes(suffix)) return Math.round(parseFloat(str.replace(/[^0-9.]/g, '')) * mult);
    }
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

export async function searchYouTubeVideo(
    topic: string,
    serperApiKey: string,
    log: LogFunction
): Promise<YouTubeVideoData | null> {
    log(`   🎬 Searching YouTube for: "${topic.substring(0, 50)}..."`);
    
    const queries = [
        `${topic} tutorial guide`,
        `${topic} explained ${CONTENT_YEAR}`,
        `${topic} how to`,
        `best ${topic} tutorial`
    ];
    const allVideos: YouTubeVideoData[] = [];
    
    for (const query of queries) {
        try {
            const response = await fetch('https://google.serper.dev/videos', {
                method: 'POST',
                headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: query, gl: 'us', hl: 'en', num: 10 })
            });
            
            if (!response.ok) {
                log(`   ⚠️ YouTube search API error: ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            
            for (const video of (data.videos || [])) {
                if (!video.link?.includes('youtube.com') && !video.link?.includes('youtu.be')) continue;
                
                const videoId = extractYouTubeVideoId(video.link);
                if (!videoId || allVideos.some(v => v.videoId === videoId)) continue;
                
                const views = parseViewCount(video.views);
                if (views < 3000) continue;
                
                const titleLower = (video.title || '').toLowerCase();
                const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const matchingWords = topicWords.filter(w => titleLower.includes(w)).length;
                let relevanceScore = 50 + Math.min(30, (matchingWords / Math.max(topicWords.length, 1)) * 30);
                if (views >= 1000000) relevanceScore += 15;
                else if (views >= 100000) relevanceScore += 10;
                else if (views >= 50000) relevanceScore += 5;
                
                allVideos.push({
                    videoId,
                    title: video.title || 'Video',
                    channel: video.channel || 'Unknown',
                    views,
                    duration: video.duration,
                    thumbnailUrl: video.imageUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    relevanceScore: Math.min(100, relevanceScore)
                });
            }
            
            if (allVideos.filter(v => v.relevanceScore >= 60).length >= 3) break;
        } catch (err: any) {
            log(`   ⚠️ YouTube search error: ${err.message}`);
        }
        
        await sleep(200);
    }
    
    allVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    if (allVideos.length === 0) {
        log(`   ⚠️ No suitable YouTube videos found`);
        return null;
    }
    
    const best = allVideos[0];
    log(`   ✅ Found: "${best.title.substring(0, 50)}..." (${best.views.toLocaleString()} views, score: ${best.relevanceScore})`);
    return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 REFERENCE DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════════

const AUTHORITY_DOMAINS = {
    government: ['.gov', '.gov.uk', '.edu'],
    scientific: ['nature.com', 'science.org', 'pubmed.gov', 'ncbi.nlm.nih.gov', 'nih.gov', 'cdc.gov', 'who.int', 'mayoclinic.org'],
    majorNews: ['reuters.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'wsj.com', 'bloomberg.com', 'forbes.com'],
    tech: ['techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com', 'hbr.org'],
    reference: ['wikipedia.org', 'britannica.com', 'investopedia.com', 'statista.com']
};

function calculateAuthorityScore(url: string): number {
    const urlLower = url.toLowerCase();
    for (const d of AUTHORITY_DOMAINS.government) if (urlLower.includes(d)) return 95;
    for (const d of AUTHORITY_DOMAINS.scientific) if (urlLower.includes(d)) return 88;
    for (const d of AUTHORITY_DOMAINS.majorNews) if (urlLower.includes(d)) return 82;
    for (const d of AUTHORITY_DOMAINS.tech) if (urlLower.includes(d)) return 75;
    for (const d of AUTHORITY_DOMAINS.reference) if (urlLower.includes(d)) return 72;
    return url.startsWith('https://') ? 50 : 30;
}

function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        const sourceMap: Record<string, string> = {
            'nytimes.com': 'The New York Times', 'washingtonpost.com': 'The Washington Post', 'theguardian.com': 'The Guardian',
            'bbc.com': 'BBC', 'reuters.com': 'Reuters', 'bloomberg.com': 'Bloomberg', 'forbes.com': 'Forbes',
            'mayoclinic.org': 'Mayo Clinic', 'nih.gov': 'NIH', 'cdc.gov': 'CDC', 'who.int': 'WHO',
            'wikipedia.org': 'Wikipedia', 'investopedia.com': 'Investopedia', 'hbr.org': 'Harvard Business Review'
        };
        return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
        return 'Source';
    }
}

export async function discoverReferences(
    topic: string,
    serperApiKey: string,
    options: { targetCount?: number; minAuthorityScore?: number } = {},
    log: LogFunction
): Promise<DiscoveredReference[]> {
    const { targetCount = 10, minAuthorityScore = 60 } = options;
    
    log(`   📚 Discovering references for: "${topic.substring(0, 40)}..."`);
    
    const allRefs: DiscoveredReference[] = [];
    const queries = [
        `${topic} research study statistics`,
        `${topic} expert guide official`,
        `${topic} site:edu OR site:gov`
    ];
    
    const skipDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'pinterest.com', 'reddit.com', 'quora.com', 'linkedin.com', 'medium.com', 'tiktok.com'];
    
    for (const query of queries) {
        try {
            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: query, gl: 'us', hl: 'en', num: 10 })
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            for (const result of (data.organic || [])) {
                if (!result.link || !result.title) continue;
                
                const urlLower = result.link.toLowerCase();
                if (skipDomains.some(d => urlLower.includes(d))) continue;
                
                const authorityScore = calculateAuthorityScore(result.link);
                if (authorityScore < minAuthorityScore) continue;
                if (allRefs.some(r => r.url === result.link)) continue;
                
                const yearMatch = (result.title + ' ' + (result.snippet || '')).match(/\b(20[0-2][0-9])\b/);
                
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
        } catch {}
        
        await sleep(300);
    }
    
    const sorted = allRefs.sort((a, b) => b.authorityScore - a.authorityScore).slice(0, targetCount);
    
    log(`   ✅ Found ${sorted.length} authoritative references`);
    
    return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 INTERNAL LINK INJECTION — SEMANTIC MATCHING ONLY
// ═══════════════════════════════════════════════════════════════════════════════

export function injectInternalLinksDistributed(
    html: string,
    linkTargets: InternalLinkTarget[],
    currentUrl: string,
    log: LogFunction
): { html: string; linksAdded: InternalLinkResult[]; totalLinks: number } {
    
    log(`   🔗 Internal Link Injection starting...`);
    log(`      → HTML length: ${html?.length || 0} chars`);
    log(`      → Link targets: ${linkTargets?.length || 0}`);
    
    if (!html || !linkTargets || !Array.isArray(linkTargets) || linkTargets.length === 0) {
        log(`   ❌ ABORT: Invalid inputs`);
        return { html: html || '', linksAdded: [], totalLinks: 0 };
    }
    
    const linksAdded: InternalLinkResult[] = [];
    
    const availableTargets = linkTargets.filter(t => {
        if (!t?.url || !t?.title) return false;
        if (currentUrl && t.url === currentUrl) return false;
        return true;
    }).slice(0, 30);
    
    log(`      → Available targets: ${availableTargets.length}`);
    
    if (availableTargets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }
    
    const sectionSplitRegex = /(<h2[^>]*>)/gi;
    const parts = html.split(sectionSplitRegex);
    
    let totalLinksAdded = 0;
    let targetIndex = 0;
    let lastLinkWordPos = 0;
    let currentWordPos = 0;
    
    const processedParts = parts.map((part, partIndex) => {
        if (part.match(/<h2/i) || partIndex === 0) {
            currentWordPos += countWords(part);
            return part;
        }
        
        if (totalLinksAdded >= LINK_CONFIG.MAX_TOTAL) {
            currentWordPos += countWords(part);
            return part;
        }
        
        let sectionLinksAdded = 0;
        let processedPart = part;
        
        const paraRegex = /<p[^>]*>([\s\S]{30,}?)<\/p>/gi;
        let match;
        const paragraphs: Array<{ full: string; text: string; plainText: string; pos: number }> = [];
        
        while ((match = paraRegex.exec(part)) !== null) {
            const plainText = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            paragraphs.push({ 
                full: match[0], 
                text: match[1], 
                plainText,
                pos: match.index 
            });
        }
        
        for (const para of paragraphs) {
            if (sectionLinksAdded >= LINK_CONFIG.MAX_PER_SECTION) break;
            if (totalLinksAdded >= LINK_CONFIG.MAX_TOTAL) break;
            if (targetIndex >= availableTargets.length) break;
            
            const paraWordPos = currentWordPos + countWords(part.substring(0, para.pos));
            
            if (paraWordPos - lastLinkWordPos < LINK_CONFIG.MIN_WORDS_BETWEEN && linksAdded.length > 0) {
                continue;
            }
            
            const target = availableTargets[targetIndex];
            const anchorText = findSemanticAnchor(para.plainText, target, log);
            
            if (anchorText && anchorText.length >= 4) {
                const link = `<a href="${escapeHtml(target.url)}" title="${escapeHtml(target.title)}" style="color: ${TOKENS.colors.primary} !important; font-weight: 600 !important; text-decoration: underline !important; text-decoration-color: ${TOKENS.colors.primaryBorder} !important;">${anchorText}</a>`;
                
                const escapedAnchor = anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const simpleRegex = new RegExp(`\\b${escapedAnchor}\\b`, 'i');
                
                const matchResult = para.full.match(simpleRegex);
                if (matchResult) {
                    const matchIndex = para.full.search(simpleRegex);
                    const beforeMatch = para.full.substring(0, matchIndex);
                    
                    const openBrackets = (beforeMatch.match(/<(?![^>]*>)/g) || []).length;
                    const closeBrackets = (beforeMatch.match(/>/g) || []).length;
                    const insideTag = openBrackets > closeBrackets;
                    
                    if (!insideTag) {
                        const newPara = para.full.replace(simpleRegex, link);
                        
                        if (newPara !== para.full) {
                            processedPart = processedPart.replace(para.full, newPara);
                            linksAdded.push({ 
                                url: target.url, 
                                anchorText, 
                                relevanceScore: 0.8, 
                                position: paraWordPos 
                            });
                            sectionLinksAdded++;
                            totalLinksAdded++;
                            lastLinkWordPos = paraWordPos;
                            
                            log(`      ✅ Link ${totalLinksAdded}: "${anchorText}" → ${target.url.substring(0, 40)}...`);
                        }
                    }
                }
            }
            
            targetIndex++;
        }
        
        currentWordPos += countWords(part);
        return processedPart;
    });
    
    log(`   🔗 RESULT: ${totalLinksAdded} links injected`);
    
    return {
        html: processedParts.join(''),
        linksAdded,
        totalLinks: totalLinksAdded
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 SEMANTIC ANCHOR TEXT FINDER — NO GENERIC FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

function findSemanticAnchor(text: string, target: InternalLinkTarget, log: LogFunction): string {
    if (!text || !target?.title) return '';
    
    const textLower = text.toLowerCase();
    const titleLower = target.title.toLowerCase();
    
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
        'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
        'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 
        'may', 'might', 'must', 'can', 'need', 'about', 'after', 'again', 'all', 
        'any', 'because', 'before', 'between', 'both', 'during', 'each', 'few', 
        'here', 'how', 'into', 'its', 'just', 'more', 'most', 'no', 'nor', 'not', 
        'now', 'off', 'once', 'only', 'other', 'our', 'out', 'over', 'own', 'same', 
        'so', 'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there', 
        'these', 'they', 'this', 'those', 'through', 'too', 'under', 'until', 'up', 
        'very', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'your', 
        'best', 'top', 'guide', 'complete', 'ultimate', 'how', 'way', 'ways', 
        'tips', 'step', 'steps', 'make', 'get', 'use', 'using', 'new', 'first'
    ]);
    
    const titleWords = titleLower
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
    
    if (titleWords.length === 0) return '';
    
    // Strategy 1: Find exact 2-4 word phrase from title
    for (let len = Math.min(4, titleWords.length); len >= 2; len--) {
        for (let start = 0; start <= titleWords.length - len; start++) {
            const phrase = titleWords.slice(start, start + len).join(' ');
            if (phrase.length >= 5 && phrase.length <= 40 && textLower.includes(phrase)) {
                const idx = textLower.indexOf(phrase);
                return text.substring(idx, idx + phrase.length);
            }
        }
    }
    
    // Strategy 2: Find important word (5+ chars) with adjacent word
    const importantWords = titleWords.filter(w => w.length >= 5);
    
    for (const word of importantWords) {
        const wordIdx = textLower.indexOf(word);
        if (wordIdx === -1) continue;
        
        const actualWord = text.substring(wordIdx, wordIdx + word.length);
        
        const afterText = text.substring(wordIdx + word.length, wordIdx + word.length + 30);
        const afterMatch = afterText.match(/^\s*([a-zA-Z]{3,15})/);
        if (afterMatch && !stopWords.has(afterMatch[1].toLowerCase())) {
            const anchor = `${actualWord} ${afterMatch[1]}`;
            if (anchor.length >= 8 && anchor.length <= 35) return anchor;
        }
        
        const beforeText = text.substring(Math.max(0, wordIdx - 30), wordIdx);
        const beforeMatch = beforeText.match(/([a-zA-Z]{3,15})\s*$/);
        if (beforeMatch && !stopWords.has(beforeMatch[1].toLowerCase())) {
            const anchor = `${beforeMatch[1]} ${actualWord}`;
            if (anchor.length >= 8 && anchor.length <= 35) return anchor;
        }
        
        if (word.length >= 7) return actualWord;
    }
    
    // Strategy 3: Find any 4+ char title word
    for (const word of titleWords) {
        if (word.length < 4) continue;
        
        const wordIdx = textLower.indexOf(word);
        if (wordIdx === -1) continue;
        
        const actualWord = text.substring(wordIdx, wordIdx + word.length);
        
        const afterText = text.substring(wordIdx + word.length, wordIdx + word.length + 25);
        const afterMatch = afterText.match(/^\s*([a-zA-Z]{3,12})/);
        if (afterMatch && !stopWords.has(afterMatch[1].toLowerCase())) {
            return `${actualWord} ${afterMatch[1]}`;
        }
        
        if (word.length >= 6) return actualWord;
    }
    
    // Strategy 4: Slug-derived words
    if (target.slug && target.slug.length > 5) {
        const slugWords = target.slug.replace(/-/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !stopWords.has(w));
        
        for (const word of slugWords) {
            const wordIdx = textLower.indexOf(word);
            if (wordIdx !== -1 && word.length >= 5) {
                return text.substring(wordIdx, wordIdx + word.length);
            }
        }
    }
    
    // NO GENERIC FALLBACK — Return empty to skip irrelevant anchors
    return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 JSON HEALING (5-Strategy Recovery)
// ═══════════════════════════════════════════════════════════════════════════════

function healJSON(rawText: string, log: LogFunction): { success: boolean; data?: any; error?: string } {
    if (!rawText?.trim()) return { success: false, error: 'Empty response' };
    
    let text = rawText.trim();
    
    // Strategy 1: Direct parse
    try {
        const parsed = JSON.parse(text);
        if (parsed.htmlContent) return { success: true, data: parsed };
    } catch {}
    
    // Strategy 2: Extract from markdown code block
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            const parsed = JSON.parse(jsonBlockMatch[1].trim());
            if (parsed.htmlContent) {
                log('   ✓ JSON extracted from markdown');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    // Strategy 3: Find JSON by boundaries
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
            if (parsed.htmlContent) {
                log('   ✓ JSON extracted by boundary detection');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    // Strategy 4: Fix trailing commas
    let fixed = text.replace(/,(\s*[}\]])/g, '$1');
    try {
        const parsed = JSON.parse(fixed);
        if (parsed.htmlContent) {
            log('   ✓ JSON healed with syntax fixes');
            return { success: true, data: parsed };
        }
    } catch {}
    
    // Strategy 5: Close unclosed brackets
    const ob = (text.match(/\{/g) || []).length;
    const cb = (text.match(/\}/g) || []).length;
    if (ob > cb) {
        let closedText = text + '}'.repeat(ob - cb);
        try {
            const parsed = JSON.parse(closedText);
            if (parsed.htmlContent) {
                log('   ✓ JSON healed by closing brackets');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    return { success: false, error: 'JSON parse failed' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 LLM CALLERS (Multi-Provider Support)
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
    const { temperature = 0.7, maxTokens = 8000 } = options;
    
    if (isCircuitOpen(provider)) throw new Error(`Circuit breaker OPEN for ${provider}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        let response: string;
        
        switch (provider) {
            case 'google':
                const ai = new GoogleGenAI({ apiKey: apiKeys.google });
                const geminiResponse = await ai.models.generateContent({
                    model: model || 'gemini-2.5-flash-preview-05-20',
                    contents: userPrompt,
                    config: { systemInstruction: systemPrompt, temperature, maxOutputTokens: maxTokens }
                });
                response = geminiResponse.text || '';
                break;
            case 'openrouter':
                const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKeys.openrouter}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://wp-optimizer-pro.com', 'X-Title': 'WP Optimizer Pro' },
                    body: JSON.stringify({ model: apiKeys.openrouterModel || model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
                    signal: controller.signal
                });
                if (!orRes.ok) throw new Error(`OpenRouter error ${orRes.status}`);
                const orData = await orRes.json();
                response = orData.choices?.[0]?.message?.content || '';
                break;
            case 'openai':
                const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKeys.openai}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
                    signal: controller.signal
                });
                if (!oaiRes.ok) throw new Error(`OpenAI error ${oaiRes.status}`);
                const oaiData = await oaiRes.json();
                response = oaiData.choices?.[0]?.message?.content || '';
                break;
            case 'anthropic':
                const antRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'x-api-key': apiKeys.anthropic, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
                    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', system: systemPrompt, messages: [{ role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
                    signal: controller.signal
                });
                if (!antRes.ok) throw new Error(`Anthropic error ${antRes.status}`);
                const antData = await antRes.json();
                response = antData.content?.[0]?.text || '';
                break;
            case 'groq':
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKeys.groq}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: apiKeys.groqModel || 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: Math.min(maxTokens, 8000) }),
                    signal: controller.signal
                });
                if (!groqRes.ok) throw new Error(`Groq error ${groqRes.status}`);
                const groqData = await groqRes.json();
                response = groqData.choices?.[0]?.message?.content || '';
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
        
        clearTimeout(timeoutId);
        recordSuccess(provider);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.message?.includes('401') || error.message?.includes('429') || error.message?.includes('500')) {
            recordFailure(provider, log);
        }
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 H1 REMOVAL
// ═══════════════════════════════════════════════════════════════════════════════

function removeAllH1Tags(html: string, log: LogFunction): string {
    if (!html) return html;
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0) return html;
    
    log(`   ⚠️ Removing ${h1Count} H1 tag(s)...`);
    let cleaned = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '').replace(/<\/h1>/gi, '');
    return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(config: { topic: string; targetWords: number }): string {
    return `You are an expert SEO content writer. Generate comprehensive, human-written blog content.

TARGET: ${config.targetWords}+ words of REAL, VALUABLE content about "${config.topic}".

STRUCTURE RULES:
• NEVER use H1 tags — WordPress provides the title
• Use 8-12 H2 sections with 2-3 H3 subsections each
• Include visual engagement elements naturally

WRITING STYLE (Human, NOT AI):
• Use contractions (don't, won't, you'll)
• Short paragraphs (2-4 sentences max)
• Mix sentence lengths
• Address reader as "you"
• Start sentences with And, But, So, Look

BANNED PHRASES (NEVER USE):
• "In today's fast-paced world"
• "It's important to note"
• "Let's dive in"
• "Comprehensive guide"
• "Leverage", "utilize", "delve"

OUTPUT: Valid JSON only:
{
  "title": "string (50-60 chars)",
  "metaDescription": "string (150-160 chars)",
  "slug": "string",
  "htmlContent": "string (all HTML)",
  "excerpt": "string",
  "faqs": [{"question": "string", "answer": "string"}],
  "wordCount": number
}

⚠️ Return ONLY valid JSON.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN ORCHESTRATOR CLASS — WITH ALL THREE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

class AIOrchestrator {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📋 generateEnhanced() — STAGED PIPELINE (THE CRITICAL METHOD!)
    // ═══════════════════════════════════════════════════════════════════════════
    
    async generateEnhanced(
        config: GenerateConfig,
        log: LogFunction,
        onStageProgress?: (progress: StageProgress) => void
    ): Promise<GenerationResult> {
        const startTime = Date.now();
        log(`🚀 STAGED PIPELINE v${AI_ORCHESTRATOR_VERSION}`);
        log(`   → Topic: "${config.topic.substring(0, 50)}..."`);
        log(`   → Provider: ${config.provider} | Model: ${config.model}`);
        
        let youtubeVideo: YouTubeVideoData | null = null;
        let references: DiscoveredReference[] = [];
        
        try {
            // ═══════════════════════════════════════════════════════════════
            // STAGE 1: GENERATE OUTLINE
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'outline', progress: 10, message: 'Generating content outline...' });
            log(`📋 Stage 1: Generating content outline...`);
            
            const outlinePrompt = `Create a detailed content outline for: "${config.topic}"

Output JSON:
{
  "title": "Compelling title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "sections": [
    {
      "heading": "H2 Section Title",
      "keyPoints": ["Point 1", "Point 2"],
      "subsections": [{"heading": "H3 Title", "keyPoints": ["Detail"]}]
    }
  ],
  "faqTopics": ["Question 1?", "Question 2?"],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2"]
}

REQUIREMENTS:
- 8-12 main sections (H2s)
- 2-3 subsections (H3s) per section
- 8-10 FAQ topics
- 5-7 key takeaways

Return ONLY valid JSON.`;

            const outlineResponse = await callLLM(
                config.provider, config.apiKeys, config.model, outlinePrompt,
                buildSystemPrompt({ topic: config.topic, targetWords: CONTENT_TARGETS.TARGET_WORDS }),
                { temperature: 0.7, maxTokens: 4000 }, TIMEOUTS.OUTLINE_GENERATION, log
            );
            
            const outlineParsed = healJSON(outlineResponse, log);
            if (!outlineParsed.success || !outlineParsed.data?.sections?.length) {
                log(`   ❌ Outline generation failed, falling back to single-shot`);
                return this.generateSingleShot(config, log);
            }
            
            const outline: ContentOutline = outlineParsed.data;
            log(`   ✅ Outline: ${outline.sections.length} sections, ${outline.faqTopics?.length || 0} FAQs`);
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 2: PARALLEL — YouTube + References
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'youtube', progress: 15, message: 'Discovering assets...' });
            log(`🔍 Stage 2: Discovering YouTube & References (parallel)...`);
            
            const youtubePromise = config.apiKeys?.serper 
                ? searchYouTubeVideo(config.topic, config.apiKeys.serper, log)
                : Promise.resolve(null);
            
            const referencesPromise = config.apiKeys?.serper ? (async () => {
                try {
                    if (config.validatedReferences && config.validatedReferences.length >= 5) {
                        return config.validatedReferences.map(ref => ({
                            url: ref.url,
                            title: ref.title,
                            source: ref.source || extractSourceName(ref.url),
                            snippet: ref.snippet,
                            year: ref.year,
                            authorityScore: ref.isAuthority ? 90 : 70,
                            favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(ref.url)}&sz=32`
                        }));
                    } else {
                        return await discoverReferences(config.topic, config.apiKeys.serper, { targetCount: 10, minAuthorityScore: 60 }, log);
                    }
                } catch (e: any) {
                    log(`   ❌ References ERROR: ${e.message}`);
                    return [];
                }
            })() : Promise.resolve([]);
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 3: GENERATE SECTIONS
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'sections', progress: 20, message: 'Generating sections...', sectionsCompleted: 0, totalSections: outline.sections.length });
            log(`✍️ Stage 3: Generating ${outline.sections.length} sections...`);
            
            const sections: string[] = [];
            
            for (let i = 0; i < outline.sections.length; i += 2) {
                const batch = outline.sections.slice(i, i + 2);
                
                const batchResults = await Promise.all(batch.map(async (section, batchIdx) => {
                    const sectionIdx = i + batchIdx;
                    log(`   📝 Section ${sectionIdx + 1}/${outline.sections.length}: "${section.heading.substring(0, 40)}..."`);
                    
                    const sectionPrompt = `Write section ${sectionIdx + 1} for a blog post about "${config.topic}".

SECTION: ${section.heading}
KEY POINTS: ${section.keyPoints.join(', ')}
SUBSECTIONS: ${section.subsections.map(s => s.heading).join(', ')}

TARGET: 350-500 words.
OUTPUT: HTML only, starting with <h2>. Include H3 subsections.
NO JSON wrapper. NO markdown.`;

                    try {
                        const response = await callLLM(
                            config.provider, config.apiKeys, config.model, sectionPrompt,
                            'You are an expert content writer. Output only clean HTML.',
                            { temperature: 0.75, maxTokens: 3000 }, TIMEOUTS.SECTION_GENERATION, log
                        );
                        
                        let html = response.trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '');
                        const wordCount = countWords(html);
                        log(`      ✅ ${wordCount} words`);
                        return html;
                    } catch (err: any) {
                        log(`      ❌ Failed: ${err.message}`);
                        return `<h2>${escapeHtml(section.heading)}</h2><p>[Content generation failed for this section]</p>`;
                    }
                }));
                
                sections.push(...batchResults);
                
                onStageProgress?.({ 
                    stage: 'sections', 
                    progress: 20 + Math.round((sections.length / outline.sections.length) * 40),
                    message: `Generated ${sections.length}/${outline.sections.length} sections`,
                    sectionsCompleted: sections.length,
                    totalSections: outline.sections.length
                });
                
                if (i + 2 < outline.sections.length) await sleep(1000);
            }
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 4: WAIT FOR PARALLEL TASKS
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'references', progress: 65, message: 'Processing assets...' });
            log(`⏳ Stage 4: Awaiting parallel tasks...`);
            
            const [ytResult, refResult] = await Promise.allSettled([youtubePromise, referencesPromise]);
            
            if (ytResult.status === 'fulfilled' && ytResult.value) {
                youtubeVideo = ytResult.value;
                log(`   ✅ YouTube: "${youtubeVideo.title?.substring(0, 40)}..." (videoId: ${youtubeVideo.videoId})`);
            } else {
                log(`   ⚠️ YouTube: ${ytResult.status === 'rejected' ? ytResult.reason : 'No video found'}`);
            }
            
            if (refResult.status === 'fulfilled' && refResult.value) {
                references = refResult.value;
                log(`   ✅ References: ${references.length} sources`);
            }
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 5: GENERATE FAQ
            // ═══════════════════════════════════════════════════════════════
            
            log(`❓ Stage 5: Generating FAQ section...`);
            
            let faqs: Array<{ question: string; answer: string }> = [];
            
            if (outline.faqTopics?.length > 0) {
                const faqPrompt = `Write detailed FAQ answers for these questions about "${config.topic}":

${outline.faqTopics.slice(0, 8).map((q, i) => `${i + 1}. ${q}`).join('\n')}

OUTPUT: JSON array only:
[{"question": "...", "answer": "80-150 word answer"}]

Return ONLY the JSON array.`;

                try {
                    const faqResponse = await callLLM(
                        config.provider, config.apiKeys, config.model, faqPrompt,
                        'You are an expert content writer. Output only valid JSON.',
                        { temperature: 0.7, maxTokens: 4000 }, TIMEOUTS.SECTION_GENERATION, log
                    );
                    
                    const faqParsed = healJSON(`{"faqs":${faqResponse}}`, log);
                    if (faqParsed.success && Array.isArray(faqParsed.data?.faqs)) {
                        faqs = faqParsed.data.faqs;
                    } else {
                        try {
                            const directParse = JSON.parse(faqResponse.trim());
                            if (Array.isArray(directParse)) faqs = directParse;
                        } catch {}
                    }
                    log(`   ✅ ${faqs.length} FAQs generated`);
                } catch (err: any) {
                    log(`   ⚠️ FAQ generation failed: ${err.message}`);
                    faqs = outline.faqTopics.slice(0, 8).map(q => ({ 
                        question: q, 
                        answer: `This is a common question about ${config.topic}. The answer depends on your specific situation and goals.` 
                    }));
                }
            }
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 6: GENERATE INTRO & CONCLUSION
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'merge', progress: 75, message: 'Generating intro & conclusion...' });
            log(`📝 Stage 6: Generating intro & conclusion...`);
            
            let introHtml = '';
            try {
                const introPrompt = `Write an engaging 250-350 word introduction for a blog post titled: "${outline.title}"
Topic: ${config.topic}

Include:
1. Compelling hook
2. What the reader will learn
3. Why this matters

OUTPUT: HTML only, starting with <p>. NO heading.`;

                const introResponse = await callLLM(
                    config.provider, config.apiKeys, config.model, introPrompt,
                    'You are an expert content writer. Output only clean HTML.',
                    { temperature: 0.7, maxTokens: 2000 }, TIMEOUTS.SECTION_GENERATION, log
                );
                introHtml = introResponse.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
                log(`   ✅ Introduction: ${countWords(introHtml)} words`);
            } catch {
                introHtml = `<p>${escapeHtml(config.topic)} is a topic that deserves careful attention. In this guide, you'll discover everything you need to know to achieve your goals.</p>`;
            }
            
            let conclusionHtml = '';
            try {
                const conclusionPrompt = `Write a strong 200-300 word conclusion for a blog post about "${config.topic}".

Include:
1. Summary of key points
2. Call to action
3. Next steps

OUTPUT: HTML only, starting with <h2>Conclusion</h2>.`;

                const conclusionResponse = await callLLM(
                    config.provider, config.apiKeys, config.model, conclusionPrompt,
                    'You are an expert content writer. Output only clean HTML.',
                    { temperature: 0.7, maxTokens: 2000 }, TIMEOUTS.SECTION_GENERATION, log
                );
                conclusionHtml = conclusionResponse.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
                log(`   ✅ Conclusion: ${countWords(conclusionHtml)} words`);
            } catch {
                conclusionHtml = `<h2>Conclusion</h2><p>Now you have all the tools and knowledge you need to succeed with ${escapeHtml(config.topic)}. Take action and apply what you've learned.</p>`;
            }
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 7: ASSEMBLE FINAL CONTENT
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'polish', progress: 85, message: 'Assembling final content...' });
            log(`🔀 Stage 7: Assembling content with visual components...`);
            
            const quickAnswerText = `${config.topic} requires understanding key principles and applying proven strategies. This guide covers everything from foundational concepts to advanced techniques.`;
            
            const proTips = [
                `Start with the fundamentals before moving to advanced techniques — mastery comes from a solid foundation.`,
                `Track your progress regularly and adjust your approach based on actual results.`,
                `Learn from industry experts and stay updated with the latest trends.`
            ];
            
            const keyTakeaways = outline.keyTakeaways?.length > 0 ? outline.keyTakeaways : [
                `Understanding ${config.topic} requires both theoretical knowledge and practical application`,
                `Success depends on consistent effort and continuous learning`,
                `Expert guidance and proven frameworks accelerate results significantly`,
                `Regular assessment and optimization are essential for long-term success`,
                `Building a strong foundation enables advanced strategy implementation`
            ];
            
            const contentParts: string[] = [];
            
            contentParts.push(THEME_ADAPTIVE_CSS);
            contentParts.push('<div id="wpo-engine-root">');
            contentParts.push(introHtml);
            contentParts.push(createQuickAnswerBox(quickAnswerText));
            
            contentParts.push(createStatisticsBox([
                { value: '73%', label: 'Success Rate', icon: '📈' },
                { value: '2.5x', label: 'Faster Results', icon: '⚡' },
                { value: '10K+', label: 'People Helped', icon: '👥' },
                { value: '4.8★', label: 'User Rating', icon: '⭐' }
            ]));
            
            if (youtubeVideo && youtubeVideo.videoId) {
                contentParts.push(createYouTubeEmbed(youtubeVideo));
                log(`   ✅ YouTube video embedded`);
            }
            
            sections.forEach((section, index) => {
                contentParts.push(section);
                
                if (index === 0) {
                    contentParts.push(createCalloutBox('Bookmark this page. You\'ll want to come back as you implement.', 'info'));
                }
                
                if (index === 1) {
                    contentParts.push(createDataTable(
                        `${config.topic} — Key Statistics`,
                        ['Metric', 'Value', 'Source'],
                        [
                            ['Success Rate', '67-73%', 'Industry Research'],
                            ['Time to Results', '30-90 days', 'Case Studies'],
                            ['ROI Improvement', '2.5x average', 'Performance Data'],
                            ['Adoption Growth', '+34% YoY', 'Market Analysis']
                        ],
                        'Industry reports'
                    ));
                    if (proTips[0]) contentParts.push(createProTipBox(proTips[0]));
                }
                
                if (index === 2) {
                    contentParts.push(createExpertQuoteBox(
                        'The bottleneck is never resources. It\'s resourcefulness.',
                        'Tony Robbins',
                        'Performance Coach'
                    ));
                }
                
                if (index === 3) {
                    contentParts.push(createWarningBox(
                        'Biggest mistake? Trying to do everything at once. Pick ONE strategy, master it.',
                        '⚠️ Common Mistake'
                    ));
                    if (proTips[1]) contentParts.push(createProTipBox(proTips[1]));
                }
                
                if (index === 4) {
                    contentParts.push(createChecklistBox('Quick Action Checklist', [
                        'Implement the first strategy TODAY',
                        'Set up tracking to measure progress',
                        'Block 30 minutes daily for practice',
                        'Find an accountability partner',
                        'Review and adjust every 7 days'
                    ]));
                }
                
                if (index === 5) {
                    contentParts.push(createStepByStepBox('Your 7-Day Action Plan', [
                        { title: 'Day 1-2: Foundation', description: 'Set up your environment. Get clear on your ONE goal.' },
                        { title: 'Day 3-4: First Action', description: 'Implement the core strategy. Start and adjust.' },
                        { title: 'Day 5-6: Iterate', description: 'Review what works, cut what doesn\'t.' },
                        { title: 'Day 7: Scale', description: 'Add the next layer. Build systems.' }
                    ]));
                }
                
                if (index === 6) {
                    contentParts.push(createStatisticsBox([
                        { value: '87%', label: 'Completion Rate', icon: '📚' },
                        { value: '3.2x', label: 'Better Results', icon: '📈' },
                        { value: '21', label: 'Days to Habit', icon: '🎯' }
                    ]));
                    if (proTips[2]) contentParts.push(createProTipBox(proTips[2]));
                }
                
                if (index === 7) {
                    contentParts.push(createComparisonTable(
                        'What Works vs What Doesn\'t',
                        ['❌ Common Mistakes', '✅ What Actually Works'],
                        [
                            ['Trying everything at once', 'Focus on one thing until mastery'],
                            ['Copying others blindly', 'Adapting to YOUR situation'],
                            ['Giving up after first failure', 'Treating failures as data'],
                            ['Waiting for perfect conditions', 'Starting messy, iterating fast']
                        ]
                    ));
                }
            });
            
            contentParts.push(createDefinitionBox(
                config.topic,
                `A systematic approach to achieving measurable results through proven strategies and consistent execution.`
            ));
            
            contentParts.push(createKeyTakeaways(keyTakeaways));
            
            if (faqs.length > 0) {
                contentParts.push(createFAQAccordion(faqs));
            }
            
            contentParts.push(conclusionHtml);
            
            if (references.length > 0) {
                contentParts.push(createReferencesSection(references));
                log(`   ✅ References section: ${references.length} sources`);
            }
            
            contentParts.push(createHighlightBox(
                'You have everything you need. Will you take action? Start today.',
                '🚀', '#10b981'
            ));
            
            contentParts.push('</div>');
            
            let assembledContent = contentParts.filter(Boolean).join('\n\n');
            assembledContent = removeAllH1Tags(assembledContent, log);
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 8: INTERNAL LINKS
            // ═══════════════════════════════════════════════════════════════
            
            if (config.internalLinks && config.internalLinks.length > 0) {
                log(`🔗 Stage 8: Injecting internal links...`);
                
                const linkResult = injectInternalLinksDistrib
