// lib/youtube-integration.ts — NEW FILE

import { serperSearch } from '../fetch-service';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  views: number;
  duration: string;
  thumbnail: string;
  relevanceScore: number;
}

export interface YouTubeSearchResult {
  video: YouTubeVideo | null;
  searchQuery: string;
  alternates: YouTubeVideo[];
}

/**
 * Search for relevant YouTube videos using Serper API
 * Validates quality (views, relevance) before returning
 */
export async function searchAndValidateYouTubeVideo(
  topic: string,
  serperApiKey: string,
  options: {
    minViews?: number;
    maxAgeDays?: number;
    preferredChannels?: string[];
  } = {},
  log?: (msg: string) => void
): Promise<YouTubeSearchResult> {
  const { minViews = 10000, maxAgeDays = 365 } = options;
  
  log?.(`🎬 Searching YouTube for: "${topic}"`);
  
  // Build optimized search queries
  const searchQueries = [
    `${topic} tutorial guide ${new Date().getFullYear()}`,
    `${topic} explained step by step`,
    `how to ${topic} complete guide`,
    `${topic} tips and strategies`
  ];
  
  const allVideos: YouTubeVideo[] = [];
  
  for (const query of searchQueries.slice(0, 2)) {
    try {
      const result = await serperSearch(serperApiKey, query, {
        type: 'videos',
        num: 10,
        gl: 'us',
        hl: 'en'
      });
      
      const videos = (result as any).videos || [];
      
      for (const video of videos) {
        if (!video.link?.includes('youtube.com/watch')) continue;
        
        // Extract video ID
        const videoIdMatch = video.link.match(/[?&]v=([^&]+)/);
        if (!videoIdMatch) continue;
        
        // Parse view count
        const viewsMatch = video.views?.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(K|M|B)?/i);
        let views = 0;
        if (viewsMatch) {
          views = parseFloat(viewsMatch[1].replace(/,/g, ''));
          const multiplier = { K: 1000, M: 1000000, B: 1000000000 }[viewsMatch[2]?.toUpperCase()] || 1;
          views *= multiplier;
        }
        
        // Skip low-quality videos
        if (views < minViews) continue;
        
        // Calculate relevance score
        const titleLower = (video.title || '').toLowerCase();
        const topicWords = topic.toLowerCase().split(/\s+/);
        const matchedWords = topicWords.filter(w => titleLower.includes(w));
        const relevanceScore = (matchedWords.length / topicWords.length) * 100;
        
        allVideos.push({
          videoId: videoIdMatch[1],
          title: video.title || 'Untitled',
          channel: video.channel || 'Unknown',
          views,
          duration: video.duration || '',
          thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
          relevanceScore
        });
      }
    } catch (e: any) {
      log?.(`   ⚠️ Search failed for query: ${e.message}`);
    }
  }
  
  // Sort by relevance * views (quality score)
  allVideos.sort((a, b) => {
    const scoreA = a.relevanceScore * Math.log10(a.views + 1);
    const scoreB = b.relevanceScore * Math.log10(b.views + 1);
    return scoreB - scoreA;
  });
  
  // Deduplicate by videoId
  const uniqueVideos = allVideos.filter((v, i, arr) => 
    arr.findIndex(x => x.videoId === v.videoId) === i
  );
  
  if (uniqueVideos.length === 0) {
    log?.(`   ❌ No suitable videos found`);
    return { video: null, searchQuery: searchQueries[0], alternates: [] };
  }
  
  const bestVideo = uniqueVideos[0];
  log?.(`   ✅ Found: "${bestVideo.title}" (${formatViews(bestVideo.views)} views)`);
  
  return {
    video: bestVideo,
    searchQuery: searchQueries[0],
    alternates: uniqueVideos.slice(1, 5)
  };
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

/**
 * Generate responsive YouTube embed HTML with schema markup
 */
export function generateYouTubeEmbed(video: YouTubeVideo, topic: string): string {
  return `
<!-- YouTube Video: ${video.title} -->
<div style="
  margin: clamp(32px, 8vw, 64px) 0 !important;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
  border-radius: 20px !important;
  padding: clamp(20px, 5vw, 32px) !important;
  box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
" itemscope itemtype="https://schema.org/VideoObject">
  <meta itemprop="name" content="${escapeHtml(video.title)}" />
  <meta itemprop="description" content="Video guide about ${escapeHtml(topic)}" />
  <meta itemprop="thumbnailUrl" content="${video.thumbnail}" />
  <meta itemprop="uploadDate" content="${new Date().toISOString()}" />
  
  <div style="
    display: flex !important;
    align-items: center !important;
    gap: clamp(12px, 3vw, 16px) !important;
    margin-bottom: clamp(16px, 4vw, 24px) !important;
  ">
    <div style="
      width: clamp(44px, 11vw, 52px) !important;
      height: clamp(44px, 11vw, 52px) !important;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
      border-radius: 14px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 4px 16px rgba(239,68,68,0.35) !important;
    ">
      <span style="font-size: clamp(20px, 5vw, 26px) !important;">▶️</span>
    </div>
    <div>
      <div style="
        color: #f1f5f9 !important;
        font-size: clamp(14px, 3.5vw, 18px) !important;
        font-weight: 700 !important;
        line-height: 1.3 !important;
      ">${escapeHtml(video.title.substring(0, 60))}${video.title.length > 60 ? '...' : ''}</div>
      <div style="
        color: #94a3b8 !important;
        font-size: clamp(11px, 2.8vw, 13px) !important;
        margin-top: 4px !important;
      ">${escapeHtml(video.channel)} • ${formatViews(video.views)} views</div>
    </div>
  </div>
  
  <div style="
    position: relative !important;
    width: 100% !important;
    padding-bottom: 56.25% !important;
    height: 0 !important;
    overflow: hidden !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
  ">
    <iframe
      style="
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        border-radius: 12px !important;
      "
      src="https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1"
      title="${escapeHtml(video.title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
