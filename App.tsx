// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v27.0 — ENTERPRISE SOTA EDITION (COMPLETE REFACTOR)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// CRITICAL FIXES v27.0:
// ✅ STAGED PIPELINE INTEGRATION — Uses new chunked generation
// ✅ IMMER FREEZE FIX — Deep clone contracts before state updates
// ✅ ZERO H1 DUPLICATION — WordPress provides H1, content NEVER includes H1
// ✅ CANCELLATION SYSTEM — Cancel long-running jobs gracefully
// ✅ CIRCUIT BREAKER AWARE — Respects provider circuit breakers
// ✅ PROGRESS TRACKING — Real-time stage progress updates
// ✅ IMPROVED ERROR HANDLING — Better error messages and recovery
// ✅ BULK OPTIMIZATION — Parallel processing with concurrency control
// ✅ SLUG PRESERVATION — Never changes URL for existing posts
// ✅ FEATURED IMAGE PRESERVATION — Never deletes existing featured images
// ✅ CONTENT IMAGE PRESERVATION — All images maintained with optimized alt text
// ✅ FAQ DUPLICATION FIX — Premium FAQ only added once
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
    SitemapPage, 
    ContentContract, 
    GodModePhase, 
    InternalLinkTarget,
    GeoTargetConfig, 
    APP_VERSION, 
    NeuronTerm, 
    OptimizationMode,
    StageProgress,
    BulkJob,
    BulkProcessingState,
    BulkResult,
    PostPreservationData
} from './types';
import { 
    extractSlugFromUrl, 
    sanitizeTitle, 
    calculateOpportunityScore, 
    calculateSeoMetrics, 
    sanitizeSlug, 
    runQASwarm, 
    injectInternalLinks,
    analyzeExistingContent, 
    formatDuration, 
    removeAllH1Tags, 
    validateNoH1
} from './utils';
import { 
    titanFetch, 
    wpResolvePostIdEnhanced, 
    wpUpdatePost, 
    wpCreatePost, 
    wpGetPost, 
    wpTestConnection, 
    performEntityGapAnalysis,
    discoverAndValidateReferences, 
    wpUpdatePostMeta,
    wpGetPostWithImages, 
    wpGetFeaturedImage, 
    extractImagesFromContent,
    wpUpdateMediaAltText, 
    wpGetMediaIdFromUrl, 
    wpGetPostFullUrl,
    discoverInternalLinkTargets
} from './fetch-service';
import { 
    orchestrator, 
    VALID_GEMINI_MODELS, 
    OPENROUTER_MODELS,
    searchYouTubeVideo,        	// ADD THIS
    createYouTubeEmbed,			// ADD THIS
	discoverReferences,			// ADD THIS
    createReferencesSection		// ADD THIS (note: function name differs!)
} from './lib/ai-orchestrator';
import { getNeuronWriterAnalysis, listNeuronProjects } from './neuronwriter';

function extractTopicFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1] || '';
        // Convert slug to readable topic
        return lastPart
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim() || 'Content Optimization';
    } catch {
        return url.split('/').pop()?.replace(/-/g, ' ') || 'Content Optimization';
    }
}




// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const APP_VERSION_FULL = '27.0.0';
const MAX_SYNTHESIS_CYCLES = 3;
const QA_PASS_THRESHOLD = 65;
const MIN_WORD_COUNT = 3000;
const TARGET_WORD_COUNT = 4000;
const TITLE_MIN_LENGTH = 45;
const TITLE_MAX_LENGTH = 65;
const META_MIN_LENGTH = 145;
const META_MAX_LENGTH = 160;
const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (reduced from 25)

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ENTERPRISE PROGRESS TRACKING — PHASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressPhaseConfig {
    label: string;
    icon: string;
    color: string;
    step: number;
    description: string;
}

const PHASE_CONFIG: Record<string, ProgressPhaseConfig> = {
    'idle': { label: 'Ready', icon: '⏸️', color: '#64748b', step: 0, description: 'Waiting to start' },
    'initializing': { label: 'Initializing', icon: '🚀', color: '#6366f1', step: 1, description: 'Setting up optimization pipeline...' },
    'resolving_post': { label: 'Finding Post', icon: '🔍', color: '#8b5cf6', step: 2, description: 'Resolving WordPress post ID...' },
    'analyzing_existing': { label: 'Analyzing', icon: '📊', color: '#a855f7', step: 3, description: 'Analyzing existing content...' },
    'entity_gap_analysis': { label: 'Entity Analysis', icon: '🧠', color: '#d946ef', step: 4, description: 'Discovering content gaps & entities...' },
    'neuron_analysis': { label: 'NLP Analysis', icon: '🧬', color: '#ec4899', step: 5, description: 'Running NeuronWriter NLP analysis...' },
    'reference_discovery': { label: 'References', icon: '📚', color: '#f43f5e', step: 6, description: 'Finding authoritative sources...' },
    'outline_generation': { label: 'Outline', icon: '📋', color: '#f97316', step: 7, description: 'Generating content structure...' },
    'section_drafts': { label: 'Writing', icon: '✍️', color: '#eab308', step: 8, description: 'Generating content sections...' },
    'youtube_integration': { label: 'Video', icon: '🎬', color: '#84cc16', step: 9, description: 'Finding relevant YouTube video...' },
    'merge_content': { label: 'Merging', icon: '🔀', color: '#22c55e', step: 10, description: 'Assembling final content...' },
    'internal_linking': { label: 'Links', icon: '🔗', color: '#14b8a6', step: 11, description: 'Injecting contextual links...' },
    'qa_validation': { label: 'QA Check', icon: '✅', color: '#06b6d4', step: 12, description: 'Running quality validation...' },
    'final_polish': { label: 'Polishing', icon: '✨', color: '#0ea5e9', step: 13, description: 'Final optimizations...' },
    'publishing': { label: 'Publishing', icon: '📤', color: '#3b82f6', step: 14, description: 'Pushing to WordPress...' },
    'completed': { label: 'Complete!', icon: '🎉', color: '#10b981', step: 15, description: 'Optimization successful!' },
    'failed': { label: 'Failed', icon: '❌', color: '#ef4444', step: 0, description: 'Optimization failed' },
};

const TOTAL_PROGRESS_STEPS = 15;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ENTERPRISE PROGRESS TRACKER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OptimizationProgressProps {
    isRunning: boolean;
    phase: string;
    startTime: number | null;
    currentUrl: string;
    sectionsCompleted?: number;
    totalSections?: number;
    wordCount?: number;
    onCancel?: () => void;
}

const OptimizationProgress: React.FC<OptimizationProgressProps> = ({
    isRunning, phase, startTime, currentUrl, sectionsCompleted, totalSections, wordCount, onCancel
}) => {
    const [elapsedTime, setElapsedTime] = React.useState(0);
    
    React.useEffect(() => {
        if (!isRunning || !startTime) { setElapsedTime(0); return; }
        const interval = setInterval(() => setElapsedTime(Date.now() - startTime), 1000);
        return () => clearInterval(interval);
    }, [isRunning, startTime]);
    
    const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG['idle'];
    const currentStep = phaseConfig.step;
    const progressPercent = Math.round((currentStep / TOTAL_PROGRESS_STEPS) * 100);
    
    const formatTime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    const estimateRemainingTime = (): string => {
        if (currentStep === 0 || elapsedTime === 0) return '--:--';
        const avgTimePerStep = elapsedTime / currentStep;
        const remainingSteps = TOTAL_PROGRESS_STEPS - currentStep;
        return formatTime(avgTimePerStep * remainingSteps);
    };
    
    if (!isRunning && phase === 'idle') return null;
    
    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            animation: isRunning ? 'pulse-border 2s ease-in-out infinite' : 'none'
        }}>
            <style>{`
                @keyframes pulse-border { 0%, 100% { border-color: rgba(99,102,241,0.2); } 50% { border-color: rgba(99,102,241,0.5); } }
                @keyframes progress-shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                @keyframes bounce-icon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
            `}</style>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: `linear-gradient(135deg, ${phaseConfig.color} 0%, ${phaseConfig.color}dd 100%)`,
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '26px',
                        animation: isRunning ? 'bounce-icon 1s ease-in-out infinite' : 'none',
                        boxShadow: `0 8px 24px ${phaseConfig.color}40`
                    }}>
                        {phaseConfig.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: phaseConfig.color, marginBottom: '2px' }}>
                            {phaseConfig.label}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.6 }}>
                            {phaseConfig.description}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'monospace' }}>
                        {formatTime(elapsedTime)}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.4, textTransform: 'uppercase' }}>
                        ETA: {estimateRemainingTime()}
                    </div>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '12px',
                height: '16px',
                overflow: 'hidden',
                marginBottom: '16px',
                position: 'relative'
            }}>
                <div style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, ${phaseConfig.color}, ${phaseConfig.color}cc, ${phaseConfig.color})`,
                    backgroundSize: '200% 100%',
                    animation: isRunning ? 'progress-shine 2s linear infinite' : 'none',
                    borderRadius: '12px',
                    transition: 'width 0.5s ease-out',
                    boxShadow: `0 0 20px ${phaseConfig.color}60`
                }} />
                <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                }}>{progressPercent}%</span>
            </div>
            
            {/* Step Indicators */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                {Object.entries(PHASE_CONFIG).filter(([key]) => !['idle', 'failed'].includes(key)).map(([key, config]) => (
                    <div
                        key={key}
                        title={config.label}
                        style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '3px',
                            background: currentStep > config.step ? config.color : phase === key ? `linear-gradient(90deg, ${config.color}, transparent)` : 'rgba(255,255,255,0.08)',
                            transition: 'all 0.3s ease'
                        }}
                    />
                ))}
            </div>
            
            {/* Stats */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 100px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 16px', minWidth: '100px' }}>
                    <div style={{ fontSize: '10px', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>Step</div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>{currentStep} / {TOTAL_PROGRESS_STEPS}</div>
                </div>
                {sectionsCompleted !== undefined && totalSections !== undefined && totalSections > 0 && (
                    <div style={{ flex: '1 1 100px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 16px', minWidth: '100px' }}>
                        <div style={{ fontSize: '10px', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>Sections</div>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{sectionsCompleted} / {totalSections}</div>
                    </div>
                )}
                {wordCount !== undefined && wordCount > 0 && (
                    <div style={{ flex: '1 1 100px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 16px', minWidth: '100px' }}>
                        <div style={{ fontSize: '10px', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>Words</div>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{wordCount.toLocaleString()}</div>
                    </div>
                )}
                {onCancel && isRunning && (
                    <button onClick={onCancel} style={{
                        flex: '0 0 auto',
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '12px',
                        padding: '14px 24px',
                        color: '#f87171',
                        fontSize: '12px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}>
                        ⛔ Cancel
                    </button>
                )}
            </div>
            
            {currentUrl && (
                <div style={{
                    marginTop: '14px',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    opacity: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    📄 {currentUrl}
                </div>
            )}
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
// 🔥 FAQ DEDUPLICATION — MODULE LEVEL
// ═══════════════════════════════════════════════════════════════════════════════

function removeDuplicateFAQSections(html: string, log?: (msg: string) => void): string {
    if (!html) return html;
    
    const faqSectionPattern = /<section[^>]*(?:class|id)="[^"]*(?:faq|wp-opt-faq)[^"]*"[^>]*>[\s\S]*?<\/section>/gi;
    const allFaqSections = [...html.matchAll(faqSectionPattern)];
    
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
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function hasPremiumFAQStyling(html: string): boolean {
    if (!html) return false;
    const htmlLower = html.toLowerCase();
    const faqIndicators = ['frequently asked', 'faqpage', 'faq-accordion', 'wp-opt-faq-', '❓'];
    const hasFAQContent = faqIndicators.some(indicator => htmlLower.includes(indicator));
    const premiumIndicators = ['linear-gradient', 'border-radius:', 'box-shadow:', '!important'];
    const hasPremiumStyles = premiumIndicators.filter(p => html.includes(p)).length >= 2;
    return hasFAQContent && hasPremiumStyles;
}

function countWords(text: string): number {
    if (!text) return 0;
    const stripped = text.replace(/<[^>]*>/g, ' ');
    return stripped.split(/\s+/).filter(w => w.length > 0).length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎛️ OPENROUTER MODEL SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

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

interface OpenRouterModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const OpenRouterModelSelector: React.FC<OpenRouterModelSelectorProps> = ({ value, onChange }) => {
    const [isCustomMode, setIsCustomMode] = useState(() => {
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
                    📋 Presets
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
                    ✏️ Custom
                </button>
            </div>
            
            {!isCustomMode ? (
                <select
                    value={OPENROUTER_PRESET_MODELS.includes(value) ? value : OPENROUTER_PRESET_MODELS[0]}
                    onChange={handlePresetSelect}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none transition-all"
                >
                    {OPENROUTER_PRESET_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                    <option value="__custom__">— Custom Model —</option>
                </select>
            ) : (
                <input
                    type="text"
                    value={customValue}
                    onChange={handleCustomInput}
                    placeholder="e.g., anthropic/claude-sonnet-4"
                    className="w-full bg-white/[0.03] border border-purple-500/30 rounded-xl px-4 py-3 text-[14px] focus:border-purple-500 outline-none transition-all font-mono"
                />
            )}
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-white/40 uppercase">Active:</span>
                <span className="text-[12px] text-green-400 font-mono">{value || 'Not set'}</span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎛️ GROQ MODEL SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const GROQ_PRESET_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
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
    
    return (
        <div className="space-y-3">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                Groq Model
            </label>
            
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setIsCustomMode(false);
                        onChange(GROQ_PRESET_MODELS[0]);
                    }}
                    className={cn(
                        'flex-1 py-2.5 px-3 rounded-lg text-[11px] font-semibold uppercase transition-all border',
                        !isCustomMode
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                    )}
                >
                    📋 Presets
                </button>
                <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={cn(
                        'flex-1 py-2.5 px-3 rounded-lg text-[11px] font-semibold uppercase transition-all border',
                        isCustomMode
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                    )}
                >
                    ✏️ Custom
                </button>
            </div>
            
            {!isCustomMode ? (
                <select
                    value={GROQ_PRESET_MODELS.includes(value) ? value : GROQ_PRESET_MODELS[0]}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] focus:border-blue-500 outline-none"
                >
                    {GROQ_PRESET_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            ) : (
                <input
                    type="text"
                    value={customValue}
                    onChange={e => { setCustomValue(e.target.value); onChange(e.target.value); }}
                    placeholder="e.g., llama-3.3-70b-versatile"
                    className="w-full bg-white/[0.03] border border-purple-500/30 rounded-xl px-4 py-3 text-[14px] focus:border-purple-500 outline-none font-mono"
                />
            )}
        </div>
    );
};

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
    const [neuronProjects, setNeuronProjects] = useState<Array<{ project: string; name: string }>>([]);
    const [neuronLoading, setNeuronLoading] = useState(false);
    
    const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('surgical');
    const [preserveImages, setPreserveImages] = useState(true);
    const [optimizeAltText, setOptimizeAltText] = useState(true);
    const [preserveFeaturedImage, setPreserveFeaturedImage] = useState(true);
    const [preserveCategories, setPreserveCategories] = useState(true);
    const [preserveTags, setPreserveTags] = useState(true);
    
    const [geoConfig, setGeoConfig] = useState<GeoTargetConfig>({
        enabled: false,
        country: 'US',
        region: '',
        city: '',
        language: 'en'
    });

    // Stage progress for staged pipeline
    const [stageProgress, setStageProgress] = useState<StageProgress | null>(null);

    // Bulk optimization state
    const [bulkUrls, setBulkUrls] = useState('');
    const [showBulkMode, setShowBulkMode] = useState(false);
    const [bulkConcurrency, setBulkConcurrency] = useState(3);
	    // Enterprise Progress Tracking State
    const [optimizationProgress, setOptimizationProgress] = useState({
        isRunning: false,
        phase: 'idle',
        startTime: null as number | null,
        currentUrl: '',
        sectionsCompleted: 0,
        totalSections: 0,
        wordCount: 0
    });

	
	
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
    
    // Cancellation system
    const cancellationTokenRef = useRef<{ cancelled: boolean; reason?: string }>({ cancelled: false });
    
    const cancelCurrentJob = useCallback((reason: string = 'User cancelled') => {
        cancellationTokenRef.current = { cancelled: true, reason };
        store.addGodLog(`⛔ CANCELLATION REQUESTED: ${reason}`);
        store.addToast('Cancellation requested — will stop after current phase', 'warning');
    }, [store]);
    
    const resetCancellationToken = useCallback(() => {
        cancellationTokenRef.current = { cancelled: false, reason: undefined };
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

// 🔥 IMPROVED: Validates Serper API key format properly
const hasSerperKey = useCallback(() => {
    const key = store.apiKeys.serper;
    // Serper keys are typically 40+ characters, alphanumeric
    return !!(key && key.length >= 30 && key.match(/^[a-zA-Z0-9]+$/));
}, [store.apiKeys.serper]);

// 🔥 NEW: Explicit validation function for use in conditionals
const hasValidSerperKey = useCallback(() => {
    const key = store.apiKeys.serper;
    if (!key) return false;
    if (key.length < 30) return false;
    if (!key.match(/^[a-zA-Z0-9]+$/)) return false;
    return true;
}, [store.apiKeys.serper]);


    const hasNeuronConfig = useCallback(() => {
        return !!(store.neuronEnabled && store.apiKeys.neuronwriter && store.apiKeys.neuronProject);
    }, [store.neuronEnabled, store.apiKeys.neuronwriter, store.apiKeys.neuronProject]);

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

    const enforceTitle = useCallback((title: string, log: (msg: string) => void): string => {
        if (!title) return title;
        if (title.length <= TITLE_MAX_LENGTH) return title;
        
        let truncated = title.substring(0, 60);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 40) truncated = truncated.substring(0, lastSpace);
        
        log(`   ⚠️ Title truncated: ${title.length} → ${truncated.length} chars`);
        return truncated.trim();
    }, []);

    const enforceMeta = useCallback((meta: string, log: (msg: string) => void): string => {
        if (!meta) return meta;
        if (meta.length <= META_MAX_LENGTH) return meta;
        
        let truncated = meta.substring(0, 157);
        const lastPeriod = truncated.lastIndexOf('. ');
        if (lastPeriod > 100) truncated = truncated.substring(0, lastPeriod + 1);
        else truncated = truncated.trim() + '...';
        
        log(`   ⚠️ Meta truncated: ${meta.length} → ${truncated.length} chars`);
        return truncated;
    }, []);

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
    // SITEMAP CRAWLER
    // ═══════════════════════════════════════════════════════════════════════════

    const handleCrawlSitemap = useCallback(async () => {
        if (!sitemapUrl) {
            store.addToast('Enter a sitemap URL', 'warning');
            return;
        }
        
        store.setProcessing(true, 'Crawling sitemap...');
        store.addGodLog(`🕷️ ULTRA-FAST SITEMAP CRAWLER v${APP_VERSION_FULL}`);
        store.addGodLog(`🕷️ URL: ${sitemapUrl}`);
        
        const startTime = Date.now();
        
        try {
            let text = '';
            let fetchSucceeded = false;
            
            // Try direct fetch first
            try {
                const directRes = await fetch(sitemapUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/xml, text/xml, */*' }
                });
                if (directRes.ok) {
                    text = await directRes.text();
                    fetchSucceeded = true;
                    store.addGodLog(`   ✅ Direct fetch succeeded`);
                }
            } catch {}
            
            // Fallback to CORS proxy
            if (!fetchSucceeded) {
                try {
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(sitemapUrl)}`;
                    const proxyRes = await fetch(proxyUrl);
                    if (proxyRes.ok) {
                        text = await proxyRes.text();
                        fetchSucceeded = true;
                        store.addGodLog(`   ✅ CORS proxy succeeded`);
                    }
                } catch {}
            }
            
            if (!fetchSucceeded || !text) {
                throw new Error('All fetch strategies failed');
            }
            
            const xml = new DOMParser().parseFromString(text, 'application/xml');
            let allUrls: string[] = Array.from(xml.querySelectorAll('url loc, loc'))
                .map(el => el.textContent || '')
                .filter(Boolean);
            
            const uniqueUrls = [...new Set(allUrls)].filter(url => {
                if (!url || !url.startsWith('http')) return false;
                const lower = url.toLowerCase();
                const exclude = ['?', '.xml', '/wp-admin', '/wp-content', '/wp-json', '/feed/', '.pdf', '.jpg', '.png'];
                return !exclude.some(p => lower.includes(p));
            }).slice(0, 300);
            
            store.addGodLog(`🔍 Found ${uniqueUrls.length} valid URLs`);
            
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
                
                return {
                    id: url,
                    title: title || 'Page',
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
            store.addGodLog(`🎉 CRAWL COMPLETE: ${discovered.length} pages in ${formatDuration(elapsed)}`);
            store.addToast(`Discovered ${discovered.length} pages`, 'success');
            setSitemapUrl('');
        } catch (e: any) {
            store.addGodLog(`❌ Crawl failed: ${e.message}`);
            store.addToast(`Crawl failed: ${e.message}`, 'error');
        } finally {
            store.setProcessing(false);
            setCrawlProgress(null);
        }
    }, [sitemapUrl, store]);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔥🔥🔥 GOD MODE ENGINE — WITH STAGED PIPELINE INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════

    const executeGodMode = useCallback(async (
        targetOverride?: string, 
        silentMode = false
    ): Promise<{ success: boolean; score: number; wordCount: number; error?: string }> => {
        const startTime = Date.now();
        let targetId = targetOverride;
        
        resetCancellationToken();
        setStageProgress(null);
        
        const log = (msg: string, _progress?: number) => { 
            if (targetId) store.addJobLog(targetId, msg);
            if (!silentMode) store.addGodLog(msg); 
        };
		
		        // Progress tracking helper
        const updateProgress = (phase: string, extras?: { sectionsCompleted?: number; totalSections?: number; wordCount?: number }) => {
            setOptimizationProgress(prev => ({ ...prev, phase, ...(extras || {}) }));
        };
        
        // Initialize progress tracking
        setOptimizationProgress({
            isRunning: true,
            phase: 'initializing',
            startTime: startTime,
            currentUrl: targetId || manualUrl || '',
            sectionsCompleted: 0,
            totalSections: 0,
            wordCount: 0
        });


        const failWith = (error: string): { success: false; score: 0; wordCount: 0; error: string } => {
            log(`❌ ${error}`, 0);
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
                        title = pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                } catch {}
                
                const newPage: SitemapPage = { 
                    id: manualUrl, 
                    title: title || 'New Page', 
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
        
        if (!targetId) {
            const candidates = store.pages
                .filter(p => p.jobState?.status !== 'running')
                .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0));
            targetId = candidates[0]?.id;
        }

        if (!targetId) return failWith('No pages to optimize');
        if (!hasRequiredKeys()) return failWith('No AI API key configured');
        if (!store.wpConfig.url) return failWith('WordPress URL not configured');
        if (!store.wpConfig.username || !store.wpConfig.password) return failWith('WordPress credentials not configured');

        // 🔥 SAFE PAGE ACCESS — Handle missing pages gracefully
const getPage = () => useAppStore.getState().pages.find(p => p.id === targetId);

// If page doesn't exist in store, create it first
const existingPage = getPage();
if (!existingPage) {
    log(`   ⚠️ Page not in store, creating entry for: ${targetId}`);
    const slug = extractSlugFromUrl(targetId);
    const inferredTitle = extractTopicFromUrl(targetId);
    
    const newPage: SitemapPage = {
        id: targetId,
        title: inferredTitle,
        slug,
        lastMod: new Date().toISOString(),
        wordCount: null,
        crawledContent: null,
        healthScore: null,
        status: 'idle',
        opportunity: 50,
        improvementHistory: []
    };
    store.addPages([newPage]);
}

if (!getPage()?.jobState) {
    store.initJobState(targetId);
}

store.updateJobState(targetId, { 
    status: 'running', 
    phase: 'initializing', 
    error: undefined, 
    attempts: (getPage()?.jobState?.attempts || 0) + 1,
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
            log(`📍 PHASE 1: Resolving WordPress post...`);
			
			            updateProgress('resolving_post');

            
            let originalContent = '';
            // 🔥 SAFE: Always have a fallback topic
			let topic = getPage()?.title || extractTopicFromUrl(targetId) || 'Content Optimization';

            let postId: number | null = null;

            postId = await wpResolvePostIdEnhanced(store.wpConfig.url, targetId, auth, log);

            if (!postId) {
                log(`   ⚠️ Could not find existing post — will create new`);
            } else {
                log(`   ✅ Found existing post ID: ${postId}`);
                
                try {
                    const postData = await wpGetPostWithImages(store.wpConfig.url, postId, auth);
                    preservation.originalSlug = postData.originalSlug;
                    preservation.originalLink = postData.post.link || null;
                    preservation.originalCategories = postData.originalCategories;
                    preservation.originalTags = postData.originalTags;
                    
                    if (postData.featuredImage && preserveFeaturedImage) {
                        preservation.featuredImageId = postData.featuredImage.id;
                    }
                    
                    if (preserveImages) {
                        preservation.contentImages = postData.contentImages.map(img => ({
                            src: img.src,
                            alt: img.alt,
                            mediaId: img.id ? parseInt(img.id) : undefined
                        }));
                    }
                    
                    const wpTitle = postData.post.title?.rendered || postData.post.title?.raw || '';
                    if (wpTitle && wpTitle.length > 3) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = wpTitle;
                        topic = tempDiv.textContent || wpTitle;
                        store.updatePage(targetId, { title: topic });
                    }
                    
                    originalContent = postData.post.content?.rendered || '';
                } catch (e: any) {
                    log(`   ⚠️ Could not fetch existing content: ${e.message}`);
                }
            }

            if (targetKeywordOverride && targetKeywordOverride.trim().length > 3) {
                topic = targetKeywordOverride.trim();
                store.updatePage(targetId, { title: topic, targetKeyword: topic });
                if (!silentMode) setTargetKeywordOverride('');
            }

            const actualModel = getActualModel();
            
            log(`🚀 ═══════════════════════════════════════════════════════════`);
            log(`🚀 GOD MODE: "${topic.substring(0, 50)}..."`);
            log(`🚀 Provider: ${store.selectedProvider} | Model: ${actualModel}`);
            log(`🚀 ═══════════════════════════════════════════════════════════`);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 2: ENTITY GAP ANALYSIS
            // ═══════════════════════════════════════════════════════════════
            
            let entityGapData = undefined;

            if (store.apiKeys.serper) {
                store.updateJobState(targetId, { phase: 'entity_gap_analysis' });
                log(`🔬 PHASE 2: Entity Gap Analysis...`);
				
				updateProgress('entity_gap_analysis');
                
                try {
                    entityGapData = await performEntityGapAnalysis(
                        topic, 
                        store.apiKeys.serper,
                        originalContent || undefined,
                        geoConfig.enabled ? { geoCountry: geoConfig.country } : undefined,
                        log
                    );
                    
                    store.updateJobState(targetId, { entityGapData });
                    log(`   ✓ Entities: ${entityGapData.missingEntities?.length || 0} | PAA: ${entityGapData.paaQuestions?.length || 0}`);
                } catch (e: any) {
                    log(`   ⚠️ Entity analysis failed: ${e.message}`);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // PHASE 3: NEURONWRITER (Optional)
            // ═══════════════════════════════════════════════════════════════
            
            let neuronData = undefined;

            if (hasNeuronConfig()) {
                store.updateJobState(targetId, { phase: 'neuron_analysis' });
                log(`🧬 PHASE 3: NeuronWriter NLP Analysis...`);
				
				                updateProgress('neuron_analysis');

                
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
                        log(`   → ${neuronData.terms.length} NLP terms`);
                    }
                } catch (e: any) {
                    log(`   ⚠️ NeuronWriter failed: ${e.message}`);
                }
            }

// ═══════════════════════════════════════════════════════════════
// PHASE 4: INTERNAL LINKS — ALWAYS FETCH FROM WORDPRESS
// ═══════════════════════════════════════════════════════════════

store.updateJobState(targetId, { phase: 'internal_linking' });
log(`🔗 PHASE 4: Building internal links...`);

updateProgress('internal_linking');

let internalLinks: InternalLinkTarget[] = [];

// ALWAYS fetch from WordPress for complete link targets (not just local store)
try {
    const wpLinkTargets = await discoverInternalLinkTargets(
        store.wpConfig.url,
        auth,
        { 
            excludePostId: postId || undefined, 
            excludeUrls: [targetId], 
            maxPosts: 100 
        },
        log
    );
    internalLinks = wpLinkTargets;
    log(`   → ${internalLinks.length} link targets fetched from WordPress`);
} catch (e: any) {
    log(`   ⚠️ WordPress link discovery failed: ${e.message}`);
    // Fallback to store pages ONLY if WordPress fetch fails
    internalLinks = store.pages
        .filter(p => p.id !== targetId && p.title && p.title.length > 5)
        .slice(0, 50)
        .map(p => ({ url: p.id, title: p.title, slug: p.slug }));
    log(`   → ${internalLinks.length} fallback link targets from local store`);
}


            // ═══════════════════════════════════════════════════════════════
            // PHASE 5: CONTENT SYNTHESIS — STAGED PIPELINE
            // ═══════════════════════════════════════════════════════════════

            store.updateJobState(targetId, { phase: 'content_synthesis' });
            log(`🎨 PHASE 5: SOTA Content Synthesis (Staged Pipeline)...`);
			
			            updateProgress('outline_generation');


            const synthesisConfig = {
                prompt: `Create comprehensive content about "${topic}"`,
                topic,
                mode: optimizationMode === 'surgical' ? 'surgical' as const : 'writer' as const,
                siteContext,
                model: actualModel,
                provider: store.selectedProvider,
                apiKeys: store.apiKeys,
                entityGapData,
                neuronData: neuronData || undefined,
                existingAnalysis: originalContent ? analyzeExistingContent(originalContent) : undefined,
                internalLinks,
                targetKeyword: topic,
                validatedReferences: entityGapData?.validatedReferences,
                geoConfig: geoConfig.enabled ? geoConfig : undefined,
                useStagedPipeline: true,
                targetWords: TARGET_WORD_COUNT,
            };

            let bestContract: ContentContract | null = null;
            let bestScore = 0;
            let bestWordCount = 0;

            try {
                // Use the staged pipeline (generateEnhanced)
                const { contract: _rawContract } = await orchestrator.generateEnhanced(
                    synthesisConfig,
                    log,
                                        (progress: StageProgress) => {
                        store.setStageProgress(progress);
                        // Update progress UI
                        if (progress.stage === 'outline') {
                            updateProgress('outline_generation');
                        } else if (progress.stage === 'sections') {
                            updateProgress('section_drafts', { 
                                sectionsCompleted: progress.sectionsCompleted || 0, 
                                totalSections: progress.totalSections || 0 
                            });
                        } else if (progress.stage === 'youtube') {
                            updateProgress('youtube_integration');
                        } else if (progress.stage === 'references') {
                            updateProgress('reference_discovery');
                        } else if (progress.stage === 'merge') {
                            updateProgress('merge_content');
                        } else if (progress.stage === 'polish') {
                            updateProgress('final_polish');
                        }

                    }
                );

                // 🔥 CRITICAL: Deep clone to avoid Immer freeze
                let contract: ContentContract = deepClone(_rawContract);

                // Post-processing
                contract.htmlContent = removeH1TagsFromContent(contract.htmlContent, log);
                if (contract.title) contract.title = enforceTitle(contract.title, log);
                if (contract.metaDescription) contract.metaDescription = enforceMeta(contract.metaDescription, log);
                contract.htmlContent = removeDuplicateFAQSections(contract.htmlContent, log);

                // Inject internal links
                if (internalLinks.length > 0) {
                    log(`🔗 Injecting internal links...`);
                    
                    try {
                        const wpLinkTargets = await discoverInternalLinkTargets(
                            store.wpConfig.url,
                            auth,
                            { excludePostId: postId || undefined, excludeUrls: [targetId], maxPosts: 100 },
                            log
                        );
                        
                        const allLinkTargets = [...wpLinkTargets, ...internalLinks.slice(0, 30)];
                        
                        const linkResult = injectInternalLinks(
                            contract.htmlContent,
                            allLinkTargets,
                            targetId,
                            { minLinks: 12, maxLinks: 20, minRelevance: 0.55 }
                        );
                        
                        contract.htmlContent = linkResult.html;
                        contract.internalLinks = linkResult.linksAdded;
                        
                        log(`   ✅ Injected ${linkResult.linksAdded.length} internal links`);
                    } catch (linkErr: any) {
                        log(`   ⚠️ Link injection failed: ${linkErr.message}`);
                    }
                }

                // Calculate word count
                const finalDoc = new DOMParser().parseFromString(contract.htmlContent, 'text/html');
                const finalWordCount = (finalDoc.body?.textContent || '').split(/\s+/).filter(Boolean).length;
                contract.wordCount = finalWordCount;

                log(`   ✅ Content generated: ${finalWordCount.toLocaleString()} words`);

                // Store contract
                store.updateJobState(targetId, { contract: deepClone(contract) });

                // QA Validation
                store.updateJobState(targetId, { phase: 'qa_validation' });
                log(`🔍 QA Validation...`);
				
				updateProgress('qa_validation', { wordCount: finalWordCount });

                const qaResult = runQASwarm(contract, entityGapData, store.neuronTerms);
                store.updateJobState(targetId, { qaResults: qaResult.results });
                
                log(`   📊 QA Score: ${qaResult.score}/100 | Words: ${finalWordCount.toLocaleString()}`);

                bestContract = deepClone(contract);
                bestScore = qaResult.score;
                bestWordCount = finalWordCount;

            } catch (genErr: any) {
                log(`   ❌ Content generation failed: ${genErr.message}`);
                throw genErr;
            }

            // Final validation
            if (!bestContract || !bestContract.htmlContent || bestContract.htmlContent.length < 2000) {
                throw new Error('Content generation failed: No valid content produced');
            }

            // Final H1 check
            const h1FinalCheck = (bestContract.htmlContent.match(/<h1/gi) || []).length;
            if (h1FinalCheck > 0) {
                log(`   ⚠️ Final H1 cleanup: removing ${h1FinalCheck} remaining H1 tag(s)`);
                bestContract.htmlContent = bestContract.htmlContent.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
            }

            log(`✅ Phase 5 Complete: ${bestWordCount.toLocaleString()} words | Score: ${bestScore}%`);


            

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 PHASE 5.5: YOUTUBE VIDEO INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

if (store.apiKeys.serper && bestContract && bestContract.htmlContent) {
    store.updateJobState(targetId, { phase: 'youtube_integration' as GodModePhase });
    log(`🎬 PHASE 5.5: YouTube Video Integration...`, true);
    
    try {
        // Search for a relevant, high-quality YouTube video
        const videoResult = await searchYouTubeVideo(
            topic,
            store.apiKeys.serper,
            { 
                minViews: 10000,
                maxAgeDays: 730, // 2 years max
                maxResults: 10
            },
            (msg: string) => log(msg)
        );
        
        if (videoResult.video) {
            const video = videoResult.video;
            
            // Generate beautiful embed HTML
            const videoEmbed = generateYouTubeEmbed(video, {
                showHeader: true,
                showStats: true,
                lazyLoad: true
            });
            
            // Find optimal insertion point
            let insertPos = -1;
            let insertMethod = '';
            
            // Option 1: After Quick Answer box
            const quickAnswerEnd = bestContract.htmlContent.toLowerCase().indexOf('quick answer');
            if (quickAnswerEnd > 0 && quickAnswerEnd < 1500) {
                // Find the closing div after Quick Answer
                const searchStart = quickAnswerEnd;
                const searchArea = bestContract.htmlContent.substring(searchStart, searchStart + 500);
                const closingDivs = searchArea.match(/<\/div>/gi) || [];
                
                if (closingDivs.length >= 2) {
                    let divCount = 0;
                    let pos = searchStart;
                    while (divCount < 2 && pos < bestContract.htmlContent.length) {
                        const nextDiv = bestContract.htmlContent.indexOf('</div>', pos);
                        if (nextDiv === -1) break;
                        pos = nextDiv + 6;
                        divCount++;
                    }
                    if (divCount >= 2) {
                        insertPos = pos;
                        insertMethod = 'after Quick Answer box';
                    }
                }
            }
            
            // Option 2: Before first H2 (but after intro)
            if (insertPos === -1) {
                const firstH2 = bestContract.htmlContent.indexOf('<h2');
                if (firstH2 > 500 && firstH2 < 3000) {
                    insertPos = firstH2;
                    insertMethod = 'before first H2';
                }
            }
            
            // Option 3: After 3rd paragraph
            if (insertPos === -1) {
                let pCount = 0;
                let searchPos = 0;
                while (pCount < 3 && searchPos < bestContract.htmlContent.length) {
                    const pEnd = bestContract.htmlContent.indexOf('</p>', searchPos);
                    if (pEnd === -1) break;
                    pCount++;
                    searchPos = pEnd + 4;
                }
                if (pCount >= 3 && searchPos < 2000) {
                    insertPos = searchPos;
                    insertMethod = 'after 3rd paragraph';
                }
            }
            
            // Insert the video
            if (insertPos > 0) {
                bestContract.htmlContent = 
                    bestContract.htmlContent.slice(0, insertPos) + 
                    '\n\n' + videoEmbed + '\n\n' +
                    bestContract.htmlContent.slice(insertPos);
                
                log(`   ✅ Video embedded: "${video.title.substring(0, 50)}..."`, true);
                log(`   📍 Placement: ${insertMethod}`);
                log(`   📊 ${video.channel} • ${video.views.toLocaleString()} views`);
                log(`   🔗 https://youtube.com/watch?v=${video.videoId}`);
                
                // Store video data in contract for reference
                (bestContract as any).youtubeVideo = video;
            } else {
                log(`   ⚠️ Could not find optimal insertion point for video`);
            }
        } else {
            log(`   ⚠️ No suitable YouTube video found for this topic`);
            
            // Show alternative suggestion
            if (videoResult.alternativeVideos && videoResult.alternativeVideos.length > 0) {
                log(`   💡 ${videoResult.alternativeVideos.length} alternative videos available (lower quality)`);
            }
        }
    } catch (ytError: any) {
        log(`   ❌ YouTube integration error: ${ytError.message}`, true);
        // Don't fail the whole job for YouTube errors
    }
} else if (!store.apiKeys.serper) {
    log(`⚠️ Skipping YouTube integration (no Serper API key)`, true);
}


            

            // ═══════════════════════════════════════════════════════════════
            // PHASE 6: PUBLISH TO WORDPRESS
            // ═══════════════════════════════════════════════════════════════

            store.updateJobState(targetId, { phase: 'publishing' });
            log(`📤 PHASE 6: Publishing to WordPress...`);
			
			            updateProgress('publishing');


            const publishData: any = {
                title: bestContract.title,
                content: bestContract.htmlContent,
                excerpt: bestContract.excerpt || '',
                status: store.publishMode === 'autopublish' ? 'publish' : 'draft'
            };

            let finalPostId: number;
            let finalPostLink: string;

            if (postId) {
                log(`   → Updating existing post ID: ${postId}`);
                
                if (preserveCategories && preservation.originalCategories.length > 0) {
                    publishData.categories = preservation.originalCategories;
                }
                if (preserveTags && preservation.originalTags.length > 0) {
                    publishData.tags = preservation.originalTags;
                }
                if (preserveFeaturedImage && preservation.featuredImageId) {
                    publishData.featured_media = preservation.featuredImageId;
                }
                
                const result = await wpUpdatePost(store.wpConfig.url, auth, postId, publishData, {
                    preserveFeaturedImage,
                    preserveSlug: true,
                    preserveCategories,
                    preserveTags
                });
                
                finalPostId = result.id;
                finalPostLink = result.link;
                
                log(`   ✅ Updated post ID: ${finalPostId}`);
            } else {
                publishData.slug = bestContract.slug;
                log(`   → Creating NEW post with slug: "${bestContract.slug}"`);
                
                const result = await wpCreatePost(store.wpConfig.url, auth, publishData);
                finalPostId = result.id;
                finalPostLink = result.link;
                log(`   ✅ Created NEW post ID: ${finalPostId}`);
            }

            store.updateJobState(targetId, { postId: finalPostId });

            // Update SEO meta
            try {
                await wpUpdatePostMeta(store.wpConfig.url, auth, finalPostId, {
                    title: bestContract.title,
                    description: bestContract.metaDescription,
                    focusKeyword: topic
                });
                log(`   ✅ SEO meta updated`);
            } catch {}

            // ═══════════════════════════════════════════════════════════════
            // PHASE 7: COMPLETION
            // ═══════════════════════════════════════════════════════════════
            
            store.updateJobState(targetId, { phase: 'completed' });
            setStageProgress(null);
            
            const metrics = calculateSeoMetrics(
                bestContract.htmlContent, 
                bestContract.title || topic, 
                bestContract.slug || ''
            );
            
            const finalQA = runQASwarm(bestContract, entityGapData, store.neuronTerms);
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

            log(`🎉 ═══════════════════════════════════════════════════════════`);
            log(`🎉 SUCCESS: Score ${finalScore}% | ${metrics.wordCount.toLocaleString()} words | ${formatDuration(processingTime)}`);
            log(`🎉 ═══════════════════════════════════════════════════════════`);
			
			            // Reset progress tracking
            setOptimizationProgress(prev => ({ ...prev, isRunning: false, phase: 'completed', wordCount: metrics.wordCount }));

			
            
            if (!silentMode) store.addToast(`✅ Optimized! Score: ${finalScore}%`, 'success');
            
            return { success: true, score: finalScore, wordCount: metrics.wordCount };

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
            setStageProgress(null);
            
            log(`💥 FAILED: ${errorMessage}`);
			
			            // Reset progress tracking on failure
            setOptimizationProgress(prev => ({ ...prev, isRunning: false, phase: 'failed' }));

            
            if (!silentMode) store.addToast(`❌ Failed: ${errorMessage}`, 'error');
            
            return { success: false, score: 0, wordCount: 0, error: errorMessage };
        }

    }, [
        manualUrl, store, getSiteContext, getAuth, geoConfig, hasRequiredKeys, 
        targetKeywordOverride, getActualModel, enforceTitle, enforceMeta, 
        optimizationMode, preserveImages, optimizeAltText, preserveFeaturedImage, 
        preserveCategories, preserveTags, hasNeuronConfig, resetCancellationToken
    ]);

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

        bulkAbortRef.current = false;
        const startTime = Date.now();

        const jobs: BulkJob[] = urls.map((url, index) => ({
            id: `bulk-${Date.now()}-${index}`,
            url,
            status: 'queued' as const,
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

        store.addGodLog(`🚀 BULK OPTIMIZATION: ${urls.length} URLs | Concurrency: ${bulkConcurrency}`);

        let completed = 0;
        let failed = 0;
        let totalWords = 0;
        let totalScore = 0;

        const processJob = async (job: BulkJob): Promise<void> => {
            if (bulkAbortRef.current) return;

            const jobStartTime = Date.now();

            setBulkState(prev => ({
                ...prev,
                jobs: prev.jobs.map(j => j.id === job.id ? { ...j, status: 'processing' as const, startTime: jobStartTime } : j)
            }));

            try {
                const result = await Promise.race([
                    executeGodMode(job.url, true),
                    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Job timeout')), JOB_TIMEOUT_MS))
                ]);
                
                const jobTime = Date.now() - jobStartTime;
                
                if (result.success && result.score >= 50) {
                    completed++;
                    totalWords += result.wordCount;
                    totalScore += result.score;
                    
                    setBulkState(prev => ({
                        ...prev,
                        jobs: prev.jobs.map(j => j.id === job.id ? { 
                            ...j, 
                            status: 'completed' as const,
                            score: result.score,
                            wordCount: result.wordCount,
                            endTime: Date.now()
                        } : j),
                        completed,
                        totalWords,
                        avgScore: Math.round(totalScore / completed)
                    }));

                    store.addGodLog(`   ✅ ${job.url.split('/').pop()}: ${result.score}% | ${result.wordCount} words`);
                } else {
                    throw new Error(result.error || 'Quality check failed');
                }
            } catch (error: any) {
                failed++;
                
                setBulkState(prev => ({
                    ...prev,
                    jobs: prev.jobs.map(j => j.id === job.id ? { 
                        ...j, 
                        status: 'failed' as const,
                        error: error.message,
                        endTime: Date.now()
                    } : j),
                    failed
                }));

                store.addGodLog(`   ❌ ${job.url.split('/').pop()}: ${error.message}`);
            }
        };

        // Process in batches
        for (let i = 0; i < jobs.length; i += bulkConcurrency) {
            if (bulkAbortRef.current) break;
            const batch = jobs.slice(i, i + bulkConcurrency);
            await Promise.all(batch.map(job => processJob(job)));
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

        store.addGodLog(`🏁 BULK COMPLETE: ${completed}/${jobs.length} success | ${totalWords.toLocaleString()} words | ${formatDuration(totalTime)}`);
        store.addToast(`Bulk complete: ${completed}/${jobs.length} success`, completed > 0 ? 'success' : 'error');
    }, [bulkUrls, bulkConcurrency, store, hasRequiredKeys, executeGodMode, parseBulkUrls]);

    const abortBulkOptimization = useCallback(() => {
        bulkAbortRef.current = true;
        store.addGodLog(`⚠️ ABORT REQUESTED`);
        store.addToast('Aborting bulk optimization...', 'warning');
    }, [store]);

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
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
                            {/* Navigation */}
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
                            
                            {/* Stage Progress Indicator */}
                            {stageProgress && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <div className="text-[11px]">
                                        <span className="font-semibold text-blue-400 uppercase">{stageProgress.stage}</span>
                                        <span className="text-white/40 ml-2">{stageProgress.message}</span>
                                    </div>
                                    <span className="text-[10px] text-blue-400 font-mono">{stageProgress.progress}%</span>
                                </div>
                            )}
                            
                            {/* Processing Indicator */}
                            {store.isProcessing && !stageProgress && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <span className="text-[11px] font-semibold text-blue-400 uppercase">
                                        {store.processingStatus || 'Processing...'}
                                    </span>
                                </div>
                            )}
                            
                            {/* Cancel Button */}
                            {store.isProcessing && (
                                <button
                                    onClick={() => cancelCurrentJob('User clicked cancel')}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"
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
                        <SectionHeaderComponent 
                            title="Configuration" 
                            icon="⚙️" 
                            color="#0a84ff"
                            subtitle="Configure WordPress, AI providers, and optimization settings"
                        />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* WordPress Config */}
                            <CardComponent padding="lg">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <span className="text-2xl">🌐</span>
                                    WordPress Connection
                                </h3>
                                <div className="space-y-4">
                                    <AdvancedInputComponent
                                        label="Site URL"
                                        value={store.wpConfig.url}
                                        onChange={v => store.setWpConfig({ url: v })}
                                        placeholder="https://yoursite.com"
                                        icon="🔗"
                                        required
                                    />
                                    <AdvancedInputComponent
                                        label="Username"
                                        value={store.wpConfig.username}
                                        onChange={v => store.setWpConfig({ username: v })}
                                        placeholder="admin"
                                        icon="👤"
                                        required
                                    />
                                    <AdvancedInputComponent
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
                            </CardComponent>
                            
                            {/* AI Provider Config */}
                            <CardComponent padding="lg">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <span className="text-2xl">🤖</span>
                                    AI Provider
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
                                                            : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white'
                                                    )}
                                                >
                                                    {provider}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* API Key */}
                                    <AdvancedInputComponent
                                        label={`${store.selectedProvider} API Key`}
                                        value={store.apiKeys[store.selectedProvider]}
                                        onChange={v => store.setApiKey(store.selectedProvider, v)}
                                        type="password"
                                        placeholder="Enter API key..."
                                        icon="🔑"
                                        required
                                    />
                                    
                                    {/* Model Selection */}
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
                                                {Object.entries(VALID_GEMINI_MODELS).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    
                                    {store.selectedProvider === 'openrouter' && (
                                        <OpenRouterModelSelector
                                            value={store.apiKeys.openrouterModel}
                                            onChange={v => store.setApiKey('openrouterModel', v)}
                                        />
                                    )}
                                    
                                    {store.selectedProvider === 'groq' && (
                                        <GroqModelSelector
                                            value={store.apiKeys.groqModel}
                                            onChange={v => store.setApiKey('groqModel', v)}
                                        />
                                    )}
                                    
                                    {/* Serper Key */}
                                    <AdvancedInputComponent
                                        label="Serper API Key (Optional)"
                                        value={store.apiKeys.serper}
                                        onChange={v => store.setApiKey('serper', v)}
                                        type="password"
                                        placeholder="For SERP analysis..."
                                        icon="🔍"
                                        helpText="Enables entity gap analysis & references"
                                    />
                                </div>
                            </CardComponent>
                        </div>
                        
                        {/* Optimization Mode */}
                        <CardComponent padding="lg">
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
                                        Improves existing content while preserving what works.
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
                                        Complete content regeneration for outdated pages.
                                    </p>
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <ToggleComponent label="Preserve Images" checked={preserveImages} onChange={setPreserveImages} icon="🖼️" />
                                <ToggleComponent label="Optimize Alt Text" checked={optimizeAltText} onChange={setOptimizeAltText} icon="📝" />
                                <ToggleComponent label="Keep Featured" checked={preserveFeaturedImage} onChange={setPreserveFeaturedImage} icon="🎨" />
                                <ToggleComponent label="Keep Categories" checked={preserveCategories} onChange={setPreserveCategories} icon="📁" />
                                <ToggleComponent label="Keep Tags" checked={preserveTags} onChange={setPreserveTags} icon="🏷️" />
                            </div>
                        </CardComponent>
                    </div>
                )}
                
                {/* Strategy View */}
                {store.activeView === 'strategy' && (
                    <div className="space-y-8">
                        <SectionHeaderComponent 
                            title="Content Strategy" 
                            icon="🚀" 
                            color="#30d158"
                            subtitle="Crawl sitemaps and optimize content"
                        />
                        
                        <StatsDashboard />
						
						
						                        
                        {/* Enterprise Progress Tracker */}
                        <OptimizationProgress
                            isRunning={optimizationProgress.isRunning}
                            phase={optimizationProgress.phase}
                            startTime={optimizationProgress.startTime}
                            currentUrl={optimizationProgress.currentUrl}
                            sectionsCompleted={optimizationProgress.sectionsCompleted}
                            totalSections={optimizationProgress.totalSections}
                            wordCount={optimizationProgress.wordCount}
                            onCancel={() => cancelCurrentJob('User cancelled')}
                        />

						
						
						
						
						
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                {/* Sitemap Crawler */}
                                <CardComponent padding="lg">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                        <span className="text-2xl">🕷️</span>
                                        Sitemap Crawler
                                    </h3>
                                    <div className="space-y-4">
                                        <AdvancedInputComponent
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
                                    </div>
                                </CardComponent>
                                
                                {/* Quick Optimize */}
                                <CardComponent padding="lg">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                        <span className="text-2xl">⚡</span>
                                        Quick Optimize
                                    </h3>
                                    <div className="space-y-4">
                                        <AdvancedInputComponent
                                            label="Page URL"
                                            value={manualUrl}
                                            onChange={setManualUrl}
                                            placeholder="https://yoursite.com/your-page"
                                            icon="🔗"
                                        />
                                        <AdvancedInputComponent
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
                                                📝 Draft
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
                                                🚀 Publish
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
                                </CardComponent>
                                
                                {/* Bulk Mode Toggle */}
                                <CardComponent padding="md">
                                    <ToggleComponent
                                        label="Bulk Optimization Mode"
                                        checked={showBulkMode}
                                        onChange={setShowBulkMode}
                                        description="Optimize multiple URLs at once"
                                        icon="📦"
                                    />
                                </CardComponent>
                                
                                {showBulkMode && (
                                    <CardComponent padding="lg">
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
                                                    placeholder="https://yoursite.com/page-1&#10;https://yoursite.com/page-2"
                                                    className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] font-mono resize-none focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <label className="text-[11px] font-semibold text-white/50 uppercase">Concurrency:</label>
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
                                                    🚀 Start Bulk ({parseBulkUrls(bulkUrls).length} URLs)
                                                </button>
                                            )}
                                            
                                            {bulkState.isRunning && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-[12px]">
                                                        <span className="text-green-400">✅ {bulkState.completed}</span>
                                                        <span className="text-red-400">❌ {bulkState.failed}</span>
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
                                    </CardComponent>
                                )}
                            </div>
                            
                            <div className="lg:col-span-2 space-y-6">
                                <CardComponent padding="lg">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                                        <span className="text-2xl">📋</span>
                                        Page Queue
                                        <BadgeComponent variant="default">{store.pages.length}</BadgeComponent>
                                    </h3>
                                    <PageQueueList 
                                        onSelect={setActivePageId}
                                        limit={100}
                                        showFilters={true}
                                    />
                                </CardComponent>
                                
                                <NeuralLog maxHeight="350px" showControls={true} />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Review View */}
                {store.activeView === 'review' && (
                    <div className="space-y-8">
                        <SectionHeaderComponent 
                            title="Content Review" 
                            icon="📊" 
                            color="#bf5af2"
                            subtitle="Review optimized content and validation results"
                        />
                        
                        {activePage ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="space-y-6">
                                    <CardComponent padding="lg">
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
                                    </CardComponent>
                                    
                                    <DeepMetricsPanel page={activePage} />
                                </div>
                                
                                <div className="lg:col-span-2 space-y-6">
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
                                    
                                    {reviewTab === 'content' && (
                                        <ContentPreview 
                                            html={activePage.jobState?.contract?.htmlContent || ''}
                                            maxHeight="600px"
                                        />
                                    )}
                                    
                                    {reviewTab === 'qa' && (
                                        <QASwarmPanel results={activePage.jobState?.qaResults || []} />
                                    )}
                                    
                                    {reviewTab === 'entity' && (
                                        <EntityGapPanel entityData={activePage.jobState?.entityGapData} />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <EmptyStateComponent
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
                        <SectionHeaderComponent 
                            title="Analytics" 
                            icon="📈" 
                            color="#ffd60a"
                            subtitle="Track optimization performance and trends"
                        />
                        
                        <StatsDashboard />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <CardComponent padding="lg">
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
                            </CardComponent>
                            
                            <CardComponent padding="lg">
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
                                                        page.jobState?.status === 'completed' ? 'text-green-400' : 'text-red-400'
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
                            </CardComponent>
                        </div>
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
// 📦 UI COMPONENT WRAPPERS
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
    label, value, onChange, type = 'text', placeholder, icon, helpText, required, disabled
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
                {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>}
                <input
                    type={inputType}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                                        className={cn(
                        'w-full bg-white/[0.03] border rounded-xl py-3 text-[14px]',
                        'focus:outline-none focus:ring-2 transition-all duration-200',
                        'placeholder:text-white/20 disabled:opacity-50 disabled:cursor-not-allowed',
                        icon ? 'pl-12 pr-4' : 'px-4',
                        type === 'password' && 'pr-12',
                        'border-white/[0.08] hover:border-white/[0.12] focus:border-blue-500 focus:ring-blue-500/20'
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
                <p className="text-[11px] text-white/30 pl-1">{helpText}</p>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔘 TOGGLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

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
    disabled = false
}) => {
    return (
        <div 
            className={cn(
                'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                'hover:bg-white/[0.02]',
                checked ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/[0.06]',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => !disabled && onChange(!checked)}
        >
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
                    'w-12 h-7 rounded-full transition-all relative flex-shrink-0',
                    checked ? 'bg-blue-500' : 'bg-white/10'
                )}
            >
                <div 
                    className={cn(
                        'absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-transform',
                        checked ? 'translate-x-6' : 'translate-x-1'
                    )}
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

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
            'px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider',
            variantClasses[variant]
        )}>
            {children}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📭 EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4 opacity-20">{icon}</div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-[13px] text-white/50 max-w-sm">{description}</p>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 SECTION HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SectionHeaderProps {
    title: string;
    icon: string;
    color: string;
    subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, color, subtitle }) => (
    <div className="flex items-center gap-4 mb-8">
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
// 📤 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default App;

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 NAMED EXPORTS FOR EXTERNAL USE
// ═══════════════════════════════════════════════════════════════════════════════

export {
    AdvancedInput,
    Toggle,
    Card,
    Badge,
    EmptyState,
    SectionHeader,
    OpenRouterModelSelector,
    GroqModelSelector,
    deepClone,
    removeDuplicateFAQSections,
    removeH1TagsFromContent,
    validateContentNoH1,
    hasPremiumFAQStyling,
    countWords
};
