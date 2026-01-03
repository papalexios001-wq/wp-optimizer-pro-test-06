// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v30.0 — ENTERPRISE BLOG CONTENT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
// SOTA Features:
// ✓ 8-12 detailed H2 sections with rich content
// ✓ Contextual paragraph generation
// ✓ SEO-optimized heading hierarchy
// ✓ Internal link preparation (15-20 anchor targets)
// ✓ Alex Hormozi-style copywriting patterns
// ═══════════════════════════════════════════════════════════════════════════════

export interface MainContentSection {
  heading: string;
  headingLevel: 'h2' | 'h3';
  paragraphs: string[];
  subsections?: MainContentSection[];
  keyTerms: string[];
  internalLinkTargets: string[];
}

export interface BlogContentGeneratorConfig {
  minSections: number;
  maxSections: number;
  minParagraphsPerSection: number;
  maxParagraphsPerSection: number;
  minWordsPerParagraph: number;
  maxWordsPerParagraph: number;
  enHormozi: boolean;
  includeIntroduction: boolean;
  includeTransitionSentences: boolean;
}

const DEFAULT_CONFIG: BlogContentGeneratorConfig = {
  minSections: 8,
  maxSections: 12,
  minParagraphsPerSection: 2,
  maxParagraphsPerSection: 4,
  minWordsPerParagraph: 120,
  maxWordsPerParagraph: 220,
  enHormozi: true,
  includeIntroduction: true,
  includeTransitionSentences: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI PROMPT FOR MAIN CONTENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMainContentPrompt(
  keyword: string,
  title: string,
  existingQA: string,
  config: BlogContentGeneratorConfig = DEFAULT_CONFIG
): string {
  return `You are an expert content creator writing an ENTERPRISE-GRADE blog post about "${keyword}".

TITLE: ${title}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${config.minSections}-${config.maxSections} detailed H2 sections
2. Each H2 must have ${config.minParagraphsPerSection}-${config.maxParagraphsPerSection} rich paragraphs
3. Each paragraph must be ${config.minWordsPerParagraph}-${config.maxWordsPerParagraph} words
4. Use Alex Hormozi copywriting style: Problem-Agitate-Solve (PAS) framework
5. Include specific examples, statistics, and actionable insights
6. Write for SOLOPRENEURS and BUSINESS BUILDERS (not beginners)
7. Focus on TRANSFORMATION and RESULTS, not features
8. Include strategic internal link anchor candidates (marked with |ANCHOR:term|)

CONTENT STRUCTURE:
- Start with compelling hook that builds curiosity
- Each section should solve ONE specific problem
- Use transition sentences between sections
- Include data, research, and expert opinions
- End each section with actionable takeaway

STYLE GUIDE:
- Power words: "proven", "guaranteed", "revolutionary", "breakthrough"
- Emotional triggers: curiosity, FOMO, aspiration
- Voice: Direct, conversational, no fluff
- Sentence structure: Mix short punchy sentences with detailed explanations
- Specificity: Use exact numbers, percentages, timeframes

DELIVER AS MARKDOWN with proper H2 (##) formatting.
Each section must stand alone but also connect to the larger narrative.

QUICK ANSWER CONTEXT (for reference, don't repeat):
${existingQA}

Now write the comprehensive main content sections.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTENT SECTION PARSER & VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function parseMainContentSections(
  markdownContent: string
): MainContentSection[] {
  const sections: MainContentSection[] = [];
  
  // Split by H2 headings
  const h2Regex = /^## (.+?)$/gm;
  const parts = markdownContent.split(h2Regex);
  
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const content = parts[i + 1] || '';
    
    // Extract paragraphs
    const paragraphs = content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 50 && !p.startsWith('#'));
    
    // Extract internal link targets
    const linkTargets = extractInternalLinkTargets(content);
    
    // Extract key terms
    const keyTerms = extractKeyTerms(content);
    
    if (paragraphs.length >= 2) {
      sections.push({
        heading,
        headingLevel: 'h2',
        paragraphs,
        keyTerms,
        internalLinkTargets: linkTargets,
      });
    }
  }
  
  return sections;
}

function extractInternalLinkTargets(text: string): string[] {
  const regex = /\|ANCHOR:([^|]+)\|/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

function extractKeyTerms(text: string): string[] {
  // Extract capitalized phrases (potential key terms)
  const regex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const terms = text.match(regex) || [];
  return [...new Set(terms)].slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTENT VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContentValidationResult {
  isValid: boolean;
  sectionCount: number;
  totalWords: number;
  avgWordsPerSection: number;
  issues: string[];
  score: number;
}

export function validateMainContent(
  sections: MainContentSection[],
  config: BlogContentGeneratorConfig = DEFAULT_CONFIG
): ContentValidationResult {
  const issues: string[] = [];
  let totalWords = 0;
  let score = 100;
  
  // Check section count
  if (sections.length < config.minSections) {
    issues.push(`Only ${sections.length} sections (minimum: ${config.minSections})`);
    score -= 15;
  } else if (sections.length > config.maxSections) {
    issues.push(`Too many sections: ${sections.length} (maximum: ${config.maxSections})`);
    score -= 10;
  }
  
  // Validate each section
  sections.forEach((section, idx) => {
    const wordCount = section.paragraphs.reduce(
      (sum, p) => sum + p.split(/\s+/).length,
      0
    );
    totalWords += wordCount;
    
    if (section.paragraphs.length < config.minParagraphsPerSection) {
      issues.push(
        `Section "${section.heading}" has only ${section.paragraphs.length} paragraphs (minimum: ${config.minParagraphsPerSection})`
      );
      score -= 5;
    }
    
    if (wordCount < config.minWordsPerParagraph * section.paragraphs.length) {
      issues.push(
        `Section "${section.heading}" has only ${wordCount} words (minimum: ${config.minWordsPerParagraph * section.paragraphs.length})`
      );
      score -= 5;
    }
  });
  
  const avgWordsPerSection = sections.length > 0 ? Math.round(totalWords / sections.length) : 0;
  
  return {
    isValid: issues.length === 0,
    sectionCount: sections.length,
    totalWords,
    avgWordsPerSection,
    issues,
    score: Math.max(0, score),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTENT TO HTML RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

export function renderMainContentToHTML(
  sections: MainContentSection[]
): string {
  let html = '';
  
  sections.forEach((section) => {
    // H2 heading
    html += `<h2>${escapeHTML(section.heading)}</h2>\n`;
    
    // Paragraphs
    section.paragraphs.forEach((para) => {
      // Replace anchor markers with data attributes for later processing
      const cleanPara = para
        .replace(/\|ANCHOR:([^|]+)\|/g, '<span data-internal-link="$1">$1</span>');
      html += `<p>${cleanPara}</p>\n`;
    });
    
    // Subsections if present
    if (section.subsections) {
      section.subsections.forEach((sub) => {
        html += `<h3>${escapeHTML(sub.heading)}</h3>\n`;
        sub.paragraphs.forEach((para) => {
          html += `<p>${para}</p>\n`;
        });
      });
    }
  });
  
  return html;
}

function escapeHTML(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  generateMainContentPrompt,
  parseMainContentSections,
  validateMainContent,
  renderMainContentToHTML,
  DEFAULT_CONFIG,
};
