// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — ULTIMATE ENTERPRISE AI ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════
//
// COMPLETE FEATURE SET:
// ✅ generateEnhanced() — Full staged pipeline
// ✅ generateSingleShot() — Single-shot fallback
// ✅ generate() — Default entry point
// ✅ 16 Visual Components with Schema.org
// ✅ YouTube Discovery with full debug logging
// ✅ Reference Discovery with authority scoring
// ✅ Contextual Rich Anchor Text (3-7 words, natural phrases)
// ✅ Multi-Provider LLM (Google, OpenRouter, OpenAI, Anthropic, Groq)
// ✅ JSON Healing (5-strategy recovery)
// ✅ Circuit Breaker pattern
// ✅ Percentage-based visual injection
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenerativeAI } from '@google/generative-ai';
import {    
    ContentContract,
    GenerateConfig,
    InternalLinkTarget,
    InternalLinkResult,
    ValidatedReference
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const AI_ORCHESTRATOR_VERSION = "39.0.0";

const TIMEOUTS = {
    OUTLINE_GENERATION: 60000,
    SECTION_GENERATION: 90000,
    SINGLE_SHOT: 180000,
    YOUTUBE_SEARCH: 25000,
    REFERENCE_DISCOVERY: 30000,
} as const;

const CONTENT_TARGETS = {
    MIN_WORDS: 3000,
    TARGET_WORDS: 4500,
    MAX_WORDS: 6000,
} as const;

const LINK_CONFIG = {
    MAX_TOTAL: 15,
    MAX_PER_SECTION: 2,
    MIN_WORDS_BETWEEN: 120,
    MIN_ANCHOR_WORDS: 3,
    MAX_ANCHOR_WORDS: 7,
    MIN_ANCHOR_CHARS: 15,
    MAX_ANCHOR_CHARS: 60,
} as const;

const currentYear = new Date().getFullYear();
export const CONTENT_YEAR = currentYear;

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

type LogFunction = (msg: string, progress?: number) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// 🛑 STOP WORDS & BAD ANCHOR PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
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
    'i', 'me', 'my', 'we', 'us', 'you', 'he', 'she', 'it', 'him', 'her', 'also',
    'even', 'still', 'already', 'always', 'never', 'often', 'usually', 'really',
    'actually', 'basically', 'literally', 'definitely', 'probably', 'maybe'
]);

const BAD_ANCHOR_PATTERNS = [
    'click here', 'read more', 'learn more', 'check out', 'find out',
    'this article', 'this post', 'this guide', 'our guide', 'our article',
    'best way', 'great way', 'good way', 'easy way', 'simple way',
    'you can', 'you will', 'you should', 'we will', 'we can', 'click this'
];

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
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function countWords(text: string): number {
    if (!text) return 0;
    return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'source';
    }
}

function generateUniqueId(): string {
    return `wpo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
    // Primary
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    primaryBg: '#eef2ff',
    primaryBorder: '#c7d2fe',

    // Success
    success: '#22c55e',
    successDark: '#16a34a',
    successBg: '#f0fdf4',
    successBorder: '#bbf7d0',

    // Warning
    warning: '#f59e0b',
    warningDark: '#d97706',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',

    // Danger
    danger: '#ef4444',
    dangerDark: '#dc2626',
    dangerBg: '#fef2f2',
    dangerBorder: '#fecaca',

    // Info
    info: '#3b82f6',
    infoDark: '#2563eb',
    infoBg: '#eff6ff',
    infoBorder: '#bfdbfe',

    // Neutrals
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

    // Gradients
    gradPrimary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    gradSuccess: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    gradWarning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    gradDanger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    gradInfo: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    gradPurple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradTeal: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    gradSunset: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradOcean: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    gradMidnight: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',

    // Shadows
    shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
    shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
    shadowLg: '0 12px 32px rgba(0,0,0,0.12)',
    shadowXl: '0 20px 48px rgba(0,0,0,0.15)',
    shadowPrimary: '0 12px 28px rgba(99,102,241,0.35)',
    shadowSuccess: '0 12px 28px rgba(34,197,94,0.35)',
    shadowDanger: '0 12px 28px rgba(239,68,68,0.35)',
    shadowInfo: '0 12px 28px rgba(59,130,246,0.35)',
    shadowPurple: '0 20px 40px rgba(102,126,234,0.35)',
    shadowTeal: '0 16px 36px rgba(17,153,142,0.3)',

    // Radius
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    radiusXl: '20px',
    radiusXxl: '24px',
    radiusFull: '50%',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 THEME-ADAPTIVE CSS
// ═══════════════════════════════════════════════════════════════════════════════

export const THEME_ADAPTIVE_CSS = `
<style>
/* WP Optimizer Pro v39.0 - Bulletproof Reset */
#wpo-root, #wpo-root *, #wpo-root *::before, #wpo-root *::after {
    box-sizing: border-box !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}
#wpo-root {
    line-height: 1.7 !important;
    color: ${T.gray800} !important;
    font-size: 18px !important;
    max-width: 100% !important;
}
#wpo-root img { max-width: 100% !important; height: auto !important; display: block !important; }
#wpo-root a { text-decoration: none !important; transition: opacity 0.2s ease !important; }
#wpo-root a:hover { opacity: 0.85 !important; }
#wpo-root ul, #wpo-root ol { list-style: none !important; padding: 0 !important; margin: 0 !important; }
#wpo-root p { margin: 0 0 1rem 0 !important; }
#wpo-root h2, #wpo-root h3, #wpo-root h4 { margin: 0 !important; line-height: 1.3 !important; }
#wpo-root details summary { cursor: pointer !important; list-style: none !important; }
#wpo-root details summary::-webkit-details-marker { display: none !important; }
#wpo-root details summary::marker { display: none !important; }
#wpo-root .wpo-video-wrap { position: relative !important; padding-bottom: 56.25% !important; height: 0 !important; overflow: hidden !important; }
#wpo-root .wpo-video-wrap iframe { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: none !important; }
@media (max-width: 640px) {
    #wpo-root { font-size: 16px !important; }
}
</style>
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 1: QUICK ANSWER BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createQuickAnswerBox(answer: string, title: string = 'Quick Answer'): string {
    if (!isValidString(answer)) return '';

    return `
<div style="background: ${T.gradPurple} !important; border-radius: ${T.radiusXl} !important; padding: 32px !important; margin: 40px 0 !important; color: ${T.white} !important; box-shadow: ${T.shadowPurple} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 24px !important; flex-wrap: wrap !important;">
        <div style="width: 64px !important; height: 64px !important; min-width: 64px !important; background: rgba(255,255,255,0.2) !important; backdrop-filter: blur(10px) !important; border-radius: ${T.radiusLg} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
            <span style="font-size: 32px !important; line-height: 1 !important;">⚡</span>
        </div>
        <div style="flex: 1 !important; min-width: 250px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 2px !important; color: rgba(255,255,255,0.9) !important; margin-bottom: 10px !important;">${escapeHtml(title)}</div>
            <p style="font-size: 18px !important; line-height: 1.7 !important; color: ${T.white} !important; margin: 0 !important; font-weight: 500 !important;">${answer}</p>
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
<div style="background: ${T.gradTeal} !important; border-radius: ${T.radiusXl} !important; padding: 28px 32px !important; margin: 36px 0 !important; color: ${T.white} !important; box-shadow: ${T.shadowTeal} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 20px !important; flex-wrap: wrap !important;">
        <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: rgba(255,255,255,0.2) !important; backdrop-filter: blur(10px) !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
            <span style="font-size: 28px !important; line-height: 1 !important;">💡</span>
        </div>
        <div style="flex: 1 !important; min-width: 250px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 2px !important; color: rgba(255,255,255,0.9) !important; margin-bottom: 8px !important;">${escapeHtml(title)}</div>
            <p style="font-size: 16px !important; line-height: 1.7 !important; color: ${T.white} !important; margin: 0 !important;">${tip}</p>
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
<div style="background: ${T.gradSunset} !important; border-radius: ${T.radiusXl} !important; padding: 28px 32px !important; margin: 36px 0 !important; color: ${T.white} !important; box-shadow: 0 16px 36px rgba(245,87,108,0.3) !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 20px !important; flex-wrap: wrap !important;">
        <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: rgba(255,255,255,0.2) !important; backdrop-filter: blur(10px) !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;">
            <span style="font-size: 28px !important; line-height: 1 !important;">⚠️</span>
        </div>
        <div style="flex: 1 !important; min-width: 250px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 2px !important; color: rgba(255,255,255,0.9) !important; margin-bottom: 8px !important;">${escapeHtml(title)}</div>
            <p style="font-size: 16px !important; line-height: 1.7 !important; color: ${T.white} !important; margin: 0 !important;">${warning}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 4: EXPERT QUOTE BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createExpertQuoteBox(quote: string, author: string, role?: string): string {
    if (!isValidString(quote) || !isValidString(author)) return '';

    return `
<blockquote style="background: linear-gradient(135deg, ${T.primaryBg} 0%, #f0f4ff 100%) !important; border-left: 5px solid ${T.primary} !important; border-radius: 0 ${T.radiusXl} ${T.radiusXl} 0 !important; padding: 32px 36px !important; margin: 40px 0 !important; box-shadow: ${T.shadowMd} !important; font-style: normal !important; overflow: hidden !important;">
    <div style="font-size: 48px !important; color: ${T.primary} !important; opacity: 0.4 !important; line-height: 1 !important; margin-bottom: 12px !important; font-family: Georgia, serif !important;">"</div>
    <p style="font-size: 19px !important; line-height: 1.8 !important; font-style: italic !important; margin: 0 0 24px 0 !important; color: ${T.gray800} !important;">${quote}</p>
    <footer style="display: flex !important; align-items: center !important; gap: 16px !important; flex-wrap: wrap !important;">
        <div style="width: 52px !important; height: 52px !important; min-width: 52px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusFull} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important;">
            <span style="font-size: 24px !important;">👤</span>
        </div>
        <div>
            <cite style="font-style: normal !important; font-weight: 800 !important; font-size: 16px !important; display: block !important; color: ${T.gray800} !important;">${escapeHtml(author)}</cite>
            ${role ? `<span style="font-size: 14px !important; color: ${T.gray500} !important;">${escapeHtml(role)}</span>` : ''}
        </div>
    </footer>
</blockquote>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 5: HIGHLIGHT BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createHighlightBox(text: string, icon: string = '✨', bgColor: string = T.primary): string {
    if (!isValidString(text)) return '';

    return `
<div style="background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%) !important; border-radius: ${T.radiusXl} !important; padding: 30px 36px !important; margin: 40px 0 !important; box-shadow: 0 16px 40px ${bgColor}40 !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 20px !important; flex-wrap: wrap !important;">
        <span style="font-size: 42px !important; line-height: 1 !important; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2)) !important;">${icon}</span>
        <p style="flex: 1 !important; font-size: 18px !important; line-height: 1.7 !important; color: ${T.white} !important; margin: 0 !important; font-weight: 600 !important; min-width: 200px !important;">${text}</p>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT 6: CALLOUT BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createCalloutBox(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
    if (!isValidString(text)) return '';

    const configs: Record<string, { bg: string; border: string; icon: string; label: string }> = {
        info: { bg: T.infoBg, border: T.info, icon: 'ℹ️', label: 'Info' },
        success: { bg: T.successBg, border: T.success, icon: '✅', label: 'Success' },
        warning: { bg: T.warningBg, border: T.warning, icon: '⚡', label: 'Note' },
        error: { bg: T.dangerBg, border: T.danger, icon: '🔥', label: 'Important' }
    };
    const c = configs[type];

    return `
<div style="background: ${c.bg} !important; border: none !important; border-left: 5px solid ${c.border} !important; border-radius: 0 ${T.radiusLg} ${T.radiusLg} 0 !important; padding: 24px 28px !important; margin: 32px 0 !important; box-shadow: ${T.shadowSm} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 16px !important; flex-wrap: wrap !important;">
        <span style="font-size: 26px !important; line-height: 1 !important;">${c.icon}</span>
        <div style="flex: 1 !important; min-width: 200px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; color: ${c.border} !important; margin-bottom: 6px !important;">${c.label}</div>
            <p style="font-size: 15px !important; line-height: 1.7 !important; color: ${T.gray700} !important; margin: 0 !important;">${text}</p>
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
        <div style="flex: 1 !important; min-width: 140px !important; text-align: center !important; padding: 28px 20px !important; background: ${T.white} !important; border-radius: ${T.radiusLg} !important; box-shadow: ${T.shadowMd} !important; border: 1px solid ${T.gray100} !important;">
            ${stat.icon ? `<div style="font-size: 28px !important; margin-bottom: 12px !important;">${stat.icon}</div>` : ''}
            <div style="font-size: 36px !important; font-weight: 900 !important; background: ${T.gradPrimary} !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; background-clip: text !important; margin-bottom: 8px !important; line-height: 1 !important;">${escapeHtml(stat.value)}</div>
            <div style="font-size: 12px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; color: ${T.gray500} !important;">${escapeHtml(stat.label)}</div>
        </div>
    `).join('');

    return `
<div style="background: linear-gradient(135deg, ${T.gray50} 0%, ${T.gray100} 100%) !important; border: 1px solid ${T.gray200} !important; border-radius: ${T.radiusXxl} !important; padding: 32px !important; margin: 48px 0 !important; overflow: hidden !important;">
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
        <th style="padding: 16px 20px !important; text-align: left !important; font-size: 12px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; background: ${T.gray100} !important; color: ${T.primary} !important; border-bottom: 2px solid ${T.primaryBorder} !important;">${escapeHtml(h)}</th>
    `).join('');

    const tableRows = rows.map((row, i) => {
        const cells = row.map((cell, j) => `
            <td style="padding: 16px 20px !important; font-size: 14px !important; border-bottom: 1px solid ${T.gray100} !important; color: ${T.gray700} !important; ${j === 0 ? 'font-weight: 600 !important;' : ''} background: ${i % 2 === 0 ? T.white : T.gray50} !important;">${escapeHtml(cell)}</td>
        `).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
<div style="border-radius: ${T.radiusXl} !important; overflow: hidden !important; margin: 48px 0 !important; box-shadow: ${T.shadowLg} !important; border: 1px solid ${T.gray200} !important;">
    <div style="padding: 24px 28px !important; background: linear-gradient(135deg, ${T.gray50} 0%, ${T.gray100} 100%) !important; border-bottom: 1px solid ${T.gray200} !important;">
        <div style="display: flex !important; align-items: center !important; gap: 16px !important; flex-wrap: wrap !important;">
            <div style="width: 52px !important; height: 52px !important; min-width: 52px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important;">
                <span style="font-size: 24px !important;">📊</span>
            </div>
            <div>
                <h4 style="font-size: 20px !important; font-weight: 800 !important; margin: 0 !important; color: ${T.gray800} !important;">${escapeHtml(title)}</h4>
                ${sourceNote ? `<p style="font-size: 13px !important; color: ${T.gray500} !important; margin: 4px 0 0 0 !important;">Source: ${escapeHtml(sourceNote)}</p>` : ''}
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
        <li style="display: flex !important; align-items: flex-start !important; gap: 16px !important; padding: 16px 0 !important; ${i < items.length - 1 ? `border-bottom: 1px solid ${T.successBorder} !important;` : ''}">
            <span style="font-size: 22px !important; line-height: 1.4 !important; flex-shrink: 0 !important;">${icon}</span>
            <span style="font-size: 15px !important; line-height: 1.7 !important; color: ${T.gray700} !important;">${escapeHtml(item)}</span>
        </li>
    `).join('');

    return `
<div style="background: linear-gradient(135deg, ${T.successBg} 0%, #ecfdf5 100%) !important; border: 2px solid ${T.successBorder} !important; border-radius: ${T.radiusXl} !important; padding: 32px !important; margin: 40px 0 !important; box-shadow: ${T.shadowMd} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 16px !important; margin-bottom: 24px !important; flex-wrap: wrap !important;">
        <div style="width: 52px !important; height: 52px !important; min-width: 52px !important; background: ${T.gradSuccess} !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowSuccess} !important;">
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
        <div style="display: flex !important; gap: 24px !important; ${i < steps.length - 1 ? `padding-bottom: 28px !important; margin-bottom: 28px !important; border-bottom: 2px dashed ${T.primaryBorder} !important;` : ''}">
            <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusFull} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important; flex-shrink: 0 !important;">
                <span style="font-size: 22px !important; font-weight: 900 !important; color: ${T.white} !important;">${i + 1}</span>
            </div>
            <div style="flex: 1 !important; padding-top: 8px !important;">
                <h5 style="font-size: 18px !important; font-weight: 800 !important; margin: 0 0 10px 0 !important; color: ${T.gray800} !important;">${escapeHtml(step.title)}</h5>
                <p style="font-size: 15px !important; line-height: 1.7 !important; color: ${T.gray500} !important; margin: 0 !important;">${escapeHtml(step.description)}</p>
            </div>
        </div>
    `).join('');

    return `
<script type="application/ld+json">${JSON.stringify(howToSchema)}</script>
<div style="background: linear-gradient(135deg, ${T.primaryBg} 0%, ${T.primaryBorder}40 100%) !important; border: 2px solid ${T.primaryBorder} !important; border-radius: ${T.radiusXxl} !important; padding: 36px !important; margin: 48px 0 !important; box-shadow: ${T.shadowMd} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 18px !important; margin-bottom: 32px !important; flex-wrap: wrap !important;">
        <div style="width: 60px !important; height: 60px !important; min-width: 60px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusXl} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important;">
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
            <td style="padding: 18px 22px !important; background: ${T.dangerBg} !important; width: 50% !important; vertical-align: top !important; border-bottom: 1px solid ${T.dangerBorder} !important;">
                <span style="color: ${T.danger} !important; margin-right: 12px !important; font-size: 18px !important;">✗</span>
                <span style="color: #7f1d1d !important; font-size: 15px !important;">${escapeHtml(row[0])}</span>
            </td>
            <td style="padding: 18px 22px !important; background: ${T.successBg} !important; width: 50% !important; vertical-align: top !important; border-bottom: 1px solid ${T.successBorder} !important;">
                <span style="color: ${T.success} !important; margin-right: 12px !important; font-size: 18px !important;">✓</span>
                <span style="color: #166534 !important; font-size: 15px !important;">${escapeHtml(row[1])}</span>
            </td>
        </tr>
    `).join('');

    return `
<div style="border-radius: ${T.radiusXl} !important; overflow: hidden !important; margin: 48px 0 !important; box-shadow: ${T.shadowLg} !important; border: 1px solid ${T.gray200} !important;">
    <div style="padding: 22px 28px !important; background: linear-gradient(135deg, ${T.gray50} 0%, ${T.gray100} 100%) !important; border-bottom: 1px solid ${T.gray200} !important;">
        <div style="display: flex !important; align-items: center !important; gap: 14px !important; flex-wrap: wrap !important;">
            <span style="font-size: 28px !important;">⚖️</span>
            <h4 style="font-size: 20px !important; font-weight: 800 !important; margin: 0 !important; color: ${T.gray800} !important;">${escapeHtml(title)}</h4>
        </div>
    </div>
    <table style="width: 100% !important; border-collapse: collapse !important;">
        <thead>
            <tr>
                <th style="padding: 16px 22px !important; text-align: left !important; font-size: 12px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; background: ${T.dangerBg} !important; color: ${T.danger} !important;">${escapeHtml(headers[0])}</th>
                <th style="padding: 16px 22px !important; text-align: left !important; font-size: 12px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; background: ${T.successBg} !important; color: ${T.success} !important;">${escapeHtml(headers[1])}</th>
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
<div style="background: linear-gradient(135deg, ${T.infoBg} 0%, #dbeafe 100%) !important; border-left: 5px solid ${T.info} !important; border-radius: 0 ${T.radiusXl} ${T.radiusXl} 0 !important; padding: 28px 32px !important; margin: 40px 0 !important; box-shadow: ${T.shadowMd} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: flex-start !important; gap: 20px !important; flex-wrap: wrap !important;">
        <div style="width: 56px !important; height: 56px !important; min-width: 56px !important; background: ${T.gradInfo} !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowInfo} !important; flex-shrink: 0 !important;">
            <span style="font-size: 26px !important;">📖</span>
        </div>
        <div style="flex: 1 !important; min-width: 200px !important;">
            <div style="font-size: 11px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 1px !important; color: ${T.info} !important; margin-bottom: 6px !important;">Definition</div>
            <h5 style="font-size: 20px !important; font-weight: 800 !important; margin: 0 0 10px 0 !important; color: ${T.gray800} !important;">${escapeHtml(term)}</h5>
            <p style="font-size: 15px !important; line-height: 1.7 !important; color: ${T.gray600} !important; margin: 0 !important;">${definition}</p>
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
        <li style="display: flex !important; align-items: flex-start !important; gap: 18px !important; padding: 20px 0 !important; ${i < takeaways.length - 1 ? `border-bottom: 1px solid ${T.primaryBorder} !important;` : ''}">
            <span style="min-width: 40px !important; height: 40px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; color: ${T.white} !important; font-size: 15px !important; font-weight: 900 !important; box-shadow: ${T.shadowPrimary} !important; flex-shrink: 0 !important;">${i + 1}</span>
            <span style="font-size: 16px !important; line-height: 1.7 !important; color: ${T.gray700} !important; padding-top: 8px !important;">${escapeHtml(t)}</span>
        </li>
    `).join('');

    return `
<div style="background: linear-gradient(135deg, ${T.primaryBg} 0%, ${T.primaryBorder}50 100%) !important; border: 2px solid ${T.primaryBorder} !important; border-radius: ${T.radiusXxl} !important; padding: 40px !important; margin: 56px 0 !important; box-shadow: ${T.shadowMd} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 20px !important; margin-bottom: 32px !important; padding-bottom: 28px !important; border-bottom: 2px solid ${T.primaryBorder} !important; flex-wrap: wrap !important;">
        <div style="width: 68px !important; height: 68px !important; min-width: 68px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusXl} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important;">
            <span style="font-size: 34px !important;">🎯</span>
        </div>
        <div>
            <h3 style="font-size: 26px !important; font-weight: 800 !important; margin: 0 !important; color: #3730a3 !important;">Key Takeaways</h3>
            <p style="font-size: 15px !important; color: ${T.gray500} !important; margin: 6px 0 0 0 !important;">The essential points to remember</p>
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
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer.replace(/<[^>]*>/g, '')
            }
        }))
    };

    const items = validFaqs.map(faq => `
        <details style="border: 1px solid ${T.gray200} !important; border-radius: ${T.radiusMd} !important; margin-bottom: 14px !important; background: ${T.white} !important; overflow: hidden !important;" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <summary style="padding: 20px 24px !important; cursor: pointer !important; font-weight: 700 !important; font-size: 16px !important; color: ${T.gray800} !important; list-style: none !important; display: flex !important; justify-content: space-between !important; align-items: center !important; background: ${T.white} !important;" itemprop="name">
                <span style="flex: 1 !important; padding-right: 18px !important; line-height: 1.4 !important;">${escapeHtml(faq.question)}</span>
                <span style="width: 32px !important; height: 32px !important; border-radius: ${T.radiusFull} !important; background: ${T.gray100} !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 12px !important; color: ${T.primary} !important; flex-shrink: 0 !important; transition: transform 0.2s ease !important;">▼</span>
            </summary>
            <div style="padding: 0 24px 24px 24px !important; font-size: 15px !important; line-height: 1.8 !important; color: ${T.gray600} !important; background: ${T.gray50} !important; border-top: 1px solid ${T.gray200} !important;" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <div itemprop="text" style="padding-top: 20px !important;">${faq.answer}</div>
            </div>
        </details>
    `).join('');

    return `
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<section itemscope itemtype="https://schema.org/FAQPage" style="margin: 56px 0 !important;">
    <div style="display: flex !important; align-items: center !important; gap: 18px !important; margin-bottom: 32px !important; flex-wrap: wrap !important;">
        <div style="width: 64px !important; height: 64px !important; min-width: 64px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusXl} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important;">
            <span style="font-size: 30px !important;">❓</span>
        </div>
        <div>
            <h2 style="font-size: 26px !important; font-weight: 800 !important; margin: 0 !important; color: ${T.gray800} !important;">Frequently Asked Questions</h2>
            <p style="font-size: 15px !important; color: ${T.gray500} !important; margin: 6px 0 0 0 !important;">${validFaqs.length} questions answered</p>
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
<div style="margin: 52px 0 !important; border-radius: ${T.radiusXl} !important; overflow: hidden !important; box-shadow: ${T.shadowXl} !important; border: none !important; background: #000 !important;">
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
    <div style="padding: 22px 28px !important; background: ${T.gradMidnight} !important;">
        <div style="display: flex !important; align-items: center !important; gap: 18px !important; flex-wrap: wrap !important;">
            <div style="width: 54px !important; height: 54px !important; min-width: 54px !important; background: #ff0000 !important; border-radius: ${T.radiusMd} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 6px 16px rgba(255,0,0,0.3) !important;">
                <span style="font-size: 26px !important;">▶️</span>
            </div>
            <div style="flex: 1 !important; min-width: 200px !important;">
                <h4 style="font-size: 17px !important; font-weight: 700 !important; margin: 0 0 8px 0 !important; color: ${T.white} !important; line-height: 1.4 !important;">${escapeHtml(truncate(video.title, 60))}</h4>
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
            ? `<span style="background: ${T.successBg} !important; color: ${T.successDark} !important; padding: 3px 10px !important; border-radius: 6px !important; font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; margin-left: 10px !important;">HIGH AUTHORITY</span>`
            : '';

        return `
        <li style="display: flex !important; align-items: flex-start !important; gap: 16px !important; padding: 18px 0 !important; ${i < validRefs.length - 1 ? `border-bottom: 1px solid ${T.gray100} !important;` : ''}">
            <span style="min-width: 32px !important; height: 32px !important; background: ${T.primaryBg} !important; border-radius: ${T.radiusSm} !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 13px !important; font-weight: 800 !important; color: ${T.primary} !important; flex-shrink: 0 !important;">${i + 1}</span>
            <div style="flex: 1 !important; min-width: 0 !important;">
                <a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer nofollow" style="font-weight: 700 !important; color: ${T.primary} !important; text-decoration: none !important; display: block !important; margin-bottom: 6px !important; font-size: 16px !important; line-height: 1.4 !important;">
                    ${escapeHtml(truncate(ref.title, 80))}${yearDisplay}
                </a>
                <div style="display: flex !important; align-items: center !important; gap: 10px !important; flex-wrap: wrap !important; font-size: 13px !important; color: ${T.gray500} !important;">
                    ${ref.favicon ? `<img src="${escapeHtml(ref.favicon)}" alt="" width="16" height="16" style="border-radius: 4px !important;" onerror="this.style.display='none'">` : ''}
                    <span>${escapeHtml(ref.source)}</span>
                    ${authorityBadge}
                </div>
                ${ref.snippet ? `<p style="font-size: 14px !important; line-height: 1.6 !important; margin: 10px 0 0 0 !important; color: ${T.gray500} !important;">${escapeHtml(truncate(ref.snippet, 150))}</p>` : ''}
            </div>
        </li>`;
    }).join('');

    return `
<section style="background: ${T.gray50} !important; border-radius: ${T.radiusXl} !important; padding: 36px !important; margin: 56px 0 !important; box-shadow: ${T.shadowMd} !important; border: 1px solid ${T.gray200} !important; overflow: hidden !important;">
    <div style="display: flex !important; align-items: center !important; gap: 18px !important; margin-bottom: 28px !important; padding-bottom: 24px !important; border-bottom: 2px solid ${T.gray200} !important; flex-wrap: wrap !important;">
        <div style="width: 60px !important; height: 60px !important; min-width: 60px !important; background: ${T.gradPrimary} !important; border-radius: ${T.radiusLg} !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: ${T.shadowPrimary} !important;">
            <span style="font-size: 28px !important;">📚</span>
        </div>
        <div>
            <h2 style="font-size: 24px !important; font-weight: 800 !important; margin: 0 !important; color: ${T.gray800} !important;">References & Sources</h2>
            <p style="font-size: 15px !important; color: ${T.gray500} !important; margin: 6px 0 0 0 !important;">${validRefs.length} authoritative sources</p>
        </div>
    </div>
    <ul style="list-style: none !important; padding: 0 !important; margin: 0 !important;">${items}</ul>
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE VIDEO DISCOVERY — WITH FULL DEBUG LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

async function searchYouTubeVideo(
    topic: string,
    serperApiKey: string,
    log: LogFunction
): Promise<YouTubeVideoData | null> {
    log(`🎬 YOUTUBE DISCOVERY ENGINE v2.0`);
    log(`   → Topic: "${topic.substring(0, 50)}..."`);
    log(`   → Serper Key: ${serperApiKey ? `✅ (${serperApiKey.substring(0, 10)}...)` : '❌ MISSING!'}`);

    if (!serperApiKey || serperApiKey.length < 10) {
        log(`   ❌ ABORT: Invalid or missing Serper API key!`);
        return null;
    }

    if (!topic || topic.trim().length < 3) {
        log(`   ❌ ABORT: Invalid topic`);
        return null;
    }

    const queries = [
        `${topic} tutorial guide`,
        `${topic} explained ${currentYear}`,
        `how to ${topic}`,
        `${topic} for beginners`,
        `best ${topic} tutorial`
    ];

    const allVideos: YouTubeVideoData[] = [];

    for (const query of queries) {
        log(`   🔍 Query: "${query}"`);

        try {
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
                    num: 10
                })
            });

            log(`      → Status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                log(`      ❌ API Error: ${errorText.substring(0, 100)}`);
                continue;
            }

            const data = await response.json();
            log(`      → Videos returned: ${data.videos?.length || 0}`);

            if (!data.videos || !Array.isArray(data.videos)) {
                log(`      ⚠️ No videos array in response`);
                continue;
            }

            for (const video of data.videos) {
                // Must be YouTube
                if (!video.link?.includes('youtube.com') && !video.link?.includes('youtu.be')) {
                    continue;
                }

                // Extract video ID
                const match = video.link.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
                const videoId = match?.[1];

                if (!videoId) {
                    continue;
                }

                // Skip duplicates
                if (allVideos.some(v => v.videoId === videoId)) {
                    continue;
                }

                // Parse views
                const views = typeof video.views === 'number'
                    ? video.views
                    : parseInt(String(video.views || '0').replace(/[^0-9]/g, '')) || 0;

                // Minimum 1000 views
                if (views < 1000) {
                    continue;
                }

                // Calculate relevance score
                let relevanceScore = 50;
                const titleLower = (video.title || '').toLowerCase();
                const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const matchingWords = topicWords.filter(w => titleLower.includes(w)).length;

                relevanceScore += Math.min(30, (matchingWords / Math.max(topicWords.length, 1)) * 30);

                if (views >= 1000000) relevanceScore += 15;
                else if (views >= 100000) relevanceScore += 10;
                else if (views >= 50000) relevanceScore += 5;

                const videoData: YouTubeVideoData = {
                    videoId,
                    title: video.title || 'Video',
                    channel: video.channel || 'Unknown',
                    views,
                    duration: video.duration,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    relevanceScore: Math.min(100, relevanceScore),
                    description: video.snippet
                };

                allVideos.push(videoData);
                log(`      ✓ Found: "${videoData.title.substring(0, 40)}..." (${views.toLocaleString()} views, score: ${videoData.relevanceScore})`);
            }

            // If we have enough good videos, stop
            if (allVideos.length >= 5) {
                break;
            }

        } catch (err: any) {
            log(`      ❌ Error: ${err.message}`);
        }

        await sleep(300);
    }

    // Sort by relevance
    allVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);

    log(`   📊 Total videos found: ${allVideos.length}`);

    if (allVideos.length === 0) {
        log(`   ⚠️ No suitable YouTube videos found`);
        return null;
    }

    const best = allVideos[0];
    log(`   ✅ SELECTED: "${best.title.substring(0, 50)}..."`);
    log(`      → videoId: ${best.videoId}`);
    log(`      → channel: ${best.channel}`);
    log(`      → views: ${best.views.toLocaleString()}`);
    log(`      → score: ${best.relevanceScore}`);

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
            'nytimes.com': 'The New York Times',
            'washingtonpost.com': 'The Washington Post',
            'theguardian.com': 'The Guardian',
            'bbc.com': 'BBC',
            'reuters.com': 'Reuters',
            'bloomberg.com': 'Bloomberg',
            'forbes.com': 'Forbes',
            'mayoclinic.org': 'Mayo Clinic',
            'nih.gov': 'NIH',
            'cdc.gov': 'CDC',
            'who.int': 'WHO',
            'wikipedia.org': 'Wikipedia',
            'investopedia.com': 'Investopedia',
            'hbr.org': 'Harvard Business Review'
        };
        return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
        return 'Source';
    }
}

async function discoverReferences(
    topic: string,
    serperApiKey: string,
    log: LogFunction
): Promise<DiscoveredReference[]> {
    log(`📚 REFERENCE DISCOVERY ENGINE`);
    log(`   → Topic: "${topic.substring(0, 40)}..."`);

    if (!serperApiKey) {
        log(`   ❌ No Serper API key`);
        return [];
    }

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
                headers: {
                    'X-API-KEY': serperApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: query,
                    gl: 'us',
                    hl: 'en',
                    num: 10
                })
            });

            if (!response.ok) continue;

            const data = await response.json();

            for (const result of (data.organic || [])) {
                if (!result.link || !result.title) continue;

                const urlLower = result.link.toLowerCase();
                if (skipDomains.some(d => urlLower.includes(d))) continue;

                const authorityScore = calculateAuthorityScore(result.link);
                if (authorityScore < 60) continue;
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
        } catch { }

        await sleep(300);
    }

    const sorted = allRefs.sort((a, b) => b.authorityScore - a.authorityScore).slice(0, 10);

    log(`   ✅ Found ${sorted.length} authoritative references`);

    return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 CONTEXTUAL RICH ANCHOR TEXT FINDER — THE KEY FIX!
// ═══════════════════════════════════════════════════════════════════════════════

function findContextualRichAnchor(
    paragraphText: string,
    target: InternalLinkTarget,
    log: LogFunction
): string {
    if (!paragraphText || !target?.title) return '';

    const text = paragraphText;
    const textLower = text.toLowerCase();
    const titleLower = target.title.toLowerCase();

    // Extract meaningful keywords from title (4+ chars, no stop words)
    const titleKeywords = titleLower
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !STOP_WORDS.has(w));

    // Also keywords from slug
    const slugKeywords = target.slug
        ? target.slug.replace(/-/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w))
        : [];

    const keywords = [...new Set([...titleKeywords, ...slugKeywords])];

    if (keywords.length === 0) {
        return '';
    }

    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30);

    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 1: Find natural phrase containing keyword (BEST QUALITY)
    // ═══════════════════════════════════════════════════════════════════════════

    for (const keyword of keywords) {
        for (const sentence of sentences) {
            const sentLower = sentence.toLowerCase();
            const kwIdx = sentLower.indexOf(keyword);

            if (kwIdx === -1) continue;

            const words = sentence.trim().split(/\s+/);
            const wordsLower = sentLower.trim().split(/\s+/);

            // Find word index containing keyword
            let kwWordIdx = -1;
            for (let i = 0; i < wordsLower.length; i++) {
                if (wordsLower[i].includes(keyword)) {
                    kwWordIdx = i;
                    break;
                }
            }

            if (kwWordIdx === -1) continue;

            // Try phrase lengths 5, 4, 3 words (prefer longer)
            for (let len = 5; len >= 3; len--) {
                for (let offset = 0; offset < len; offset++) {
                    const start = Math.max(0, kwWordIdx - offset);
                    const end = Math.min(words.length, start + len);

                    if (end - start < 3) continue;

                    const phraseWords = words.slice(start, end);
                    let phrase = phraseWords.join(' ')
                        .replace(/^[^a-zA-Z0-9]+/, '')
                        .replace(/[^a-zA-Z0-9]+$/, '')
                        .trim();

                    // Validate length
                    if (phrase.length < LINK_CONFIG.MIN_ANCHOR_CHARS || phrase.length > LINK_CONFIG.MAX_ANCHOR_CHARS) {
                        continue;
                    }

                    const wordCount = phrase.split(/\s+/).length;
                    if (wordCount < LINK_CONFIG.MIN_ANCHOR_WORDS || wordCount > LINK_CONFIG.MAX_ANCHOR_WORDS) {
                        continue;
                    }

                    // Check first/last word not stop word
                    const first = phrase.split(/\s+/)[0].toLowerCase();
                    const last = phrase.split(/\s+/).pop()?.toLowerCase() || '';

                    if (STOP_WORDS.has(first) || STOP_WORDS.has(last)) continue;

                    // Check not bad pattern
                    const phraseLower = phrase.toLowerCase();
                    if (BAD_ANCHOR_PATTERNS.some(p => phraseLower.includes(p))) continue;

                    // Verify exists in original
                    if (text.toLowerCase().includes(phrase.toLowerCase())) {
                        const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
                        const exactPhrase = text.substring(idx, idx + phrase.length);
                        log(`      ✓ Anchor (S1): "${exactPhrase}"`);
                        return exactPhrase;
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 2: Keyword + context words
    // ═══════════════════════════════════════════════════════════════════════════

    for (const keyword of keywords) {
        const kwIdx = textLower.indexOf(keyword);
        if (kwIdx === -1) continue;

        // Get context around keyword
        const ctxStart = Math.max(0, kwIdx - 40);
        const ctxEnd = Math.min(text.length, kwIdx + keyword.length + 40);
        const context = text.substring(ctxStart, ctxEnd);
        const contextWords = context.split(/\s+/);

        // Find keyword word in context
        let kwWordIdx = -1;
        for (let i = 0; i < contextWords.length; i++) {
            if (contextWords[i].toLowerCase().includes(keyword)) {
                kwWordIdx = i;
                break;
            }
        }

        if (kwWordIdx === -1) continue;

        // Build phrase: 1-2 words before + keyword word + 1-2 words after
        const start = Math.max(0, kwWordIdx - 2);
        const end = Math.min(contextWords.length, kwWordIdx + 3);

        let phrase = contextWords.slice(start, end).join(' ')
            .replace(/^[^a-zA-Z0-9]+/, '')
            .replace(/[^a-zA-Z0-9]+$/, '')
            .trim();

        if (phrase.length >= LINK_CONFIG.MIN_ANCHOR_CHARS && phrase.length <= LINK_CONFIG.MAX_ANCHOR_CHARS) {
            const wordCount = phrase.split(/\s+/).length;
            const first = phrase.split(/\s+/)[0].toLowerCase();

            if (wordCount >= 3 && wordCount <= 6 && !STOP_WORDS.has(first)) {
                log(`      ✓ Anchor (S2): "${phrase}"`);
                return phrase;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NO FALLBACK — Return empty to skip low-quality anchors
    // ═══════════════════════════════════════════════════════════════════════════

    return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 INTERNAL LINK INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

function injectInternalLinksDistributed(
    html: string,
    linkTargets: InternalLinkTarget[],
    currentUrl: string,
    log: LogFunction
): { html: string; linksAdded: InternalLinkResult[]; totalLinks: number } {

    log(`🔗 INTERNAL LINK ENGINE v2.0`);
    log(`   → HTML: ${html?.length || 0} chars`);
    log(`   → Targets: ${linkTargets?.length || 0}`);

    if (!html || !isValidArray(linkTargets)) {
        return { html: html || '', linksAdded: [], totalLinks: 0 };
    }

    const linksAdded: InternalLinkResult[] = [];

    const targets = linkTargets.filter(t =>
        t?.url && t?.title && t.title.length >= 10 && (!currentUrl || t.url !== currentUrl)
    ).slice(0, 30);

    log(`   → Valid targets: ${targets.length}`);

    if (targets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }

    const parts = html.split(/(<h2[^>]*>)/gi);

    let totalLinksAdded = 0;
    let targetIdx = 0;
    let lastLinkWordPos = 0;
    let currentWordPos = 0;

    const processed = parts.map((part, partIdx) => {
        if (part.match(/<h2/i) || partIdx === 0) {
            currentWordPos += countWords(part);
            return part;
        }

        if (totalLinksAdded >= LINK_CONFIG.MAX_TOTAL) {
            currentWordPos += countWords(part);
            return part;
        }

        let sectionLinks = 0;
        let processedPart = part;

        // Find paragraphs (min 60 chars)
        const paraRegex = /<p[^>]*>([\s\S]{60,}?)<\/p>/gi;
        let match;
        const paras: Array<{ full: string; plain: string; pos: number }> = [];

        while ((match = paraRegex.exec(part)) !== null) {
            const plain = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (plain.length >= 60) {
                paras.push({ full: match[0], plain, pos: match.index });
            }
        }

        for (const para of paras) {
            if (sectionLinks >= LINK_CONFIG.MAX_PER_SECTION || totalLinksAdded >= LINK_CONFIG.MAX_TOTAL) break;

            const paraWordPos = currentWordPos + countWords(part.substring(0, para.pos));

            if (paraWordPos - lastLinkWordPos < LINK_CONFIG.MIN_WORDS_BETWEEN && linksAdded.length > 0) {
                continue;
            }

            // Try multiple targets
            let inserted = false;
            for (let t = targetIdx; t < Math.min(targetIdx + 5, targets.length) && !inserted; t++) {
                const target = targets[t];

                if (linksAdded.some(l => l.url === target.url)) continue;

                const anchor = findContextualRichAnchor(para.plain, target, log);

                if (!anchor || anchor.length < LINK_CONFIG.MIN_ANCHOR_CHARS) continue;

                // Build link
                const link = `<a href="${escapeHtml(target.url)}" title="${escapeHtml(target.title)}" style="color: ${T.primary} !important; font-weight: 600 !important; text-decoration: underline !important; text-underline-offset: 3px !important;">${anchor}</a>`;

                // Escape for regex
                const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(?<!<[^>]*)\\b${escaped}\\b(?![^<]*>)`, 'i');

                if (!para.full.match(regex) || para.full.includes(`>${anchor}</a>`)) continue;

                const newPara = para.full.replace(regex, link);

                if (newPara !== para.full) {
                    processedPart = processedPart.replace(para.full, newPara);
                    linksAdded.push({
                        url: target.url,
                        anchorText: anchor,
                        relevanceScore: 0.9,
                        position: paraWordPos
                    });
                    sectionLinks++;
                    totalLinksAdded++;
                    lastLinkWordPos = paraWordPos;
                    inserted = true;

                    log(`   ✅ Link ${totalLinksAdded}: "${anchor}" → ${target.url.substring(0, 50)}...`);
                }
            }

            targetIdx++;
        }

        currentWordPos += countWords(part);
        return processedPart;
    });

    log(`   🔗 RESULT: ${totalLinksAdded} high-quality links`);

    return {
        html: processed.join(''),
        linksAdded,
        totalLinks: totalLinksAdded
    };
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
    } catch { }

    // Strategy 2: Extract from markdown code block
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            const parsed = JSON.parse(jsonBlockMatch[1].trim());
            if (parsed.htmlContent) {
                log('   ✓ JSON extracted from markdown');
                return { success: true, data: parsed };
            }
        } catch { }
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
        } catch { }
    }

    // Strategy 4: Fix trailing commas
    let fixed = text.replace(/,(\s*[}\]])/g, '$1');
    try {
        const parsed = JSON.parse(fixed);
        if (parsed.htmlContent) {
            log('   ✓ JSON healed with syntax fixes');
            return { success: true, data: parsed };
        }
    } catch { }

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
        } catch { }
    }

    return { success: false, error: 'JSON parse failed' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 LLM CALLERS (Multi-Provider)
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

    if (isCircuitOpen(provider)) {
        throw new Error(`Circuit breaker OPEN for ${provider}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        let response = '';

        switch (provider) {
            case 'google':
                const ai = new GoogleGenerativeAI({ apiKey: apiKeys.google });
                const geminiResponse = await ai.models.generateContent({
                    model: model || 'gemini-2.5-flash-preview-05-20',
                    contents: userPrompt,
                    config: {
                        systemInstruction: systemPrompt,
                        temperature,
                        maxOutputTokens: maxTokens
                    }
                });
                response = geminiResponse.text || '';
                break;

            case 'openrouter':
                const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKeys.openrouter}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://wp-optimizer-pro.com',
                        'X-Title': 'WP Optimizer Pro'
                    },
                    body: JSON.stringify({
                        model: apiKeys.openrouterModel || model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature,
                        max_tokens: maxTokens
                    }),
                    signal: controller.signal
                });
                if (!orRes.ok) throw new Error(`OpenRouter error ${orRes.status}`);
                const orData = await orRes.json();
                response = orData.choices?.[0]?.message?.content || '';
                break;

            case 'openai':
                const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKeys.openai}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature,
                        max_tokens: maxTokens
                    }),
                    signal: controller.signal
                });
                if (!oaiRes.ok) throw new Error(`OpenAI error ${oaiRes.status}`);
                const oaiData = await oaiRes.json();
                response = oaiData.choices?.[0]?.message?.content || '';
                break;

            case 'anthropic':
                const antRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKeys.anthropic,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
                        system: systemPrompt,
                        messages: [{ role: 'user', content: userPrompt }],
                        temperature,
                        max_tokens: maxTokens
                    }),
                    signal: controller.signal
                });
                if (!antRes.ok) throw new Error(`Anthropic error ${antRes.status}`);
                const antData = await antRes.json();
                response = antData.content?.[0]?.text || '';
                break;

            case 'groq':
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKeys.groq}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: apiKeys.groqModel || 'llama-3.3-70b-versatile',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature,
                        max_tokens: Math.min(maxTokens, 8000)
                    }),
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
// 📝 REMOVE H1 TAGS
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
// 🚀 MAIN ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class AIOrchestrator {

    // ═══════════════════════════════════════════════════════════════════════════
    // 📋 generateEnhanced() — MAIN GENERATION METHOD
    // ═══════════════════════════════════════════════════════════════════════════

    async generateEnhanced(
        config: GenerateConfig,
        log: LogFunction,
        onProgress?: (progress: StageProgress) => void
    ): Promise<GenerationResult> {
        const startTime = Date.now();

        log(`🚀 WP OPTIMIZER PRO v${AI_ORCHESTRATOR_VERSION}`);
        log(`   → Topic: "${config.topic.substring(0, 50)}..."`);
        log(`   → Provider: ${config.provider} | Model: ${config.model}`);
        log(`   → Serper Key: ${config.apiKeys?.serper ? '✅' : '❌ MISSING!'}`);

        // Initialize BEFORE promises
        let youtubeVideo: YouTubeVideoData | null = null;
        let references: DiscoveredReference[] = [];

        // ═══════════════════════════════════════════════════════════════
        // PHASE 1: PARALLEL DISCOVERY
        // ═══════════════════════════════════════════════════════════════

        onProgress?.({ stage: 'youtube', progress: 10, message: 'Discovering assets...' });
        log(`🔍 Phase 1: Parallel Discovery`);

        const youtubePromise = config.apiKeys?.serper
            ? searchYouTubeVideo(config.topic, config.apiKeys.serper, log)
            : Promise.resolve(null);

        const referencesPromise = config.apiKeys?.serper
            ? discoverReferences(config.topic, config.apiKeys.serper, log)
            : Promise.resolve([]);

        // ═══════════════════════════════════════════════════════════════
        // PHASE 2: CONTENT GENERATION
        // ═══════════════════════════════════════════════════════════════

        onProgress?.({ stage: 'sections', progress: 30, message: 'Generating content...' });
        log(`📝 Phase 2: Content Generation`);

        const contentPrompt = `Write a ${CONTENT_TARGETS.TARGET_WORDS}+ word blog post about: "${config.topic}"

STYLE: Conversational, punchy. Use contractions. Short paragraphs (2-3 sentences). Start sentences with "And", "But", "So", "Look".

STRUCTURE: 8-12 H2 sections with H3 subsections. NO H1 tags. Wrap text in <p> tags.

BANNED: "In today's", "Let's dive in", "Comprehensive guide", "Leverage", "Utilize", "It's important to note"

OUTPUT JSON:
{
  "title": "Title (50-60 chars)",
  "metaDescription": "Meta (150-160 chars)",
  "slug": "url-slug",
  "htmlContent": "Full HTML",
  "excerpt": "Summary",
  "faqs": [{"question": "...", "answer": "..."}],
  "wordCount": number
}`;

        const systemPrompt = `You are an elite SEO content writer. Generate human-quality, engaging blog content. Output only valid JSON.`;

        let rawContract: ContentContract | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            log(`   📝 Attempt ${attempt}/3`);

            try {
                const response = await callLLM(
                    config.provider,
                    config.apiKeys,
                    config.model,
                    contentPrompt,
                    systemPrompt,
                    { temperature: 0.75 + (attempt - 1) * 0.03, maxTokens: 16000 },
                    TIMEOUTS.SINGLE_SHOT,
                    log
                );

                const parsed = healJSON(response, log);

                if (parsed.success && parsed.data?.htmlContent) {
                    rawContract = parsed.data;
                    log(`   ✅ Content generated: ${countWords(rawContract.htmlContent)} words`);
                    break;
                }
            } catch (e: any) {
                log(`   ❌ Error: ${e.message}`);
            }

            if (attempt < 3) await sleep(2000);
        }

        if (!rawContract) {
            throw new Error('Content generation failed after 3 attempts');
        }

        // ═══════════════════════════════════════════════════════════════
        // PHASE 3: AWAIT PARALLEL TASKS — CRITICAL!
        // ═══════════════════════════════════════════════════════════════

        onProgress?.({ stage: 'references', progress: 60, message: 'Processing assets...' });
        log(`⏳ Phase 3: Awaiting Parallel Tasks`);

        const [ytResult, refResult] = await Promise.allSettled([youtubePromise, referencesPromise]);

        // EXPLICIT REASSIGNMENT
        if (ytResult.status === 'fulfilled' && ytResult.value) {
            youtubeVideo = ytResult.value;
            log(`   ✅ YouTube: "${youtubeVideo.title?.substring(0, 40)}..." (videoId: ${youtubeVideo.videoId})`);
        } else {
            log(`   ⚠️ YouTube: ${ytResult.status === 'rejected' ? (ytResult.reason as Error)?.message : 'No video found'}`);
        }

        if (refResult.status === 'fulfilled') {
            references = refResult.value;
            log(`   ✅ References: ${references.length}`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PHASE 4: CONTENT ENRICHMENT
        // ═══════════════════════════════════════════════════════════════

        onProgress?.({ stage: 'merge', progress: 75, message: 'Enriching content...' });
        log(`🎨 Phase 4: Content Enrichment`);

        const contentParts: string[] = [];

        // CSS + Root wrapper
        contentParts.push(THEME_ADAPTIVE_CSS);
        contentParts.push('<div id="wpo-root">');

        // Quick Answer
        contentParts.push(createQuickAnswerBox(
            `Here's the deal: ${config.topic} isn't complicated when you break it down. This guide gives you exactly what works — no fluff.`
        ));

        // Stats
        contentParts.push(createStatisticsBox([
            { value: '73%', label: 'Success Rate', icon: '📈' },
            { value: '2.5x', label: 'Faster Results', icon: '⚡' },
            { value: '10K+', label: 'People Helped', icon: '👥' },
            { value: '4.8★', label: 'Rating', icon: '⭐' }
        ]));

        // Process main content
        let mainContent = removeAllH1Tags(rawContract.htmlContent, log);

        // Strip FAQ from LLM output (we add our own)
        mainContent = mainContent.replace(/<h2[^>]*>.*?(?:FAQ|Frequently Asked).*?<\/h2>[\s\S]*?(?=<h2[^>]*>|$)/gi, '');

        // Split H2 sections
        const h2Parts = mainContent.split(/(<h2[^>]*>)/gi).filter(p => p.trim());
        const h2Sections: string[] = [];
        let intro = '';

        for (let i = 0; i < h2Parts.length; i++) {
            if (h2Parts[i].match(/<h2[^>]*>/i)) {
                h2Sections.push(h2Parts[i] + (h2Parts[i + 1] || ''));
                i++;
            } else if (h2Sections.length === 0) {
                intro += h2Parts[i];
            }
        }

        log(`   📊 Structure: ${h2Sections.length} H2 sections`);

        // Add intro
        if (intro.trim()) {
            contentParts.push(intro);
        }

        // YouTube — AFTER intro
        if (youtubeVideo && youtubeVideo.videoId) {
            contentParts.push(createYouTubeEmbed(youtubeVideo));
            log(`   ✅ YouTube EMBEDDED`);
        } else {
            log(`   ⚠️ NO YouTube video to embed`);
        }

        // Visual injection — PERCENTAGE-BASED
        const proTips = [
            'The first 30 days are hardest. Push through that resistance and everything changes.',
            'Done beats perfect. Ship fast, learn faster, iterate constantly.',
            'Consistency beats intensity. Daily 30-minute sessions beat weekend marathons.',
            'Track everything. What gets measured gets improved.',
            'Learn from practitioners, not theorists. Theory is useless without execution.'
        ];

        const expertQuotes = [
            { q: 'The bottleneck is never resources. It\'s resourcefulness.', a: 'Tony Robbins', r: 'Performance Coach' },
            { q: 'What gets measured gets managed.', a: 'Peter Drucker', r: 'Management Expert' },
            { q: 'The way to get started is to quit talking and begin doing.', a: 'Walt Disney', r: 'Entrepreneur' }
        ];

        const totalSections = h2Sections.length;
        let tipIdx = 0, quoteIdx = 0;

        h2Sections.forEach((section, idx) => {
            contentParts.push(section);

            const pct = (idx + 1) / totalSections;

            // 10% - Info callout
            if (pct >= 0.1 && pct < 0.15) {
                contentParts.push(createCalloutBox('Bookmark this page. You\'ll want to come back as you implement.', 'info'));
            }

            // 20% - Pro tip
            if (pct >= 0.2 && pct < 0.25 && tipIdx < proTips.length) {
                contentParts.push(createProTipBox(proTips[tipIdx++]));
            }

            // 30% - Expert quote
            if (pct >= 0.3 && pct < 0.35 && quoteIdx < expertQuotes.length) {
                const q = expertQuotes[quoteIdx++];
                contentParts.push(createExpertQuoteBox(q.q, q.a, q.r));
            }

            // 40% - Warning
            if (pct >= 0.4 && pct < 0.45) {
                contentParts.push(createWarningBox('Biggest mistake? Trying everything at once. Pick ONE thing and master it.'));
            }

            // 50% - Checklist
            if (pct >= 0.5 && pct < 0.55) {
                contentParts.push(createChecklistBox('Quick Action Checklist', [
                    'Start with ONE strategy today',
                    'Set up tracking to measure progress',
                    'Block 30 minutes daily for practice',
                    'Review and adjust weekly'
                ]));
            }

            // 60% - Pro tip + Quote
            if (pct >= 0.6 && pct < 0.65) {
                if (tipIdx < proTips.length) contentParts.push(createProTipBox(proTips[tipIdx++]));
                if (quoteIdx < expertQuotes.length) {
                    const q = expertQuotes[quoteIdx++];
                    contentParts.push(createExpertQuoteBox(q.q, q.a, q.r));
                }
            }

            // 70% - Step by step
            if (pct >= 0.7 && pct < 0.75) {
                contentParts.push(createStepByStepBox('Your 7-Day Action Plan', [
                    { title: 'Day 1-2: Foundation', description: 'Set up your environment. Get clear on your ONE goal.' },
                    { title: 'Day 3-4: Execute', description: 'Implement the core strategy. Start messy, just start.' },
                    { title: 'Day 5-6: Iterate', description: 'Review results. Cut what doesn\'t work.' },
                    { title: 'Day 7: Scale', description: 'Add the next layer. Build systems.' }
                ]));
            }

            // 80% - Stats
            if (pct >= 0.8 && pct < 0.85) {
                contentParts.push(createStatisticsBox([
                    { value: '87%', label: 'Completion', icon: '📚' },
                    { value: '3.2x', label: 'Results', icon: '📈' },
                    { value: '21', label: 'Days to Habit', icon: '🎯' }
                ]));
            }

            // Remaining tips
            if (pct >= 0.85 && tipIdx < proTips.length) {
                contentParts.push(createProTipBox(proTips[tipIdx++]));
            }
        });

        // Comparison
        contentParts.push(createComparisonTable(
            'What Works vs What Doesn\'t',
            ['❌ Common Mistakes', '✅ What Actually Works'],
            [
                ['Trying everything at once', 'Focus on one thing until mastery'],
                ['Copying others blindly', 'Adapting strategies to YOUR situation'],
                ['Giving up after first failure', 'Treating failures as data points'],
                ['Waiting for perfect conditions', 'Starting messy, iterating fast']
            ]
        ));

        // Key Takeaways
        contentParts.push(createKeyTakeaways([
            `${config.topic} requires consistent, focused action`,
            'Focus on the 20% of activities that drive 80% of results',
            'Track your progress weekly — what gets measured improves',
            'Start messy, iterate fast — perfectionism kills progress',
            'Model successful people — don\'t reinvent the wheel'
        ]));

        // FAQ
        if (rawContract.faqs && rawContract.faqs.length > 0) {
            const validFaqs = rawContract.faqs.filter((f: any) =>
                f?.question?.length > 5 && f?.answer?.length > 20
            );
            if (validFaqs.length > 0) {
                contentParts.push(createFAQAccordion(validFaqs));
            }
        }

        // References
        if (references.length > 0) {
            contentParts.push(createReferencesSection(references));
        }

        // Final CTA
        contentParts.push(createHighlightBox(
            'You have everything you need. Will you take action? Start today.',
            '🚀', '#10b981'
        ));

        contentParts.push(createCalloutBox(
            'The gap between where you are and where you want to be is bridged by action. Go.',
            'success'
        ));

        contentParts.push('</div>');

        let assembledContent = contentParts.filter(Boolean).join('\n\n');

        // ═══════════════════════════════════════════════════════════════
        // PHASE 5: INTERNAL LINKS
        // ═══════════════════════════════════════════════════════════════

        if (isValidArray(config.internalLinks)) {
            onProgress?.({ stage: 'polish', progress: 90, message: 'Adding internal links...' });
            log(`🔗 Phase 5: Internal Links`);

            const linkResult = injectInternalLinksDistributed(
                assembledContent,
                config.internalLinks,
                '',
                log
            );

            assembledContent = linkResult.html;
            log(`   ✅ ${linkResult.totalLinks} links injected`);
        }

        // ═══════════════════════════════════════════════════════════════
        // DONE
        // ═══════════════════════════════════════════════════════════════

        onProgress?.({ stage: 'validation', progress: 100, message: 'Complete!' });

        const finalContract: ContentContract = {
            ...rawContract,
            htmlContent: assembledContent,
            wordCount: countWords(assembledContent)
        };

        const totalTime = Date.now() - startTime;

        log(`🎉 SUCCESS`);
        log(`   → ${finalContract.wordCount} words`);
        log(`   → ${h2Sections.length} sections`);
        log(`   → ${references.length} references`);
        log(`   → ${youtubeVideo ? '1 video' : 'No video'}`);
        log(`   → ${(totalTime / 1000).toFixed(1)}s total`);

        return {
            contract: finalContract,
            generationMethod: 'staged',
            attempts: 1,
            totalTime,
            youtubeVideo: youtubeVideo || undefined,
            references
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🎯 generateSingleShot() — FALLBACK METHOD
    // ═══════════════════════════════════════════════════════════════════════════

    async generateSingleShot(config: GenerateConfig, log: LogFunction): Promise<GenerationResult> {
        return this.generateEnhanced(config, log);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔧 generate() — DEFAULT ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════

    async generate(
        config: GenerateConfig,
        log: LogFunction,
        onProgress?: (progress: StageProgress) => void
    ): Promise<GenerationResult> {
        return this.generateEnhanced(config, log, onProgress);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS — NO DUPLICATES!
// ═══════════════════════════════════════════════════════════════════════════════

export const orchestrator = new AIOrchestrator();

export const VALID_GEMINI_MODELS: Record<string, string> = {
    'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash Preview',
    'gemini-2.5-pro-preview-05-06': 'Gemini 2.5 Pro Preview',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
};

export const OPENROUTER_MODELS = [
    'anthropic/claude-sonnet-4',
    'anthropic/claude-opus-4',
    'google/gemini-2.5-flash-preview',
    'google/gemini-2.5-pro-preview',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.3-70b-instruct',
    'qwen/qwen-2.5-72b-instruct',
];

export const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
];

export default orchestrator;
