// CTA LINKS, FAQ ACCORDION, SCHEMA MARKUP & YOUTUBE VIDEO INTEGRATION
// WP Optimizer Pro v30.0 - Enterprise SOTA Implementation

// =======================
// CTA BOX WITH LINKED TEXT
// =======================

export interface CTABoxConfig {
  heading: string;
  description: string;
  buttonText: string;
  targetLink: string;  // Internal link URL
  emoji?: string;
}

// Create SOTA CTA box with semantically validated button link
export function createCTABox(config: CTABoxConfig): string {
  const { emoji = '🚀', heading, description, buttonText, targetLink } = config;
  
  return `
<div class="cta-box" style="background-color: #f8f9fa; padding: 32px; border-radius: 12px; margin: 32px 0;">
  <h3 style="margin-top: 0; color: #1f2937; font-size: 24px;">${emoji} ${heading}</h3>
  <p style="color: #4b5563; line-height: 1.6;">${description}</p>
  <a href="${targetLink}" class="cta-button" data-internal-link="true" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">${buttonText} →</a>
</div>
`;
}

// ==========================
// ENTERPRISE FAQ ACCORDION
// ==========================

export interface FAQItem {
  question: string;
  answer: string;
}

export function createEnterpriseAccordion(items: FAQItem[], title: string = 'Frequently Asked Questions'): string {
  let html = `<section class="faq-accordion" style="margin: 40px 0; background-color: #ffffff; padding: 32px; border-radius: 12px;">`;
  html += `<h2 style="color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 24px;">${title}</h2>`;
  html += `<div class="faq-items" role="region">`;

  items.forEach((item, index) => {
    html += `
    <details class="faq-item" style="margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <summary style="padding: 16px; background-color: #3b82f6; color: white; cursor: pointer; font-weight: 600;">${item.question}</summary>
      <div style="padding: 20px; background-color: #f9fafb;">
        <p style="color: #4b5563; line-height: 1.8;">${item.answer}</p>
      </div>
    </details>
    `;
  });

  html += `</div></section>`;
  return html;
}

// ==========================
// ENTERPRISE SCHEMA MARKUP
// ==========================

export function generateEnterpriseSchema(options: {
  articleTitle: string;
  articleDescription: string;
  author: string;
  publishDate: string;
  modifiedDate: string;
  faqs?: FAQItem[];
  videoUrl?: string;
}): string {
  const schemas = [];

  // NewsArticle Schema
  const newsArticle = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: options.articleTitle,
    description: options.articleDescription,
    author: { '@type': 'Person', name: options.author },
    datePublished: options.publishDate,
    dateModified: options.modifiedDate,
    publisher: {
      '@type': 'Organization',
      name: 'WP Optimizer Pro',
      logo: 'https://wp-optimizer-pro.com/logo.png'
    }
  };
  schemas.push(newsArticle);

  // FAQPage Schema
  if (options.faqs && options.faqs.length > 0) {
    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: options.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer }
      }))
    };
    schemas.push(faqPage);
  }

  // VideoObject Schema
  if (options.videoUrl) {
    const videoObject = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: options.articleTitle,
      description: options.articleDescription,
      url: options.videoUrl,
      uploadDate: options.publishDate
    };
    schemas.push(videoObject);
  }

  // BreadcrumbList
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://wp-optimizer-pro.com' },
      { '@type': 'ListItem', position: 2, name: options.articleTitle, item: 'https://wp-optimizer-pro.com/article' }
    ]
  };
  schemas.push(breadcrumbList);

  return schemas.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
}

// ==========================
// YOUTUBE VIDEO WITH SERPER API
// ==========================

export async function searchYouTubeVideoSerper(query: string, serperApiKey: string): Promise<any | null> {
  try {
    const response = await fetch('https://google.serper.dev/videos', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 5 })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.videos?.[0] || null;
  } catch (error) {
    console.error('Serper API error:', error);
    return null;
  }
}

export function createYouTubeEmbed(videoUrl: string, title: string): string {
  const videoId = videoUrl.includes('youtu.be') 
    ? videoUrl.split('youtu.be/')[1]?.split('?')[0]
    : new URL(videoUrl).searchParams.get('v');

  if (!videoId) return '';

  return `
<figure class="youtube-embed" style="margin: 32px 0; position: relative; width: 100%; padding-bottom: 56.25%;">
  <figcaption style="font-weight: 600; margin-bottom: 12px;">${title}</figcaption>
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" src="https://www.youtube.com/embed/${videoId}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy"></iframe>
</figure>
`;
}


// ==========================
// INTEGRATED YOUTUBE SOLUTION
// ==========================
export async function integrateYouTubeVideoIntoContent(
  htmlContent: string,
  articleTitle: string,
  serperApiKey: string | undefined,
  log?: (msg: string) => void
): Promise<{ html: string; videoUrl?: string }> {
  if (!serperApiKey) {
    log?.(' No Serper API key provided — skipping YouTube integration');
    return { html: htmlContent };
  }

  try {
    log?.('Searching for relevant YouTube video...');
    const video = await searchYouTubeVideoSerper(
      articleTitle + ' tutorial guide demonstration',
      serperApiKey
    );

    if (!video?.link) {
      log?.(' No relevant YouTube video found');
      return { html: htmlContent };
    }

    log?.(' Found video: ' + (video.title || 'Unknown'));
    const videoEmbed = createYouTubeEmbed(video.link, 'Relevant Video: ' + articleTitle);

    // Insert video after the first paragraph or before FAQ
    const faqIndex = htmlContent.toLowerCase().indexOf('frequently asked');
    const firstParagraphEnd = htmlContent.indexOf('</p>') + 4;
    const insertPosition = faqIndex > 0 ? faqIndex : firstParagraphEnd;

    const newHtml =
      htmlContent.slice(0, insertPosition) +
      '\n' +
      videoEmbed +
      '\n' +
      htmlContent.slice(insertPosition);

    log?.(' YouTube video embedded into content');
    return { html: newHtml, videoUrl: video.link };
  } catch (error: any) {
    log?.(' YouTube integration failed: ' + error.message);
    return { html: htmlContent };
  }
}

export {
 createCTABox, createEnterpriseAccordion, generateEnterpriseSchema, searchYouTubeVideoSerper, createYouTubeEmbed }; integrateYouTubeVideoIntoContent,
