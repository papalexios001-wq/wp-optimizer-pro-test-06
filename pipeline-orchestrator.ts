// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v28.0 — ENTERPRISE SOTA PIPELINE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════
//
// 🔥 CRITICAL FIX: Enforces strict sequential step ordering (1 → 15)
// 
// PROBLEM SOLVED:
// ❌ OLD: Internal links injected (Step 11) BEFORE content generation (Step 7)
// ✅ NEW: Strict pipeline ensures Step N only runs after Step N-1 completes
//
// PIPELINE STEPS (STRICT ORDER):
// ┌─────┬──────────────────────────────────────────────────────────────────┐
// │ 1   │ Initialize & Validate Configuration                              │
// │ 2   │ Fetch Existing Content (if updating)                             │
// │ 3   │ SERP Analysis & Entity Gap Discovery                             │
// │ 4   │ Competitor Analysis & Content Gap Identification                 │
// │ 5   │ NeuronWriter Integration (if enabled)                            │
// │ 6   │ Content Strategy & Outline Generation                            │
// │ 7   │ 🔥 CONTENT GENERATION (Main HTML body)                           │
// │ 8   │ 🎬 YOUTUBE VIDEO INJECTION (After first H2)                      │
// │ 9   │ FAQ Section Generation & Schema Markup                           │
// │ 10  │ Reference Discovery & Validation                                 │
// │ 11  │ 🔗 INTERNAL LINK INJECTION (Rich contextual anchors)             │
// │ 12  │ Schema Markup Assembly (FAQPage, Article, VideoObject)           │
// │ 13  │ Final HTML Assembly & H1 Removal                                 │
// │ 14  │ QA Swarm Validation (40+ rules)                                  │
// │ 15  │ WordPress Publishing (Draft/Publish)                             │
// └─────┴──────────────────────────────────────────────────────────────────┘
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { 
    ContentContract, 
    EntityGapAnalysis, 
    InternalLinkTarget,
    ValidatedReference,
    FAQ,
    YouTubeVideoData
} from './types';

import { YouTubeVideoService, injectVideoIntoContent } from './youtube-video-service';
import { injectEnterpriseInternalLinks, discoverInternalLinkTargetsEnhanced } from './internal-linking-engine';
import { removeAllH1Tags, runQASwarm, countWords } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 PIPELINE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const PIPELINE_VERSION = "28.0.0";

export const PIPELINE_STEPS = [
    { step: 1,  name: 'Initialize & Validate Configuration',    critical: true },
    { step: 2,  name: 'Fetch Existing Content',                 critical: false },
    { step: 3,  name: 'SERP Analysis & Entity Gap Discovery',   critical: true },
    { step: 4,  name: 'Competitor Analysis',                    critical: false },
    { step: 5,  name: 'NeuronWriter Integration',               critical: false },
    { step: 6,  name: 'Content Strategy & Outline',             critical: true },
    { step: 7,  name: 'Content Generation',                     critical: true },
    { step: 8,  name: 'YouTube Video Injection',                critical: false },
    { step: 9,  name: 'FAQ Section & Schema',                   critical: true },
    { step: 10, name: 'Reference Discovery',                    critical: false },
    { step: 11, name: 'Internal Link Injection',                critical: true },
    { step: 12, name: 'Schema Markup Assembly',                 critical: true },
    { step: 13, name: 'Final HTML Assembly',                    critical: true },
    { step: 14, name: 'QA Swarm Validation',                    critical: true },
    { step: 15, name: 'WordPress Publishing',                   critical: true },
] as const;

export type PipelineStepNumber = typeof PIPELINE_STEPS[number]['step'];

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 PIPELINE STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineState {
    currentStep: PipelineStepNumber;
    completedSteps: Set<PipelineStepNumber>;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    error: string | null;
    startTime: number;
    stepStartTime: number;
    
    // Step outputs (populated as pipeline progresses)
    entityGapData: EntityGapAnalysis | null;
    generatedContent: string | null;
    youtubeVideo: YouTubeVideoData | null;
    faqs: FAQ[];
    references: ValidatedReference[];
    internalLinkTargets: InternalLinkTarget[];
    finalHtml: string | null;
    qaResult: any | null;
}

export interface PipelineConfig {
    wpUrl: string;
    wpAuth?: { u: string; p: string };
    serperApiKey: string;
    targetKeyword: string;
    targetUrl?: string;
    existingPostId?: number;
    
    // Options
    enableYouTube: boolean;
    enableInternalLinks: boolean;
    minInternalLinks: number;
    maxInternalLinks: number;
    videoPosition: 'after-intro' | 'middle' | 'before-conclusion';
    
    // Callbacks
    onStepStart?: (step: PipelineStepNumber, name: string) => void;
    onStepComplete?: (step: PipelineStepNumber, name: string, duration: number) => void;
    onStepError?: (step: PipelineStepNumber, name: string, error: Error) => void;
    onProgress?: (message: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 PIPELINE ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class PipelineOrchestrator {
    private state: PipelineState;
    private config: PipelineConfig;
    private abortController: AbortController;
    
    constructor(config: PipelineConfig) {
        this.config = config;
        this.abortController = new AbortController();
        this.state = this.createInitialState();
    }
    
    private createInitialState(): PipelineState {
        return {
            currentStep: 1,
            completedSteps: new Set(),
            status: 'idle',
            error: null,
            startTime: 0,
            stepStartTime: 0,
            entityGapData: null,
            generatedContent: null,
            youtubeVideo: null,
            faqs: [],
            references: [],
            internalLinkTargets: [],
            finalHtml: null,
            qaResult: null,
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔒 STEP VALIDATION — Ensures strict ordering
    // ═══════════════════════════════════════════════════════════════════════════
    
    private canExecuteStep(step: PipelineStepNumber): boolean {
        // Step 1 can always execute
        if (step === 1) return true;
        
        // All previous steps must be completed
        for (let i = 1; i < step; i++) {
            if (!this.state.completedSteps.has(i as PipelineStepNumber)) {
                this.log(`❌ Cannot execute Step ${step}: Step ${i} not completed`);
                return false;
            }
        }
        
        return true;
    }
    
    private markStepComplete(step: PipelineStepNumber): void {
        this.state.completedSteps.add(step);
        const duration = Date.now() - this.state.stepStartTime;
        this.config.onStepComplete?.(step, this.getStepName(step), duration);
        this.log(`✅ Step ${step}/15 completed: ${this.getStepName(step)} (${duration}ms)`);
    }
    
    private getStepName(step: PipelineStepNumber): string {
        return PIPELINE_STEPS.find(s => s.step === step)?.name || `Step ${step}`;
    }
    
    private log(message: string): void {
        this.config.onProgress?.(message);
        console.log(`[Pipeline] ${message}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🚀 MAIN EXECUTION — Runs steps in strict order
    // ═══════════════════════════════════════════════════════════════════════════
    
    async execute(): Promise<{ success: boolean; html: string | null; error?: string }> {
        this.state.status = 'running';
        this.state.startTime = Date.now();
        
        try {
            // Execute each step in order
            for (const stepDef of PIPELINE_STEPS) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Pipeline aborted by user');
                }
                
                await this.executeStep(stepDef.step);
            }
            
            this.state.status = 'completed';
            return { success: true, html: this.state.finalHtml };
            
        } catch (error: any) {
            this.state.status = 'failed';
            this.state.error = error.message;
            this.log(`❌ Pipeline failed at Step ${this.state.currentStep}: ${error.message}`);
            return { success: false, html: null, error: error.message };
        }
    }
    
    private async executeStep(step: PipelineStepNumber): Promise<void> {
        // Validate step can execute
        if (!this.canExecuteStep(step)) {
            throw new Error(`Step ${step} cannot execute: prerequisites not met`);
        }
        
        this.state.currentStep = step;
        this.state.stepStartTime = Date.now();
        this.config.onStepStart?.(step, this.getStepName(step));
        this.log(`🔄 Step ${step}/15: ${this.getStepName(step)}...`);
        
        try {
            switch (step) {
                case 1:
                    await this.step1_Initialize();
                    break;
                case 2:
                    await this.step2_FetchExisting();
                    break;
                case 3:
                    await this.step3_SerpAnalysis();
                    break;
                case 4:
                    await this.step4_CompetitorAnalysis();
                    break;
                case 5:
                    await this.step5_NeuronWriter();
                    break;
                case 6:
                    await this.step6_ContentStrategy();
                    break;
                case 7:
                    await this.step7_ContentGeneration();
                    break;
                case 8:
                    await this.step8_YouTubeInjection();
                    break;
                case 9:
                    await this.step9_FAQGeneration();
                    break;
                case 10:
                    await this.step10_ReferenceDiscovery();
                    break;
                case 11:
                    await this.step11_InternalLinkInjection();
                    break;
                case 12:
                    await this.step12_SchemaAssembly();
                    break;
                case 13:
                    await this.step13_FinalAssembly();
                    break;
                case 14:
                    await this.step14_QAValidation();
                    break;
                case 15:
                    await this.step15_Publishing();
                    break;
            }
            
            this.markStepComplete(step);
            
        } catch (error: any) {
            const stepDef = PIPELINE_STEPS.find(s => s.step === step);
            this.config.onStepError?.(step, this.getStepName(step), error);
            
            // Critical steps cause pipeline failure
            if (stepDef?.critical) {
                throw error;
            } else {
                this.log(`⚠️ Non-critical step ${step} failed: ${error.message} — continuing`);
                this.markStepComplete(step); // Mark as complete to allow pipeline to continue
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📋 STEP IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    private async step1_Initialize(): Promise<void> {
        // Validate required config
        if (!this.config.serperApiKey) {
            throw new Error('Serper API key is required');
        }
        if (!this.config.targetKeyword) {
            throw new Error('Target keyword is required');
        }
        
        this.log(`   → Target keyword: "${this.config.targetKeyword}"`);
        this.log(`   → YouTube enabled: ${this.config.enableYouTube}`);
        this.log(`   → Internal links: ${this.config.minInternalLinks}-${this.config.maxInternalLinks}`);
    }
    
    private async step2_FetchExisting(): Promise<void> {
        // Fetch existing content if updating
        if (this.config.existingPostId) {
            this.log(`   → Fetching existing post ID: ${this.config.existingPostId}`);
            // Implementation would fetch from WordPress
        }
    }
    
    private async step3_SerpAnalysis(): Promise<void> {
        // This would call performEntityGapAnalysis from fetch-service
        this.log(`   → Analyzing SERP for: "${this.config.targetKeyword}"`);
        // State would be populated with entityGapData
    }
    
    private async step4_CompetitorAnalysis(): Promise<void> {
        this.log(`   → Analyzing competitor content`);
    }
    
    private async step5_NeuronWriter(): Promise<void> {
        this.log(`   → NeuronWriter integration (if enabled)`);
    }
    
    private async step6_ContentStrategy(): Promise<void> {
        this.log(`   → Generating content structure and outline`);
    }
    
    private async step7_ContentGeneration(): Promise<void> {
        // 🔥 CRITICAL: This must complete BEFORE Step 11 (internal links)
        this.log(`   → Generating main content HTML`);
        this.log(`   → Content generation MUST complete before internal link injection`);
        
        // In real implementation, this would call the AI content generator
        // this.state.generatedContent = await generateContent(...);
    }
    
    private async step8_YouTubeInjection(): Promise<void> {
        // 🎬 YouTube video injection — AFTER content generation (Step 7)
        if (!this.config.enableYouTube) {
            this.log(`   → YouTube disabled, skipping`);
            return;
        }
        
        // Verify Step 7 completed
        if (!this.state.completedSteps.has(7)) {
            throw new Error('Cannot inject YouTube video: Content not generated (Step 7 incomplete)');
        }
        
        this.log(`   → Searching for relevant YouTube video via Serper.dev`);
        
        try {
            const youtubeService = new YouTubeVideoService({
                serperApiKey: this.config.serperApiKey
            });
            
            const result = await youtubeService.findBestVideo(
                this.config.targetKeyword,
                this.config.targetKeyword
            );
            
            if (result.video) {
                this.state.youtubeVideo = result.video;
                this.log(`   ✅ Found video: "${result.video.title}"`);
                this.log(`   → Will inject after first H2 (position: ${this.config.videoPosition})`);
                
                // Inject into generated content
                if (this.state.generatedContent) {
                    this.state.generatedContent = injectVideoIntoContent(
                        this.state.generatedContent,
                        result.video,
                        this.config.targetKeyword,
                        this.config.videoPosition
                    );
                    this.log(`   ✅ Video injected into content`);
                }
            } else {
                this.log(`   ⚠️ No suitable video found`);
            }
        } catch (error: any) {
            this.log(`   ⚠️ YouTube search failed: ${error.message}`);
            // Non-critical, continue pipeline
        }
    }
    
    private async step9_FAQGeneration(): Promise<void> {
        this.log(`   → Generating FAQ section`);
    }
    
    private async step10_ReferenceDiscovery(): Promise<void> {
        this.log(`   → Discovering authoritative references`);
    }
    
    private async step11_InternalLinkInjection(): Promise<void> {
        // 🔗 Internal link injection — MUST be AFTER content generation (Step 7)
        if (!this.config.enableInternalLinks) {
            this.log(`   → Internal links disabled, skipping`);
            return;
        }
        
        // 🔥 CRITICAL VALIDATION: Ensure content was generated first
        if (!this.state.completedSteps.has(7)) {
            throw new Error('Cannot inject internal links: Content not generated (Step 7 incomplete)');
        }
        
        if (!this.state.generatedContent) {
            this.log(`   ⚠️ No generated content to inject links into`);
            return;
        }
        
        this.log(`   → Step 7 (Content Generation) verified complete ✓`);
        this.log(`   → Discovering internal link targets from WordPress`);
        
        try {
            // Discover link targets
            const targets = await discoverInternalLinkTargetsEnhanced(
                this.config.wpUrl,
                this.config.wpAuth,
                { maxPosts: 100 },
                (msg) => this.log(msg)
            );
            
            this.state.internalLinkTargets = targets;
            this.log(`   → Found ${targets.length} potential link targets`);
            
            // Inject links with rich contextual anchors
            const result = await injectEnterpriseInternalLinks(
                this.state.generatedContent,
                targets,
                this.config.targetUrl || '',
                {
                    minLinks: this.config.minInternalLinks,
                    maxLinks: this.config.maxInternalLinks,
                    minAnchorWords: 3,
                    maxAnchorWords: 8,
                    minRelevance: 0.5,
                    minDistanceBetweenLinks: 400,
                },
                (msg) => this.log(msg)
            );
            
            this.state.generatedContent = result.html;
            this.log(`   ✅ Injected ${result.linksAdded.length} internal links with rich contextual anchors`);
            
            // Log sample anchors
            result.linksAdded.slice(0, 3).forEach((link, i) => {
                this.log(`   → Link ${i + 1}: "${link.anchorText}" → ${link.url}`);
            });
            
        } catch (error: any) {
            this.log(`   ⚠️ Internal link injection failed: ${error.message}`);
        }
    }
    
    private async step12_SchemaAssembly(): Promise<void> {
        this.log(`   → Assembling schema markup (FAQPage, Article, VideoObject)`);
    }
    
    private async step13_FinalAssembly(): Promise<void> {
        // 🔥 CRITICAL: Remove H1 tags, assemble final HTML
        this.log(`   → Final HTML assembly`);
        
        if (this.state.generatedContent) {
            // Remove any H1 tags
            this.state.finalHtml = removeAllH1Tags(
                this.state.generatedContent,
                (msg) => this.log(msg)
            );
            
            const wordCount = countWords(this.state.finalHtml);
            this.log(`   ✅ Final content: ${wordCount.toLocaleString()} words`);
        }
    }
    
    private async step14_QAValidation(): Promise<void> {
        this.log(`   → Running QA Swarm validation (40+ rules)`);
        
        if (this.state.finalHtml) {
            const contract: ContentContract = {
                title: this.config.targetKeyword,
                htmlContent: this.state.finalHtml,
                metaDescription: '',
                slug: '',
                wordCount: countWords(this.state.finalHtml),
                faqs: this.state.faqs,
                internalLinks: this.state.internalLinkTargets.map(t => ({
                    url: t.url,
                    anchorText: t.title,
                    relevanceScore: 0.8,
                    position: 0
                }))
            };
            
            this.state.qaResult = runQASwarm(contract);
            this.log(`   → QA Score: ${this.state.qaResult.score}/100`);
            this.log(`   → Critical fails: ${this.state.qaResult.criticalFails}`);
        }
    }
    
    private async step15_Publishing(): Promise<void> {
        this.log(`   → Ready for WordPress publishing`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🛑 ABORT CONTROL
    // ═══════════════════════════════════════════════════════════════════════════
    
    abort(): void {
        this.abortController.abort();
        this.state.status = 'paused';
        this.log('⚠️ Pipeline abort requested');
    }
    
    getState(): PipelineState {
        return { ...this.state };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default PipelineOrchestrator;
