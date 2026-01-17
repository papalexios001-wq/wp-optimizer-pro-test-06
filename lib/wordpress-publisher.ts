// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v39.0 — WORDPRESS REST API PUBLISHER
// ═══════════════════════════════════════════════════════════════════════════════
//
// FEATURES:
// ✅ WordPress REST API v2 integration
// ✅ Application Password authentication
// ✅ Create, update, and schedule posts
// ✅ Featured image upload
// ✅ Category and tag management
// ✅ SEO meta fields (Yoast, RankMath, AIOSEO)
// ═══════════════════════════════════════════════════════════════════════════════

import { ContentContract } from '../types';

export const WP_PUBLISHER_VERSION = "15.0.0";

export interface WordPressConfig {
    siteUrl: string;
    username: string;
    applicationPassword: string;
}

export interface PublishResult {
    success: boolean;
    postId?: number;
    postUrl?: string;
    error?: string;
}

export interface WordPressPost {
    id: number;
    title: { rendered: string };
    link: string;
    status: string;
    date: string;
}

type LogFunction = (msg: string) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

function createAuthHeader(username: string, appPassword: string): string {
    const credentials = `${username}:${appPassword}`;
    const encoded = btoa(credentials);
    return `Basic ${encoded}`;
}

function normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
    }
    return normalized.replace(/\/+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 VALIDATE CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateWordPressConnection(
    config: WordPressConfig,
    log: LogFunction
): Promise<{ valid: boolean; error?: string; siteName?: string }> {
    log(`🔌 Validating WordPress connection...`);
    log(`   → Site: ${config.siteUrl}`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    try {
        // Test authentication by fetching user info
        const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                return { valid: false, error: 'Invalid credentials. Check username and application password.' };
            }
            if (response.status === 403) {
                return { valid: false, error: 'Access forbidden. Check user permissions.' };
            }
            if (response.status === 404) {
                return { valid: false, error: 'REST API not found. Is the WordPress REST API enabled?' };
            }
            return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const userData = await response.json();
        
        // Check if user can publish
        if (!userData.capabilities?.publish_posts && !userData.capabilities?.edit_posts) {
            return { valid: false, error: 'User does not have permission to publish posts.' };
        }
        
        // Get site info
        const siteResponse = await fetch(`${baseUrl}/wp-json/`, {
            headers: { 'Authorization': authHeader }
        });
        
        let siteName = 'WordPress Site';
        if (siteResponse.ok) {
            const siteData = await siteResponse.json();
            siteName = siteData.name || siteName;
        }
        
        log(`   ✅ Connected as: ${userData.name || userData.slug}`);
        log(`   ✅ Site: ${siteName}`);
        
        return { valid: true, siteName };
        
    } catch (error: any) {
        log(`   ❌ Connection failed: ${error.message}`);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return { valid: false, error: 'Network error. Check the site URL and ensure CORS is configured.' };
        }
        
        return { valid: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 PUBLISH POST
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishToWordPress(
    config: WordPressConfig,
    contract: ContentContract,
    options: {
        status?: 'publish' | 'draft' | 'pending' | 'future';
        scheduleDate?: string;
        categoryIds?: number[];
        tagIds?: number[];
        featuredImageId?: number;
        updateExistingId?: number;
        seoPlugin?: 'yoast' | 'rankmath' | 'aioseo' | 'none';
    } = {},
    log: LogFunction
): Promise<PublishResult> {
    log(`📤 Publishing to WordPress...`);
    log(`   → Title: "${contract.title.substring(0, 50)}..."`);
    log(`   → Status: ${options.status || 'draft'}`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    const {
        status = 'draft',
        scheduleDate,
        categoryIds = [],
        tagIds = [],
        featuredImageId,
        updateExistingId,
        seoPlugin = 'none'
    } = options;
    
    // Build post data
    const postData: Record<string, any> = {
        title: contract.title,
        content: contract.htmlContent,
        excerpt: contract.excerpt || '',
        slug: contract.slug,
        status: scheduleDate ? 'future' : status,
    };
    
    // Schedule date
    if (scheduleDate) {
        postData.date = scheduleDate;
    }
    
    // Categories
    if (categoryIds.length > 0) {
        postData.categories = categoryIds;
    }
    
    // Tags
    if (tagIds.length > 0) {
        postData.tags = tagIds;
    }
    
    // Featured image
    if (featuredImageId) {
        postData.featured_media = featuredImageId;
    }
    
    // SEO fields
    if (seoPlugin !== 'none' && contract.metaDescription) {
        switch (seoPlugin) {
            case 'yoast':
                postData.meta = {
                    _yoast_wpseo_metadesc: contract.metaDescription,
                    _yoast_wpseo_focuskw: contract.focusKeyword || ''
                };
                break;
            case 'rankmath':
                postData.meta = {
                    rank_math_description: contract.metaDescription,
                    rank_math_focus_keyword: contract.focusKeyword || ''
                };
                break;
            case 'aioseo':
                postData.meta = {
                    _aioseo_description: contract.metaDescription,
                    _aioseo_keywords: contract.focusKeyword || ''
                };
                break;
        }
    }
    
    try {
        const endpoint = updateExistingId
            ? `${baseUrl}/wp-json/wp/v2/posts/${updateExistingId}`
            : `${baseUrl}/wp-json/wp/v2/posts`;
        
        const method = updateExistingId ? 'PUT' : 'POST';
        
        log(`   → Endpoint: ${method} ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `HTTP ${response.status}`;
            log(`   ❌ Publish failed: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
        
        const result = await response.json();
        
        log(`   ✅ Published successfully!`);
        log(`   → Post ID: ${result.id}`);
        log(`   → URL: ${result.link}`);
        
        return {
            success: true,
            postId: result.id,
            postUrl: result.link
        };
        
    } catch (error: any) {
        log(`   ❌ Publish error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📂 GET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWordPressCategories(
    config: WordPressConfig,
    log: LogFunction
): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    log(`📂 Fetching categories...`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    try {
        const response = await fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=100`, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            log(`   ⚠️ Failed to fetch categories`);
            return [];
        }
        
        const categories = await response.json();
        
        log(`   ✅ Found ${categories.length} categories`);
        
        return categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            count: cat.count
        }));
        
    } catch (error: any) {
        log(`   ❌ Error: ${error.message}`);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ GET TAGS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWordPressTags(
    config: WordPressConfig,
    log: LogFunction
): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    log(`🏷️ Fetching tags...`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    try {
        const response = await fetch(`${baseUrl}/wp-json/wp/v2/tags?per_page=100`, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            log(`   ⚠️ Failed to fetch tags`);
            return [];
        }
        
        const tags = await response.json();
        
        log(`   ✅ Found ${tags.length} tags`);
        
        return tags.map((tag: any) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            count: tag.count
        }));
        
    } catch (error: any) {
        log(`   ❌ Error: ${error.message}`);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ UPLOAD MEDIA
// ═══════════════════════════════════════════════════════════════════════════════

export async function uploadMediaToWordPress(
    config: WordPressConfig,
    file: File,
    log: LogFunction
): Promise<{ success: boolean; mediaId?: number; url?: string; error?: string }> {
    log(`🖼️ Uploading media: ${file.name}`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Disposition': `attachment; filename="${file.name}"`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.message || `HTTP ${response.status}` };
        }
        
        const result = await response.json();
        
        log(`   ✅ Uploaded: ${result.source_url}`);
        
        return {
            success: true,
            mediaId: result.id,
            url: result.source_url
        };
        
    } catch (error: any) {
        log(`   ❌ Upload error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 GET POSTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getWordPressPosts(
    config: WordPressConfig,
    options: {
        perPage?: number;
        page?: number;
        status?: 'publish' | 'draft' | 'pending' | 'any';
        search?: string;
    } = {},
    log: LogFunction
): Promise<WordPressPost[]> {
    const { perPage = 20, page = 1, status = 'any', search } = options;
    
    log(`📋 Fetching posts (page ${page})...`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    let endpoint = `${baseUrl}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}`;
    
    if (status !== 'any') {
        endpoint += `&status=${status}`;
    } else {
        endpoint += `&status=publish,draft,pending`;
    }
    
    if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
    }
    
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            log(`   ⚠️ Failed to fetch posts`);
            return [];
        }
        
        const posts = await response.json();
        
        log(`   ✅ Found ${posts.length} posts`);
        
        return posts.map((post: any) => ({
            id: post.id,
            title: post.title,
            link: post.link,
            status: post.status,
            date: post.date
        }));
        
    } catch (error: any) {
        log(`   ❌ Error: ${error.message}`);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🗑️ DELETE POST
// ═══════════════════════════════════════════════════════════════════════════════

export async function deleteWordPressPost(
    config: WordPressConfig,
    postId: number,
    force: boolean = false,
    log: LogFunction
): Promise<{ success: boolean; error?: string }> {
    log(`🗑️ Deleting post ${postId}...`);
    
    const baseUrl = normalizeUrl(config.siteUrl);
    const authHeader = createAuthHeader(config.username, config.applicationPassword);
    
    try {
        const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${postId}?force=${force}`, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.message || `HTTP ${response.status}` };
        }
        
        log(`   ✅ Post deleted`);
        
        return { success: true };
        
    } catch (error: any) {
        log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    validateWordPressConnection,
    publishToWordPress,
    getWordPressCategories,
    getWordPressTags,
    uploadMediaToWordPress,
    getWordPressPosts,
    deleteWordPressPost
};

