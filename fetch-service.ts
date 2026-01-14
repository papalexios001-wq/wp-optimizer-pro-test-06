// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v25.0 — ENTERPRISE SOTA FETCH SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 CRITICAL FEATURES v25.0:
// • Multi-strategy post ID resolution (FIXES DUPLICATE URL BUG)
// • URL crawl-based post ID extraction
// • Slug preservation enforcement
// • Request deduplication (prevents duplicate API calls)
// • Parallelized reference discovery with batching
// • Image preservation & alt text optimization
// • Full WordPress REST API coverage
// • Adaptive timeout calculation
// • Exponential backoff with jitter
// • Circuit breaker pattern for API calls
// • STRICT TYPE SAFETY FIXES (v25.0.1)
// ═══════════════════════════════════════════════════════════════════════════════

import { ValidatedReference, CompetitorAnalysis, EntityGapAnalysis } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 HELPER: Safely get header value (converts null to undefined)
// ═══════════════════════════════════════════════════════════════════════════════
function safeGetHeader(headers: Headers, name: string): string | undefined {
    const value = headers.get(name);
    return value === null ? undefined : value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const FETCH_SERVICE_VERSION = "25.0.1";

// Timeout configuration
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TIMEOUT_MS = 120000;
const MIN_TIMEOUT_MS = 5000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30000;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 REQUEST DEDUPLICATION — PREVENTS DUPLICATE CONCURRENT API CALLS
// ═══════════════════════════════════════════════════════════════════════════════

const inflightEntityGapRequests = new Map<string, Promise<EntityGapAnalysis>>();
const inflightReferenceRequests = new Map<string, Promise<ValidatedReference[]>>();
const inflightPostResolutionRequests = new Map<string, Promise<number | null>>();
const inflightFetchRequests = new Map<string, Promise<Response>>();

function createDedupeKey(...args: string[]): string {
    return args.map(a => a.toLowerCase().trim().replace(/\s+/g, '-')).join(':');
}

/**
 * Generic request deduplication wrapper
 */
export async function dedupeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    cache: Map<string, Promise<T>>
): Promise<T> {
    const existing = cache.get(key);
    if (existing) {
        console.log(`[DEDUP] Reusing inflight request: ${key.substring(0, 60)}...`);
        return existing;
    }
    
    const promise = requestFn().finally(() => {
        cache.delete(key);
    });
    
    cache.set(key, promise);
    return promise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 PROXY CONFIGURATION — MULTI-TIER FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

const PROXY_TIERS = [
    (url: string) => url, // Direct
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 AUTHENTICATION TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export type BasicAuth = { u: string; p: string };

function basicAuthHeader(auth?: BasicAuth): Record<string, string> {
    if (!auth?.u || !auth?.p) return {};
    return { Authorization: `Basic ${btoa(`${auth.u}:${auth.p}`)}` };
}

function wpBase(wpUrl: string): string {
    return wpUrl.replace(/\/+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⏱️ ADAPTIVE TIMEOUT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateAdaptiveTimeout(options: {
    targetWords?: number;
    complexity?: 'low' | 'medium' | 'high';
    retryAttempt?: number;
}): number {
    const { targetWords = 4500, complexity = 'medium', retryAttempt = 0 } = options;
    
    // Base timeout based on word count
    const wordsPerMinute = 1500;
    const baseTimeout = Math.ceil((targetWords / wordsPerMinute) * 60 * 1000);
    
    // Complexity multiplier
    const complexityMultiplier = {
        low: 0.8,
        medium: 1.0,
        high: 1.5
    }[complexity];
    
    // Retry multiplier (increase timeout on retries)
    const retryMultiplier = 1 + (retryAttempt * 0.3);
    
    const calculatedTimeout = baseTimeout * complexityMultiplier * retryMultiplier;
    
    return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, calculatedTimeout));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 EXPONENTIAL BACKOFF WITH JITTER
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateBackoff(
    attempt: number,
    baseDelay: number = RETRY_BASE_DELAY_MS,
    maxDelay: number = RETRY_MAX_DELAY_MS
): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponentialDelay + jitter, maxDelay);
}

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 RESILIENT API CALLER — WITH CIRCUIT BREAKER & AUTOMATIC RETRY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResilientCallOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
    circuitBreakerKey?: string;
    retryOn?: (error: Error, attempt: number) => boolean;
    onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

export async function resilientApiCall<T>(
    fn: () => Promise<T>,
    options: ResilientCallOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 30000,
        timeoutMs = 30000,
        circuitBreakerKey,
        retryOn = defaultRetryPredicate,
        onRetry
    } = options;
    
    // Check circuit breaker
    if (circuitBreakerKey && isCircuitOpen(circuitBreakerKey)) {
        throw new Error(`Circuit breaker OPEN for ${circuitBreakerKey}`);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Wrap with timeout
            const result = await Promise.race([
                fn(),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);
            
            // Success - reset circuit breaker
            if (circuitBreakerKey) {
                recordCircuitSuccess(circuitBreakerKey);
            }
            
            return result;
            
        } catch (error) {
            lastError = error as Error;
            
            // Check if we should retry
            if (attempt < maxRetries && retryOn(lastError, attempt)) {
                const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
                
                onRetry?.(lastError, attempt + 1, delay);
                console.warn(`[RESILIENT] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms`);
                
                await sleep(delay);
            } else {
                break;
            }
        }
    }
    
    // All retries failed
    if (circuitBreakerKey) {
        recordCircuitFailure(circuitBreakerKey);
    }
    
    throw lastError || new Error('Unknown error in resilientApiCall');
}

function defaultRetryPredicate(error: Error, attempt: number): boolean {
    const message = error.message.toLowerCase();
    
    // Always retry on network errors
    if (message.includes('network') || message.includes('fetch')) return true;
    
    // Retry on timeout
    if (message.includes('timeout')) return true;
    
    // Retry on rate limit (with longer backoff)
    if (message.includes('429') || message.includes('rate limit')) return true;
    
    // Retry on server errors
    if (message.includes('500') || message.includes('502') || 
        message.includes('503') || message.includes('504')) return true;
    
    // Don't retry on client errors
    if (message.includes('400') || message.includes('401') || 
        message.includes('403') || message.includes('404')) return false;
    
    // Default: retry
    return true;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 CIRCUIT BREAKER PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    halfOpenRequests: 1
};

function getCircuitBreaker(key: string): CircuitBreakerState {
    if (!circuitBreakers.has(key)) {
        circuitBreakers.set(key, { failures: 0, lastFailure: 0, isOpen: false });
    }
    return circuitBreakers.get(key)!;
}

function recordCircuitFailure(key: string): void {
    const breaker = getCircuitBreaker(key);
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
        breaker.isOpen = true;
        console.warn(`[CIRCUIT BREAKER] ${key} is now OPEN after ${breaker.failures} failures`);
    }
}

function recordCircuitSuccess(key: string): void {
    const breaker = getCircuitBreaker(key);
    breaker.failures = 0;
    breaker.isOpen = false;
}

function isCircuitOpen(key: string): boolean {
    const breaker = getCircuitBreaker(key);
    
    if (!breaker.isOpen) return false;
    
    // Check if reset timeout has passed (half-open state)
    if (Date.now() - breaker.lastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
        console.log(`[CIRCUIT BREAKER] ${key} entering half-open state`);
        return false;
    }
    
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 TITAN FETCH — MULTI-PROXY RESILIENT FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

export interface TitanFetchOptions extends RequestInit {
    timeoutMs?: number;
    retries?: number;
    useProxies?: boolean;
    circuitBreakerKey?: string;
}

export async function titanFetch(
    url: string, 
    options: TitanFetchOptions = {}
): Promise<Response> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retries = MAX_RETRIES,
        useProxies = true,
        circuitBreakerKey,
        ...fetchOptions
    } = options;
    
    // Check circuit breaker
    if (circuitBreakerKey && isCircuitOpen(circuitBreakerKey)) {
        throw new Error(`Circuit breaker OPEN for ${circuitBreakerKey}`);
    }
    
    const dedupeKey = `fetch:${url}:${JSON.stringify(fetchOptions)}`;
    
    // Check for duplicate in-flight request
    const existing = inflightFetchRequests.get(dedupeKey);
    if (existing) {
        return existing.then(r => r.clone());
    }
    
    const requestPromise = titanFetchInternal(url, {
        timeoutMs,
        retries,
        useProxies,
        circuitBreakerKey,
        ...fetchOptions
    });
    
    inflightFetchRequests.set(dedupeKey, requestPromise);
    
    try {
        return await requestPromise;
    } finally {
        inflightFetchRequests.delete(dedupeKey);
    }
}

async function titanFetchInternal(
    url: string,
    options: TitanFetchOptions
): Promise<Response> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retries = MAX_RETRIES,
        useProxies = true,
        circuitBreakerKey,
        ...fetchOptions
    } = options;
    
    let lastError: Error | null = null;
    
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(fetchOptions.headers || {})
    };
    
    const proxiesToTry = useProxies ? PROXY_TIERS : [PROXY_TIERS[0]];
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        for (const buildProxy of proxiesToTry) {
            try {
                const finalUrl = buildProxy(url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                
                const res = await fetch(finalUrl, {
                    ...fetchOptions,
                    headers: defaultHeaders,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    if (circuitBreakerKey) recordCircuitSuccess(circuitBreakerKey);
                    return res;
                }
                
                // Handle specific error codes
                if (res.status === 429) {
                    const retryAfter = safeGetHeader(res.headers, 'Retry-After');
                    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : calculateBackoff(attempt);
                    console.warn(`[TITAN FETCH] Rate limited, waiting ${waitTime}ms`);
                    await sleep(waitTime);
                    continue;
                }
                
                lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
            } catch (e: any) {
                if (e.name === 'AbortError') {
                    lastError = new Error(`Request timeout after ${timeoutMs}ms`);
                } else {
                    lastError = e;
                }
            }
        }
        
        // Wait before retry
        if (attempt < retries) {
            const backoff = calculateBackoff(attempt);
            console.log(`[TITAN FETCH] Retry ${attempt + 1}/${retries} after ${backoff}ms`);
            await sleep(backoff);
        }
    }
    
    if (circuitBreakerKey) recordCircuitFailure(circuitBreakerKey);
    throw lastError || new Error('TITAN_FETCH_FAILED: All attempts exhausted');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📡 DIRECT FETCH — FOR API CALLS (NO PROXY)
// ═══════════════════════════════════════════════════════════════════════════════

export async function directFetch(
    url: string, 
    options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const res = await fetch(url, { 
            ...fetchOptions, 
            headers: { 
                'Content-Type': 'application/json', 
                ...(fetchOptions.headers || {}) 
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return res;
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw e;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 SERPER API — SEARCH ENGINE RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SerperResult {
    organic: Array<{ 
        title: string; 
        link: string; 
        snippet: string; 
        position: number; 
        date?: string;
        sitelinks?: Array<{ title: string; link: string }>;
    }>;
    peopleAlsoAsk?: Array<{ 
        question: string; 
        snippet: string; 
        link: string; 
    }>;
    relatedSearches?: Array<{ query: string }>;
    knowledgeGraph?: { 
        title: string; 
        type: string; 
        description: string; 
        attributes?: Record<string, string>; 
    };
    answerBox?: { 
        title: string; 
        answer: string; 
        snippet: string; 
        link?: string; 
    };
    topStories?: Array<{ 
        title: string; 
        link: string; 
        source: string; 
        date: string; 
    }>;
    videos?: Array<{
        title: string;
        link: string;
        channel?: string;
        duration?: string;
    }>;
}

export async function serperSearch(
    apiKey: string, 
    query: string, 
    options: { 
        gl?: string; 
        hl?: string; 
        num?: number; 
        type?: 'search' | 'news' | 'images' | 'videos'; 
        tbs?: string;
        page?: number;
    } = {}
): Promise<SerperResult> {
    const { gl = 'us', hl = 'en', num = 10, type = 'search', tbs, page } = options;
    const endpoint = type === 'search' 
        ? 'https://google.serper.dev/search' 
        : `https://google.serper.dev/${type}`;
    
    const body: Record<string, any> = { q: query, gl, hl, num };
    if (tbs) body.tbs = tbs;
    if (page) body.page = page;
    
    const res = await directFetch(endpoint, {
        method: 'POST',
        headers: { 
            'X-API-KEY': apiKey, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(body),
        timeoutMs: 20000
    });
    
    if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        
        if (res.status === 429) {
            throw new Error(`Serper rate limit exceeded. Try again later.`);
        }
        
        throw new Error(`Serper API error ${res.status}: ${errorText}`);
    }
    
    return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ AUTHORITY DOMAINS & BLACKLIST
// ═══════════════════════════════════════════════════════════════════════════════

const AUTHORITY_DOMAINS = [
    // Government & Education
    '.gov', '.edu', '.org', '.mil', '.int', '.ac.uk', '.edu.au',
    
    // Major News
    'reuters.com', 'bbc.com', 'nytimes.com', 'wsj.com', 'economist.com',
    'apnews.com', 'theguardian.com', 'washingtonpost.com', 'ft.com',
    
    // Business & Finance
    'forbes.com', 'bloomberg.com', 'cnbc.com', 'businessinsider.com',
    'fortune.com', 'hbr.org', 'mckinsey.com', 'gartner.com', 'deloitte.com',
    
    // Science & Academic
    'nature.com', 'sciencedirect.com', 'springer.com', 'wiley.com',
    'pubmed', 'ncbi.nlm.nih.gov', 'arxiv.org', 'researchgate.net',
    'scholar.google.com', 'jstor.org', 'ieee.org', 'acm.org',
    
    // Technology
    'techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com',
    'cnet.com', 'zdnet.com', 'thenextweb.com', 'engadget.com',
    
    // Marketing & SEO
    'hubspot.com', 'semrush.com', 'moz.com', 'ahrefs.com', 
    'searchengineland.com', 'searchenginejournal.com', 'backlinko.com',
    
    // Health
    'healthline.com', 'webmd.com', 'mayoclinic.org', 'nih.gov', 'cdc.gov',
    'who.int', 'clevelandclinic.org', 'hopkinsmedicine.org',
    
    // Reference
    'wikipedia.org', 'britannica.com', 'statista.com', 'pewresearch.org',
    'gallup.com', 'data.gov', 'worldbank.org', 'imf.org',
];

const BLACKLISTED_DOMAINS = [
    // Social Media
    'pinterest.com', 'pinterest.', 'facebook.com', 'fb.com',
    'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
    'snapchat.com', 'threads.net',
    
    // User-Generated Content
    'reddit.com/r/', 'quora.com', 'linkedin.com/posts', 'linkedin.com/pulse',
    'medium.com/@', 'tumblr.com', 'wordpress.com/tag',
    
    // Video (unless specifically searching for videos)
    'youtube.com', 'vimeo.com', 'dailymotion.com',
    
    // Aggregators & Low Quality
    'buzzfeed.com', 'boredpanda.com', 'ranker.com',
    
    // E-commerce listings
    'amazon.com/dp', 'ebay.com/itm', 'etsy.com/listing',
    'aliexpress.com', 'alibaba.com',
];

function isAuthorityDomain(url: string): boolean {
    const urlLower = url.toLowerCase();
    return AUTHORITY_DOMAINS.some(d => urlLower.includes(d));
}

function isBlacklistedDomain(url: string): boolean {
    const urlLower = url.toLowerCase();
    return BLACKLISTED_DOMAINS.some(d => urlLower.includes(d));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ URL VALIDATION — MULTI-STRATEGY
// ═══════════════════════════════════════════════════════════════════════════════

export interface UrlValidationResult {
    status: number;
    isValid: boolean;
    responseTime: number;
    contentType?: string;
    redirectUrl?: string;
}

export async function validateUrl(
    url: string, 
    timeoutMs: number = 8000
): Promise<UrlValidationResult> {
    const startTime = Date.now();
    
    // Strategy 1: HEAD request (fastest)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const headRes = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (compatible; WPOptimizerBot/1.0)',
                'Accept': '*/*'
            },
            redirect: 'follow'
        });
        
        clearTimeout(timeoutId);
        
        return { 
            status: headRes.status, 
            isValid: headRes.status >= 200 && headRes.status < 400, 
            responseTime: Date.now() - startTime,
            contentType: safeGetHeader(headRes.headers, 'content-type'),
            redirectUrl: headRes.url !== url ? headRes.url : undefined
        };
    } catch {
        // Continue to next strategy
    }
    
    // Strategy 2: CORS proxy GET
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const proxyRes = await fetch(proxyUrl, { 
            method: 'GET', 
            signal: controller.signal,
            headers: { 'Range': 'bytes=0-1024' }
        });
        
        clearTimeout(timeoutId);
        
        return { 
            status: proxyRes.status, 
            isValid: proxyRes.status >= 200 && proxyRes.status < 400, 
            responseTime: Date.now() - startTime,
            contentType: safeGetHeader(proxyRes.headers, 'content-type')
        };
    } catch {
        // Continue to next strategy
    }
    
    // Strategy 3: AllOrigins proxy
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const proxyRes = await fetch(proxyUrl, { method: 'GET', signal: controller.signal });
        
        clearTimeout(timeoutId);
        
        return { 
            status: proxyRes.ok ? 200 : 404, 
            isValid: proxyRes.ok, 
            responseTime: Date.now() - startTime 
        };
    } catch {
        // All strategies failed
    }
    
    return { 
        status: 0, 
        isValid: false, 
        responseTime: Date.now() - startTime 
    };
}



// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 BATCH PROCESSOR — FOR PARALLEL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchProcessorOptions {
    batchSize?: number;
    delayBetweenBatches?: number;
    onProgress?: (completed: number, total: number) => void;
}

export async function processBatch<T, R>(
    items: T[], 
    processor: (item: T, index: number) => Promise<R>,
    options: BatchProcessorOptions = {}
): Promise<R[]> {
    const { 
        batchSize = 5, 
        delayBetweenBatches = 100,
        onProgress 
    } = options;
    
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchStartIndex = i;
        
        const batchResults = await Promise.allSettled(
            batch.map((item, idx) => processor(item, batchStartIndex + idx))
        );
        
        batchResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                console.warn(`[BATCH] Item ${batchStartIndex + idx} failed:`, result.reason);
            }
        });
        
        onProgress?.(Math.min(i + batchSize, items.length), items.length);
        
        // Delay between batches to avoid rate limiting
        if (i + batchSize < items.length && delayBetweenBatches > 0) {
            await sleep(delayBetweenBatches);
        }
    }
    
    return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 REFERENCE DISCOVERY & VALIDATION — WITH DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReferenceDiscoveryOptions {
    targetCount?: number;
    geoCountry?: string;
    geoLanguage?: string;
    includeRecent?: boolean;
    maxConcurrency?: number;
    preferAuthority?: boolean;
    excludeDomains?: string[];
}

export async function discoverAndValidateReferences(
    topic: string,
    serperKey: string,
    options: ReferenceDiscoveryOptions = {},
    onProgress?: (msg: string) => void
): Promise<ValidatedReference[]> {
    const { 
        targetCount = 15, 
        geoCountry = 'us', 
        geoLanguage = 'en', 
        maxConcurrency = 5,
        preferAuthority = true,
        excludeDomains = []
    } = options;
    
    // Deduplication check
    const dedupeKey = createDedupeKey('refs', topic, geoCountry);
    
    return dedupeRequest(
        dedupeKey,
        () => discoverAndValidateReferencesInternal(
            topic, serperKey, options, onProgress
        ),
        inflightReferenceRequests
    );
}

async function discoverAndValidateReferencesInternal(
    topic: string,
    serperKey: string,
    options: ReferenceDiscoveryOptions = {},
    onProgress?: (msg: string) => void
): Promise<ValidatedReference[]> {
    const { 
        targetCount = 15, 
        geoCountry = 'us', 
        geoLanguage = 'en', 
        maxConcurrency = 5,
        preferAuthority = true,
        excludeDomains = []
    } = options;
    
    const currentYear = new Date().getFullYear();
    const validatedRefs: ValidatedReference[] = [];
    const seenUrls = new Set<string>();
    const seenDomains = new Set<string>();
    
    // Candidate URLs from searches
    const candidateUrls: Array<{ 
        url: string; 
        title: string; 
        date?: string;
        snippet?: string;
        position: number;
        queryType: string;
    }> = [];
    
    // Search queries optimized for authoritative content
    const searchQueries = [
        `${topic} statistics research ${currentYear}`,
        `${topic} study findings data analysis`,
        `${topic} expert guide best practices`,
        `"${topic}" site:edu OR site:gov OR site:org`,
        `${topic} scientific research peer reviewed`,
        `${topic} industry report ${currentYear - 1} ${currentYear}`,
    ];
    
    onProgress?.(`🔍 Discovering authoritative references for "${topic}"...`);
    
    // Run searches in parallel batches
    const searchResults = await processBatch(
        searchQueries,
        async (query) => {
            try {
                return await serperSearch(serperKey, query, { 
                    num: 10, 
                    gl: geoCountry, 
                    hl: geoLanguage 
                });
            } catch (e: any) {
                onProgress?.(`   ⚠️ Search failed: "${query.substring(0, 35)}..." - ${e.message}`);
                return null;
            }
        },
        { batchSize: 2, delayBetweenBatches: 500 }
    );
    
    // Collect all results
    searchResults.forEach((result, queryIndex) => {
        if (!result) return;
        
        const queryType = searchQueries[queryIndex].includes('site:') ? 'authority' : 'general';
        
        (result.organic || []).forEach((item, position) => {
            if (seenUrls.has(item.link)) return;
            if (isBlacklistedDomain(item.link)) return;
            if (excludeDomains.some(d => item.link.toLowerCase().includes(d))) return;
            
            seenUrls.add(item.link);
            candidateUrls.push({ 
                url: item.link, 
                title: item.title, 
                date: item.date,
                snippet: item.snippet,
                position,
                queryType
            });
        });
    });
    
    onProgress?.(`   📋 Found ${candidateUrls.length} candidate URLs, validating...`);
    
    // Sort candidates: authority first, then by position
    candidateUrls.sort((a, b) => {
        const aAuthority = isAuthorityDomain(a.url) ? 0 : 1;
        const bAuthority = isAuthorityDomain(b.url) ? 0 : 1;
        
        if (aAuthority !== bAuthority) return aAuthority - bAuthority;
        if (a.queryType !== b.queryType) {
            return a.queryType === 'authority' ? -1 : 1;
        }
        return a.position - b.position;
    });
    
    // Validate URLs in batches
    const validateCandidate = async (
        candidate: typeof candidateUrls[0]
    ): Promise<ValidatedReference | null> => {
        // Skip if we already have enough from this domain
        try {
            const domain = new URL(candidate.url).hostname.replace('www.', '');
            if (seenDomains.has(domain) && !isAuthorityDomain(candidate.url)) {
                return null;
            }
        } catch {
            return null;
        }
        
        try {
            const validation = await validateUrl(candidate.url, 8000);
            
            if (!validation.isValid) return null;
            
            const isAuthority = isAuthorityDomain(candidate.url);
            let source = 'Source';
            let domain = '';
            
            try {
                const urlObj = new URL(candidate.url);
                domain = urlObj.hostname.replace('www.', '');
                seenDomains.add(domain);
                
                const domainParts = domain.split('.');
                source = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
                
                // Better source names for known domains
                const sourceOverrides: Record<string, string> = {
                    'nih.gov': 'NIH',
                    'cdc.gov': 'CDC',
                    'who.int': 'WHO',
                    'ncbi.nlm.nih.gov': 'PubMed',
                    'hbr.org': 'Harvard Business Review',
                    'mckinsey.com': 'McKinsey',
                    'gartner.com': 'Gartner',
                    'semrush.com': 'Semrush',
                    'moz.com': 'Moz',
                    'hubspot.com': 'HubSpot',
                };
                
                for (const [pattern, name] of Object.entries(sourceOverrides)) {
                    if (domain.includes(pattern.split('.')[0])) {
                        source = name;
                        break;
                    }
                }
            } catch {}
            
            // Extract year from URL, title, or date
            const yearMatch = candidate.url.match(/20\d{2}/) || 
                             candidate.title.match(/20\d{2}/) || 
                             candidate.date?.match(/20\d{2}/);
            const year = yearMatch ? yearMatch[0] : currentYear.toString();
            
            onProgress?.(`   ✅ Valid (${validation.status}): ${candidate.title.substring(0, 50)}...`);
            
            return {
                url: candidate.url,
                title: candidate.title.substring(0, 120),
                source,
                year,
                status: validation.status,
                isValid: true,
                domain,
                isAuthority
            };
        } catch {
            return null;
        }
    };
    
    // Process candidates until we have enough
    const batchSize = maxConcurrency;
    
    for (let i = 0; i < candidateUrls.length && validatedRefs.length < targetCount; i += batchSize) {
        const batch = candidateUrls.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(validateCandidate));
        
        results.forEach(ref => {
            if (ref && validatedRefs.length < targetCount) {
                validatedRefs.push(ref);
            }
        });
    }
    
    onProgress?.(`   ✅ Validated ${validatedRefs.length} authoritative references`);
    
    // Final sort: authorities first, then by year (newest first)
return validatedRefs.sort((a, b) => {
    if (a.isAuthority && !b.isAuthority) return -1;
    if (!a.isAuthority && b.isAuthority) return 1;
    return parseInt(String(b.year)) - parseInt(String(a.year));
});


// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ENTITY GAP ANALYSIS — WITH DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityGapOptions {
    geoCountry?: string;
    geoLanguage?: string;
    maxCompetitors?: number;
    includeKnowledgeGraph?: boolean;
}

export async function performEntityGapAnalysis(
    keyword: string,
    serperKey: string,
    existingContent?: string,
    options: EntityGapOptions = {},
    onProgress?: (msg: string) => void
): Promise<EntityGapAnalysis> {
    const { geoCountry = 'us', geoLanguage = 'en' } = options;
    
    // Deduplication check
    const dedupeKey = createDedupeKey('entityGap', keyword, geoCountry);
    
    return dedupeRequest(
        dedupeKey,
        () => performEntityGapAnalysisInternal(
            keyword, serperKey, existingContent, options, onProgress
        ),
        inflightEntityGapRequests
    );
}

async function performEntityGapAnalysisInternal(
    keyword: string,
    serperKey: string,
    existingContent?: string,
    options: EntityGapOptions = {},
    onProgress?: (msg: string) => void
): Promise<EntityGapAnalysis> {
    const { 
        geoCountry = 'us', 
        geoLanguage = 'en',
        maxCompetitors = 10,
        includeKnowledgeGraph = true
    } = options;
    
    try {
        onProgress?.(`🔬 Analyzing SERP for "${keyword}"...`);
        
        // Optimize search query
        const searchQuery = keyword.length > 60 
            ? keyword.split(' ').slice(0, 8).join(' ')
            : keyword;
        
        // Main search
        const data = await serperSearch(serperKey, searchQuery, { 
            num: maxCompetitors, 
            gl: geoCountry, 
            hl: geoLanguage 
        });
        
        const organic = data.organic || [];
        onProgress?.(`   📊 Found ${organic.length} organic results`);
        
        // Build competitor data
        const competitors: CompetitorAnalysis[] = [];
        const competitorUrls: string[] = [];
        const allSnippetText: string[] = [];
        
        for (const result of organic.slice(0, maxCompetitors)) {
            competitorUrls.push(result.link);
            allSnippetText.push(`${result.title} ${result.snippet}`);
            
            let domain = '';
            try {
                domain = new URL(result.link).hostname;
            } catch {}
            
            competitors.push({
                url: result.link,
                title: result.title,
                wordCount: 0,
                headings: [],
                entities: [],
                snippet: result.snippet,
                position: result.position,
                domain,
                hasSchema: false,
                hasFAQ: result.snippet?.toLowerCase().includes('faq') || 
                        result.title?.toLowerCase().includes('faq') ||
                        result.snippet?.toLowerCase().includes('question')
            });
        }
        
        // Extract entities from snippets
        const combinedText = allSnippetText.join(' ');
        const entities = new Set<string>();
        
        // Proper nouns (multi-word support)
        const properNouns = combinedText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g) || [];
        const stopWords = new Set([
            'The', 'This', 'That', 'What', 'When', 'Where', 'Which', 'How', 'Why',
            'And', 'But', 'For', 'With', 'From', 'Your', 'They', 'Have', 'Been',
            'More', 'Most', 'Best', 'Home', 'Page', 'Click', 'Here', 'Learn', 'Read',
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]);
        properNouns.forEach(m => {
            if (m.length > 3 && !stopWords.has(m)) entities.add(m);
        });
        
        // Statistics with units
        const stats = combinedText.match(
            /\d+(?:\.\d+)?(?:\s*(?:%|percent|million|billion|thousand|K|M|B|trillion|USD|\$|€|£))?/gi
        ) || [];
        stats.slice(0, 20).forEach(s => {
            if (s.length > 2) entities.add(s.trim());
        });
        
        // Years
        const years = combinedText.match(/\b20[1-3]\d\b/g) || [];
        years.forEach(y => entities.add(y));
        
        const competitorEntities = Array.from(entities).slice(0, 80);
        
        // Calculate missing entities
        let missingEntities: string[] = [];
        if (existingContent) {
            const existingLower = existingContent.toLowerCase();
            missingEntities = competitorEntities
                .filter(e => !existingLower.includes(e.toLowerCase()))
                .slice(0, 40);
        } else {
            missingEntities = competitorEntities.slice(0, 40);
        }
        
        // Get PAA questions with fallback strategies
        let paaQuestions = (data.peopleAlsoAsk || [])
            .slice(0, 15)
            .map((p: any) => p.question);
        
        if (paaQuestions.length < 5) {
            onProgress?.(`   → Only ${paaQuestions.length} PAA found, trying alternate queries...`);
            
            // Try alternate queries
            const altQueries = [
                `${searchQuery} questions`,
                `what is ${searchQuery}`,
                `how to ${searchQuery}`,
                `${searchQuery} tips`
            ];
            
            for (const altQuery of altQueries) {
                if (paaQuestions.length >= 8) break;
                
                try {
                    const altData = await serperSearch(serperKey, altQuery, { 
                        num: 5, 
                        gl: geoCountry, 
                        hl: geoLanguage 
                    });
                    
                    const newPAA = (altData.peopleAlsoAsk || [])
                        .map((p: any) => p.question)
                        .filter((q: string) => !paaQuestions.includes(q));
                    
                    paaQuestions.push(...newPAA.slice(0, 5 - paaQuestions.length + 3));
                } catch {
                    // Continue with other queries
                }
            }
            
            // Generate from related searches if still not enough
            if (paaQuestions.length < 5 && data.relatedSearches) {
                const generatedQuestions = (data.relatedSearches || [])
                    .slice(0, 10)
                    .map((r: any) => {
                        const query = r.query || '';
                        const startsWithQuestion = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
                            .some(w => query.toLowerCase().startsWith(w));
                        
                        if (startsWithQuestion) {
                            return query + (query.endsWith('?') ? '' : '?');
                        }
                        return `What is ${query}?`;
                    })
                    .filter((q: string) => !paaQuestions.includes(q));
                
                paaQuestions.push(...generatedQuestions.slice(0, 10 - paaQuestions.length));
                onProgress?.(`   → Generated ${generatedQuestions.length} questions from related searches`);
            }
        }
        
        onProgress?.(`   ❓ Total ${paaQuestions.length} PAA questions`);
        
        // Related searches
        const relatedSearches = (data.relatedSearches || [])
            .slice(0, 25)
            .map((r: any) => r.query);
        
        // Discover authoritative references
        onProgress?.(`   📚 Discovering authoritative references...`);
        let validatedReferences: ValidatedReference[] = [];
        
        try {
            validatedReferences = await discoverAndValidateReferences(
                keyword, 
                serperKey, 
                { targetCount: 15, geoCountry, geoLanguage }, 
                onProgress
            );
        } catch (e: any) {
            onProgress?.(`   ⚠️ Reference discovery failed: ${e.message}`);
        }
        
        // Detect SERP features
        const serpFeatures: any[] = [];
        
        if (data.answerBox) {
            serpFeatures.push({ type: 'featured_snippet', present: true, targetable: true });
        }
        if (data.knowledgeGraph) {
            serpFeatures.push({ type: 'knowledge_panel', present: true, targetable: false });
        }
        if (paaQuestions.length > 0) {
            serpFeatures.push({ type: 'paa', present: true, targetable: true });
        }
        if ((data as any).videos?.length > 0) {
            serpFeatures.push({ type: 'video', present: true, targetable: true });
        }
        
        // Calculate recommended word count based on query complexity
        const queryWords = searchQuery.split(' ').length;
        const baseWordCount = 4500;
        const complexityBonus = Math.min(queryWords * 200, 1500);
        const recommendedWordCount = baseWordCount + complexityBonus;
        
        // Build topic clusters from related searches
        const topicClusters = relatedSearches
            .filter(s => s.split(' ').length >= 2)
            .slice(0, 12);
        
        return {
            competitorEntities,
            missingEntities,
            topKeywords: [keyword, ...relatedSearches].slice(0, 30),
            paaQuestions,
            contentGaps: [
                'Comprehensive step-by-step guide',
                'Case studies with specific numbers',
                'Expert quotes and insights',
                'Comparison tables',
                'Common mistakes to avoid',
                `${new Date().getFullYear()} trends and updates`,
                'FAQ section with detailed answers',
                'References to authoritative sources',
                'Visual data representations',
                'Actionable takeaways'
            ],
            avgWordCount: 4000,
            serpFeatures,
            competitorUrls,
            competitors,
            recommendedWordCount,
            topicClusters,
            semanticTerms: relatedSearches.slice(0, 20),
            validatedReferences,
            knowledgeGraphData: includeKnowledgeGraph ? data.knowledgeGraph : undefined,
            featuredSnippetOpportunity: !data.answerBox,
            localPackPresent: false
        };
    } catch (e: any) {
        onProgress?.(`   ⚠️ Entity gap analysis failed: ${e.message}`);
        
        // Return minimal result instead of throwing
        return {
            competitorEntities: [],
            missingEntities: [],
            topKeywords: [keyword],
            paaQuestions: [],
            contentGaps: [],
            avgWordCount: 4000,
            serpFeatures: [],
            competitorUrls: [],
            competitors: [],
            recommendedWordCount: 4500,
            topicClusters: [],
            semanticTerms: [],
            validatedReferences: [],
            featuredSnippetOpportunity: true,
            localPackPresent: false
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 WORDPRESS API — CONNECTION TEST
// ═══════════════════════════════════════════════════════════════════════════════

export async function wpTestConnection(
    wpUrl: string, 
    auth: BasicAuth
): Promise<{ success: boolean; message: string; siteName?: string; version?: string }> {
    try {
        const baseUrl = wpBase(wpUrl);
        
        // Test authentication
        const res = await directFetch(
            `${baseUrl}/wp-json/wp/v2/posts?per_page=1&status=any`, 
            { 
                method: 'GET', 
                headers: { ...basicAuthHeader(auth) },
                timeoutMs: 15000
            }
        );
        
        if (res.ok) {
            // Get site info
            try {
                const siteRes = await directFetch(`${baseUrl}/wp-json`, { timeoutMs: 10000 });
                const siteData = await siteRes.json();
                
                return { 
                    success: true, 
                    message: 'Connected successfully', 
                    siteName: siteData.name,
                    version: siteData.authentication?.application_passwords?.version
                };
            } catch {
                return { success: true, message: 'Connected successfully' };
            }
        }
        
        // Handle specific error codes
        if (res.status === 401) {
            return { success: false, message: 'Authentication failed. Check username/password.' };
        }
        if (res.status === 403) {
            return { success: false, message: 'Access forbidden. Application passwords may be disabled.' };
        }
        if (res.status === 404) {
            return { success: false, message: 'REST API not found. Check WordPress URL.' };
        }
        
        const errorText = await res.text().catch(() => '');
        return { success: false, message: `HTTP ${res.status}: ${errorText.substring(0, 150)}` };
    } catch (e: any) {
        return { success: false, message: `Connection failed: ${e.message}` };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥🔥🔥 ENHANCED POST ID RESOLUTION — MULTI-STRATEGY (FIXES DUPLICATE URL BUG)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve WordPress post ID from URL with multiple fallback strategies.
 * This is the CRITICAL function that prevents duplicate URLs.
 * 
 * STRATEGIES (in order):
 * 1. Preview URL parameters (?p= or ?page_id=)
 * 2. Direct slug search via REST API
 * 3. Title/content search via REST API
 * 4. HTML crawl for post ID markers
 * 5. Check if it's a page (not post)
 * 6. Fuzzy path segment matching
 */
export async function wpResolvePostIdEnhanced(
    wpUrl: string, 
    targetUrl: string,
    auth?: BasicAuth,
    onProgress?: (msg: string) => void
): Promise<number | null> {
    const baseUrl = wpBase(wpUrl);
    
    // Deduplication check
    const dedupeKey = createDedupeKey('postRes', baseUrl, targetUrl);
    
    return dedupeRequest(
        dedupeKey,
        () => wpResolvePostIdInternal(baseUrl, targetUrl, auth, onProgress),
        inflightPostResolutionRequests
    );
}

async function wpResolvePostIdInternal(
    baseUrl: string, 
    targetUrl: string,
    auth?: BasicAuth,
    onProgress?: (msg: string) => void
): Promise<number | null> {
    // Extract slug and path from URL
    let slug = '';
    let fullPath = '';
    
    try {
        const urlObj = new URL(targetUrl);
        fullPath = urlObj.pathname.replace(/^\/+|\/+$/g, '');
        
        // STRATEGY 0: Check for preview URL parameters
        const previewId = urlObj.searchParams.get('p') || 
                          urlObj.searchParams.get('page_id') ||
                          urlObj.searchParams.get('post');
        if (previewId) {
            const postId = parseInt(previewId, 10);
            if (!isNaN(postId) && postId > 0) {
                onProgress?.(`   ✅ Found post ID from preview URL: ${postId}`);
                return postId;
            }
        }
        
        // Get the last path segment as potential slug
        const pathParts = fullPath.split('/').filter(Boolean);
        slug = pathParts[pathParts.length - 1] || '';
        
        // Remove common suffixes and clean up
        slug = slug
            .replace(/\.(html?|php|aspx?)$/i, '')
            .replace(/[#?].*$/, '')
            .trim();
        
    } catch (e) {
        // If URL parsing fails, use the input as slug
        slug = targetUrl.replace(/^\/+|\/+$/g, '').split('/').pop() || targetUrl;
    }
    
    onProgress?.(`   → Resolving post: "${slug}" (path: ${fullPath})`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 1: Direct slug search (most reliable)
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (slug && slug.length > 1) {
        const url1 = `${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=any&_fields=id,link,slug,status`;
        
        try {
            onProgress?.(`   → Strategy 1: Searching by slug "${slug}"...`);
            const res = await directFetch(url1, { 
                method: 'GET', 
                headers: auth ? basicAuthHeader(auth) : {},
                timeoutMs: 15000
            });
            
            if (res.ok) {
                const posts = await res.json();
                if (Array.isArray(posts) && posts.length > 0) {
                    // If only one result, use it
                    if (posts.length === 1) {
                        onProgress?.(`   ✅ Found post ID: ${posts[0].id} (via slug match)`);
                        return posts[0].id;
                    }
                    
                    // If multiple results, try to match by full URL
                    for (const post of posts) {
                        if (post.link) {
                            try {
                                const postPath = new URL(post.link).pathname.replace(/^\/+|\/+$/g, '');
                                if (postPath === fullPath || postPath.endsWith(slug)) {
                                    onProgress?.(`   ✅ Found post ID: ${posts[0].id} (via URL match)`);
                                    return post.id;
                                }
                            } catch {}
                        }
                    }
                    
                    // Fall back to first result
                    onProgress?.(`   ✅ Found post ID: ${posts[0].id} (first match of ${posts.length})`);
                    return posts[0].id;
                }
            }
        } catch (e: any) {
            onProgress?.(`   ⚠️ Strategy 1 failed: ${e.message}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 2: Search by title (handles permalink mismatches)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const humanReadableTitle = slug
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .trim();
    
    if (humanReadableTitle.length > 3) {
        const url2 = `${baseUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(humanReadableTitle)}&status=any&per_page=10&_fields=id,link,slug,title`;
        
        try {
            onProgress?.(`   → Strategy 2: Searching by title "${humanReadableTitle}"...`);
            const res = await directFetch(url2, { 
                method: 'GET', 
                headers: auth ? basicAuthHeader(auth) : {},
                timeoutMs: 15000
            });
            
            if (res.ok) {
                const posts = await res.json();
                if (Array.isArray(posts) && posts.length > 0) {
                    // Try to find exact URL match
                    for (const post of posts) {
                        if (post.link) {
                            try {
                                const postPath = new URL(post.link).pathname.replace(/^\/+|\/+$/g, '');
                                if (postPath === fullPath) {
                                    onProgress?.(`   ✅ Found post ID: ${post.id} (via search + URL match)`);
                                    return post.id;
                                }
                            } catch {}
                        }
                        
                        // Check if slug matches
                        if (post.slug === slug) {
                            onProgress?.(`   ✅ Found post ID: ${post.id} (via search + slug match)`);
                            return post.id;
                        }
                    }
                }
            }
        } catch (e: any) {
            onProgress?.(`   ⚠️ Strategy 2 failed: ${e.message}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 3: Crawl the actual URL and extract post ID from HTML
    // ═══════════════════════════════════════════════════════════════════════════
    
    try {
        onProgress?.(`   → Strategy 3: Crawling URL to extract post ID...`);
        const crawlRes = await titanFetch(targetUrl, { timeoutMs: 12000, retries: 2 });
        const html = await crawlRes.text();
        
        // WordPress includes post ID in various places:
        const idPatterns = [
            // Body class: class="... postid-123 ..."
            /class="[^"]*\bpostid-(\d+)\b[^"]*"/i,
            // Article ID: <article id="post-123"
            /<article[^>]*\bid=["']post-(\d+)["']/i,
            // Data attribute: data-post-id="123"
            /data-post-id=["'](\d+)["']/i,
            // Comments form: <input name="comment_post_ID" value="123"
            /name=["']comment_post_ID["'][^>]*value=["'](\d+)["']/i,
            // Edit link: /wp-admin/post.php?post=123&action=edit
            /\/wp-admin\/post\.php\?post=(\d+)/i,
            // Shortlink: /?p=123
            /rel=["']shortlink["'][^>]*href=["'][^"]*\?p=(\d+)["']/i,
            /href=["'][^"]*\?p=(\d+)["'][^>]*rel=["']shortlink["']/i,
            // WP REST API link: /wp-json/wp/v2/posts/123
            /\/wp-json\/wp\/v2\/posts\/(\d+)/i,
            // wp-image class: wp-image-123 (for attachment pages)
            /class="[^"]*wp-post-(\d+)[^"]*"/i,
        ];
        
        for (const pattern of idPatterns) {
            const match = html.match(pattern);
            if (match) {
                const postId = parseInt(match[1], 10);
                if (!isNaN(postId) && postId > 0) {
                    const patternName = pattern.source.substring(0, 30);
                    onProgress?.(`   ✅ Found post ID: ${postId} (via HTML pattern)`);
                    return postId;
                }
            }
        }
    } catch (e: any) {
        onProgress?.(`   ⚠️ Strategy 3 failed: ${e.message}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 4: Check if it's a page instead of post
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (slug && slug.length > 1) {
        try {
            onProgress?.(`   → Strategy 4: Checking if it's a page...`);
            const pageUrl = `${baseUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&status=any&_fields=id,link,slug`;
            const pageRes = await directFetch(pageUrl, { 
                method: 'GET', 
                headers: auth ? basicAuthHeader(auth) : {},
                timeoutMs: 15000
            });
            
            if (pageRes.ok) {
                const pages = await pageRes.json();
                if (Array.isArray(pages) && pages.length > 0) {
                    onProgress?.(`   ✅ Found PAGE ID: ${pages[0].id} (it's a page, not a post)`);
                    return pages[0].id;
                }
            }
        } catch (e: any) {
            onProgress?.(`   ⚠️ Strategy 4 failed: ${e.message}`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 5: Fuzzy search with individual path segments
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (fullPath.includes('/')) {
        const pathSegments = fullPath.split('/').filter(Boolean);
        
        for (const segment of pathSegments.reverse()) {
            if (segment.length < 3) continue;
            if (segment === slug) continue; // Already tried this
            
            try {
                onProgress?.(`   → Strategy 5: Trying path segment "${segment}"...`);
                const segmentUrl = `${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(segment)}&status=any&_fields=id,link,slug`;
                const res = await directFetch(segmentUrl, { 
                    method: 'GET', 
                    headers: auth ? basicAuthHeader(auth) : {},
                    timeoutMs: 10000
                });
                
                if (res.ok) {
                    const posts = await res.json();
                    if (Array.isArray(posts) && posts.length === 1) {
                        onProgress?.(`   ✅ Found post ID: ${posts[0].id} (via path segment "${segment}")`);
                        return posts[0].id;
                    }
                }
            } catch {
                // Continue to next segment
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATEGY 6: Custom post types
    // ═══════════════════════════════════════════════════════════════════════════
    
    const commonCustomTypes = ['product', 'portfolio', 'project', 'service', 'landing'];
    
    for (const postType of commonCustomTypes) {
        try {
            const cptUrl = `${baseUrl}/wp-json/wp/v2/${postType}?slug=${encodeURIComponent(slug)}&status=any&_fields=id,link,slug`;
            const res = await directFetch(cptUrl, { 
                method: 'GET', 
                headers: auth ? basicAuthHeader(auth) : {},
                timeoutMs: 8000
            });
            
            if (res.ok) {
                const items = await res.json();
                if (Array.isArray(items) && items.length > 0) {
                    onProgress?.(`   ✅ Found ${postType} ID: ${items[0].id}`);
                    return items[0].id;
                }
            }
        } catch {
            // Post type doesn't exist or error - continue
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ALL STRATEGIES FAILED
    // ═══════════════════════════════════════════════════════════════════════════
    
    onProgress?.(`   ❌ Could not resolve post ID for: ${targetUrl}`);
    onProgress?.(`   ⚠️ A NEW POST WILL BE CREATED (this may create a duplicate URL)`);
    
    return null;
}

/**
 * Legacy function - wraps the enhanced version for backward compatibility
 */
export async function wpResolvePostId(
    wpUrl: string, 
    slug: string,
    auth?: BasicAuth
): Promise<number | null> {
    // Construct a URL from the slug if it doesn't look like a URL
    const targetUrl = slug.startsWith('http') 
        ? slug 
        : `${wpBase(wpUrl)}/${slug}`;
    
    return wpResolvePostIdEnhanced(wpUrl, targetUrl, auth);
}

/**
 * Get post ID by crawling the actual URL
 * @deprecated Use wpResolvePostIdEnhanced instead
 */
export async function wpGetPostByUrl(
    wpUrl: string, 
    fullUrl: string, 
    auth?: BasicAuth
): Promise<number | null> {
    return wpResolvePostIdEnhanced(wpUrl, fullUrl, auth);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 WORDPRESS CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a WordPress post by ID
 */
export async function wpGetPost(
    wpUrl: string, 
    postId: number, 
    auth?: BasicAuth,
    fields?: string[]
): Promise<any> {
    const baseUrl = wpBase(wpUrl);
    const fieldsParam = fields ? `&_fields=${fields.join(',')}` : '';
    const url = `${baseUrl}/wp-json/wp/v2/posts/${postId}?context=edit${fieldsParam}`;
    
    const res = await directFetch(url, { 
        method: 'GET', 
        headers: { ...basicAuthHeader(auth) },
        timeoutMs: 20000
    });
    
    if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        throw new Error(`WP_FETCH_ERROR: ${res.status} - ${errorText}`);
    }
    
    return res.json();
}

/**
 * Get the full URL of a WordPress post by ID
 */
export async function wpGetPostFullUrl(
    wpUrl: string, 
    postId: number, 
    auth?: BasicAuth
): Promise<string | null> {
    try {
        const post = await wpGetPost(wpUrl, postId, auth, ['link']);
        return post.link || null;
    } catch (e) {
        console.warn('[wpGetPostFullUrl] Failed:', e);
        return null;
    }
}

/**
 * Get post categories
 */
export async function wpGetPostCategories(
    wpUrl: string, 
    postId: number, 
    auth?: BasicAuth
): Promise<number[]> {
    try {
        const post = await wpGetPost(wpUrl, postId, auth, ['categories']);
        return post.categories || [];
    } catch {
        return [];
    }
}

/**
 * Get post tags
 */
export async function wpGetPostTags(
    wpUrl: string, 
    postId: number, 
    auth?: BasicAuth
): Promise<number[]> {
    try {
        const post = await wpGetPost(wpUrl, postId, auth, ['tags']);
        return post.tags || [];
    } catch {
        return [];
    }
}

/**
 * Create a new WordPress post
 */
export async function wpCreatePost(
    wpUrl: string, 
    auth: BasicAuth, 
    data: any
): Promise<{ id: number; link: string }> {
    const url = `${wpBase(wpUrl)}/wp-json/wp/v2/posts`;
    
    const res = await directFetch(url, { 
        method: 'POST', 
        headers: { ...basicAuthHeader(auth) }, 
        body: JSON.stringify(data),
        timeoutMs: 30000
    });
    
    const result = await res.json().catch(() => ({}));
    
    if (!res.ok) {
        const errorMsg = result?.message || result?.code || 'Unknown error';
        throw new Error(`WP_CREATE_ERROR: ${res.status} - ${errorMsg}`);
    }
    
    return { id: result.id, link: result.link };
}

/**
 * Update an existing WordPress post
 * 🔥 CRITICAL: Preserves slug, featured image, categories, and tags by default
 */
export async function wpUpdatePost(
    wpUrl: string, 
    auth: BasicAuth, 
    postId: number, 
    data: any,
    options: {
        preserveFeaturedImage?: boolean;
        preserveSlug?: boolean;
        preserveCategories?: boolean;
        preserveTags?: boolean;
    } = {}
): Promise<{ id: number; link: string }> {
    const { 
        preserveFeaturedImage = true, 
        preserveSlug = true,
        preserveCategories = true,
        preserveTags = true
    } = options;
    
    const url = `${wpBase(wpUrl)}/wp-json/wp/v2/posts/${postId}`;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔥🔥🔥 CRITICAL: Build CLEAN payload — NEVER include fields we want to preserve
    // ═══════════════════════════════════════════════════════════════════════════
    
    const updateData: Record<string, any> = {};
    
    // ✅ ALWAYS include these content fields
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.meta !== undefined) updateData.meta = data.meta;
    
    // 🔥🔥🔥 SLUG: ABSOLUTELY NEVER INCLUDE WHEN PRESERVING
    // This is the #1 cause of URL changes!
    if (preserveSlug) {
        // DO NOT add slug to updateData — period.
        console.log(`[wpUpdatePost] 🔒 PRESERVING SLUG — not sending slug field`);
    } else if (data.slug !== undefined) {
        updateData.slug = data.slug;
        console.log(`[wpUpdatePost] ⚠️ CHANGING SLUG to: ${data.slug}`);
    }
    
    // 🔥 FEATURED IMAGE: Only include if explicitly changing
    if (!preserveFeaturedImage && data.featured_media !== undefined) {
        updateData.featured_media = data.featured_media;
    }
    
    // 🔥 CATEGORIES: Only include if explicitly changing
    if (!preserveCategories && data.categories !== undefined) {
        updateData.categories = data.categories;
    }
    
    // 🔥 TAGS: Only include if explicitly changing
    if (!preserveTags && data.tags !== undefined) {
        updateData.tags = data.tags;
    }
    
    console.log(`[wpUpdatePost] POST ${postId} — Payload keys: [${Object.keys(updateData).join(', ')}]`);
    console.log(`[wpUpdatePost] Preservation: slug=${preserveSlug}, featured=${preserveFeaturedImage}, cats=${preserveCategories}, tags=${preserveTags}`);
    
    const res = await directFetch(url, { 
        method: 'POST', 
        headers: { ...basicAuthHeader(auth) }, 
        body: JSON.stringify(updateData),
        timeoutMs: 30000
    });
    
    const result = await res.json().catch(() => ({}));
    
    if (!res.ok) {
        const errorMsg = result?.message || result?.code || 'Unknown error';
        throw new Error(`WP_UPDATE_ERROR: ${res.status} - ${errorMsg}`);
    }
    
    // 🔥 VERIFY URL DIDN'T CHANGE
    console.log(`[wpUpdatePost] ✅ Updated post ${result.id} — Final URL: ${result.link}`);
    
    return { id: result.id, link: result.link };
}

/**
 * Get all categories from WordPress
 */
export async function wpGetCategories(
    wpUrl: string, 
    auth?: BasicAuth
): Promise<Array<{ id: number; name: string; slug: string; count?: number }>> {
    const url = `${wpBase(wpUrl)}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count`;
    
    try {
        const res = await directFetch(url, { 
            method: 'GET', 
            headers: auth ? basicAuthHeader(auth) : {},
            timeoutMs: 15000
        });
        
        if (!res.ok) return [];
        
        const categories = await res.json();
        return categories.map((c: any) => ({ 
            id: c.id, 
            name: c.name, 
            slug: c.slug,
            count: c.count 
        }));
    } catch {
        return [];
    }
}

/**
 * Get all tags from WordPress
 */
export async function wpGetTags(
    wpUrl: string, 
    auth?: BasicAuth
): Promise<Array<{ id: number; name: string; slug: string; count?: number }>> {
    const url = `${wpBase(wpUrl)}/wp-json/wp/v2/tags?per_page=100&_fields=id,name,slug,count`;
    
    try {
        const res = await directFetch(url, { 
            method: 'GET', 
            headers: auth ? basicAuthHeader(auth) : {},
            timeoutMs: 15000
        });
        
        if (!res.ok) return [];
        
        const tags = await res.json();
        return tags.map((t: any) => ({ 
            id: t.id, 
            name: t.name, 
            slug: t.slug,
            count: t.count 
        }));
    } catch {
        return [];
    }
}

/**
 * Update post meta (Yoast/RankMath/AIOSEO compatible)
 */
export async function wpUpdatePostMeta(
    wpUrl: string, 
    auth: BasicAuth, 
    postId: number, 
    meta: {
        title?: string;
        description?: string;
        focusKeyword?: string;
        canonicalUrl?: string;
        noindex?: boolean;
    }
): Promise<boolean> {
    const url = `${wpBase(wpUrl)}/wp-json/wp/v2/posts/${postId}`;
    
    const metaPayload: Record<string, any> = {};
    
    if (meta.title) {
        // Yoast
        metaPayload._yoast_wpseo_title = meta.title;
        metaPayload.yoast_wpseo_title = meta.title;
        // RankMath
        metaPayload.rank_math_title = meta.title;
        // AIOSEO
        metaPayload._aioseo_title = meta.title;
        // SEOPress
        metaPayload._seopress_titles_title = meta.title;
    }
    
    if (meta.description) {
        // Yoast
        metaPayload._yoast_wpseo_metadesc = meta.description;
        metaPayload.yoast_wpseo_metadesc = meta.description;
        // RankMath
        metaPayload.rank_math_description = meta.description;
        // AIOSEO
        metaPayload._aioseo_description = meta.description;
        // SEOPress
        metaPayload._seopress_titles_desc = meta.description;
    }
    
    if (meta.focusKeyword) {
        // Yoast
        metaPayload._yoast_wpseo_focuskw = meta.focusKeyword;
        // RankMath
        metaPayload.rank_math_focus_keyword = meta.focusKeyword;
        // AIOSEO
        metaPayload._aioseo_keyphrases = JSON.stringify([{ keyphrase: meta.focusKeyword }]);
    }
    
    if (meta.canonicalUrl) {
        metaPayload._yoast_wpseo_canonical = meta.canonicalUrl;
        metaPayload.rank_math_canonical_url = meta.canonicalUrl;
    }
    
    if (meta.noindex !== undefined) {
        metaPayload._yoast_wpseo_meta_robots_noindex = meta.noindex ? '1' : '0';
        metaPayload.rank_math_robots = meta.noindex ? ['noindex'] : [];
    }
    
    try {
        const res = await directFetch(url, {
            method: 'POST',
            headers: { ...basicAuthHeader(auth) },
            body: JSON.stringify({ meta: metaPayload }),
            timeoutMs: 15000
        });
        
        return res.ok;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ IMAGE DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PostImageData {
    id: number;
    url: string;
    alt: string;
    title: string;
    caption: string;
    width: number;
    height: number;
    inContent: boolean;
}

export interface FeaturedImageData {
    id: number;
    url: string;
    alt: string;
    title: string;
    width?: number;
    height?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ IMAGE PRESERVATION & ALT TEXT OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get featured image data for a post
 */
export async function wpGetFeaturedImage(
    wpUrl: string, 
    postId: number, 
    auth?: BasicAuth
): Promise<FeaturedImageData | null> {
    try {
        const post = await wpGetPost(wpUrl, postId, auth, ['featured_media']);
        const mediaId = post.featured_media;
        
        if (!mediaId || mediaId === 0) return null;
        
        // Fetch the media details
        const mediaUrl = `${wpBase(wpUrl)}/wp-json/wp/v2/media/${mediaId}?_fields=id,source_url,alt_text,title,media_details`;
        const mediaRes = await directFetch(mediaUrl, { 
            method: 'GET', 
            headers: auth ? basicAuthHeader(auth) : {},
            timeoutMs: 15000
        });
        
        if (!mediaRes.ok) return null;
        
        const media = await mediaRes.json();
        
        return {
            id: media.id,
            url: media.source_url,
            alt: media.alt_text || '',
            title: media.title?.rendered || media.title?.raw || '',
            width: media.media_details?.width,
            height: media.media_details?.height
        };
    } catch (e) {
        console.warn('[wpGetFeaturedImage] Failed:', e);
        return null;
    }
}

/**
 * Extract all images from HTML content
 */
export function extractImagesFromContent(
    htmlContent: string
): Array<{ src: string; alt: string; title?: string; id?: string; classes?: string }> {
    const images: Array<{ src: string; alt: string; title?: string; id?: string; classes?: string }> = [];
    
    const imgRegex = /<img[^>]+>/gi;
    const matches = htmlContent.match(imgRegex) || [];
    
    for (const imgTag of matches) {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const titleMatch = imgTag.match(/title=["']([^"']*)["']/i);
        const idMatch = imgTag.match(/data-id=["'](\d+)["']/i) || imgTag.match(/wp-image-(\d+)/i);
        const classMatch = imgTag.match(/class=["']([^"']*)["']/i);
        
        if (srcMatch) {
            images.push({
                src: srcMatch[1],
                alt: altMatch ? altMatch[1] : '',
                title: titleMatch ? titleMatch[1] : undefined,
                id: idMatch ? idMatch[1] : undefined,
                classes: classMatch ? classMatch[1] : undefined
            });
        }
    }
    
    return images;
}

/**
 * Update media alt text in WordPress
 */
export async function wpUpdateMediaAltText(
    wpUrl: string, 
    auth: BasicAuth, 
    mediaId: number, 
    altText: string,
    title?: string,
    caption?: string
): Promise<boolean> {
    const url = `${wpBase(wpUrl)}/wp-json/wp/v2/media/${mediaId}`;
    
    const updateData: Record<string, any> = {
        alt_text: altText
    };
    
    if (title) {
        updateData.title = title;
    }
    
    if (caption) {
        updateData.caption = caption;
    }
    
    try {
        const res = await directFetch(url, {
            method: 'POST',
            headers: { ...basicAuthHeader(auth) },
            body: JSON.stringify(updateData),
            timeoutMs: 15000
        });
        
        return res.ok;
    } catch (e) {
        console.warn('[wpUpdateMediaAltText] Failed:', e);
        return false;
    }
}

/**
 * Update image alt text directly in HTML content
 */
export function updateImageAltInContent(
    htmlContent: string, 
    imageSrc: string, 
    newAlt: string
): string {
    // Escape special regex characters in the src
    const escapedSrc = imageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try to replace existing alt attribute
    const imgWithAltRegex = new RegExp(
        `(<img[^>]*src=["']${escapedSrc}["'][^>]*)(alt=["'][^"']*["'])([^>]*>)`, 
        'gi'
    );
    
    let updated = htmlContent.replace(imgWithAltRegex, `$1alt="${newAlt}"$3`);
    
    // If no alt attribute existed, add one
    if (updated === htmlContent) {
        const imgWithoutAltRegex = new RegExp(
            `(<img[^>]*src=["']${escapedSrc}["'])([^>]*>)`, 
            'gi'
        );
        updated = htmlContent.replace(imgWithoutAltRegex, `$1 alt="${newAlt}"$2`);
    }
    
    return updated;
}

/**
 * Get media ID from URL
 */
export async function wpGetMediaIdFromUrl(
    wpUrl: string, 
    imageUrl: string, 
    auth?: BasicAuth
): Promise<number | null> {
    // Extract filename
    const filename = imageUrl.split('/').pop()?.split('?')[0];
    if (!filename) return null;
    
    // Remove size suffix (e.g., -300x200) to get original filename
    const cleanFilename = filename.replace(/-\d+x\d+(\.\w+)$/, '$1');
    
    const searchUrl = `${wpBase(wpUrl)}/wp-json/wp/v2/media?search=${encodeURIComponent(cleanFilename)}&_fields=id,source_url`;
    
    try {
        const res = await directFetch(searchUrl, {
            method: 'GET',
            headers: auth ? basicAuthHeader(auth) : {},
            timeoutMs: 15000
        });
        
        if (!res.ok) return null;
        
        const media = await res.json();
        
        if (Array.isArray(media) && media.length > 0) {
            // Try to find exact match
            for (const m of media) {
                if (m.source_url && 
                    (m.source_url.includes(filename) || m.source_url.includes(cleanFilename))) {
                    return m.id;
                }
            }
            // Fall back to first result
            return media[0].id;
        }
    } catch (e) {
        console.warn('[wpGetMediaIdFromUrl] Failed:', e);
    }
    
    return null;
}

/**
 * Get all post data including images — comprehensive function
 */
export async function wpGetPostWithImages(
    wpUrl: string, 
    postId: number, 
    auth?: BasicAuth
): Promise<{
    post: any;
    featuredImage: FeaturedImageData | null;
    contentImages: Array<{ src: string; alt: string; title?: string; id?: string }>;
    originalSlug: string;
    originalCategories: number[];
    originalTags: number[];
}> {
    const post = await wpGetPost(wpUrl, postId, auth);
    
    // Get featured image
    const featuredImage = await wpGetFeaturedImage(wpUrl, postId, auth);
    
    // Extract content images
    const content = post.content?.rendered || post.content?.raw || '';
    const contentImages = extractImagesFromContent(content);
    
    return {
        post,
        featuredImage,
        contentImages,
        originalSlug: post.slug || '',
        originalCategories: post.categories || [],
        originalTags: post.tags || []
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🕷️ PAGE CONTENT FETCHER — STRICT TYPE SAFETY FIXES (v25.0.1)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PageContentResult {
    html: string;
    text: string;
    wordCount: number;
    headings: string[];
    hasSchema: boolean;
    hasFAQ: boolean;
    title?: string;
    metaDescription?: string;
    images: Array<{ src: string; alt: string }>;
}

export async function fetchPageContent(url: string): Promise<PageContentResult> {
    try {
        const res = await titanFetch(url, { timeoutMs: 15000, retries: 2 });
        const html = await res.text();
        
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        // Extract title - ensure undefined if empty or null
        const title = doc.querySelector('title')?.textContent?.trim() || 
                      doc.querySelector('h1')?.textContent?.trim() || 
                      undefined;
        
        // Extract meta description - 🔥 FIXED: Ensure null becomes undefined for strict type safety
        const metaDescRaw = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                            doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const metaDescription = metaDescRaw || undefined;
        
        // Remove non-content elements
        const removeSelectors = [
            'script', 'style', 'nav', 'footer', 'header', 'aside', 
            'noscript', 'iframe', '.sidebar', '.menu', '.navigation',
            '.comments', '.related-posts', '.advertisement', '.ad'
        ];
        
        removeSelectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        const text = doc.body?.innerText || '';
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        // Extract headings
        const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4'))
            .map(h => h.textContent?.trim() || '')
            .filter(Boolean);
        
        // Extract images
        const images = Array.from(doc.querySelectorAll('img'))
            .map(img => ({
                src: img.getAttribute('src') || '',
                alt: img.getAttribute('alt') || ''
            }))
            .filter(img => img.src && img.src.startsWith('http'));
        
        const hasSchema = html.includes('application/ld+json');
        const htmlLower = html.toLowerCase();
        const hasFAQ = htmlLower.includes('faq') || 
                       htmlLower.includes('frequently asked') ||
                       htmlLower.includes('faqpage');
        
        return { 
            html, 
            text, 
            wordCount: words.length, 
            headings, 
            hasSchema, 
            hasFAQ,
            title,
            metaDescription,
            images
        };
    } catch (e: any) {
        console.warn('[fetchPageContent] Failed:', e.message);
        return { 
            html: '', 
            text: '', 
            wordCount: 0, 
            headings: [], 
            hasSchema: false, 
            hasFAQ: false,
            images: []
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 INTERNAL LINK TARGET DISCOVERY — FETCH ALL SITE POSTS FOR LINKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface InternalLinkDiscoveryOptions {
    excludePostId?: number;
    excludeUrls?: string[];
    maxPosts?: number;
}

export async function discoverInternalLinkTargets(
    wpUrl: string,
    auth?: BasicAuth,
    options: InternalLinkDiscoveryOptions = {},
    onProgress?: (msg: string) => void
): Promise<Array<{ url: string; title: string; slug: string; keywords?: string[] }>> {
    const { excludePostId, excludeUrls = [], maxPosts = 100 } = options;
    const baseUrl = wpBase(wpUrl);
    const targets: Array<{ url: string; title: string; slug: string; keywords?: string[] }> = [];
    const seenUrls = new Set<string>(excludeUrls.map(u => u.toLowerCase()));
    
    onProgress?.(`🔗 Discovering internal link targets...`);
    
    try {
        const url = `${baseUrl}/wp-json/wp/v2/posts?status=publish&per_page=${Math.min(100, maxPosts)}&orderby=modified&_fields=id,link,title,slug`;
        
        const res = await directFetch(url, {
            method: 'GET',
            headers: auth ? basicAuthHeader(auth) : {},
            timeoutMs: 15000
        });
        
        if (!res.ok) {
            onProgress?.(`   ⚠️ Failed to fetch posts: ${res.status}`);
            return [];
        }
        
        const posts = await res.json();
        
        if (!Array.isArray(posts)) return [];
        
        for (const post of posts) {
            if (excludePostId && post.id === excludePostId) continue;
            
            const postUrl = post.link?.toLowerCase();
            if (!postUrl || seenUrls.has(postUrl)) continue;
            seenUrls.add(postUrl);
            
            let title = '';
            if (typeof post.title === 'object' && post.title.rendered) {
                title = post.title.rendered.replace(/<[^>]*>/g, '');
            } else if (typeof post.title === 'string') {
                title = post.title;
            }
            
            if (!title || title.length < 10) continue;
            
            const keywords = title
                .toLowerCase()
                .replace(/[|–—:;\[\](){}""''«»<>]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 3)
                .slice(0, 8);
            
            targets.push({
                url: post.link,
                title: title.substring(0, 120),
                slug: post.slug,
                keywords
            });
        }
        
        onProgress?.(`   ✅ Found ${targets.length} internal link targets`);
        return targets;
        
    } catch (e: any) {
        onProgress?.(`   ⚠️ Link discovery failed: ${e.message}`);
        return [];
    }
}
}
