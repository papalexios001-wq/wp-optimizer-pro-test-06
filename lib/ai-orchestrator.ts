// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v27.0 — ENTERPRISE SOTA AI ORCHESTRATOR
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

export const AI_ORCHESTRATOR_VERSION = "27.0.0";

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
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%); border-left: 4px solid #6366f1;">
    <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="min-width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 24px;">⚡</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px;">${escapeHtml(title)}</div>
            <p style="font-size: 17px; line-height: 1.7; margin: 0; font-weight: 500;">${answer}</p>
        </div>
    </div>
</div>`;
}

export function createProTipBox(tip: string, title: string = 'Pro Tip'): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(34,197,94,0.04) 100%); border-left: 4px solid #10b981;">
    <div style="display: flex; align-items: flex-start; gap: 14px;">
        <div style="min-width: 44px; height: 44px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 20px;">💡</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #10b981; margin-bottom: 8px;">${escapeHtml(title)}</div>
            <p style="font-size: 15px; line-height: 1.7; margin: 0;">${tip}</p>
        </div>
    </div>
</div>`;
}

export function createWarningBox(warning: string, title: string = 'Important'): string {
    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,179,8,0.04) 100%); border-left: 4px solid #f59e0b;">
    <div style="display: flex; align-items: flex-start; gap: 14px;">
        <div style="min-width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 20px;">⚠️</span>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #d97706; margin-bottom: 8px;">${escapeHtml(title)}</div>
            <p style="font-size: 15px; line-height: 1.7; margin: 0;">${warning}</p>
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
        <li style="display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; ${i < takeaways.length - 1 ? 'border-bottom: 1px solid rgba(128,128,128,0.08);' : ''}">
            <span style="min-width: 28px; height: 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 800; flex-shrink: 0;">${i + 1}</span>
            <span style="font-size: 15px; line-height: 1.6; padding-top: 3px;">${escapeHtml(t)}</span>
        </li>
    `).join('');

    return `
<div class="wpo-box" style="background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%); border-radius: 20px; padding: 28px;">
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(99,102,241,0.15);">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 22px;">🎯</span>
        </div>
        <h3 style="font-size: 20px; font-weight: 800; margin: 0;">Key Takeaways</h3>
    </div>
    <ul style="list-style: none; padding: 0; margin: 0;">${items}</ul>
</div>`;
}

export function createFAQAccordion(faqs: Array<{ question: string; answer: string }>): string {
    if (!faqs || faqs.length === 0) return '';
    
    const sectionId = generateUniqueId();
    
    const faqItems = faqs.map((faq, index) => {
        const itemId = `${sectionId}-${index}`;
        return `
        <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" style="border-bottom: 1px solid rgba(128,128,128,0.1);">
            <input type="checkbox" id="${itemId}" style="position: absolute; opacity: 0; pointer-events: none;" />
            <label for="${itemId}" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; font-size: 15px; font-weight: 600; gap: 12px;">
                <span itemprop="name" style="flex: 1;">${escapeHtml(faq.question)}</span>
                <span style="font-size: 12px; color: #6366f1; transition: transform 0.3s;" class="${sectionId}-arrow">▼</span>
            </label>
            <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;" class="${sectionId}-content">
                <div itemprop="text" style="padding: 0 20px 20px 20px; font-size: 15px; line-height: 1.8; opacity: 0.85;">${faq.answer}</div>
            </div>
        </div>`;
    }).join('');

    return `
<style>
#${sectionId} input:checked + label + div { max-height: 1000px !important; }
#${sectionId} input:checked + label .${sectionId}-arrow { transform: rotate(180deg); }
#${sectionId} label:hover { background: rgba(128,128,128,0.04); }
</style>
<section id="${sectionId}" itemscope itemtype="https://schema.org/FAQPage" style="border: 1px solid rgba(128,128,128,0.15); border-radius: 20px; margin: 48px 0; overflow: hidden;">
    <div style="padding: 22px 24px; background: rgba(128,128,128,0.04); border-bottom: 1px solid rgba(128,128,128,0.1);">
        <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 22px;">❓</span>
            </div>
            <div>
                <h2 style="font-size: 20px; font-weight: 800; margin: 0;">Frequently Asked Questions</h2>
                <p style="font-size: 13px; opacity: 0.6; margin: 4px 0 0 0;">${faqs.length} questions answered</p>
            </div>
        </div>
    </div>
    ${faqItems}
</section>`;
}

export function createReferencesSection(references: DiscoveredReference[]): string {
    if (!references || references.length === 0) return '';
    
    const validRefs = references.filter(r => r.url && r.title);
    if (validRefs.length === 0) return '';
    
    const refItems = validRefs.map((ref, index) => {
        const domain = extractDomain(ref.url);
        const favicon = ref.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        const yearDisplay = ref.year ? ` (${ref.year})` : '';
        
        return `
        <li style="display: flex; gap: 16px; padding: 16px 0; ${index < validRefs.length - 1 ? 'border-bottom: 1px solid rgba(128,128,128,0.08);' : ''} align-items: flex-start;">
            <span style="min-width: 28px; height: 28px; background: rgba(99,102,241,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6366f1; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 2px;">${index + 1}</span>
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <img src="${favicon}" alt="" width="16" height="16" style="border-radius: 3px; flex-shrink: 0;" onerror="this.style.display='none'" />
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; font-weight: 600;">${escapeHtml(ref.source || domain)}${yearDisplay}</span>
                </div>
                <a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer nofollow" style="font-size: 15px; font-weight: 600; color: #6366f1; text-decoration: none; display: block; line-height: 1.4;">
                    ${escapeHtml(ref.title)}
                </a>
                ${ref.snippet ? `<p style="font-size: 13px; line-height: 1.6; opacity: 0.7; margin: 8px 0 0 0;">${escapeHtml(ref.snippet.substring(0, 150))}${ref.snippet.length > 150 ? '...' : ''}</p>` : ''}
            </div>
        </li>`;
    }).join('');

    return `
<section style="background: rgba(128,128,128,0.03); border: 1px solid rgba(128,128,128,0.12); border-radius: 20px; padding: 28px; margin: 56px 0 32px 0;">
    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(128,128,128,0.1);">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 14px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 22px;">📚</span>
        </div>
        <div>
            <h2 style="font-size: 20px; font-weight: 800; margin: 0;">References & Sources</h2>
            <p style="font-size: 13px; opacity: 0.6; margin: 4px 0 0 0;">${validRefs.length} authoritative sources cited</p>
        </div>
    </div>
    <ol style="list-style: none; padding: 0; margin: 0;">${refItems}</ol>
</section>`;
}

export function createYouTubeEmbed(video: YouTubeVideoData): string {
    const formatViews = (views: number): string => {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views.toString();
    };
    
    return `
<div class="wpo-youtube-embed" style="margin: 40px 0;">
    <div style="border: 1px solid rgba(128, 128, 128, 0.15); border-radius: 16px; overflow: hidden; background: rgba(128, 128, 128, 0.03);">
        <div style="padding: 16px 20px; border-bottom: 1px solid rgba(128, 128, 128, 0.1); display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #ff0000, #cc0000); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${escapeHtml(video.title)}</div>
                <div style="font-size: 12px; opacity: 0.6;">
                    ${escapeHtml(video.channel)} • ${formatViews(video.views)} views${video.duration ? ` • ${video.duration}` : ''}
                </div>
            </div>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0; background: #000;">
            <iframe 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                src="${video.embedUrl}?rel=0&modestbranding=1"
                title="${escapeHtml(video.title)}"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
            ></iframe>
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
    log(`🎬 Searching YouTube for: "${topic.substring(0, 50)}..."`);
    
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
                
                // Calculate relevance score
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
    
    log(`📚 Discovering references for: "${topic.substring(0, 40)}..."`);
    
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
                
                // Extract year from text
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
// 🔗 INTERNAL LINK INJECTION — EVEN DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function injectInternalLinksDistributed(
    html: string,
    linkTargets: InternalLinkTarget[],
    currentUrl: string,
    log: LogFunction
): { html: string; linksAdded: InternalLinkResult[]; totalLinks: number } {
    if (!html || !linkTargets || linkTargets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }
    
    const linksAdded: InternalLinkResult[] = [];
    
    // Filter out current URL
    const availableTargets = linkTargets.filter(t => 
        t.url !== currentUrl && !t.url.includes(extractSlugFromUrl(currentUrl))
    ).slice(0, 30);
    
    if (availableTargets.length === 0) {
        return { html, linksAdded: [], totalLinks: 0 };
    }
    
    // Split by H2 sections
    const sectionSplitRegex = /(<h2[^>]*>)/gi;
    const parts = html.split(sectionSplitRegex);
    
    let totalLinksAdded = 0;
    let targetIndex = 0;
    let lastLinkWordPos = 0;
    let currentWordPos = 0;
    
    const processedParts = parts.map((part, partIndex) => {
        // Skip H2 tags themselves and first part (intro)
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
        
        // Find paragraphs
        const paraRegex = /<p[^>]*>([^<]{80,})<\/p>/gi;
        let match;
        const paragraphs: Array<{ full: string; text: string; pos: number }> = [];
        
        while ((match = paraRegex.exec(part)) !== null) {
            paragraphs.push({ full: match[0], text: match[1], pos: match.index });
        }
        
        for (const para of paragraphs) {
            if (sectionLinksAdded >= LINK_CONFIG.MAX_PER_SECTION) break;
            if (totalLinksAdded >= LINK_CONFIG.MAX_TOTAL) break;
            if (targetIndex >= availableTargets.length) break;
            
            const paraWordPos = currentWordPos + countWords(part.substring(0, para.pos));
            
            // Check distance from last link
            if (paraWordPos - lastLinkWordPos < LINK_CONFIG.MIN_WORDS_BETWEEN && linksAdded.length > 0) {
                continue;
            }
            
            const target = availableTargets[targetIndex];
            const anchorText = findAnchorText(para.text, target);
            
            if (anchorText && para.text.toLowerCase().includes(anchorText.toLowerCase())) {
                const link = `<a href="${target.url}" title="${escapeHtml(target.title)}">${anchorText}</a>`;
                const escapedAnchor = anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const anchorRegex = new RegExp(`\\b${escapedAnchor}\\b`, 'i');
                
                const newPara = para.full.replace(anchorRegex, link);
                
                if (newPara !== para.full) {
                    processedPart = processedPart.replace(para.full, newPara);
                    linksAdded.push({ url: target.url, anchorText, relevanceScore: 0.8, position: paraWordPos });
                    sectionLinksAdded++;
                    totalLinksAdded++;
                    lastLinkWordPos = paraWordPos;
                }
            }
            
            targetIndex++;
        }
        
        currentWordPos += countWords(part);
        return processedPart;
    });
    
    log(`   ✅ ${linksAdded.length} internal links added (evenly distributed)`);
    
    return {
        html: processedParts.join(''),
        linksAdded,
        totalLinks: linksAdded.length
    };
}

function findAnchorText(text: string, target: InternalLinkTarget): string {
    const titleWords = target.title.split(/\s+/);
    const textLower = text.toLowerCase();
    
    // Try 3-5 word phrases
    for (let len = 5; len >= 3; len--) {
        for (let start = 0; start <= titleWords.length - len; start++) {
            const phrase = titleWords.slice(start, start + len).join(' ');
            if (textLower.includes(phrase.toLowerCase())) {
                return phrase;
            }
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
    
    // Strategy 1: Direct parse
    try {
        const parsed = JSON.parse(text);
        if (parsed.htmlContent) return { success: true, data: parsed };
    } catch {}
    
    // Strategy 2: Extract from markdown
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
    
    // Strategy 3: Find boundaries
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
    
    // Strategy 5: Close truncated JSON
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
            // STAGE 2: YOUTUBE VIDEO SEARCH (Parallel)
            // ═══════════════════════════════════════════════════════════════
            
            const youtubePromise = config.apiKeys?.serper ? (async () => {
                onStageProgress?.({ stage: 'youtube', progress: 15, message: 'Searching for relevant video...' });
                try {
                    youtubeVideo = await searchYouTubeVideo(config.topic, config.apiKeys.serper, log);
                } catch (e: any) {
                    log(`   ⚠️ YouTube search failed: ${e.message}`);
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
            
            // Wait for YouTube search
            await youtubePromise;
            
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
                        // Try direct parse
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
            // STAGE 5: DISCOVER REFERENCES
if (config.apiKeys?.serper) {
    // Use passed references OR discover new ones
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
        references = await discoverReferences(config.topic, config.apiKeys.serper, {...}, log);
    }
}

            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 6: GENERATE INTRO & CONCLUSION
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'merge', progress: 75, message: 'Generating intro & conclusion...' });
            log(`📝 Stage 6: Generating intro & conclusion...`);
            
            // Introduction
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
            
            // Conclusion
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
            // STAGE 7: ASSEMBLE FINAL CONTENT
            // ═══════════════════════════════════════════════════════════════
            
            onStageProgress?.({ stage: 'polish', progress: 85, message: 'Assembling final content...' });
            log(`🔀 Stage 7: Assembling content with visual components...`);
            
            // Quick Answer
            const quickAnswerText = `${config.topic} requires understanding key principles and applying proven strategies. This comprehensive guide covers everything from foundational concepts to advanced techniques, backed by expert insights and real-world examples.`;
            
            // Pro Tips
            const proTips = [
                `Start with the fundamentals before moving to advanced techniques — mastery comes from a solid foundation.`,
                `Track your progress regularly and adjust your approach based on actual results, not assumptions.`,
                `Learn from industry experts and stay updated with the latest trends and best practices.`
            ];
            
            // Key Takeaways
            const keyTakeaways = outline.keyTakeaways?.length > 0 ? outline.keyTakeaways : [
                `Understanding ${config.topic} requires both theoretical knowledge and practical application`,
                `Success depends on consistent effort and continuous learning`,
                `Expert guidance and proven frameworks accelerate results significantly`,
                `Regular assessment and optimization are essential for long-term success`,
                `Building a strong foundation enables advanced strategy implementation`
            ];
            
            // Build content parts
            const contentParts: string[] = [];
            
            // CSS
            contentParts.push(THEME_ADAPTIVE_CSS);
            contentParts.push('<div class="wpo-content">');
            
            // Introduction
            contentParts.push(introHtml);
            
            // Quick Answer
            contentParts.push(createQuickAnswerBox(quickAnswerText));
            
            // YouTube Video (if found)
            if (youtubeVideo) {
                contentParts.push(createYouTubeEmbed(youtubeVideo));
                log(`   ✅ YouTube video embedded`);
            }
            
            // Sections with Pro Tips interspersed
            sections.forEach((section, index) => {
                contentParts.push(section);
                
                // Add Pro Tip after every 3rd section
                if ((index + 1) % 3 === 0 && proTips[Math.floor(index / 3)]) {
                    contentParts.push(createProTipBox(proTips[Math.floor(index / 3)]));
                }
                
                // Add Warning after section 5
                if (index === 4) {
                    contentParts.push(createWarningBox(
                        `Many beginners make the mistake of rushing through the fundamentals. Take your time to fully understand each concept before moving forward — it will save you significant time and frustration later.`,
                        'Common Mistake to Avoid'
                    ));
                }
            });
            
            // Key Takeaways
            contentParts.push(createKeyTakeaways(keyTakeaways));
            
            // FAQ Accordion
            if (faqs.length > 0) {
                contentParts.push(createFAQAccordion(faqs));
            }
            
            // Conclusion
            contentParts.push(conclusionHtml);
            
            // References Section
            if (references.length > 0) {
                contentParts.push(createReferencesSection(references));
                log(`   ✅ References section: ${references.length} sources`);
            }
            
            // Close wrapper
            contentParts.push('</div>');
            
            let assembledContent = contentParts.filter(Boolean).join('\n\n');
            
            // Remove H1 tags
            assembledContent = removeAllH1Tags(assembledContent, log);
            
            // ═══════════════════════════════════════════════════════════════
            // STAGE 8: INTERNAL LINKS
            // ═══════════════════════════════════════════════════════════════
            
            if (config.internalLinks && config.internalLinks.length > 0) {
                log(`🔗 Stage 8: Injecting internal links (distributed)...`);
                
                const linkResult = injectInternalLinksDistributed(
                    assembledContent,
                    config.internalLinks,
                    config.topic,
                    log
                );
                
                assembledContent = linkResult.html;
            }
            
            // Final word count
            const finalWordCount = countWords(assembledContent);
            log(`   ✅ Final content: ${finalWordCount.toLocaleString()} words`);
            
            // Build contract
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
    
    async generateSingleShot(config: GenerateConfig, log: LogFunction): Promise<GenerationResult> {
        const startTime = Date.now();
        log(`🎨 SINGLE-SHOT GENERATION (fallback)`);
        
        const userPrompt = `Write a comprehensive ${CONTENT_TARGETS.TARGET_WORDS}+ word blog post about: "${config.topic}"

Include:
- 8-12 H2 sections with H3 subsections
- Practical examples and tips
- FAQ section with 8-10 questions
- NO H1 tags (WordPress provides title)

Output ONLY valid JSON with: title, metaDescription, slug, htmlContent, excerpt, faqs, wordCount`;

        for (let attempt = 1; attempt <= 3; attempt++) {
            log(`   📝 Attempt ${attempt}/3...`);
            
            try {
                const response = await callLLM(
                    config.provider, config.apiKeys, config.model, userPrompt,
                    buildSystemPrompt({ topic: config.topic, targetWords: CONTENT_TARGETS.TARGET_WORDS }),
                    { temperature: 0.7 + (attempt - 1) * 0.05, maxTokens: 16000 },
                    TIMEOUTS.SINGLE_SHOT, log
                );
                
                const parsed = healJSON(response, log);
                
                if (parsed.success && parsed.data?.htmlContent) {
                    let contract = parsed.data as ContentContract;
                    contract.htmlContent = removeAllH1Tags(contract.htmlContent, log);
                    contract.wordCount = countWords(contract.htmlContent);
                    
                    if (contract.wordCount >= 2000) {
                        log(`   ✅ Success: ${contract.wordCount} words`);
                        return { contract, generationMethod: 'single-shot', attempts: attempt, totalTime: Date.now() - startTime };
                    }
                }
                
                log(`   ⚠️ Insufficient content, retrying...`);
            } catch (err: any) {
                log(`   ❌ Error: ${err.message}`);
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
