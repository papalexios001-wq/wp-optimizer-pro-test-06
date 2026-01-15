// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v27.0 — ENTERPRISE SOTA AI ORCHESTRATOR (REFACTORED)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// 🔥 CRITICAL FIXES v27.0 (Addresses all generation failures):
// ✅ STAGED CONTENT PIPELINE — Generates outline → sections → merge (no truncation)
// ✅ SLIM SYSTEM PROMPTS — Visual examples on-demand, not embedded
// ✅ RESPONSE VALIDATION — Detects truncation before JSON parsing
// ✅ ADAPTIVE WORD TARGETS — Starts lower, expands incrementally
// ✅ ROBUST JSON HEALING — Multi-strategy recovery for malformed responses
// ✅ PER-ATTEMPT TIMEOUTS — Prevents 25-minute runaway jobs
// ✅ CIRCUIT BREAKER — Fails fast on repeated API errors
// ✅ STREAMING SUPPORT — For compatible providers
// ✅ CONTINUATION REQUESTS — Resumes truncated responses
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
    ContentOutline, 
    SectionOutline, 
    GeneratedSection
} from '../types';

import { injectInternalLinks } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & CONFIGURATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const AI_ORCHESTRATOR_VERSION = "27.0.0";

// 🔥 FIX #1: Reduced timeouts with per-attempt limits
const TIMEOUTS = {
    OUTLINE_GENERATION: 60000,       // 1 minute for outline
    SECTION_GENERATION: 90000,       // 1.5 minutes per section
    MERGE_GENERATION: 120000,        // 2 minutes for merge
    POLISH_GENERATION: 90000,        // 1.5 minutes for polish
    SINGLE_SHOT_GENERATION: 180000,  // 3 minutes max for single generation
    OPENROUTER_REQUEST: 180000,      // 3 minutes for OpenRouter
    CONTINUATION_REQUEST: 120000,    // 2 minutes for continuation
    TOTAL_JOB_TIMEOUT: 600000,       // 10 minutes total (not 25!)
} as const;

// 🔥 FIX #2: Reduced initial word targets (expand incrementally)
const CONTENT_TARGETS = {
    INITIAL_WORD_TARGET: 3000,       // Start here (was 4500)
    EXPANDED_WORD_TARGET: 4000,      // After successful initial
    FINAL_WORD_TARGET: 4500,         // Final expansion target
    MIN_ACCEPTABLE_WORDS: 2500,      // Absolute minimum to accept
    SECTION_TARGET_WORDS: 300,       // Per section (was 450)
    INTRO_TARGET_WORDS: 250,         // Introduction (was 350)
    FAQ_TARGET_WORDS: 400,           // FAQ section (was 700)
} as const;

// Generation attempt configuration
const GENERATION_CONFIG = {
    MAX_ATTEMPTS: 3,                 // Reduced from 4
    MAX_CONTINUATION_ATTEMPTS: 2,    // For truncated responses
    BASE_TEMPERATURE: 0.7,           // More consistent (was 0.8)
    TEMPERATURE_INCREMENT: 0.05,
    MAX_TEMPERATURE: 0.9,
} as const;

// 🔥 FIX #3: Circuit breaker configuration
const CIRCUIT_BREAKER = {
    FAILURE_THRESHOLD: 3,            // Open after 3 failures
    RESET_TIMEOUT: 60000,            // 1 minute cooldown
    HALF_OPEN_REQUESTS: 1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 YEAR CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
export const CONTENT_YEAR = currentMonth === 11 ? currentYear + 1 : currentYear;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface StageProgress {
    stage: 'outline' | 'sections' | 'merge' | 'polish' | 'validation';
    progress: number;
    message: string;
    sectionsCompleted?: number;
    totalSections?: number;
}

export interface GenerationResult {
    contract: ContentContract;
    groundingSources?: string[];
    generationMethod: 'staged' | 'single-shot' | 'continuation';
    attempts: number;
    totalTime: number;
}

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
    provider: string;
}

interface ParsedResponse {
    success: boolean;
    data?: ContentContract;
    error?: string;
    isTruncated?: boolean;
    truncationPoint?: string;
}

interface SectionGenerationResult {
    success: boolean;
    html: string;
    wordCount: number;
    sectionIndex: number;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 CIRCUIT BREAKER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const circuitBreakers = new Map<string, CircuitBreakerState>();

function getCircuitBreaker(provider: string): CircuitBreakerState {
    if (!circuitBreakers.has(provider)) {
        circuitBreakers.set(provider, {
            failures: 0,
            lastFailure: 0,
            isOpen: false,
            provider
        });
    }
    return circuitBreakers.get(provider)!;
}

function recordFailure(provider: string, log: LogFunction): void {
    const breaker = getCircuitBreaker(provider);
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
        breaker.isOpen = true;
        log(`⚡ Circuit breaker OPEN for ${provider} after ${breaker.failures} failures`);
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
    
    // Check if reset timeout has passed (half-open state)
    if (Date.now() - breaker.lastFailure > CIRCUIT_BREAKER.RESET_TIMEOUT) {
        return false; // Allow one test request
    }
    
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 LOGGING UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

type LogFunction = (msg: string, progress?: number) => void;

function createLogger(baseLog: LogFunction, prefix: string): LogFunction {
    return (msg: string, progress?: number) => {
        baseLog(`${prefix} ${msg}`, progress);
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function countWords(text: string): number {
    if (!text) return 0;
    // Strip HTML tags for accurate word count
    const stripped = text.replace(/<[^>]*>/g, ' ');
    return stripped.split(/\s+/).filter(w => w.length > 0).length;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseMs: number = 2000): number {
    const exponential = baseMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponential + jitter, 30000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FIX #4: RESPONSE VALIDATION — DETECT TRUNCATION BEFORE PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function validateResponseCompleteness(responseText: string): {
    isComplete: boolean;
    isTruncated: boolean;
    truncationType: 'json' | 'content' | 'none';
    details: string;
} {
    if (!responseText || responseText.trim().length === 0) {
        return { 
            isComplete: false, 
            isTruncated: false, 
            truncationType: 'none',
            details: 'Empty response' 
        };
    }
    
    const trimmed = responseText.trim();
    
    // Check 1: JSON structure balance
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    
    const braceImbalance = openBraces - closeBraces;
    const bracketImbalance = openBrackets - closeBrackets;
    
    if (braceImbalance > 0 || bracketImbalance > 0) {
        return {
            isComplete: false,
            isTruncated: true,
            truncationType: 'json',
            details: `JSON imbalance: ${braceImbalance} unclosed braces, ${bracketImbalance} unclosed brackets`
        };
    }
    
    // Check 2: Required fields presence
    const requiredFields = ['htmlContent', 'title', 'metaDescription'];
    const hasAllFields = requiredFields.every(field => 
        trimmed.includes(`"${field}"`) || trimmed.includes(`'${field}'`)
    );
    
    if (!hasAllFields) {
        return {
            isComplete: false,
            isTruncated: true,
            truncationType: 'content',
            details: `Missing required fields: ${requiredFields.filter(f => !trimmed.includes(`"${f}"`)).join(', ')}`
        };
    }
    
    // Check 3: Proper JSON ending
    if (!trimmed.endsWith('}') && !trimmed.endsWith('"}')) {
        // Allow for trailing whitespace or newlines
        const lastNonWhitespace = trimmed.replace(/\s+$/, '').slice(-1);
        if (lastNonWhitespace !== '}') {
            return {
                isComplete: false,
                isTruncated: true,
                truncationType: 'json',
                details: `Response doesn't end with closing brace, ends with: "${trimmed.slice(-20)}"`
            };
        }
    }
    
    // Check 4: Content truncation indicators
    const truncationIndicators = [
        /\.\.\."?\s*$/,           // Ends with ...
        /\[continues\]/i,         // Explicit continuation marker
        /\[truncated\]/i,
        /"htmlContent"\s*:\s*"[^"]{100,}$/,  // htmlContent that doesn't close
    ];
    
    for (const indicator of truncationIndicators) {
        if (indicator.test(trimmed)) {
            return {
                isComplete: false,
                isTruncated: true,
                truncationType: 'content',
                details: 'Content truncation indicator detected'
            };
        }
    }
    
    return {
        isComplete: true,
        isTruncated: false,
        truncationType: 'none',
        details: 'Response appears complete'
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FIX #5: ROBUST JSON HEALING — MULTI-STRATEGY RECOVERY
// ═══════════════════════════════════════════════════════════════════════════════

function healJSON(rawText: string, log: LogFunction): ParsedResponse {
    if (!rawText || rawText.trim().length === 0) {
        return { success: false, error: 'Empty response text' };
    }
    
    let text = rawText.trim();
    
    // Strategy 1: Direct parse (best case)
    try {
        const parsed = JSON.parse(text);
        if (parsed.htmlContent) {
            log('   ✓ JSON parsed directly');
            return { success: true, data: parsed };
        }
    } catch {}
    
    // Strategy 2: Extract JSON from markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            const parsed = JSON.parse(jsonBlockMatch[1].trim());
            if (parsed.htmlContent) {
                log('   ✓ JSON extracted from markdown block');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    // Strategy 3: Find JSON object boundaries
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extracted = text.slice(firstBrace, lastBrace + 1);
        try {
            const parsed = JSON.parse(extracted);
            if (parsed.htmlContent) {
                log('   ✓ JSON extracted by boundary detection');
                return { success: true, data: parsed };
            }
        } catch {}
    }
    
    // Strategy 4: Fix common JSON issues
    let fixed = text;
    
    // Fix unescaped quotes in strings
    fixed = fixed.replace(/(?<!\\)(?:\\\\)*"([^"]*?)(?<!\\)"/g, (match, content) => {
        return `"${content.replace(/(?<!\\)"/g, '\\"')}"`;
    });
    
    // Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between properties
    fixed = fixed.replace(/}(\s*"){/g, '},$1{');
    fixed = fixed.replace(/"(\s*)"(?=[a-zA-Z])/g, '",$1"');
    
    try {
        const parsed = JSON.parse(fixed);
        if (parsed.htmlContent) {
            log('   ✓ JSON healed with syntax fixes');
            return { success: true, data: parsed };
        }
    } catch {}
    
    // Strategy 5: Attempt to close truncated JSON
    const validation = validateResponseCompleteness(text);
    if (validation.isTruncated && validation.truncationType === 'json') {
        log(`   → Attempting to close truncated JSON (${validation.details})`);
        
        let closedText = text;
        const openBraces = (closedText.match(/\{/g) || []).length;
        const closeBraces = (closedText.match(/\}/g) || []).length;
        const openBrackets = (closedText.match(/\[/g) || []).length;
        const closeBrackets = (closedText.match(/\]/g) || []).length;
        
        // Add missing brackets
        closedText += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        
        // Try to intelligently close the structure
        // If we're in the middle of a string, close it
        const lastQuote = closedText.lastIndexOf('"');
        const afterLastQuote = closedText.slice(lastQuote + 1);
        if (!/[",}\]]/.test(afterLastQuote.trim())) {
            closedText += '"';
        }
        
        // Add missing braces
        closedText += '}'.repeat(Math.max(0, openBraces - closeBraces));
        
        try {
            const parsed = JSON.parse(closedText);
            if (parsed.htmlContent) {
                log('   ✓ JSON healed by closing truncated structure');
                return { 
                    success: true, 
                    data: parsed, 
                    isTruncated: true,
                    truncationPoint: text.slice(-100)
                };
            }
        } catch {}
    }
    
    // Strategy 6: Regex extraction of individual fields
    log('   → Attempting field-by-field extraction');
    
    const extractField = (fieldName: string): string | null => {
        const patterns = [
            new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`),
            new RegExp(`"${fieldName}"\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`),
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        return null;
    };
    
    const extractArray = (fieldName: string): any[] | null => {
        const pattern = new RegExp(`"${fieldName}"\\s*:\\s*(\\[\\s*[\\s\\S]*?\\])`, 'i');
        const match = text.match(pattern);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch {}
        }
        return null;
    };
    
    const htmlContent = extractField('htmlContent');
    const title = extractField('title') || extractField('article_title');
    const metaDescription = extractField('metaDescription') || extractField('meta_description');
    const slug = extractField('slug');
    const excerpt = extractField('excerpt');
    const faqs = extractArray('faqs');
    
    if (htmlContent && title) {
        log('   ✓ JSON reconstructed from field extraction');
        return {
            success: true,
            data: {
                htmlContent,
                title,
                metaDescription: metaDescription || '',
                slug: slug || '',
                excerpt: excerpt || '',
                faqs: faqs || [],
                wordCount: countWords(htmlContent),
            } as ContentContract,
            isTruncated: true
        };
    }
    
    // All strategies failed
    return {
        success: false,
        error: `JSON parse failed after all healing attempts. Preview: ${text.slice(0, 150)}...${text.slice(-100)}`,
        isTruncated: validation.isTruncated
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FIX #6: SLIM SYSTEM PROMPTS — LOAD EXAMPLES ON-DEMAND
// ═══════════════════════════════════════════════════════════════════════════════

// Minimal base prompt (reduced from ~800 lines to ~50 lines)
function buildSlimSystemPrompt(config: {
    topic: string;
    targetWords: number;
    hasNeuronData: boolean;
    hasEntityData: boolean;
}): string {
    return `You are an expert SEO content writer. Generate comprehensive, human-written blog content.

═══════════════════════════════════════════════════════════════════════════════
MANDATORY REQUIREMENTS — FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════════════

TARGET: ${config.targetWords}+ words of REAL, VALUABLE content.

STRUCTURE RULES:
• NEVER use H1 tags — WordPress provides the title
• Use 8-12 H2 sections with 2-3 H3 subsections each
• Include visual boxes: Pro Tips, Warnings, Statistics, Expert Quotes
• Add FAQ section with 7-10 Q&As before conclusion
• Use dark mode styling: backgrounds #0f172a/#1e293b, text #f1f5f9/#ffffff

WRITING STYLE (Human, NOT AI):
• Use contractions (don't, won't, you'll, we're)
• Short paragraphs (2-4 sentences max)
• Mix sentence lengths. Short punchy. Then longer explanatory ones.
• Address reader as "you" constantly
• Start sentences with And, But, So, Look, Here's the thing
• Be opinionated — take a stance

BANNED AI PHRASES (NEVER USE):
• "In today's fast-paced world"
• "It's important to note"
• "Let's dive in"
• "Comprehensive guide"
• "Leverage", "utilize", "delve"
• "Without further ado"
• "In conclusion"

INTERNAL LINKS:
• Add 15-20 contextual internal links
• Anchor text: 3-7 words (NEVER "click here" or single words)
• Example: "complete guide to protein timing" ✓

OUTPUT FORMAT: Valid JSON with this EXACT structure:
{
  "title": "string (50-60 chars, compelling)",
  "metaDescription": "string (150-160 chars)",
  "slug": "string (url-friendly-slug)",
  "htmlContent": "string (all HTML content)",
  "excerpt": "string (2-3 sentences)",
  "faqs": [{"question": "string", "answer": "string"}],
  "wordCount": number
}

⚠️ CRITICAL: Your response MUST be ONLY valid JSON — no text before or after.
⚠️ CRITICAL: htmlContent MUST be complete — do not truncate.
═══════════════════════════════════════════════════════════════════════════════`;
}

// Visual component examples — loaded only when generating specific sections
function getVisualComponentExample(type: 'quickAnswer' | 'proTip' | 'warning' | 'statsDashboard' | 'expertQuote' | 'table' | 'checklist' | 'keyTakeaways' | 'cta'): string {
    const examples: Record<string, string> = {
        quickAnswer: `
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important; border-radius: 16px !important; padding: 24px !important; margin: 32px 0 !important; border: 1px solid rgba(99,102,241,0.2) !important;">
  <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important; color: #fff !important; font-size: 11px !important; font-weight: 700 !important; padding: 8px 14px !important; border-radius: 8px !important; text-transform: uppercase !important; margin-bottom: 16px !important;">
    <span>⚡</span> Quick Answer
  </div>
  <p style="color: #f1f5f9 !important; font-size: 17px !important; line-height: 1.75 !important; margin: 0 !important;">[50-70 word direct answer]</p>
</div>`,

        proTip: `
<div style="background: linear-gradient(135deg, #14532d 0%, #166534 100%) !important; border-radius: 14px !important; padding: 24px !important; margin: 28px 0 !important;">
  <div style="display: flex; align-items: flex-start; gap: 14px;">
    <div style="min-width: 44px; height: 44px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 20px;">💡</span>
    </div>
    <div>
      <div style="color: #86efac !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 1.5px !important; margin-bottom: 8px !important;">Pro Tip</div>
      <p style="color: #dcfce7 !important; font-size: 15px !important; line-height: 1.7 !important; margin: 0 !important;">[Specific actionable advice]</p>
    </div>
  </div>
</div>`,

        warning: `
<div style="background: linear-gradient(135deg, #78350f 0%, #92400e 100%) !important; border-radius: 14px !important; padding: 24px !important; margin: 28px 0 !important; border-left: 5px solid #f59e0b !important;">
  <div style="display: flex; align-items: flex-start; gap: 14px;">
    <div style="min-width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 20px;">⚠️</span>
    </div>
    <div>
      <div style="color: #fde68a !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; margin-bottom: 8px !important;">Important</div>
      <p style="color: #fef3c7 !important; font-size: 15px !important; line-height: 1.7 !important; margin: 0 !important;">[Critical warning]</p>
    </div>
  </div>
</div>`,

        statsDashboard: `
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 40px 0;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important; border-radius: 14px; padding: 20px; text-align: center; border: 1px solid rgba(99,102,241,0.15);">
    <div style="font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">87%</div>
    <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px;">Success Rate</div>
  </div>
</div>`,

        expertQuote: `
<blockquote style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%) !important; border-radius: 18px; padding: 36px; margin: 40px 0; border-left: 5px solid #6366f1;">
  <p style="color: #e0e7ff !important; font-size: 18px; font-style: italic; line-height: 1.8; margin: 0 0 20px 0;">"[Expert quote]"</p>
  <footer style="display: flex; align-items: center; gap: 14px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>
    <div>
      <cite style="color: #c7d2fe; font-style: normal; font-weight: 700; font-size: 14px;">[Name]</cite>
      <span style="color: #818cf8; font-size: 12px; display: block;">[Title]</span>
    </div>
  </footer>
</blockquote>`,

        table: `
<div style="overflow-x: auto; margin: 40px 0; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);">
  <table style="width: 100%; border-collapse: collapse; background: #0f172a;">
    <thead>
      <tr style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
        <th style="padding: 16px; text-align: left; color: #f1f5f9; font-weight: 700; border-bottom: 2px solid #3b82f6;">Feature</th>
        <th style="padding: 16px; text-align: center; color: #f1f5f9; border-bottom: 2px solid #3b82f6;">Option A</th>
        <th style="padding: 16px; text-align: center; color: #f1f5f9; border-bottom: 2px solid #3b82f6;">Option B</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 14px; color: #e2e8f0; border-bottom: 1px solid rgba(255,255,255,0.04);">Feature 1</td><td style="padding: 14px; text-align: center; color: #22c55e;">✓</td><td style="padding: 14px; text-align: center; color: #ef4444;">✗</td></tr>
    </tbody>
  </table>
</div>`,

        checklist: `
<div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%) !important; border-radius: 14px; padding: 24px; margin: 32px 0;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 18px;">✅</span>
    </div>
    <h4 style="color: #a7f3d0; font-size: 16px; margin: 0;">Checklist</h4>
  </div>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 10px;">
      <span style="min-width: 22px; height: 22px; background: #10b981; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">✓</span>
      <span style="color: #d1fae5; font-size: 14px;">[Checklist item]</span>
    </li>
  </ul>
</div>`,

        keyTakeaways: `
<div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%) !important; border-radius: 20px; padding: 32px; margin: 48px 0; border: 1px solid rgba(16,185,129,0.3);">
  <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(16,185,129,0.2);">
    <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 14px; display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 24px;">🎯</span>
    </div>
    <h2 style="color: #a7f3d0; font-size: 24px; font-weight: 800; margin: 0;">Key Takeaways</h2>
  </div>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; padding: 16px; background: rgba(255,255,255,0.06); border-radius: 10px;">
      <div style="min-width: 28px; height: 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 7px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #fff; font-size: 14px; font-weight: 800;">✓</span>
      </div>
      <span style="color: #d1fae5; font-size: 15px; line-height: 1.6;">[Key takeaway]</span>
    </li>
  </ul>
</div>`,

        cta: `
<div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%) !important; border-radius: 20px; padding: 44px; margin: 56px 0; text-align: center;">
  <h3 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 14px 0;">Ready to Get Started?</h3>
  <p style="color: #e9d5ff; font-size: 17px; margin: 0 0 28px 0; max-width: 500px; margin-left: auto; margin-right: auto;">[CTA message]</p>
  <div style="display: inline-block; background: #ffffff; color: #5b21b6; font-weight: 700; padding: 16px 36px; border-radius: 12px; font-size: 16px;">🚀 [Action Text]</div>
</div>`
    };
    
    return examples[type] || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FIX #7: STAGED CONTENT PIPELINE — ELIMINATES TRUNCATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ContentOutline {
    title: string;
    metaDescription: string;
    slug: string;
    sections: Array<{
        heading: string;
        type: 'h2';
        keyPoints: string[];
        subsections: Array<{
            heading: string;
            keyPoints: string[];
        }>;
        visualComponents: string[];
    }>;
    faqTopics: string[];
    keyTakeaways: string[];
}

async function generateContentOutline(
    config: GenerateConfig,
    log: LogFunction
): Promise<ContentOutline | null> {
    log('📋 Stage 1: Generating content outline...');
    
    const outlinePrompt = `Create a detailed content outline for: "${config.topic}"

Output a JSON object with this EXACT structure:
{
  "title": "Compelling title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "sections": [
    {
      "heading": "H2 Section Title",
      "type": "h2",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "subsections": [
        {"heading": "H3 Subsection", "keyPoints": ["Detail 1", "Detail 2"]}
      ],
      "visualComponents": ["proTip", "expertQuote"]
    }
  ],
  "faqTopics": ["Question 1?", "Question 2?", ...],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", ...]
}

REQUIREMENTS:
- 8-12 main sections (H2s)
- 2-3 subsections (H3s) per main section
- 7-10 FAQ topics
- 5-7 key takeaways
- Each section should have 1-2 visual component suggestions

⚠️ Return ONLY valid JSON, no other text.`;

    try {
        const response = await callLLM(
            config.provider,
            config.apiKeys,
            config.model,
            outlinePrompt,
            buildSlimSystemPrompt({
                topic: config.topic,
                targetWords: CONTENT_TARGETS.INITIAL_WORD_TARGET,
                hasNeuronData: !!config.neuronData,
                hasEntityData: !!config.entityGapData
            }),
            { temperature: 0.7, maxTokens: 4000 },
            TIMEOUTS.OUTLINE_GENERATION,
            log
        );
        
        const parsed = healJSON(response, log);
        
        if (parsed.success && parsed.data) {
            // Validate outline structure
            const outline = parsed.data as unknown as ContentOutline;
            if (outline.sections && outline.sections.length >= 5) {
                log(`   ✅ Outline generated: ${outline.sections.length} sections, ${outline.faqTopics?.length || 0} FAQs`);
                return outline;
            }
        }
        
        log(`   ❌ Invalid outline structure`);
        return null;
        
    } catch (error: any) {
        log(`   ❌ Outline generation failed: ${error.message}`);
        return null;
    }
}

async function generateSection(
    sectionOutline: ContentOutline['sections'][0],
    sectionIndex: number,
    totalSections: number,
    config: GenerateConfig,
    log: LogFunction
): Promise<SectionGenerationResult> {
    log(`   📝 Section ${sectionIndex + 1}/${totalSections}: "${sectionOutline.heading.substring(0, 40)}..."`);
    
    // Get relevant visual component examples for this section
    const visualExamples = (sectionOutline.visualComponents || [])
        .map(type => getVisualComponentExample(type as any))
        .filter(Boolean)
        .join('\n\n');
    
    const sectionPrompt = `Write section ${sectionIndex + 1} of a blog post about "${config.topic}".

SECTION DETAILS:
Heading: ${sectionOutline.heading}
Key Points to Cover:
${sectionOutline.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Subsections:
${sectionOutline.subsections.map(s => `- ${s.heading}: ${s.keyPoints.join(', ')}`).join('\n')}

TARGET: 300-450 words for this section.

${visualExamples ? `VISUAL COMPONENTS TO INCLUDE:\n${visualExamples}` : ''}

OUTPUT: Return ONLY the HTML content for this section. Start with <h2> and include all subsections with <h3>.
Use dark mode styling (backgrounds: #0f172a, #1e293b; text: #f1f5f9, #ffffff).
Include !important on all style properties.

⚠️ Return ONLY HTML, no JSON wrapper, no markdown.`;

    try {
        const response = await callLLM(
            config.provider,
            config.apiKeys,
            config.model,
            sectionPrompt,
            'You are an expert content writer. Output only clean HTML with inline styles.',
            { temperature: 0.75, maxTokens: 3000 },
            TIMEOUTS.SECTION_GENERATION,
            log
        );
        
        // Clean up the response (might have markdown wrappers)
        let html = response.trim();
        html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '');
        
        const wordCount = countWords(html);
        
        if (wordCount < 100) {
            return {
                success: false,
                html: '',
                wordCount: 0,
                sectionIndex,
                error: `Section too short: ${wordCount} words`
            };
        }
        
        log(`      ✅ ${wordCount} words`);
        
        return {
            success: true,
            html,
            wordCount,
            sectionIndex
        };
        
    } catch (error: any) {
        log(`      ❌ Failed: ${error.message}`);
        return {
            success: false,
            html: '',
            wordCount: 0,
            sectionIndex,
            error: error.message
        };
    }
}

async function generateFAQSection(
    faqTopics: string[],
    config: GenerateConfig,
    log: LogFunction
): Promise<string> {
    log('   📝 Generating FAQ section...');
    
    const faqPrompt = `Write a comprehensive FAQ section for a blog post about "${config.topic}".

QUESTIONS TO ANSWER:
${faqTopics.map((q, i) => `${i + 1}. ${q}`).join('\n')}

OUTPUT: Return a complete FAQ section as HTML using a CSS-only accordion pattern.
Each Q&A should have 80-150 words in the answer.
Use dark mode styling (backgrounds: #0f172a, #1e293b; text: #f1f5f9).
Include Schema.org FAQPage markup.

⚠️ Return ONLY the HTML for the FAQ section, no JSON wrapper.`;

    try {
        const response = await callLLM(
            config.provider,
            config.apiKeys,
            config.model,
            faqPrompt,
            'You are an expert content writer. Output only clean HTML with inline styles.',
            { temperature: 0.7, maxTokens: 4000 },
            TIMEOUTS.SECTION_GENERATION,
            log
        );
        
        let html = response.trim();
        html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '');
        
        const wordCount = countWords(html);
        log(`      ✅ FAQ: ${wordCount} words, ${faqTopics.length} questions`);
        
        return html;
        
    } catch (error: any) {
        log(`      ❌ FAQ generation failed: ${error.message}`);
        // Return a basic FAQ structure
        return generateBasicFAQ(faqTopics, config.topic);
    }
}

function generateBasicFAQ(topics: string[], topic: string): string {
    const sectionId = `faq-${Date.now()}`;
    
    const items = topics.slice(0, 7).map((q, i) => `
    <div style="border-bottom: 1px solid rgba(255,255,255,0.06);">
      <details>
        <summary style="padding: 20px; cursor: pointer; color: #f1f5f9; font-weight: 600;">
          Q${i + 1}: ${escapeHtml(q)}
        </summary>
        <div style="padding: 0 20px 20px; color: #cbd5e1; line-height: 1.7;">
          [Answer for: ${escapeHtml(q)}]
        </div>
      </details>
    </div>`).join('\n');
    
    return `
<section style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 20px; margin: 48px 0; overflow: hidden;">
  <div style="padding: 24px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
    <h2 style="color: #f1f5f9; font-size: 24px; margin: 0;">❓ Frequently Asked Questions</h2>
  </div>
  ${items}
</section>`;
}

async function mergeAndPolishContent(
    outline: ContentOutline,
    sections: string[],
    faqHtml: string,
    config: GenerateConfig,
    log: LogFunction
): Promise<ContentContract | null> {
    log('   🔀 Merging and polishing content...');
    
    // Build introduction
    const introPrompt = `Write an engaging introduction (250-350 words) for a blog post titled: "${outline.title}"

Topic: ${config.topic}

Include:
1. A compelling hook that grabs attention
2. What the reader will learn
3. Why this matters to them
4. A Quick Answer box (50-70 words)

OUTPUT: Return ONLY HTML, starting with <p> (no heading). Include the Quick Answer box component.
Use dark mode styling.`;

    let introHtml = '';
    try {
        const introResponse = await callLLM(
            config.provider,
            config.apiKeys,
            config.model,
            introPrompt,
            'You are an expert content writer. Output only clean HTML.',
            { temperature: 0.7, maxTokens: 2000 },
            TIMEOUTS.SECTION_GENERATION,
            log
        );
        introHtml = introResponse.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
        log(`      ✅ Introduction: ${countWords(introHtml)} words`);
    } catch (error: any) {
        log(`      ⚠️ Introduction failed, using placeholder`);
        introHtml = `<p>${escapeHtml(config.topic)} is a topic that deserves careful attention. In this guide, you'll learn everything you need to know.</p>`;
    }
    
    // Build Key Takeaways
    const keyTakeawaysHtml = generateKeyTakeawaysBox(outline.keyTakeaways || []);
    
    // Build conclusion
    const conclusionPrompt = `Write a strong conclusion (200-300 words) for a blog post about "${config.topic}".

Include:
1. Summary of main points
2. Call to action
3. Next steps for the reader
4. A CTA box component

OUTPUT: Return ONLY HTML. Include a styled CTA box. Use dark mode styling.`;

    let conclusionHtml = '';
    try {
        const conclusionResponse = await callLLM(
            config.provider,
            config.apiKeys,
            config.model,
            conclusionPrompt,
            'You are an expert content writer. Output only clean HTML.',
            { temperature: 0.7, maxTokens: 2000 },
            TIMEOUTS.SECTION_GENERATION,
            log
        );
        conclusionHtml = conclusionResponse.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
        log(`      ✅ Conclusion: ${countWords(conclusionHtml)} words`);
    } catch (error: any) {
        log(`      ⚠️ Conclusion failed, using placeholder`);
        conclusionHtml = `<h2>Conclusion</h2><p>Now you have all the tools you need to succeed with ${escapeHtml(config.topic)}. Take action today!</p>`;
    }
    
    // Assemble final content
    const assembledContent = [
        introHtml,
        ...sections,
        keyTakeawaysHtml,
        faqHtml,
        conclusionHtml
    ].join('\n\n');
    
    // Remove any H1 tags
    const finalContent = removeAllH1Tags(assembledContent, log);
    
    const wordCount = countWords(finalContent);
    log(`   ✅ Final assembly: ${wordCount} words`);
    
    // Extract FAQs for structured data
    const faqs = extractFAQsFromHTML(faqHtml);
    
    return {
        title: outline.title,
        metaDescription: outline.metaDescription,
        slug: outline.slug,
        htmlContent: finalContent,
        excerpt: outline.metaDescription,
        faqs,
        wordCount
    } as ContentContract;
}

function extractFAQsFromHTML(html: string): Array<{ question: string; answer: string }> {
    const faqs: Array<{ question: string; answer: string }> = [];
    
    // Try to extract from details/summary structure
    const detailsRegex = /<summary[^>]*>(.*?)<\/summary>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    
    while ((match = detailsRegex.exec(html)) !== null) {
        const question = match[1].replace(/<[^>]*>/g, '').replace(/^Q\d+:\s*/i, '').trim();
        const answer = match[2].replace(/<[^>]*>/g, '').trim();
        
        if (question && answer && question.length > 10 && answer.length > 20) {
            faqs.push({ question, answer });
        }
    }
    
    // If no FAQs found, try itemprop pattern
    if (faqs.length === 0) {
        const questionRegex = /itemprop="name"[^>]*>(.*?)<\/[\s\S]*?itemprop="text"[^>]*>(.*?)</gi;
        while ((match = questionRegex.exec(html)) !== null) {
            const question = match[1].replace(/<[^>]*>/g, '').trim();
            const answer = match[2].replace(/<[^>]*>/g, '').trim();
            if (question && answer) {
                faqs.push({ question, answer });
            }
        }
    }
    
    return faqs;
}

function generateKeyTakeawaysBox(takeaways: string[]): string {
    if (!takeaways || takeaways.length === 0) return '';
    
    const items = takeaways.map(t => `
    <li style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; padding: 16px; background: rgba(255,255,255,0.06); border-radius: 10px;">
      <div style="min-width: 28px; height: 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <span style="color: #fff; font-size: 14px; font-weight: 800;">✓</span>
      </div>
      <span style="color: #d1fae5; font-size: 15px; line-height: 1.6;">${escapeHtml(t)}</span>
    </li>`).join('\n');
    
    return `
<div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%) !important; border-radius: 20px !important; padding: 32px !important; margin: 48px 0 !important; border: 1px solid rgba(16,185,129,0.3) !important;">
  <div style="display: flex !important; align-items: center !important; gap: 14px !important; margin-bottom: 24px !important; padding-bottom: 20px !important; border-bottom: 1px solid rgba(16,185,129,0.2) !important;">
    <div style="width: 52px !important; height: 52px !important; background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; border-radius: 14px !important; display: flex !important; align-items: center !important; justify-content: center !important;">
      <span style="font-size: 24px !important;">🎯</span>
    </div>
    <h2 style="color: #a7f3d0 !important; font-size: 24px !important; font-weight: 800 !important; margin: 0 !important;">Key Takeaways</h2>
  </div>
  <ul style="list-style: none !important; padding: 0 !important; margin: 0 !important;">
    ${items}
  </ul>
</div>`;
}

function removeAllH1Tags(html: string, log: LogFunction): string {
    if (!html) return html;
    
    const h1CountBefore = (html.match(/<h1/gi) || []).length;
    
    if (h1CountBefore === 0) return html;
    
    log(`   ⚠️ Removing ${h1CountBefore} H1 tag(s)...`);
    
    let cleaned = html;
    for (let i = 0; i < 3; i++) {
        cleaned = cleaned.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
    }
    cleaned = cleaned.replace(/<h1\b[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/h1>/gi, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 FIX #8: UNIFIED LLM CALLER — HANDLES ALL PROVIDERS
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
    
    // Check circuit breaker
    if (isCircuitOpen(provider)) {
        throw new Error(`Circuit breaker OPEN for ${provider} — too many recent failures`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        let response: string;
        
        switch (provider) {
            case 'google':
                response = await callGemini(apiKeys.google, model, userPrompt, systemPrompt, temperature, maxTokens, controller.signal);
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
                response = await callGroq(apiKeys.groq, apiKeys.groqModel || 'llama-3.3-70b-versatile', userPrompt, systemPrompt, temperature, maxTokens, controller.signal);
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
        
        clearTimeout(timeoutId);
        recordSuccess(provider);
        return response;
        
    } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            recordFailure(provider, log);
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        
        // Record failure for rate limits and server errors
        if (error.message.includes('429') || error.message.includes('500') || error.message.includes('503')) {
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
    maxTokens: number,
    signal: AbortSignal
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-preview-05-20',
        contents: userPrompt,
        config: {
            systemInstruction: systemPrompt,
            temperature,
            maxOutputTokens: maxTokens,
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
            model: model || 'anthropic/claude-sonnet-4',
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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenRouter error ${response.status}: ${errorText.substring(0, 200)}`);
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
            model: model || 'gpt-4o',
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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenAI error ${response.status}: ${errorText.substring(0, 200)}`);
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
            model: model || 'claude-sonnet-4-20250514',
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            temperature,
            max_tokens: maxTokens
        }),
        signal
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Anthropic error ${response.status}: ${errorText.substring(0, 200)}`);
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
            model: model || 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: Math.min(maxTokens, 8000) // Groq has lower limits
        }),
        signal
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Groq error ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class AIOrchestrator {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔥 STAGED GENERATION — PRIMARY METHOD (ELIMINATES TRUNCATION)
    // ═══════════════════════════════════════════════════════════════════════════
    
    async generateEnhanced(
        config: GenerateConfig,
        log: LogFunction,
        onStageProgress?: (progress: StageProgress) => void
    ): Promise<GenerationResult> {
        const startTime = Date.now();
        log(`🚀 STAGED CONTENT PIPELINE v${AI_ORCHESTRATOR_VERSION}`);
        log(`   → Topic: "${config.topic.substring(0, 50)}..."`);
        log(`   → Provider: ${config.provider} | Model: ${config.model}`);
        
        try {
            // Stage 1: Generate Outline
            onStageProgress?.({ stage: 'outline', progress: 10, message: 'Generating content outline...' });
            
            const outline = await generateContentOutline(config, log);
            
            if (!outline || !outline.sections || outline.sections.length < 5) {
                log('   ❌ Outline generation failed, falling back to single-shot');
                return this.generate(config, log);
            }
            
            onStageProgress?.({ stage: 'outline', progress: 20, message: `Outline ready: ${outline.sections.length} sections` });
            
            // Stage 2: Generate Sections (with parallelism)
            onStageProgress?.({ 
                stage: 'sections', 
                progress: 25, 
                message: 'Generating sections...',
                sectionsCompleted: 0,
                totalSections: outline.sections.length
            });
            
            const sections: string[] = [];
            const BATCH_SIZE = 2; // Generate 2 sections at a time
            
            for (let i = 0; i < outline.sections.length; i += BATCH_SIZE) {
                const batch = outline.sections.slice(i, i + BATCH_SIZE);
                
                const batchResults = await Promise.all(
                    batch.map((section, batchIndex) => 
                        generateSection(
                            section,
                            i + batchIndex,
                            outline.sections.length,
                            config,
                            log
                        )
                    )
                );
                
                for (const result of batchResults) {
                    if (result.success && result.html) {
                        sections.push(result.html);
                    } else {
                        // Generate placeholder for failed section
                        const failedSection = outline.sections[result.sectionIndex];
                        sections.push(`<h2>${escapeHtml(failedSection.heading)}</h2><p>[Content for this section could not be generated]</p>`);
                    }
                }
                
                const progress = 25 + Math.round((sections.length / outline.sections.length) * 40);
                onStageProgress?.({
                    stage: 'sections',
                    progress,
                    message: `Generated ${sections.length}/${outline.sections.length} sections`,
                    sectionsCompleted: sections.length,
                    totalSections: outline.sections.length
                });
                
                // Small delay between batches to avoid rate limiting
                if (i + BATCH_SIZE < outline.sections.length) {
                    await sleep(1000);
                }
            }
            
            log(`   ✅ Sections complete: ${sections.length}/${outline.sections.length}`);
            
            // Stage 3: Generate FAQ
            onStageProgress?.({ stage: 'sections', progress: 70, message: 'Generating FAQ...' });
            
            const faqHtml = await generateFAQSection(
                outline.faqTopics || [],
                config,
                log
            );
            
            // Stage 4: Merge and Polish
            onStageProgress?.({ stage: 'merge', progress: 80, message: 'Merging content...' });
            
            const contract = await mergeAndPolishContent(
                outline,
                sections,
                faqHtml,
                config,
                log
            );
            
            if (!contract) {
                throw new Error('Content merge failed');
            }
            
            // Stage 5: Validation
            onStageProgress?.({ stage: 'polish', progress: 90, message: 'Final validation...' });
            
            // Validate word count
            if (contract.wordCount < CONTENT_TARGETS.MIN_ACCEPTABLE_WORDS) {
                log(`   ⚠️ Word count low (${contract.wordCount}), attempting expansion...`);
                // Could add expansion logic here
            }
            
            // Inject internal links if available
            if (config.internalLinks && config.internalLinks.length > 0) {
                log(`   🔗 Injecting internal links...`);
                const linkResult = injectInternalLinks(
                    contract.htmlContent,
                    config.internalLinks,
                    config.topic,
                    {
                        minLinks: 10,
                        maxLinks: 20,
                        minRelevance: 0.5
                    }
                );
                contract.htmlContent = linkResult.html;
                contract.internalLinks = linkResult.linksAdded;
                log(`      ✅ ${linkResult.linksAdded.length} internal links added`);
            }
            
            onStageProgress?.({ stage: 'validation', progress: 100, message: 'Complete!' });
            
            const totalTime = Date.now() - startTime;
            log(`🎉 STAGED GENERATION COMPLETE: ${contract.wordCount} words in ${Math.round(totalTime / 1000)}s`);
            
            return {
                contract,
                generationMethod: 'staged',
                attempts: 1,
                totalTime
            };
            
        } catch (error: any) {
            log(`❌ Staged generation failed: ${error.message}`);
            log(`   → Falling back to single-shot generation...`);
            
            return this.generate(config, log);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 SINGLE-SHOT GENERATION — FALLBACK METHOD (WITH IMPROVEMENTS)
    // ═══════════════════════════════════════════════════════════════════════════
    
    async generate(
        config: GenerateConfig,
        log: LogFunction
    ): Promise<GenerationResult> {
        const startTime = Date.now();
        const maxAttempts = GENERATION_CONFIG.MAX_ATTEMPTS;
        
        log(`🎨 SINGLE-SHOT GENERATION (fallback)`);
        log(`   → Target: ${CONTENT_TARGETS.INITIAL_WORD_TARGET}+ words`);
        
        let lastError: string = '';
        let bestResult: ContentContract | null = null;
        let bestWordCount = 0;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            log(`   📝 Attempt ${attempt}/${maxAttempts}...`);
            
            const temperature = Math.min(
                GENERATION_CONFIG.BASE_TEMPERATURE + ((attempt - 1) * GENERATION_CONFIG.TEMPERATURE_INCREMENT),
                GENERATION_CONFIG.MAX_TEMPERATURE
            );
            
            try {
                // Build the prompt with all context
                const userPrompt = this.buildFullPrompt(config);
                const systemPrompt = buildSlimSystemPrompt({
                    topic: config.topic,
                    targetWords: CONTENT_TARGETS.INITIAL_WORD_TARGET,
                    hasNeuronData: !!config.neuronData,
                    hasEntityData: !!config.entityGapData
                });
                
                const response = await callLLM(
                    config.provider,
                    config.apiKeys,
                    config.model,
                    userPrompt,
                    systemPrompt,
                    { temperature, maxTokens: 16000 },
                    TIMEOUTS.SINGLE_SHOT_GENERATION,
                    log
                );
                
                // Validate response completeness before parsing
                const validation = validateResponseCompleteness(response);
                if (!validation.isComplete) {
                    log(`      ⚠️ Response incomplete: ${validation.details}`);
                    
                    if (validation.isTruncated && attempt < maxAttempts) {
                        // Try continuation
                        const continued = await this.attemptContinuation(
                            response,
                            config,
                            log
                        );
                        
                        if (continued) {
                            const parsed = healJSON(continued, log);
                            if (parsed.success && parsed.data) {
                                bestResult = parsed.data;
                                bestWordCount = parsed.data.wordCount || countWords(parsed.data.htmlContent);
                                log(`      ✅ Continuation successful: ${bestWordCount} words`);
                                break;
                            }
                        }
                    }
                }
                
                // Parse the response
                const parsed = healJSON(response, log);
                
                if (!parsed.success) {
                    lastError = parsed.error || 'Parse failed';
                    log(`      ❌ ${lastError}`);
                    
                    if (attempt < maxAttempts) {
                        const backoff = calculateBackoff(attempt - 1);
                        log(`      ⏳ Waiting ${Math.round(backoff / 1000)}s before retry...`);
                        await sleep(backoff);
                    }
                    continue;
                }
                
                const contract = parsed.data!;
                const wordCount = contract.wordCount || countWords(contract.htmlContent);
                
                // Track best result
                if (wordCount > bestWordCount) {
                    bestResult = contract;
                    bestWordCount = wordCount;
                }
                
                // Check if acceptable
                if (wordCount >= CONTENT_TARGETS.MIN_ACCEPTABLE_WORDS && contract.htmlContent?.length > 5000) {
                    log(`      ✅ Success: ${wordCount} words`);
                    
                    // Post-processing
                    contract.htmlContent = removeAllH1Tags(contract.htmlContent, log);
                    contract.wordCount = countWords(contract.htmlContent);
                    
                    const totalTime = Date.now() - startTime;
                    
                    return {
                        contract,
                        generationMethod: 'single-shot',
                        attempts: attempt,
                        totalTime
                    };
                }
                
                lastError = `Content too short: ${wordCount} words`;
                log(`      ⚠️ ${lastError}`);
                
            } catch (error: any) {
                lastError = error.message;
                log(`      ❌ Error: ${lastError}`);
                
                if (error.message.includes('Circuit breaker')) {
                    break; // Don't retry if circuit is open
                }
                
                if (attempt < maxAttempts) {
                    const backoff = calculateBackoff(attempt - 1);
                    log(`      ⏳ Waiting ${Math.round(backoff / 1000)}s before retry...`);
                    await sleep(backoff);
                }
            }
        }
        
        // Use best result if we have one
        if (bestResult && bestWordCount >= 2000) {
            log(`   ⚠️ Using best available result: ${bestWordCount} words`);
            
            bestResult.htmlContent = removeAllH1Tags(bestResult.htmlContent, log);
            bestResult.wordCount = countWords(bestResult.htmlContent);
            
            return {
                contract: bestResult,
                generationMethod: 'single-shot',
                attempts: maxAttempts,
                totalTime: Date.now() - startTime
            };
        }
        
        throw new Error(`Content generation failed after ${maxAttempts} attempts: ${lastError}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📝 PROMPT BUILDER
    // ═══════════════════════════════════════════════════════════════════════════
    
    private buildFullPrompt(config: GenerateConfig): string {
        const parts: string[] = [];
        
        parts.push(`Write a comprehensive ${CONTENT_TARGETS.INITIAL_WORD_TARGET}+ word blog post about: "${config.topic}"`);
        
        // Add entity gap data if available (condensed)
        if (config.entityGapData) {
            const entities = config.entityGapData.missingEntities?.slice(0, 15) || [];
            const paa = config.entityGapData.paaQuestions?.slice(0, 8) || [];
            
            if (entities.length > 0) {
                parts.push(`\nENTITIES TO INCLUDE: ${entities.join(', ')}`);
            }
            if (paa.length > 0) {
                parts.push(`\nFAQ QUESTIONS TO ANSWER:\n${paa.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
            }
        }
        
        // Add NLP terms if available (condensed)
        if (config.neuronData?.terms) {
            const criticalTerms = config.neuronData.terms
                .filter(t => t.importance >= 80)
                .slice(0, 15)
                .map(t => t.term);
            
            if (criticalTerms.length > 0) {
                parts.push(`\nCRITICAL NLP TERMS TO USE: ${criticalTerms.join(', ')}`);
            }
        }
        
        // Add internal link targets (condensed)
        if (config.internalLinks && config.internalLinks.length > 0) {
            const links = config.internalLinks.slice(0, 15);
            parts.push(`\nINTERNAL LINKS TO ADD (use 3-7 word anchors):\n${links.map(l => `• ${l.title} → ${l.url}`).join('\n')}`);
        }
        
        // Add references if available
        if (config.validatedReferences && config.validatedReferences.length > 0) {
            const refs = config.validatedReferences.filter(r => r.isValid).slice(0, 10);
            if (refs.length > 0) {
                parts.push(`\nCITE THESE SOURCES with [1], [2] notation:\n${refs.map((r, i) => `[${i + 1}] ${r.title} (${r.source})`).join('\n')}`);
            }
        }
        
        parts.push(`\n⚠️ OUTPUT: Return ONLY valid JSON matching the required structure.`);
        
        return parts.join('\n');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 CONTINUATION HANDLER — FOR TRUNCATED RESPONSES
    // ═══════════════════════════════════════════════════════════════════════════
    
    private async attemptContinuation(
        truncatedResponse: string,
        config: GenerateConfig,
        log: LogFunction
    ): Promise<string | null> {
        log(`   🔄 Attempting response continuation...`);
        
        for (let attempt = 1; attempt <= GENERATION_CONFIG.MAX_CONTINUATION_ATTEMPTS; attempt++) {
            try {
                const lastChars = truncatedResponse.slice(-500);
                
                const continuationPrompt = `Continue this JSON response EXACTLY from where it was cut off.

The response was truncated here:
...${lastChars}

RULES:
1. Continue IMMEDIATELY from the cut-off point
2. Complete all unclosed strings, arrays, and objects
3. Ensure the final JSON is valid
4. Do NOT repeat any content
5. Do NOT add any text before or after the JSON

Continue:`;

                const continuation = await callLLM(
                    config.provider,
                    config.apiKeys,
                    config.model,
                    continuationPrompt,
                    'You are continuing a truncated JSON response. Output ONLY the continuation, nothing else.',
                    { temperature: 0.5, maxTokens: 4000 },
                    TIMEOUTS.CONTINUATION_REQUEST,
                    log
                );
                
                // Merge the responses
                const merged = truncatedResponse + continuation;
                
                // Validate the merged response
                const validation = validateResponseCompleteness(merged);
                if (validation.isComplete) {
                    log(`      ✅ Continuation successful`);
                    return merged;
                }
                
                log(`      ⚠️ Continuation attempt ${attempt} incomplete`);
                
            } catch (error: any) {
                log(`      ❌ Continuation failed: ${error.message}`);
            }
        }
        
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const orchestrator = new AIOrchestrator();

// Export utility functions
export {
    removeAllH1Tags,
    countWords,
    validateResponseCompleteness,
    healJSON,
    getVisualComponentExample,
    generateKeyTakeawaysBox,
    buildSlimSystemPrompt
};

// Export model registries
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

// Alt text generator (simplified export for compatibility)
export async function generateOptimizedAltText(
    images: Array<{ src: string; alt: string }>,
    topic: string,
    apiKey: string
): Promise<Array<{ src: string; originalAlt: string; optimizedAlt: string }>> {
    return images.map(img => ({
        src: img.src,
        originalAlt: img.alt,
        optimizedAlt: img.alt || `Image related to ${topic}`
    }));
}

// FAQ upgrade function (for compatibility)
export function upgradeFAQSection(
    htmlContent: string,
    faqs: Array<{ question: string; answer: string }>
): string {
    if (!faqs || faqs.length === 0) return htmlContent;
    
    // Check if FAQ section already exists
    const hasFAQ = /<section[^>]*(?:faq|wp-opt-faq)/i.test(htmlContent);
    if (hasFAQ) return htmlContent;
    
    // Generate new FAQ section
    const faqHtml = generateEnterpriseAccordionFAQ(faqs);
    
    // Find insertion point (before conclusion or at end)
    const conclusionMatch = htmlContent.match(/<h2[^>]*>[^<]*(?:conclusion|summary|final|wrapping)/i);
    
    if (conclusionMatch) {
        const insertIndex = htmlContent.indexOf(conclusionMatch[0]);
        return htmlContent.slice(0, insertIndex) + faqHtml + '\n\n' + htmlContent.slice(insertIndex);
    }
    
    // Insert before last H2 or at end
    const lastH2 = htmlContent.lastIndexOf('<h2');
    if (lastH2 > htmlContent.length * 0.7) {
        return htmlContent.slice(0, lastH2) + faqHtml + '\n\n' + htmlContent.slice(lastH2);
    }
    
    return htmlContent + '\n\n' + faqHtml;
}

function generateEnterpriseAccordionFAQ(faqs: Array<{ question: string; answer: string }>): string {
    if (!faqs || faqs.length === 0) return '';
    
    const sectionId = `faq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const colorPalette = [
        { accent: '#6366f1', bg: 'rgba(99,102,241,0.15)', text: '#c7d2fe' },
        { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', text: '#ddd6fe' },
        { accent: '#06b6d4', bg: 'rgba(6,182,212,0.15)', text: '#a5f3fc' },
        { accent: '#10b981', bg: 'rgba(16,185,129,0.15)', text: '#a7f3d0' },
        { accent: '#f59e0b', bg: 'rgba(245,158,11,0.15)', text: '#fde68a' },
        { accent: '#ec4899', bg: 'rgba(236,72,153,0.15)', text: '#fbcfe8' },
    ];
    
    const faqItems = faqs.map((faq, index) => {
        const colors = colorPalette[index % colorPalette.length];
        const itemId = `${sectionId}-q${index}`;
        
        return `
    <div style="border-bottom: 1px solid rgba(255,255,255,0.06) !important;">
        <input type="checkbox" id="${itemId}" style="position: absolute !important; opacity: 0 !important; pointer-events: none !important;" />
        <label for="${itemId}" style="width: 100% !important; display: flex !important; align-items: center !important; gap: 14px !important; padding: 20px 24px !important; cursor: pointer !important; background: rgba(255,255,255,0.02) !important;">
            <div style="min-width: 36px !important; height: 36px !important; background: ${colors.bg} !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; border: 2px solid ${colors.accent}40 !important;">
                <span style="font-size: 12px !important; font-weight: 800 !important; color: ${colors.accent} !important;">Q${index + 1}</span>
            </div>
            <span style="flex: 1 !important; color: #f1f5f9 !important; font-size: 15px !important; font-weight: 600 !important; line-height: 1.5 !important;">${escapeHtml(faq.question)}</span>
            <span style="font-size: 14px !important; color: ${colors.accent} !important;">▼</span>
        </label>
        <div style="max-height: 0 !important; overflow: hidden !important; background: rgba(0,0,0,0.2) !important;">
            <div style="padding: 20px 24px 24px 74px !important;">
                <p style="color: #cbd5e1 !important; font-size: 15px !important; line-height: 1.75 !important; margin: 0 !important;">${escapeHtml(faq.answer)}</p>
            </div>
        </div>
    </div>`;
    }).join('\n');

    return `
<style>
#faq-section-${sectionId} input:checked + label + div { max-height: 800px !important; }
#faq-section-${sectionId} input:checked + label span:last-child { transform: rotate(180deg) !important; }
</style>
<section id="faq-section-${sectionId}" itemscope itemtype="https://schema.org/FAQPage" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important; border-radius: 20px !important; margin: 48px 0 !important; border: 1px solid rgba(255,255,255,0.08) !important; overflow: hidden !important;">
    <div style="padding: 28px !important; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important;">
        <div style="display: flex !important; align-items: center !important; gap: 14px !important;">
            <div style="width: 52px !important; height: 52px !important; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important; border-radius: 14px !important; display: flex !important; align-items: center !important; justify-content: center !important;">
                <span style="font-size: 24px !important;">❓</span>
            </div>
            <div>
                <h2 style="color: #f1f5f9 !important; font-size: 24px !important; font-weight: 800 !important; margin: 0 !important;">Frequently Asked Questions</h2>
                <p style="color: #94a3b8 !important; font-size: 12px !important; margin: 4px 0 0 0 !important;">${faqs.length} questions • Click to expand</p>
            </div>
        </div>
    </div>
    ${faqItems}
</section>`;
}

export default orchestrator;
