// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — WORDPRESS REST API PUBLISHER
// ═══════════════════════════════════════════════════════════════════════════════

import { ContentContract } from '../types';

export const WORDPRESS_PUBLISHER_VERSION = "39.0.0";

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WordPressConfig {
    siteUrl: string;
    username: string;
    applicationPassword: string;
}

export interface WordPressValidationResult {
    valid: boolean;
    siteName?: string;
    siteUrl?: string;
    error?: string;
    version?: string;
}

export interface WordPressPublishResult {
    success: boolean;
    postId?: number;
    postUrl?: string;
    error?: string;
}

export interface WordPressPublishOptions {
    status?: 'publish' | 'draft' | 'pending' | 'private';
    categories?: number[];
    tags?: number[];
    featuredMediaId?: number;
    preserveSlug?: boolean;
    preserveFeaturedImage?: boolean;
    existingPostId?: number;
}

type LogFunction = (msg: string) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

function createAuthHeader(username: string, password: string): string {
    const credentials = btoa(`${username}:${password}`);
    return `Basic ${credentials}`;
}

async function wpFetch(
    url: string,
    config: WordPressConfig,
    options: RequestInit = {},
    timeoutMs: number = 30000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': createAuthHeader(config.username, config.applicationPassword),
                'Content-Type': 'application/json',
                ...options.headers,
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ VALIDATE WORDPRESS CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateWordPressConnection(
    config: WordPressConfig,
    log?: LogFunction
): Promise<WordPressValidationResult> {
    log?.('🔌 Validating WordPress connection...');

    if (!config.siteUrl || !config.username || !config.applicationPassword) {
        return { valid: false, error: 'Missing credentials' };
    }

    const baseUrl = normalizeUrl(config.siteUrl);

    try {
        // Test authentication by fetching user info
        const userResponse = await wpFetch(
            `${baseUrl}/wp-json/wp/v2/users/me?context=edit`,
            config,
            { method: 'GET' },
            15000
        );

        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                return { valid: false, error: 'Invalid credentials' };
            }
            if (userResponse.status === 403) {
                return { valid: false, error: 'Insufficient permissions' };
            }
            return { valid: false, error: `HTTP ${userResponse.status}` };
        }

        // Get site info
        const siteResponse = await fetch(`${baseUrl}/wp-json`, { method: 'GET' });
        let siteName = 'WordPress Site';
        let version = '';

        if (siteResponse.ok) {
            const siteData = await siteResponse.json();
            siteName = siteData.name || siteName;
            version = siteData.authentication?.application_passwords?.version || '';
        }

        log?.(`✅ Connected to: ${siteName}`);

        return {
            valid: true,
            siteName,
            siteUrl: baseUrl,
            version,
        };
    } catch (error: any) {
        log?.(`❌ Connection failed: ${error.message}`);
        return { valid: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 PUBLISH TO WORDPRESS
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishToWordPress(
    config: WordPressConfig,
    content: ContentContract,
    options: WordPressPublishOptions = {},
    log?: LogFunction
): Promise<WordPressPublishResult> {
    const {
        status = 'draft',
        categories,
        tags,
        featuredMediaId,
        preserveSlug = true,
        preserveFeaturedImage = true,
        existingPostId,
    } = options;

    log?.(`📤 Publishing to WordPress...`);
    log?.(`   → Status: ${status}`);
    log?.(`   → Title: "${content.title.substring(0, 50)}..."`);

    const baseUrl = normalizeUrl(config.siteUrl);

    try {
        // Build post data
        const postData: Record<string, any> = {
            title: content.title,
            content: content.htmlContent,
            excerpt: content.excerpt || content.metaDescription,
            status,
        };

        // Only include slug if NOT preserving or if creating new post
        if (!preserveSlug || !existingPostId) {
            postData.slug = content.slug;
        }

        // Categories and tags
        if (categories && categories.length > 0) {
            postData.categories = categories;
        }
        if (tags && tags.length > 0) {
            postData.tags = tags;
        }

        // Featured image
        if (featuredMediaId && !preserveFeaturedImage) {
            postData.featured_media = featuredMediaId;
        }

        // SEO meta (Yoast/RankMath compatible)
        postData.meta = {
            _yoast_wpseo_title: content.title,
            _yoast_wpseo_metadesc: content.metaDescription,
            rank_math_title: content.title,
            rank_math_description: content.metaDescription,
        };

        let response: Response;
        let method: string;
        let endpoint: string;

        if (existingPostId) {
            // Update existing post
            method = 'POST';
            endpoint = `${baseUrl}/wp-json/wp/v2/posts/${existingPostId}`;
            log?.(`   → Updating existing post ID: ${existingPostId}`);
        } else {
            // Create new post
            method = 'POST';
            endpoint = `${baseUrl}/wp-json/wp/v2/posts`;
            log?.(`   → Creating new post`);
        }

        response = await wpFetch(
            endpoint,
            config,
            {
                method,
                body: JSON.stringify(postData),
            },
            60000
        );

        if (!response.ok) {
            const errorText = await response.text();
            log?.(`❌ Publish failed: ${response.status}`);
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
            };
        }

        const result = await response.json();

        log?.(`✅ Published successfully!`);
        log?.(`   → Post ID: ${result.id}`);
        log?.(`   → URL: ${result.link}`);

        return {
            success: true,
            postId: result.id,
            postUrl: result.link,
        };
    } catch (error: any) {
        log?.(`❌ Publish error: ${error.message}`);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 GET POST BY SLUG
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPostBySlug(
    config: WordPressConfig,
    slug: string,
    log?: LogFunction
): Promise<{ id: number; title: string; link: string } | null> {
    const baseUrl = normalizeUrl(config.siteUrl);

    try {
        const response = await wpFetch(
            `${baseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=any`,
            config,
            { method: 'GET' },
            15000
        );

        if (!response.ok) return null;

        const posts = await response.json();

        if (Array.isArray(posts) && posts.length > 0) {
            const post = posts[0];
            log?.(`   ✅ Found existing post: ID ${post.id}`);
            return {
                id: post.id,
                title: post.title?.rendered || post.title,
                link: post.link,
            };
        }

        return null;
    } catch (error: any) {
        log?.(`   ⚠️ Post lookup failed: ${error.message}`);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 GET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCategories(
    config: WordPressConfig
): Promise<Array<{ id: number; name: string; slug: string }>> {
    const baseUrl = normalizeUrl(config.siteUrl);

    try {
        const response = await wpFetch(
            `${baseUrl}/wp-json/wp/v2/categories?per_page=100`,
            config,
            { method: 'GET' },
            15000
        );

        if (!response.ok) return [];

        const categories = await response.json();
        return categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
        }));
    } catch {
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ GET TAGS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTags(
    config: WordPressConfig
): Promise<Array<{ id: number; name: string; slug: string }>> {
    const baseUrl = normalizeUrl(config.siteUrl);

    try {
        const response = await wpFetch(
            `${baseUrl}/wp-json/wp/v2/tags?per_page=100`,
            config,
            { method: 'GET' },
            15000
        );

        if (!response.ok) return [];

        const tags = await response.json();
        return tags.map((t: any) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
        }));
    } catch {
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    WORDPRESS_PUBLISHER_VERSION,
    validateWordPressConnection,
    publishToWordPress,
    getPostBySlug,
    getCategories,
    getTags,
};
