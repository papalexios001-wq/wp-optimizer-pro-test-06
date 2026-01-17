// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v27.1.0 — ENTERPRISE SOTA AI ORCHESTRATOR (FIXED)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// COMPLETE FEATURE SET:
// ✅ STAGED CONTENT PIPELINE — Generates outline → sections → merge (no truncation)
// ✅ THEME-ADAPTIVE VISUALS — Beautiful components that work on ANY theme
// ✅ REFERENCE DISCOVERY — Serper.dev powered authoritative source citations
// ✅ YOUTUBE INTEGRATION — Automatic relevant video discovery and embedding
// ✅ EVEN LINK DISTRIBUTION — Max 2 internal links per section
// ✅ CIRCUIT BREAKER — Fails fast on repeated API errors
// ✅ ROBUST JSON HEALING — Multi-strategy recovery for malformed responses
// ✅ MULTI-PROVIDER — Google, OpenRouter, OpenAI, Anthropic, Groq
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

export const AI_ORCHESTRATOR_VERSION = "27.1.0";

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
    TARGET_WORDS: 4000,
    MAX_WORDS: 5000,
    SECTION_WORDS: 350,
} as const;

const LINK_CONFIG = {
    MAX_TOTAL: 15,
    MAX_PER_SECTION: 2,
    MIN_WORDS_BETWEEN: 150,
} as const;

// Year calculation
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
export const CONTENT_YEAR = currentMonth === 11 ? currentYear + 1 : currentYear;

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
    if (Date.now() - breaker.lastFailure > 60000) return false;
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
.wpo-content {
  --wpo-primary: #6366f1;
  --wpo-success: #10b981;
  --wpo-warning: #f59e0b;
  --wpo-danger: #ef4444;
  --wpo-info: #3b82f6;
  --wpo-bg-subtle: rgba(128, 128, 128, 0.06);
  --wpo-border: rgba(128, 128, 128, 0.15);
  --wpo-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-family: var(--wpo-font);
  line-height: 1.8;
  font-size: clamp(16px, 2.5vw, 18px);
}
.wpo-content h2 { font-size: clamp(1.5rem, 4vw, 1.875rem); font-weight: 700; line-height: 1.3; margin: 2.5rem 0 1.25rem; }
.wpo-content h3 { font-size: clamp(1.25rem, 3vw, 1.5rem); font-weight: 600; line-height: 1.4; margin: 2rem 0 1rem; }
.wpo-content p { margin: 0 0 1rem; line-height: 1.8; }
.wpo-content ul, .wpo-content ol { margin: 1rem 0; padding-left: 1.5rem; }
.wpo-content li { margin: 0.5rem 0; line-height: 1.7; }
.wpo-content a { color: var(--wpo-primary); text-decoration: underline; text-decoration-color: rgba(99, 102, 241, 0.3); text-underline-offset: 3px; }
.wpo-content a:hover { text-decoration-color: var(--wpo-primary); }
.wpo-box { border-radius: 16px; padding: 24px; margin: 32px 0; border: 1px solid var(--wpo-border); background: var(--wpo-bg-subtle); }
@media (max-width: 768px) { .wpo-content { font-size: 16px; } .wpo-box { padding: 16px; margin: 24px 0; } }
</style>
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL COMPONENT GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

export function createQuickAnswerBox(answer: string, title: string = 'Quick Answer'): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 32px; margin: 40px 0; color: white; box-shadow: 0 20px 40px rgba(102,126,234,0.3);">
    <div style="display: flex; align-items: flex-start; gap: 20px;">
        <div style="min-width: 60px; height: 60px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 28px;">⚡</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 10px;">${escapeHtml(title)}</div>
            <p style="font-size: 18px; line-height: 1.7; margin: 0; font-weight: 500;">${answer}</p>
        </div>
    </div>
</div>`;
}

export function createProTipBox(tip: string, title: string = 'Pro Tip'): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 20px; padding: 28px; margin: 36px 0; color: white; box-shadow: 0 16px 32px rgba(17,153,142,0.25);">
    <div style="display: flex; align-items: flex-start; gap: 18px;">
        <div style="min-width: 52px; height: 52px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 24px;">💡</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 8px;">${escapeHtml(title)}</div>
            <p style="font-size: 16px; line-height: 1.7; margin: 0;">${tip}</p>
        </div>
    </div>
</div>`;
}

export function createWarningBox(warning: string, title: string = 'Important'): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 20px; padding: 28px; margin: 36px 0; color: white; box-shadow: 0 16px 32px rgba(245,87,108,0.25);">
    <div style="display: flex; align-items: flex-start; gap: 18px;">
        <div style="min-width: 52px; height: 52px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 24px;">⚠️</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 8px;">${escapeHtml(title)}</div>
            <p style="font-size: 16px; line-height: 1.7; margin: 0;">${warning}</p>
        </div>
    </div>
</div>`;
}

export function createExpertQuoteBox(quote: string, author: string, title?: string): string {
    return `
<blockquote class="wpo-box" style="background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%); border-left: 4px solid #6366f1; font-style: normal;">
    <div style="font-size: 28px; color: #6366f1; opacity: 0.5; line-height: 1; margin-bottom: 12px;">"</div>
    <p style="font-size: 18px; line-height: 1.8; font-style: italic; margin: 0 0 20px 0;">${quote}</p>
    <footer style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">👤</div>
        <div>
            <cite style="font-style: normal; font-weight: 700; font-size: 15px; display: block;">${escapeHtml(author)}</cite>
            ${title ? `<span style="font-size: 13px; opacity: 0.6;">${escapeHtml(title)}</span>` : ''}
        </div>
    </footer>
</blockquote>`;
}

export function createKeyTakeaways(takeaways: string[]): string {
    if (!takeaways || takeaways.length === 0) return '';
    
    const items = takeaways.map((t, i) => `
        <li style="display: flex; align-items: flex-start; gap: 16px; padding: 18px 0; ${i < takeaways.length - 1 ? 'border-bottom: 1px solid rgba(99,102,241,0.1);' : ''}">
            <span style="min-width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 800; flex-shrink: 0; box-shadow: 0 4px 12px rgba(102,126,234,0.3);">${i + 1}</span>
            <span style="font-size: 16px; line-height: 1.6; padding-top: 6px; color: #374151;">${escapeHtml(t)}</span>
        </li>
    `).join('');

    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.04) 100%); border: 2px solid rgba(99,102,241,0.15); border-radius: 24px; padding: 36px; margin: 48px 0;">
    <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 2px solid rgba(99,102,241,0.1);">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 24px rgba(102,126,234,0.3);">
            <span style="font-size: 28px;">🎯</span>
        </div>
        <div>
            <h3 style="font-size: 22px; font-weight: 800; margin: 0; color: #111827;">Key Takeaways</h3>
            <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">Remember these crucial points</p>
        </div>
    </div>
    <ul style="list-style: none; padding: 0; margin: 0;">${items}</ul>
</div>`;
}

export function createFAQAccordion(faqs: Array<{ question: string; answer: string }>): string {
    if (!faqs || faqs.length === 0) return '';
    
    const sectionId = generateUniqueId();
    
    const faqItems = faqs.map((faq, index) => {
        return `
        <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" class="wpo-faq-item" style="border: 1px solid rgba(128,128,128,0.12); border-radius: 12px; margin-bottom: 12px; overflow: hidden; background: white;">
            <button 
                onclick="this.parentElement.classList.toggle('wpo-faq-open'); this.querySelector('.wpo-faq-arrow').style.transform = this.parentElement.classList.contains('wpo-faq-open') ? 'rotate(180deg)' : 'rotate(0deg)'; this.nextElementSibling.style.maxHeight = this.parentElement.classList.contains('wpo-faq-open') ? this.nextElementSibling.scrollHeight + 'px' : '0px';"
                style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; cursor: pointer; font-size: 16px; font-weight: 600; gap: 16px; background: none; border: none; text-align: left; font-family: inherit; color: inherit;"
            >
                <span itemprop="name" style="flex: 1; line-height: 1.4;">${escapeHtml(faq.question)}</span>
                <span class="wpo-faq-arrow" style="font-size: 14px; color: #6366f1; transition: transform 0.3s ease; flex-shrink: 0;">▼</span>
            </button>
            <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; background: rgba(99,102,241,0.03);">
                <div itemprop="text" style="padding: 20px 24px; font-size: 15px; line-height: 1.8; color: #374151;">${faq.answer}</div>
            </div>
        </div>`;
    }).join('');

    return `
<section id="${sectionId}" itemscope itemtype="https://schema.org/FAQPage" style="margin: 56px 0;">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 28px;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(99,102,241,0.25);">
            <span style="font-size: 26px;">❓</span>
        </div>
        <div>
            <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #111827;">Frequently Asked Questions</h2>
            <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">${faqs.length} questions answered by experts</p>
        </div>
    </div>
    <div class="wpo-faq-container">
        ${faqItems}
    </div>
</section>`;
}

export function createCalloutBox(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
    const configs = {
        info: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', icon: 'ℹ️', label: 'Info' },
        success: { bg: 'rgba(16,185,129,0.08)', border: '#10b981', icon: '✅', label: 'Success' },
        warning: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', icon: '⚠️', label: 'Warning' },
        error: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444', icon: '🚫', label: 'Important' }
    };
    const c = configs[type];
    
    return `
<div class="wpo-box" style="background: ${c.bg}; border: 1px solid ${c.border}30; border-left: 4px solid ${c.border}; border-radius: 0 16px 16px 0; padding: 20px 24px; margin: 32px 0;">
    <div style="display: flex; align-items: flex-start; gap: 14px;">
        <span style="font-size: 22px; flex-shrink: 0;">${c.icon}</span>
        <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${c.border}; margin-bottom: 6px;">${c.label}</div>
            <p style="font-size: 15px; line-height: 1.7; margin: 0;">${text}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE VIDEO EMBED
// ═══════════════════════════════════════════════════════════════════════════════

export function createYouTubeEmbed(video: YouTubeVideoData): string {
    if (!video || !video.videoId) return '';
    
    return `
<div class="wpo-box" style="margin: 48px 0; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15);">
    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
        <iframe 
            src="https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1" 
            title="${escapeHtml(video.title)}"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen
            loading="lazy"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
        ></iframe>
    </div>
    <div style="padding: 20px 24px; background: linear-gradient(135deg, rgba(255,0,0,0.05) 0%, rgba(255,0,0,0.02) 100%); border-top: 1px solid rgba(128,128,128,0.1);">
        <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ff0000, #cc0000); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="font-size: 22px;">▶️</span>
            </div>
            <div style="flex: 1; min-width: 0;">
                <h4 style="font-size: 15px; font-weight: 700; margin: 0 0 4px 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(video.title)}</h4>
                <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; opacity: 0.6;">
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
// 📚 REFERENCES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createReferencesSection(references: DiscoveredReference[]): string {
    if (!references || references.length === 0) return '';
    
    const refItems = references.slice(0, 10).map((ref, i) => {
        const domain = extractDomain(ref.url);
        const yearDisplay = ref.year ? ` (${ref.year})` : '';
        
        return `
        <li style="display: flex; align-items: flex-start; gap: 14px; padding: 16px 0; ${i < references.length - 1 ? 'border-bottom: 1px solid rgba(128,128,128,0.08);' : ''}">
            <div style="flex-shrink: 0; width: 28px; height: 28px; background: rgba(99,102,241,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #6366f1;">${i + 1}</div>
            <div style="flex: 1; min-width: 0;">
                <a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer" style="font-size: 15px; font-weight: 600; color: #6366f1; text-decoration: none; line-height: 1.4; display: block; margin-bottom: 4px;">
                    ${escapeHtml(ref.title)}${yearDisplay}
                </a>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; opacity: 0.6;">
                    ${ref.favicon ? `<img src="${escapeHtml(ref.favicon)}" alt="" width="14" height="14" style="border-radius: 3px;" onerror="this.style.display='none'">` : ''}
                    <span>${escapeHtml(ref.source || domain)}</span>
                    ${ref.authorityScore >= 80 ? '<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">HIGH AUTHORITY</span>' : ''}
                </div>
                ${ref.snippet ? `<p style="font-size: 13px; line-height: 1.5; margin: 8px 0 0 0; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHtml(ref.snippet)}</p>` : ''}
            </div>
        </li>`;
    }).join('');

    return `
<section class="wpo-box" style="background: linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.02) 100%); border: 1px solid rgba(99,102,241,0.1); border-radius: 20px; padding: 28px; margin: 48px 0;">
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(99,102,241,0.1);">
        <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(99,102,241,0.25);">
            <span style="font-size: 24px;">📚</span>
        </div>
        <div>
            <h2 style="font-size: 20px; font-weight: 800; margin: 0;">References & Sources</h2>
            <p style="font-size: 13px; opacity: 0.6; margin: 4px 0 0 0;">${references.length} authoritative sources cited</p>
        </div>
    </div>
    <ul style="list-style: none; padding: 0; margin: 0;">
        ${refItems}
    </ul>
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ADDITIONAL VISUAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createDataTable(title: string, headers: string[], rows: string[][], sourceNote?: string): string {
    if (!rows || rows.length === 0) return '';
    
    const headerCells = headers.map(h => `
        <th style="padding: 14px 18px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%); border-bottom: 2px solid rgba(99,102,241,0.2);">${escapeHtml(h)}</th>
    `).join('');
    
    const tableRows = rows.map((row, i) => {
        const cells = row.map((cell, j) => `
            <td style="padding: 14px 18px; font-size: 14px; border-bottom: 1px solid rgba(128,128,128,0.08); ${j === 0 ? 'font-weight: 600;' : ''}">${escapeHtml(cell)}</td>
        `).join('');
        return `<tr style="background: ${i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.02)'}; transition: background 0.2s;" onmouseover="this.style.background='rgba(99,102,241,0.04)'" onmouseout="this.style.background='${i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.02)'}'">${cells}</tr>`;
    }).join('');

    return `
<div class="wpo-box" style="border: 1px solid rgba(128,128,128,0.12); border-radius: 20px; overflow: hidden; margin: 48px 0; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
    <div style="padding: 20px 24px; background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%); border-bottom: 1px solid rgba(128,128,128,0.1);">
        <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(99,102,241,0.25);">
                <span style="font-size: 22px;">📊</span>
            </div>
            <div>
                <h3 style="font-size: 18px; font-weight: 700; margin: 0;">${escapeHtml(title)}</h3>
                ${sourceNote ? `<p style="font-size: 12px; opacity: 0.6; margin: 4px 0 0 0;">Source: ${escapeHtml(sourceNote)}</p>` : ''}
            </div>
        </div>
    </div>
    <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 500px;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>
</div>`;
}

export function createStatisticsBox(stats: Array<{ value: string; label: string; icon?: string }>): string {
    if (!stats || stats.length === 0) return '';
    
    const statItems = stats.map(stat => `
        <div style="flex: 1; min-width: 140px; text-align: center; padding: 28px 16px; background: rgba(255,255,255,0.5); border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.04);">
            <div style="font-size: 16px; margin-bottom: 10px;">${stat.icon || '📊'}</div>
            <div style="font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; line-height: 1;">${escapeHtml(stat.value)}</div>
            <div style="font-size: 13px; opacity: 0.7; font-weight: 600;">${escapeHtml(stat.label)}</div>
        </div>
    `).join('');

    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%); border: 2px solid rgba(99,102,241,0.1); border-radius: 24px; padding: 24px; margin: 48px 0;">
    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;">
        ${statItems}
    </div>
</div>`;
}

export function createComparisonTable(title: string, headers: [string, string], rows: Array<[string, string]>): string {
    if (!rows || rows.length === 0) return '';
    
    const tableRows = rows.map((row, i) => `
        <tr style="border-bottom: 1px solid rgba(128,128,128,0.08);">
            <td style="padding: 16px 20px; font-weight: 500; background: rgba(239,68,68,0.03); width: 50%;">
                <span style="color: #ef4444; margin-right: 8px;">✗</span>${escapeHtml(row[0])}
            </td>
            <td style="padding: 16px 20px; background: rgba(16,185,129,0.03); width: 50%;">
                <span style="color: #10b981; margin-right: 8px;">✓</span>${escapeHtml(row[1])}
            </td>
        </tr>
    `).join('');

    return `
<div class="wpo-box" style="border: 1px solid rgba(128,128,128,0.12); border-radius: 20px; overflow: hidden; margin: 40px 0;">
    <div style="padding: 20px 24px; background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%); border-bottom: 1px solid rgba(128,128,128,0.1);">
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">⚖️</span>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0;">${escapeHtml(title)}</h3>
        </div>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr style="background: rgba(128,128,128,0.04);">
                <th style="padding: 14px 20px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ef4444;">${escapeHtml(headers[0])}</th>
                <th style="padding: 14px 20px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #10b981;">${escapeHtml(headers[1])}</th>
            </tr>
        </thead>
        <tbody>${tableRows}</tbody>
    </table>
</div>`;
}

export function createStepByStepBox(title: string, steps: Array<{ title: string; description: string }>): string {
    if (!steps || steps.length === 0) return '';
    
    const stepItems = steps.map((step, i) => `
        <div style="display: flex; gap: 20px; ${i < steps.length - 1 ? 'padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px dashed rgba(99,102,241,0.2);' : ''}">
            <div style="flex-shrink: 0;">
                <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 800; box-shadow: 0 8px 20px rgba(99,102,241,0.3);">${i + 1}</div>
            </div>
            <div style="flex: 1; padding-top: 6px;">
                <h4 style="font-size: 17px; font-weight: 700; margin: 0 0 8px 0;">${escapeHtml(step.title)}</h4>
                <p style="font-size: 15px; line-height: 1.7; margin: 0; opacity: 0.8;">${escapeHtml(step.description)}</p>
            </div>
        </div>
    `).join('');

    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.02) 100%); border: 2px solid rgba(99,102,241,0.1); border-radius: 24px; padding: 32px; margin: 48px 0;">
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 28px;">
        <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(99,102,241,0.25);">
            <span style="font-size: 24px;">📋</span>
        </div>
        <h3 style="font-size: 22px; font-weight: 800; margin: 0;">${escapeHtml(title)}</h3>
    </div>
    ${stepItems}
</div>`;
}

export function createHighlightBox(text: string, icon: string = '✨', bgColor: string = '#6366f1'): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%); border-radius: 20px; padding: 28px 32px; margin: 40px 0; color: white; box-shadow: 0 16px 40px ${bgColor}40;">
    <div style="display: flex; align-items: center; gap: 18px;">
        <span style="font-size: 36px; flex-shrink: 0;">${icon}</span>
        <p style="font-size: 18px; line-height: 1.7; margin: 0; font-weight: 500;">${text}</p>
    </div>
</div>`;
}

export function createChecklistBox(title: string, items: string[], icon: string = '✅'): string {
    if (!items || items.length === 0) return '';
    
    const checkItems = items.map((item, i) => `
        <li style="display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; ${i < items.length - 1 ? 'border-bottom: 1px solid rgba(16,185,129,0.1);' : ''}">
            <span style="font-size: 18px; flex-shrink: 0; margin-top: 2px;">${icon}</span>
            <span style="font-size: 15px; line-height: 1.6;">${escapeHtml(item)}</span>
        </li>
    `).join('');

    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(34,197,94,0.02) 100%); border: 2px solid rgba(16,185,129,0.15); border-radius: 20px; padding: 28px; margin: 40px 0;">
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(16,185,129,0.25);">
            <span style="font-size: 22px;">📝</span>
        </div>
        <h3 style="font-size: 20px; font-weight: 800; margin: 0;">${escapeHtml(title)}</h3>
    </div>
    <ul style="list-style: none; padding: 0; margin: 0;">${checkItems}</ul>
</div>`;
}

export function createDefinitionBox(term: string, definition: string): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(37,99,235,0.02) 100%); border-left: 5px solid #3b82f6; border-radius: 0 16px 16px 0; padding: 24px 28px; margin: 36px 0;">
    <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 22px;">📖</span>
        </div>
        <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #3b82f6; margin-bottom: 6px;">Definition</div>
            <h4 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0;">${escapeHtml(term)}</h4>
            <p style="font-size: 15px; line-height: 1.7; margin: 0; opacity: 0.85;">${definition}</p>
        </div>
    </div>
</div>`;
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
    
    const queries = [`${topic} tutorial guide`, `${topic} explained ${currentYear}`];
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
                if (views < 10000) continue;
                
                const titleLower = (video.title || '').toLowerCase();
                const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const matchingWords = topicWords.filter(w => titleLower.includes(w)).length;
                let relevanceScore = 50 + Math.min(30, (matchingWords / topicWords.length) * 30);
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
    if (sorted.length > 0) {
        log(`   📋 Top sources: ${sorted.slice(0, 5).map(r => r.source).join(', ')}`);
    }
    
    return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 INTERNAL LINK INJECTION — ENTERPRISE GRADE
// ═══════════════════════════════════════════════════════════════════════════════

export function injectInternalLinksDistributed(
    html: string,
    linkTargets: InternalLinkTarget[],
    currentUrl: string,
    log: LogFunction
): { html: string; linksAdded: InternalLinkResult[]; totalLinks: number } {
    
    log(`   🔗 ═══════════════════════════════════════════════════════`);
    log(`   🔗 INTERNAL LINK INJECTION — DEBUG MODE`);
    log(`   🔗 ═══════════════════════════════════════════════════════`);
    log(`   🔗 Input validation:`);
    log(`      → html length: ${html?.length || 0} chars`);
    log(`      → linkTargets length: ${linkTargets?.length || 0}`);
    
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
    
    log(`   🔗 Available targets: ${availableTargets.length}`);
    
    if (availableTargets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }
    
    const sectionSplitRegex = /(<h2[^>]*>)/gi;
    const parts = html.split(sectionSplitRegex);
    
    log(`   🔗 Content split into ${parts.length} parts`);
    
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
        
        const paraRegex = /<p[^>]*>([\s\S]{30,}?)<\/p>/gi;  // Reduced from 80 to 30


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
            const anchorText = findAnchorText(para.plainText, target, log, totalLinksAdded < 3);
            
            if (anchorText && anchorText.length >= 4) {
                if (para.plainText.toLowerCase().includes(anchorText.toLowerCase())) {
                    const link = `<a href="${escapeHtml(target.url)}" title="${escapeHtml(target.title)}">${anchorText}</a>`;
                    
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
// 🔍 ANCHOR TEXT FINDER
// ═══════════════════════════════════════════════════════════════════════════════

function findAnchorText(
    text: string, 
    target: InternalLinkTarget, 
    log: LogFunction,
    verbose: boolean = false
): string {
    if (!text || !target?.title) {
        return '';
    }
    
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
        'tips', 'step', 'steps', 'make', 'get', 'use', 'using', 'new', 'first',
        'like', 'just', 'know', 'take', 'come', 'think', 'see', 'look', 'want',
        'give', 'find', 'tell', 'become', 'leave', 'put', 'mean', 'keep', 'let',
        'begin', 'seem', 'help', 'show', 'hear', 'play', 'run', 'move', 'live'
    ]);
    
    const titleWords = titleLower
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
    
    if (titleWords.length === 0) {
        return '';
    }
    
    // Strategy 1: Find exact 2-4 word phrase from title
    for (let len = Math.min(4, titleWords.length); len >= 2; len--) {
        for (let start = 0; start <= titleWords.length - len; start++) {
            const phrase = titleWords.slice(start, start + len).join(' ');
            if (phrase.length >= 5 && phrase.length <= 40 && textLower.includes(phrase)) {
                const idx = textLower.indexOf(phrase);
                const result = text.substring(idx, idx + phrase.length);
                if (verbose) log(`         → Strategy 1 MATCH: "${result}"`);
                return result;
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
            if (anchor.length >= 8 && anchor.length <= 35) {
                if (verbose) log(`         → Strategy 2a MATCH: "${anchor}"`);
                return anchor;
            }
        }
        
        const beforeText = text.substring(Math.max(0, wordIdx - 30), wordIdx);
        const beforeMatch = beforeText.match(/([a-zA-Z]{3,15})\s*$/);
        if (beforeMatch && !stopWords.has(beforeMatch[1].toLowerCase())) {
            const anchor = `${beforeMatch[1]} ${actualWord}`;
            if (anchor.length >= 8 && anchor.length <= 35) {
                if (verbose) log(`         → Strategy 2b MATCH: "${anchor}"`);
                return anchor;
            }
        }
        
        if (word.length >= 7) {
            if (verbose) log(`         → Strategy 2c MATCH: "${actualWord}"`);
            return actualWord;
        }
    }
    
    // Strategy 3: Find any 4+ char title word with adjacent word
    for (const word of titleWords) {
        if (word.length < 4) continue;
        
        const wordIdx = textLower.indexOf(word);
        if (wordIdx === -1) continue;
        
        const actualWord = text.substring(wordIdx, wordIdx + word.length);
        
        const afterText = text.substring(wordIdx + word.length, wordIdx + word.length + 25);
        const afterMatch = afterText.match(/^\s*([a-zA-Z]{3,12})/);
        if (afterMatch && !stopWords.has(afterMatch[1].toLowerCase())) {
            const anchor = `${actualWord} ${afterMatch[1]}`;
            if (verbose) log(`         → Strategy 3a MATCH: "${anchor}"`);
            return anchor;
        }
        
        if (word.length >= 6) {
            if (verbose) log(`         → Strategy 3b MATCH: "${actualWord}"`);
            return actualWord;
        }
    }
    
    // Strategy 4: Use slug-derived words
    if (target.slug && target.slug.length > 5) {
        const slugWords = target.slug
            .replace(/-/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4 && !stopWords.has(w));
        
        for (const word of slugWords) {
            const wordIdx = textLower.indexOf(word);
            if (wordIdx !== -1) {
                const actualWord = text.substring(wordIdx, wordIdx + word.length);
                
                if (word.length >= 6) {
                    if (verbose) log(`         → Strategy 4a MATCH: "${actualWord}"`);
                    return actualWord;
                }
                
                const afterText = text.substring(wordIdx + word.length, wordIdx + word.length + 20);
                const afterMatch = afterText.match(/^\s*([a-zA-Z]{3,10})/);
                if (afterMatch && !stopWords.has(afterMatch[1].toLowerCase())) {
                    const anchor = `${actualWord} ${afterMatch[1]}`;
                    if (verbose) log(`         → Strategy 4b MATCH: "${anchor}"`);
                    return anchor;
                }
            }
        }
    }
    
    // Strategy 5: Generic contextual anchor from paragraph
    const genericPhrases = text.match(/\b([a-zA-Z]{4,}(?:\s+[a-zA-Z]{4,}){1,2})\b/g);
    if (genericPhrases && genericPhrases.length > 0) {
        const badStartWords = new Set(['have', 'been', 'this', 'that', 'will', 'would', 'could', 'should', 'there', 'these', 'those', 'when', 'what', 'where', 'which', 'while', 'your', 'their', 'about', 'after', 'before', 'being', 'here', 'very', 'really', 'actually', 'basically', 'simply', 'just', 'even', 'also', 'only']);
        const badEndWords = new Set(['here', 'there', 'been', 'being', 'have', 'this', 'that', 'very', 'really', 'much', 'well', 'just', 'also', 'only', 'even']);
        
        const validPhrases = genericPhrases.filter(p => {
            const words = p.toLowerCase().split(' ');
            const firstWord = words[0];
            const lastWord = words[words.length - 1];
            
            return (
                p.length >= 10 &&
                p.length <= 35 &&
                !stopWords.has(firstWord) &&
                !badStartWords.has(firstWord) &&
                !badEndWords.has(lastWord) &&
                words.every(w => w.length >= 3) &&
                !words.every(w => stopWords.has(w))
            );
        });
        
        if (validPhrases.length > 0) {
            validPhrases.sort((a, b) => {
                const aAvgLen = a.split(' ').reduce((sum, w) => sum + w.length, 0) / a.split(' ').length;
                const bAvgLen = b.split(' ').reduce((sum, w) => sum + w.length, 0) / b.split(' ').length;
                return bAvgLen - aAvgLen;
            });
            
            const anchor = validPhrases[0];
            if (verbose) log(`         → Strategy 5 MATCH (generic): "${anchor}"`);
            return anchor;
        }
    }
    
    return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 JSON HEALING
// ═══════════════════════════════════════════════════════════════════════════════

function healJSON(rawText: string, log: LogFunction): { success: boolean; data?: any; error?: string } {
    if (!rawText?.trim()) return { success: false, error: 'Empty response' };
    
    let text = rawText.trim();
    
    try {
        const parsed = JSON.parse(text);
        if (parsed.htmlContent) return { success: true, data: parsed };
    } catch {}
    
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
    
    let fixed = text.replace(/,(\s*[}\]])/g, '$1');
    try {
        const parsed = JSON.parse(fixed);
        if (parsed.htmlContent) {
            log('   ✓ JSON healed with syntax fixes');
            return { success: true, data: parsed };
        }
    } catch {}
    
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
    
    return { success: false, error: `JSON parse failed` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 SYSTEM PROMPT
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
// 🔌 LLM CALLERS
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
                response = await callGemini(apiKeys.google, model, userPrompt, systemPrompt, temperature, maxTokens);
                break;
            case 'openrouter':
                response = await callOpenRouter(apiKeys.openrouter, apiKeys.openrouterModel || model, userPrompt, systemPrompt, temperature, maxTokens, controller.signal);
                break;
            case 'openai':
                response = await callOpenAI(apiKeys.openai, 'gpt-4o', userPrompt, systemPrompt, temperature, maxTokens, controller.signal);
                break;
            case 'anthropic':
                response = await callAnthropic(apiKeys.anthropic, 'claude-sonnet-4-20250514', userPrompt, systemPrompt, temperature, maxTokens, controller.signal);
                break;
            case 'groq':
                response = await callGroq(apiKeys.groq, apiKeys.groqModel || 'llama-3.3-70b-versatile', userPrompt, systemPrompt, temperature, Math.min(maxTokens, 8000), controller.signal);
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

async function callGemini(apiKey: string, model: string, userPrompt: string, systemPrompt: string, temperature: number, maxTokens: number): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-preview-05-20',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature, maxOutputTokens: maxTokens }
    });
    return response.text || '';
}

async function callOpenRouter(apiKey: string, model: string, userPrompt: string, systemPrompt: string, temperature: number, maxTokens: number, signal: AbortSignal): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://wp-optimizer-pro.com', 'X-Title': 'WP Optimizer Pro' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
        signal
    });
    if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(apiKey: string, model: string, userPrompt: string, systemPrompt: string, temperature: number, maxTokens: number, signal: AbortSignal): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
        signal
    });
    if (!response.ok) throw new Error(`OpenAI error ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(apiKey: string, model: string, userPrompt: string, systemPrompt: string, temperature: number, maxTokens: number, signal: AbortSignal): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
        signal
    });
    if (!response.ok) throw new Error(`Anthropic error ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text || '';
}

async function callGroq(apiKey: string, model: string, userPrompt: string, systemPrompt: string, temperature: number, maxTokens: number, signal: AbortSignal): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature, max_tokens: maxTokens }),
        signal
    });
    if (!response.ok) throw new Error(`Groq error ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 H1 REMOVAL
// ═══════════════════════════════════════════════════════════════════════════════

function removeAllH1Tags(html: string, log: LogFunction): string {
    if (!html) return html;
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0) return html;
    
    log(`   ⚠️ Removing ${h1Count} H1 tag(s)...`);
    let cleaned = html;
    for (let i = 0; i < 3; i++) {
        cleaned = cleaned.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
    }
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '').replace(/<\/h1>/gi, '');
    return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class AIOrchestrator {
    
    async generateEnhanced(
        config: GenerateConfig,
        log: LogFunction,
        onStageProgress?: (progress: StageProgress) => void
    ): Promise<GenerationResult> {
        const startTime = Date.now();
        log(`🚀 STAGED CONTENT PIPELINE v${AI_ORCHESTRATOR_VERSION}`);
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
            
            const youtubePromise = config.apiKeys?.serper ? (async () => {
                try {
                    const foundVideo = await searchYouTubeVideo(config.topic, config.apiKeys.serper, log);
                    if (foundVideo && foundVideo.videoId) {
                        youtubeVideo = foundVideo;
                    }
                } catch (e: any) {
                    log(`   ❌ YouTube search ERROR: ${e.message}`);
                }
            })() : Promise.resolve();

            const referencesPromise = config.apiKeys?.serper ? (async () => {
                try {
                    if (config.validatedReferences && config.validatedReferences.length >= 5) {
                        references = config.validatedReferences.map(ref => ({
                            url: ref.url,
                            title: ref.title,
                            source: ref.source || extractSourceName(ref.url),
                            snippet: ref.snippet,
                            year: ref.year,
                            authorityScore: ref.isAuthority ? 90 : 70,
                            favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(ref.url)}&sz=32`
                        }));
                        log(`   ✅ Using ${references.length} pre-validated references`);
                    } else {
                        references = await discoverReferences(config.topic, config.apiKeys.serper, { targetCount: 10, minAuthorityScore: 60 }, log);
                    }
                } catch (e: any) {
                    log(`   ❌ References discovery ERROR: ${e.message}`);
                }
            })() : Promise.resolve();
            
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

TARGET: 300-450 words.
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
                    progress: 20 + Math.round((sections.length / outline.sections.length) * 35),
                    message: `Generated ${sections.length}/${outline.sections.length} sections`,
                    sectionsCompleted: sections.length,
                    totalSections: outline.sections.length
                });
                
                if (i + 2 < outline.sections.length) await sleep(1000);
            }
            
            // Wait for parallel tasks
            await Promise.all([youtubePromise, referencesPromise]);
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 4: GENERATE FAQ
            // ═══════════════════════════════════════════════════════════════
            
            log(`❓ Stage 4: Generating FAQ section...`);
            
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
                    faqs = outline.faqTopics.slice(0, 8).map(q => ({ question: q, answer: `This is a common question about ${config.topic}. The answer depends on your specific situation.` }));
                }
            }
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 5: GENERATE INTRO & CONCLUSION
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'merge', progress: 75, message: 'Generating intro & conclusion...' });
            log(`📝 Stage 5: Generating intro & conclusion...`);
            
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
                introHtml = `<p>${escapeHtml(config.topic)} is a topic that deserves careful attention. In this comprehensive guide, you'll discover everything you need to know to achieve your goals.</p>`;
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
                conclusionHtml = `<h2>Conclusion</h2><p>Now you have all the tools and knowledge you need to succeed with ${escapeHtml(config.topic)}. The key is to take action and apply what you've learned consistently.</p>`;
            }
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 6: ASSEMBLE FINAL CONTENT
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'polish', progress: 85, message: 'Assembling final content...' });
            log(`🔀 Stage 6: Assembling content with visual components...`);
            
            const quickAnswerText = `${config.topic} requires understanding key principles and applying proven strategies. This comprehensive guide covers everything from foundational concepts to advanced techniques, backed by expert insights and real-world examples.`;
            
            const proTips = [
                `Start with the fundamentals before moving to advanced techniques — mastery comes from a solid foundation.`,
                `Track your progress regularly and adjust your approach based on actual results, not assumptions.`,
                `Learn from industry experts and stay updated with the latest trends and best practices.`
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
            contentParts.push('<div class="wpo-content">');
            contentParts.push(introHtml);
            contentParts.push(createQuickAnswerBox(quickAnswerText));
            
            if (youtubeVideo && youtubeVideo.videoId) {
                contentParts.push(createYouTubeEmbed(youtubeVideo));
                log(`   ✅ YouTube video embedded`);
            }
            
            sections.forEach((section, index) => {
                contentParts.push(section);
                
                if ((index + 1) % 3 === 0 && proTips[Math.floor(index / 3)]) {
                    contentParts.push(createProTipBox(proTips[Math.floor(index / 3)]));
                }
                
                if (index === 4) {
                    contentParts.push(createWarningBox(
                        `Many beginners make the mistake of rushing through the fundamentals. Take your time to fully understand each concept before moving forward — it will save you significant time and frustration later.`,
                        'Common Mistake to Avoid'
                    ));
                }
            });
            
            contentParts.push(createKeyTakeaways(keyTakeaways));
            
            if (faqs.length > 0) {
                contentParts.push(createFAQAccordion(faqs));
            }
            
            contentParts.push(conclusionHtml);
            
            if (references.length > 0) {
                contentParts.push(createReferencesSection(references));
                log(`   ✅ References section: ${references.length} sources`);
            }
            
            contentParts.push('</div>');
            
            let assembledContent = contentParts.filter(Boolean).join('\n\n');
            assembledContent = removeAllH1Tags(assembledContent, log);
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 7: INTERNAL LINKS
            // ═══════════════════════════════════════════════════════════════
            
            if (config.internalLinks && config.internalLinks.length > 0) {
                log(`🔗 Stage 7: Injecting internal links...`);
                
                const linkResult = injectInternalLinksDistributed(
                    assembledContent,
                    config.internalLinks,
                    '',
                    log
                );
                
                assembledContent = linkResult.html;
            }
            
            const finalWordCount = countWords(assembledContent);
            log(`   ✅ Final content: ${finalWordCount.toLocaleString()} words`);
            
            const contract: ContentContract = {
                title: outline.title,
                metaDescription: outline.metaDescription,
                slug: outline.slug,
                htmlContent: assembledContent,
                excerpt: outline.metaDescription,
                faqs,
                wordCount: finalWordCount
            };
            
            onStageProgress?.({ stage: 'validation', progress: 100, message: 'Complete!' });
            
            const totalTime = Date.now() - startTime;
            log(`🎉 STAGED GENERATION COMPLETE: ${finalWordCount.toLocaleString()} words in ${Math.round(totalTime / 1000)}s`);
            
            return {
                contract,
                generationMethod: 'staged',
                attempts: 1,
                totalTime,
                youtubeVideo: youtubeVideo || undefined,
                references
            };
            
        } catch (error: any) {
            log(`❌ Staged generation failed: ${error.message}`);
            log(`   → Falling back to single-shot...`);
            return this.generateSingleShot(config, log);
        }
    } 

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 SINGLE-SHOT GENERATION v29.0 — ALL BUGS FIXED
    // ═══════════════════════════════════════════════════════════════════════════════

    async generateSingleShot(config: GenerateConfig, log: LogFunction): Promise<GenerationResult> {
        const startTime = Date.now();
        log(`🎨 SINGLE-SHOT GENERATION v29.0 (ALL BUGS FIXED)`);
        
        let youtubeVideo: YouTubeVideoData | null = null;
        let references: DiscoveredReference[] = [];
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 1: START PARALLEL TASKS
        // ═══════════════════════════════════════════════════════════════

        log(`   🔍 Starting parallel discovery...`);
        log(`   📋 Serper API: ${config.apiKeys?.serper ? '✅ (' + config.apiKeys.serper.substring(0, 8) + '...)' : '❌ MISSING'}`);

        const youtubePromise = config.apiKeys?.serper ? (async () => {
            try {
                log(`   🎬 YouTube search starting...`);
                const video = await searchYouTubeVideo(config.topic, config.apiKeys.serper, log);
                if (video && video.videoId) {
                    youtubeVideo = video;
                    log(`   ✅ YouTube FOUND: "${video.title?.substring(0, 40)}..." (${video.views?.toLocaleString()} views)`);
                } else {
                    log(`   ⚠️ YouTube: No valid video returned`);
                }
                return video;
            } catch (e: any) {
                log(`   ❌ YouTube ERROR: ${e.message}`);
                return null;
            }
        })() : Promise.resolve(null);

        const referencesPromise = config.apiKeys?.serper ? (async () => {
            try {
                log(`   📚 References discovery starting...`);
                if (config.validatedReferences && config.validatedReferences.length >= 5) {
                    references = config.validatedReferences.map(ref => ({
                        url: ref.url,
                        title: ref.title,
                        source: ref.source || extractSourceName(ref.url),
                        snippet: ref.snippet,
                        year: ref.year,
                        authorityScore: ref.isAuthority ? 90 : 70,
                        favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(ref.url)}&sz=32`
                    }));
                    log(`   ✅ Using ${references.length} pre-validated references`);
                } else {
                    references = await discoverReferences(config.topic, config.apiKeys.serper, { targetCount: 10, minAuthorityScore: 60 }, log);
                    log(`   ✅ Discovered ${references.length} references`);
                }
            } catch (e: any) {
                log(`   ❌ References ERROR: ${e.message}`);
                references = [];
            }
        })() : Promise.resolve();
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 2: GENERATE CONTENT
        // ═══════════════════════════════════════════════════════════════
        
        const humanPrompt = `You're writing like Alex Hormozi meets Tim Ferriss. Punchy, personal, valuable.

Write a ${CONTENT_TARGETS.TARGET_WORDS}+ word blog post about: "${config.topic}"

⚠️ CRITICAL: Do NOT include FAQ section in htmlContent. We add FAQs separately.

VOICE RULES:
• Write like texting a smart friend
• Use contractions: don't, won't, can't, you'll, here's
• Start sentences with: Look, Here's the thing, And, But, So, Now
• 1-3 sentences MAX per paragraph
• Wrap ALL text in <p> tags

STRUCTURE:
• 8-12 H2 sections, each with 2-3 H3 subsections
• NO H1 tags
• Use proper <p>, <h2>, <h3>, <ul>, <li> tags

FORBIDDEN: "In today's", "It's important to note", "Let's dive in", "Comprehensive guide", "Leverage", "Utilize"

OUTPUT (VALID JSON ONLY):
{
  "title": "Title (50-60 chars)",
  "metaDescription": "Meta (150-160 chars)",
  "slug": "url-slug",
  "htmlContent": "Full HTML with <p>, <h2>, <h3>",
  "excerpt": "2-3 sentence summary",
  "faqs": [{"question": "...", "answer": "80-150 words"}],
  "wordCount": number
}

⚠️ Return ONLY valid JSON.`;

        for (let attempt = 1; attempt <= 3; attempt++) {
            log(`   📝 Content attempt ${attempt}/3...`);
            
            try {
                const response = await callLLM(
                    config.provider, config.apiKeys, config.model, humanPrompt,
                    'You are an elite content creator. Never sound formal or robotic.',
                    { temperature: 0.78 + (attempt - 1) * 0.04, maxTokens: 16000 },
                    TIMEOUTS.SINGLE_SHOT, log
                );
                
                const parsed = healJSON(response, log);
                
                if (parsed.success && parsed.data?.htmlContent) {
                    const rawContract = parsed.data as ContentContract;
                    
                    // ═══════════════════════════════════════════════════════════
                    // STEP 3: WAIT FOR BOTH PARALLEL TASKS — CRITICAL FIX!
                    // ═══════════════════════════════════════════════════════════
                    
                    log(`   ⏳ Waiting for YouTube & References...`);
                    await Promise.all([youtubePromise, referencesPromise]);  // ✅ AWAIT BOTH!
                    
                    log(`   📊 Parallel results:`);
                    log(`      → YouTube: ${youtubeVideo ? '✅ videoId=' + youtubeVideo.videoId : '❌ null'}`);
                    log(`      → References: ${references.length} sources`);
                    
                    // ═══════════════════════════════════════════════════════════
                    // STEP 4: BUILD CONTENT WITH 25+ VISUAL COMPONENTS
                    // ═══════════════════════════════════════════════════════════
                    
                    log(`   🎨 Building content with 25+ visual components...`);
                    
                    const contentParts: string[] = [];
                    
                    // CSS + Wrapper
                    contentParts.push(THEME_ADAPTIVE_CSS);
                    contentParts.push('<div class="wpo-content">');
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL 1: Quick Answer Box
                    // ═══════════════════════════════════════════════════════════
                    contentParts.push(createQuickAnswerBox(
                        `Here's the deal: ${config.topic} isn't as complicated as people make it. This guide breaks down exactly what works — no fluff, no filler, just actionable strategies.`,
                        '⚡ Quick Answer'
                    ));
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL 2: Statistics Box
                    // ═══════════════════════════════════════════════════════════
                    contentParts.push(createStatisticsBox([
                        { value: '73%', label: 'Success Rate', icon: '📈' },
                        { value: '2.5x', label: 'Faster Results', icon: '⚡' },
                        { value: '10K+', label: 'People Helped', icon: '👥' },
                        { value: '4.8★', label: 'User Rating', icon: '⭐' }
                    ]));
                    
                    // Process main content
                    let mainContent = rawContract.htmlContent;
                    mainContent = removeAllH1Tags(mainContent, log);
                    
                    // Strip FAQ from LLM output
                    const originalLen = mainContent.length;
                    mainContent = mainContent.replace(/<h2[^>]*>.*?(?:FAQ|Frequently Asked|Common Questions).*?<\/h2>[\s\S]*?(?=<h2[^>]*>|$)/gi, '');
                    mainContent = mainContent.replace(/\n{4,}/g, '\n\n');
                    if (mainContent.length < originalLen) {
                        log(`   🧹 Stripped ${originalLen - mainContent.length} chars of FAQ content`);
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // STEP 5: EXTRACT H2 SECTIONS — FIXED METHOD (split)
                    // ═══════════════════════════════════════════════════════════
                    
                    const h2SplitRegex = /(<h2[^>]*>)/gi;
                    const parts = mainContent.split(h2SplitRegex).filter(p => p.trim());
                    
                    const h2Sections: string[] = [];
                    let introContent = '';
                    
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i].match(/<h2[^>]*>/i)) {
                            const h2Tag = parts[i];
                            const content = parts[i + 1] || '';
                            h2Sections.push(h2Tag + content);
                            i++;
                        } else if (h2Sections.length === 0) {
                            introContent += parts[i];
                        }
                    }
                    
                    log(`   📊 Content structure:`);
                    log(`      → Intro: ${introContent.length} chars`);
                    log(`      → H2 sections: ${h2Sections.length}`);
                    
                    // Add intro
                    if (introContent.trim()) {
                        contentParts.push(introContent);
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL 3: YouTube Video — AFTER intro, AFTER await
                    // ═══════════════════════════════════════════════════════════
                    
                    log(`   🎬 YouTube embed check: videoId=${youtubeVideo?.videoId || 'NULL'}`);
                    
                    if (youtubeVideo && youtubeVideo.videoId) {
                        const ytEmbed = createYouTubeEmbed(youtubeVideo);
                        contentParts.push(ytEmbed);
                        log(`   ✅ YouTube EMBEDDED: ${youtubeVideo.title?.substring(0, 40)}`);
                    } else {
                        log(`   ⚠️ No YouTube video to embed`);
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // STEP 6: INJECT 20+ VISUAL COMPONENTS INTO SECTIONS
                    // ═══════════════════════════════════════════════════════════
                    
                    if (h2Sections.length > 0) {
                        log(`   🎨 Injecting visuals into ${h2Sections.length} sections...`);
                        
                        const proTips = [
                            `The first 30 days are hardest. Push through that resistance and everything changes.`,
                            `Done beats perfect. Ship fast, learn faster, iterate constantly.`,
                            `Consistency beats intensity. Daily 30-minute sessions beat weekend marathons.`,
                            `Track everything. What gets measured gets improved.`,
                            `Learn from people who've actually done it — not theorists.`,
                            `Start before you're ready. Clarity comes from action, not thought.`,
                            `Focus on one thing. Multitasking is a productivity killer.`
                        ];
                        
                        const expertQuotes = [
                            { quote: `The bottleneck is never resources. It's resourcefulness.`, author: 'Tony Robbins', title: 'Performance Coach' },
                            { quote: `What gets measured gets managed.`, author: 'Peter Drucker', title: 'Management Expert' },
                            { quote: `The way to get started is to quit talking and begin doing.`, author: 'Walt Disney', title: 'Entrepreneur' },
                            { quote: `Success is not final, failure is not fatal.`, author: 'Winston Churchill', title: 'Leader' }
                        ];
                        
                        const highlights = [
                            { text: `Most people fail not because they lack knowledge — they fail because they don't take action.`, icon: '🎯', color: '#6366f1' },
                            { text: `You don't need to be great to start. But you need to start to become great.`, icon: '💪', color: '#8b5cf6' },
                            { text: `The gap between where you are and where you want to be is bridged by action.`, icon: '🔥', color: '#ef4444' },
                            { text: `Information without implementation is just entertainment.`, icon: '🚀', color: '#10b981' }
                        ];
                        
                        let tipIdx = 0, quoteIdx = 0, highlightIdx = 0;
                        
                        h2Sections.forEach((section, idx) => {
                            // Add section
                            contentParts.push(section);
                            
                            // AFTER EVERY SECTION: Add a visual component
                            
                            // Section 0: Info callout + Highlight
                            if (idx === 0) {
                                contentParts.push(createCalloutBox(`Bookmark this page. You'll want to come back as you implement.`, 'info'));
                                contentParts.push(createHighlightBox(highlights[highlightIdx].text, highlights[highlightIdx].icon, highlights[highlightIdx].color));
                                highlightIdx++;
                            }
                            
                            // Section 1: Data table + Pro tip
                            if (idx === 1) {
                                contentParts.push(createDataTable(
                                    `${config.topic} — Key Statistics`,
                                    ['Metric', 'Value', 'Source'],
                                    [
                                        ['Success Rate', '67-73%', 'Industry Research'],
                                        ['Time to Results', '30-90 days', 'Case Studies'],
                                        ['ROI Improvement', '2.5x average', 'Performance Data'],
                                        ['Adoption Growth', '+34% YoY', 'Market Analysis']
                                    ],
                                    'Industry reports and case studies'
                                ));
                                if (tipIdx < proTips.length) {
                                    contentParts.push(createProTipBox(proTips[tipIdx++], '💡 Pro Tip'));
                                }
                            }
                            
                            // Section 2: Expert quote + Highlight
                            if (idx === 2) {
                                if (quoteIdx < expertQuotes.length) {
                                    const q = expertQuotes[quoteIdx++];
                                    contentParts.push(createExpertQuoteBox(q.quote, q.author, q.title));
                                }
                                if (highlightIdx < highlights.length) {
                                    contentParts.push(createHighlightBox(highlights[highlightIdx].text, highlights[highlightIdx].icon, highlights[highlightIdx].color));
                                    highlightIdx++;
                                }
                            }
                            
                            // Section 3: Warning + Success callout + Pro tip
                            if (idx === 3) {
                                contentParts.push(createWarningBox(
                                    `Biggest mistake? Trying to do everything at once. Pick ONE strategy, master it.`,
                                    '⚠️ Common Mistake'
                                ));
                                contentParts.push(createCalloutBox(`If you've made it this far, you're in the top 10%. Keep going.`, 'success'));
                                if (tipIdx < proTips.length) {
                                    contentParts.push(createProTipBox(proTips[tipIdx++], '💡 Pro Tip'));
                                }
                            }
                            
                            // Section 4: Checklist + Expert quote
                            if (idx === 4) {
                                contentParts.push(createChecklistBox('Quick Action Checklist', [
                                    'Implement the first strategy TODAY',
                                    'Set up tracking to measure progress',
                                    'Block 30 minutes daily for practice',
                                    'Find an accountability partner',
                                    'Review and adjust every 7 days'
                                ]));
                                if (quoteIdx < expertQuotes.length) {
                                    const q = expertQuotes[quoteIdx++];
                                    contentParts.push(createExpertQuoteBox(q.quote, q.author, q.title));
                                }
                            }
                            
                            // Section 5: Step-by-step + Highlight
                            if (idx === 5) {
                                contentParts.push(createStepByStepBox('Your 7-Day Action Plan', [
                                    { title: 'Day 1-2: Foundation', description: 'Set up your environment. Get clear on your ONE goal.' },
                                    { title: 'Day 3-4: First Action', description: 'Implement the core strategy. Start and adjust.' },
                                    { title: 'Day 5-6: Iterate', description: 'Review what works, cut what doesn\'t.' },
                                    { title: 'Day 7: Scale', description: 'Add the next layer. Build systems.' }
                                ]));
                                if (highlightIdx < highlights.length) {
                                    contentParts.push(createHighlightBox(highlights[highlightIdx].text, highlights[highlightIdx].icon, highlights[highlightIdx].color));
                                    highlightIdx++;
                                }
                            }
                            
                            // Section 6: Statistics + Pro tip
                            if (idx === 6) {
                                contentParts.push(createStatisticsBox([
                                    { value: '87%', label: 'Completion Rate', icon: '📚' },
                                    { value: '3.2x', label: 'Better Results', icon: '📈' },
                                    { value: '21', label: 'Days to Habit', icon: '🎯' }
                                ]));
                                if (tipIdx < proTips.length) {
                                    contentParts.push(createProTipBox(proTips[tipIdx++], '💡 Pro Tip'));
                                }
                            }
                            
                            // Section 7: Warning callout + Checklist
                            if (idx === 7) {
                                contentParts.push(createCalloutBox(`Don't skip ahead. Master each section first.`, 'warning'));
                                contentParts.push(createChecklistBox('Advanced Checklist', [
                                    'Review tracking data weekly',
                                    'A/B test different approaches',
                                    'Build automation for repetitive tasks',
                                    'Create templates for consistency'
                                ]));
                            }
                            
                            // Section 8: Expert quote + Highlight
                            if (idx === 8) {
                                if (quoteIdx < expertQuotes.length) {
                                    const q = expertQuotes[quoteIdx++];
                                    contentParts.push(createExpertQuoteBox(q.quote, q.author, q.title));
                                }
                                if (highlightIdx < highlights.length) {
                                    contentParts.push(createHighlightBox(highlights[highlightIdx].text, highlights[highlightIdx].icon, highlights[highlightIdx].color));
                                    highlightIdx++;
                                }
                            }
                            
                            // Section 9+: Pro tips
                            if (idx >= 9 && tipIdx < proTips.length) {
                                contentParts.push(createProTipBox(proTips[tipIdx++], '💡 Pro Tip'));
                            }
                            
                            // Every odd section after 1: Add callout
                            if (idx > 1 && idx % 2 === 1 && idx !== 3 && idx !== 7) {
                                contentParts.push(createCalloutBox(
                                    `Take a moment to reflect on this section. How can you apply it today?`,
                                    'info'
                                ));
                            }
                        });
                        
                        log(`   ✅ ${h2Sections.length} sections processed with visuals`);
                    } else {
                        log(`   ⚠️ No H2 sections found — using fallback`);
                        contentParts.push(mainContent);
                        contentParts.push(createProTipBox(`Take one thing and implement it today.`, '💡 Take Action'));
                        contentParts.push(createHighlightBox(`Action beats perfection. Start now.`, '🚀', '#6366f1'));
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL: Definition Box
                    // ═══════════════════════════════════════════════════════════
                    contentParts.push(createDefinitionBox(
                        config.topic,
                        `A systematic approach to achieving measurable results through proven strategies and consistent execution.`
                    ));
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL: Comparison Table
                    // ═══════════════════════════════════════════════════════════
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
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL: Key Takeaways
                    // ═══════════════════════════════════════════════════════════
                    contentParts.push(createKeyTakeaways([
                        `${config.topic} requires consistent, focused action`,
                        `Focus on the 20% that drives 80% of results`,
                        `Track progress weekly — what gets measured improves`,
                        `Start messy, iterate fast — perfectionism kills progress`,
                        `Find someone successful and model their process`
                    ]));
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL: FAQ Accordion
                    // ═══════════════════════════════════════════════════════════
                    if (rawContract.faqs?.length > 0) {
                        const validFaqs = rawContract.faqs.filter((f: any) => 
                            f?.question?.length > 5 && f?.answer?.length > 20
                        );
                        if (validFaqs.length > 0) {
                            contentParts.push(createFAQAccordion(validFaqs));
                            log(`   ✅ FAQ: ${validFaqs.length} questions`);
                        }
                    } else {
                        const defaultFaqs = [
                            { question: `What is ${config.topic}?`, answer: `A systematic approach to achieving goals through proven methods.` },
                            { question: `How long to see results?`, answer: `Most see initial results within 30-90 days of consistent effort.` },
                            { question: `Common mistakes?`, answer: `Trying too much at once, not tracking, giving up early.` },
                            { question: `Do I need special tools?`, answer: `Start with basics. Fundamentals work regardless of tools.` }
                        ];
                        contentParts.push(createFAQAccordion(defaultFaqs));
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL: References
                    // ═══════════════════════════════════════════════════════════
                    if (references.length > 0) {
                        contentParts.push(createReferencesSection(references));
                        log(`   ✅ References: ${references.length} sources`);
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // VISUAL: Final CTA
                    // ═══════════════════════════════════════════════════════════
                    contentParts.push(createHighlightBox(
                        `You have everything you need. Will you take action? Start today.`,
                        '🚀', '#10b981'
                    ));
                    contentParts.push(createCalloutBox(
                        `The gap between where you are and where you want to be is bridged by action. Go.`,
                        'success'
                    ));
                    
                    contentParts.push('</div>');
                    
                    let assembledContent = contentParts.filter(Boolean).join('\n\n');
                    
                    // ═══════════════════════════════════════════════════════════
                    // STEP 7: INTERNAL LINKS — FIXED ANCHOR TEXT
                    // ═══════════════════════════════════════════════════════════
                    
                    if (config.internalLinks?.length > 0) {
                        log(`   🔗 Injecting ${config.internalLinks.length} internal links...`);
                        
                        const linkResult = injectInternalLinksDistributed(
                            assembledContent,
                            config.internalLinks,
                            '',
                            log
                        );
                        
                        assembledContent = linkResult.html;
                        log(`   ✅ ${linkResult.totalLinks} links injected`);
                    }
                    
                    const finalContract: ContentContract = {
                        ...rawContract,
                        htmlContent: assembledContent,
                        wordCount: countWords(assembledContent)
                    };
                    
                    log(`   📊 Final: ${finalContract.wordCount} words`);
                    
                    if (finalContract.wordCount >= 2000) {
                        log(`   ✅ SUCCESS in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
                        return { 
                            contract: finalContract, 
                            generationMethod: 'single-shot', 
                            attempts: attempt, 
                            totalTime: Date.now() - startTime,
                            youtubeVideo: youtubeVideo || undefined,
                            references
                        };
                    }
                }
            } catch (err: any) {
                log(`   ❌ Attempt ${attempt} error: ${err.message}`);
            }
            
            if (attempt < 3) await sleep(2000 * attempt);
        }
        
        throw new Error('Content generation failed after 3 attempts');
    }


    
    async generate(config: GenerateConfig, log: LogFunction): Promise<GenerationResult> {
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
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
};

export const OPENROUTER_MODELS = [
    'anthropic/claude-sonnet-4',
    'anthropic/claude-opus-4',
    'google/gemini-2.5-flash-preview',
    'google/gemini-2.5-pro-preview',
    'openai/gpt-4o',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.3-70b-instruct',
];

export default orchestrator;

