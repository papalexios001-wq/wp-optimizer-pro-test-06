// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — MAIN APPLICATION COMPONENT 
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    orchestrator,
    AI_ORCHESTRATOR_VERSION,
    VALID_GEMINI_MODELS,
    OPENROUTER_MODELS,
    GROQ_MODELS,
    StageProgress,
    GenerationResult
} from './lib/ai-orchestrator';
import { crawlSitemap, convertToInternalLinkTargets } from './lib/sitemap-crawler';
import {
    validateWordPressConnection,
    publishToWordPress,
    WordPressConfig
} from './lib/wordpress-publisher';
import {
    ContentContract,
    GenerateConfig,
    CrawledPage,
    InternalLinkTarget,
    BulkGenerationResult,
    APIKeyConfig
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px'
    },
    header: {
        textAlign: 'center' as const,
        marginBottom: '40px',
        padding: '30px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(99, 102, 241, 0.2)'
    },
    title: {
        fontSize: '36px',
        fontWeight: 900,
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: '0 0 10px 0'
    },
    subtitle: {
        fontSize: '16px',
        color: '#94a3b8',
        margin: 0
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        maxWidth: '1600px',
        margin: '0 auto'
    },
    card: {
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        backdropFilter: 'blur(10px)'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#f1f5f9',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '10px',
        color: '#e2e8f0',
        fontSize: '14px',
        marginBottom: '12px',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    select: {
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '10px',
        color: '#e2e8f0',
        fontSize: '14px',
        marginBottom: '12px',
        outline: 'none',
        cursor: 'pointer'
    },
    textarea: {
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '10px',
        color: '#e2e8f0',
        fontSize: '14px',
        marginBottom: '12px',
        outline: 'none',
        resize: 'vertical' as const,
        minHeight: '100px',
        fontFamily: 'inherit'
    },
    button: {
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
    },
    buttonSecondary: {
        padding: '14px 28px',
        background: 'transparent',
        border: '2px solid rgba(99, 102, 241, 0.5)',
        borderRadius: '10px',
        color: '#a5b4fc',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    buttonDanger: {
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer'
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600,
        color: '#94a3b8',
        marginBottom: '6px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px'
    },
    logContainer: {
        background: 'rgba(15, 23, 42, 0.9)',
        borderRadius: '10px',
        padding: '16px',
        maxHeight: '300px',
        overflowY: 'auto' as const,
        fontFamily: 'Monaco, Consolas, monospace',
        fontSize: '12px',
        lineHeight: '1.6',
        marginTop: '16px'
    },
    progressBar: {
        width: '100%',
        height: '8px',
        background: 'rgba(99, 102, 241, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '12px'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
        borderRadius: '4px',
        transition: 'width 0.3s ease'
    },
    badge: {
        display: 'inline-block',
        padding: '4px 10px',
        background: 'rgba(99, 102, 241, 0.2)',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#a5b4fc',
        textTransform: 'uppercase' as const
    },
    stat: {
        textAlign: 'center' as const,
        padding: '16px',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '12px',
        flex: 1
    },
    statValue: {
        fontSize: '28px',
        fontWeight: 900,
        color: '#a5b4fc',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '11px',
        color: '#64748b',
        textTransform: 'uppercase' as const
    },
    preview: {
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        color: '#1f2937',
        maxHeight: '500px',
        overflowY: 'auto' as const,
        fontSize: '16px',
        lineHeight: '1.7'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
    // ═══════════════════════════════════════════════════════════════════════════
    // 📊 STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    // API Keys
    const [apiKeys, setApiKeys] = useState<APIKeyConfig>(() => {
        const saved = localStorage.getItem('wpo_api_keys');
        return saved ? JSON.parse(saved) : {};
    });
    
    // Provider selection
    const [provider, setProvider] = useState<'google' | 'openrouter' | 'openai' | 'anthropic' | 'groq'>('google');
    const [model, setModel] = useState('gemini-2.5-flash-preview-05-20');
    
    // Content generation
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<StageProgress | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    
    // Sitemap crawler
    const [sitemapUrl, setSitemapUrl] = useState('');
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
    const [internalLinks, setInternalLinks] = useState<InternalLinkTarget[]>([]);
    
    // WordPress
    const [wpConfig, setWpConfig] = useState<WordPressConfig>(() => {
        const saved = localStorage.getItem('wpo_wp_config');
        return saved ? JSON.parse(saved) : { siteUrl: '', username: '', applicationPassword: '' };
    });
    const [wpConnected, setWpConnected] = useState(false);
    const [wpSiteName, setWpSiteName] = useState('');
    
    // Bulk generation
    const [bulkUrls, setBulkUrls] = useState<string[]>([]);
    const [bulkResults, setBulkResults] = useState<BulkGenerationResult[]>([]);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    
    // Refs
    const logContainerRef = useRef<HTMLDivElement>(null);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔧 EFFECTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Save API keys to localStorage
    useEffect(() => {
        localStorage.setItem('wpo_api_keys', JSON.stringify(apiKeys));
    }, [apiKeys]);
    
    // Save WP config to localStorage
    useEffect(() => {
        localStorage.setItem('wpo_wp_config', JSON.stringify(wpConfig));
    }, [wpConfig]);
    
    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📝 LOG FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    const log = useCallback((msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
        console.log(`[WPO] ${msg}`);
    }, []);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🕷️ SITEMAP CRAWLER
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleCrawlSitemap = useCallback(async () => {
        if (!sitemapUrl.trim()) {
            log('❌ Please enter a sitemap URL');
            return;
        }
        
        setIsCrawling(true);
        setCrawledPages([]);
        setInternalLinks([]);
        
        try {
            const pages = await crawlSitemap(
                sitemapUrl,
                log,
                (current, total) => {
                    log(`   📊 Progress: ${current}/${total} URLs`);
                }
            );
            
            setCrawledPages(pages);
            
            const links = convertToInternalLinkTargets(pages);
            setInternalLinks(links);
            
            log(`✅ Crawl complete: ${pages.length} pages ready for internal linking`);
            
        } catch (error: any) {
            log(`❌ Crawl failed: ${error.message}`);
        } finally {
            setIsCrawling(false);
        }
    }, [sitemapUrl, log]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🚀 GENERATE CONTENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            log('❌ Please enter a topic');
            return;
        }
        
        // Validate API key
        const providerKeyMap: Record<string, string | undefined> = {
            google: apiKeys.google,
            openrouter: apiKeys.openrouter,
            openai: apiKeys.openai,
            anthropic: apiKeys.anthropic,
            groq: apiKeys.groq
        };
        
        if (!providerKeyMap[provider]) {
            log(`❌ Please enter your ${provider} API key`);
            return;
        }
        
        setIsGenerating(true);
        setProgress(null);
        setResult(null);
        setLogs([]);
        
        // Debug: Check API keys
        log('🔑 API Keys Check:');
        log(`   → ${provider}: ✅`);
        log(`   → serper: ${apiKeys.serper ? '✅' : '❌ MISSING (YouTube/References disabled)'}`);
        
        const config: GenerateConfig = {
            topic: topic.trim(),
            provider,
            model,
            apiKeys: {
                google: apiKeys.google,
                openrouter: apiKeys.openrouter,
                openrouterModel: apiKeys.openrouterModel,
                openai: apiKeys.openai,
                anthropic: apiKeys.anthropic,
                groq: apiKeys.groq,
                groqModel: apiKeys.groqModel,
                serper: apiKeys.serper, // CRITICAL: Pass Serper key!
            },
            internalLinks: internalLinks.length > 0 ? internalLinks : undefined,
        };
        
        try {
            const generationResult = await orchestrator.generate(
                config,
                log,
                (p) => setProgress(p)
            );
            
            setResult(generationResult);
            log(`🎉 Generation complete!`);
            
        } catch (error: any) {
            log(`❌ Generation failed: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    }, [topic, provider, model, apiKeys, internalLinks, log]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔌 WORDPRESS CONNECTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleConnectWordPress = useCallback(async () => {
        if (!wpConfig.siteUrl || !wpConfig.username || !wpConfig.applicationPassword) {
            log('❌ Please fill in all WordPress credentials');
            return;
        }
        
        const validation = await validateWordPressConnection(wpConfig, log);
        
        if (validation.valid) {
            setWpConnected(true);
            setWpSiteName(validation.siteName || '');
            log(`✅ Connected to WordPress: ${validation.siteName}`);
        } else {
            setWpConnected(false);
            log(`❌ WordPress connection failed: ${validation.error}`);
        }
    }, [wpConfig, log]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📤 PUBLISH TO WORDPRESS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handlePublish = useCallback(async (status: 'publish' | 'draft' = 'draft') => {
        if (!result?.contract) {
            log('❌ No content to publish');
            return;
        }
        
        if (!wpConnected) {
            log('❌ Please connect to WordPress first');
            return;
        }
        
        const publishResult = await publishToWordPress(
            wpConfig,
            result.contract,
            { status },
            log
        );
        
        if (publishResult.success) {
            log(`✅ Published: ${publishResult.postUrl}`);
        } else {
            log(`❌ Publish failed: ${publishResult.error}`);
        }
    }, [result, wpConnected, wpConfig, log]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 📋 COPY TO CLIPBOARD
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleCopyHtml = useCallback(() => {
        if (result?.contract?.htmlContent) {
            navigator.clipboard.writeText(result.contract.htmlContent);
            log('✅ HTML copied to clipboard');
        }
    }, [result, log]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🎨 RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    
    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <h1 style={styles.title}>🚀 WP Optimizer Pro</h1>
                <p style={styles.subtitle}>
                    Enterprise AI Content Generation Engine v{AI_ORCHESTRATOR_VERSION}
                </p>
            </header>
            
            <div style={styles.grid}>
                {/* API Keys Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>🔑 API Configuration</h2>
                    
                    <label style={styles.label}>Provider</label>
                    <select
                        style={styles.select}
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as any)}
                    >
                        <option value="google">Google (Gemini)</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="groq">Groq</option>
                    </select>
                    
                    {provider === 'google' && (
                        <>
                            <label style={styles.label}>Google API Key</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="AIza..."
                                value={apiKeys.google || ''}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                            />
                            <label style={styles.label}>Model</label>
                            <select
                                style={styles.select}
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            >
                                {Object.entries(VALID_GEMINI_MODELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </>
                    )}
                    
                    {provider === 'openrouter' && (
                        <>
                            <label style={styles.label}>OpenRouter API Key</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="sk-or-..."
                                value={apiKeys.openrouter || ''}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, openrouter: e.target.value }))}
                            />
                            <label style={styles.label}>Model</label>
                            <select
                                style={styles.select}
                                value={apiKeys.openrouterModel || OPENROUTER_MODELS[0]}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, openrouterModel: e.target.value }))}
                            >
                                {OPENROUTER_MODELS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </>
                    )}
                    
                    {provider === 'openai' && (
                        <>
                            <label style={styles.label}>OpenAI API Key</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="sk-..."
                                value={apiKeys.openai || ''}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                            />
                        </>
                    )}
                    
                    {provider === 'anthropic' && (
                        <>
                            <label style={styles.label}>Anthropic API Key</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="sk-ant-..."
                                value={apiKeys.anthropic || ''}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                            />
                        </>
                    )}
                    
                    {provider === 'groq' && (
                        <>
                            <label style={styles.label}>Groq API Key</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="gsk_..."
                                value={apiKeys.groq || ''}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, groq: e.target.value }))}
                            />
                            <label style={styles.label}>Model</label>
                            <select
                                style={styles.select}
                                value={apiKeys.groqModel || GROQ_MODELS[0]}
                                onChange={(e) => setApiKeys(prev => ({ ...prev, groqModel: e.target.value }))}
                            >
                                {GROQ_MODELS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </>
                    )}
                    
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(99,102,241,0.2)', margin: '20px 0' }} />
                    
                    <label style={styles.label}>Serper API Key (YouTube + References)</label>
                    <input
                        type="password"
                        style={styles.input}
                        placeholder="Your Serper.dev API key"
                        value={apiKeys.serper || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, serper: e.target.value }))}
                    />
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                        Required for YouTube video discovery and reference citations
                    </p>
                </div>
                
                {/* Sitemap Crawler Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>🕷️ Sitemap Crawler</h2>
                    
                    <label style={styles.label}>Sitemap URL</label>
                    <input
                        type="text"
                        style={styles.input}
                        placeholder="https://example.com/sitemap.xml"
                        value={sitemapUrl}
                        onChange={(e) => setSitemapUrl(e.target.value)}
                    />
                    
                    <button
                        style={{ ...styles.button, width: '100%', opacity: isCrawling ? 0.7 : 1 }}
                        onClick={handleCrawlSitemap}
                        disabled={isCrawling}
                    >
                        {isCrawling ? '🔄 Crawling...' : '🕷️ Crawl Sitemap'}
                    </button>
                    
                    {crawledPages.length > 0 && (
                        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                            <div style={styles.stat}>
                                <div style={styles.statValue}>{crawledPages.length}</div>
                                <div style={styles.statLabel}>Pages Found</div>
                            </div>
                            <div style={styles.stat}>
                                <div style={styles.statValue}>{internalLinks.length}</div>
                                <div style={styles.statLabel}>Link Targets</div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* WordPress Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>📤 WordPress Publishing</h2>
                    
                    <label style={styles.label}>Site URL</label>
                    <input
                        type="text"
                        style={styles.input}
                        placeholder="https://yoursite.com"
                        value={wpConfig.siteUrl}
                        onChange={(e) => setWpConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
                    />
                    
                    <label style={styles.label}>Username</label>
                    <input
                        type="text"
                        style={styles.input}
                        placeholder="admin"
                        value={wpConfig.username}
                        onChange={(e) => setWpConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                    
                    <label style={styles.label}>Application Password</label>
                    <input
                        type="password"
                        style={styles.input}
                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                        value={wpConfig.applicationPassword}
                        onChange={(e) => setWpConfig(prev => ({ ...prev, applicationPassword: e.target.value }))}
                    />
                    
                    <button
                        style={{ ...styles.buttonSecondary, width: '100%' }}
                        onClick={handleConnectWordPress}
                    >
                        {wpConnected ? `✅ Connected: ${wpSiteName}` : '🔌 Connect'}
                    </button>
                </div>
                
                {/* Content Generation Card */}
                <div style={{ ...styles.card, gridColumn: 'span 2' }}>
                    <h2 style={styles.cardTitle}>✨ Content Generation</h2>
                    
                    <label style={styles.label}>Topic / Keyword</label>
                    <textarea
                        style={styles.textarea}
                        placeholder="Enter your topic, keyword, or content brief..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <button
                            style={{ ...styles.button, flex: 1, opacity: isGenerating ? 0.7 : 1 }}
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? '🔄 Generating...' : '🚀 Generate Content'}
                        </button>
                        
                        {result && (
                            <>
                                <button style={styles.buttonSecondary} onClick={handleCopyHtml}>
                                    📋 Copy HTML
                                </button>
                                {wpConnected && (
                                    <>
                                        <button
                                            style={styles.buttonSecondary}
                                            onClick={() => handlePublish('draft')}
                                        >
                                            📝 Save Draft
                                        </button>
                                        <button
                                            style={styles.button}
                                            onClick={() => handlePublish('publish')}
                                        >
                                            🚀 Publish
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    
                    {/* Progress */}
                    {progress && (
                        <div>
                            <div style={styles.progressBar}>
                                <div style={{ ...styles.progressFill, width: `${progress.progress}%` }} />
                            </div>
                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                                {progress.message} ({progress.progress}%)
                            </p>
                        </div>
                    )}
                    
                    {/* Stats */}
                    {result && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <div style={styles.stat}>
                                <div style={styles.statValue}>{result.contract.wordCount.toLocaleString()}</div>
                                <div style={styles.statLabel}>Words</div>
                            </div>
                            <div style={styles.stat}>
                                <div style={styles.statValue}>{result.youtubeVideo ? '1' : '0'}</div>
                                <div style={styles.statLabel}>Video</div>
                            </div>
                            <div style={styles.stat}>
                                <div style={styles.statValue}>{result.references?.length || 0}</div>
                                <div style={styles.statLabel}>References</div>
                            </div>
                            <div style={styles.stat}>
                                <div style={styles.statValue}>{(result.totalTime / 1000).toFixed(1)}s</div>
                                <div style={styles.statLabel}>Time</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Logs */}
                    <div ref={logContainerRef} style={styles.logContainer}>
                        {logs.map((logLine, i) => (
                            <div key={i} style={{ color: logLine.includes('❌') ? '#ef4444' : logLine.includes('✅') ? '#22c55e' : '#94a3b8' }}>
                                {logLine}
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div style={{ color: '#64748b' }}>Logs will appear here...</div>
                        )}
                    </div>
                </div>
                
                {/* Preview Card */}
                {result && (
                    <div style={{ ...styles.card, gridColumn: 'span 2' }}>
                        <h2 style={styles.cardTitle}>👁️ Content Preview</h2>
                        <div
                            style={styles.preview}
                            dangerouslySetInnerHTML={{ __html: result.contract.htmlContent }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
