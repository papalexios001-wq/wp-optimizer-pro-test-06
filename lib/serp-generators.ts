// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v23.2 — SERP-FEATURE-SPECIFIC CONTENT GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════
// Dedicated generators optimized for specific SERP features:
// • Featured Snippets (paragraph, list, table)
// • People Also Ask (PAA)
// • Comparison Tables
// • Statistics Dashboards
// • Quick Answer Boxes
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
    EntityGapAnalysis, FAQItem, ValidatedReference, SerpFeature, ApiKeys 
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SERPContentBlocks {
    quickAnswer?: string;
    featuredSnippetBait?: string;
    paaFAQs?: FAQItem[];
    paaHTML?: string;
    comparisonTable?: string;
    statsDashboard?: string;
    prosConsTable?: string;
    definitionBox?: string;
}

export interface SnippetConfig {
    query: string;
    format: 'paragraph' | 'list' | 'table';
    wordLimit: number;
    includeNumbers: boolean;
}

export interface PAA_Config {
    questions: string[];
    answerLength: { min: number; max: number };
    includeSchema: boolean;
    topic: string;
}

export interface ComparisonConfig {
    topic: string;
    items: string[];
    features: string[];
    highlightWinner: boolean;
}

export interface StatsConfig {
    topic: string;
    stats: Array<{ value: string; label: string; trend?: 'up' | 'down' | 'neutral' }>;
    sources?: ValidatedReference[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: AI CALL
// ═══════════════════════════════════════════════════════════════════════════════

async function callAI(
    prompt: string,
    apiKey: string,
    options: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
        jsonMode?: boolean;
    } = {}
): Promise<string> {
    const {
        model = 'gemini-2.0-flash',
        maxTokens = 2048,
        temperature = 0.7,
        jsonMode = false,
    } = options;

    const ai = GoogleGenerativeAI({ apiKey });
    
    const config: any = {
        temperature,
        maxOutputTokens: maxTokens,
    };
    
    if (jsonMode) {
        config.responseMimeType = 'application/json';
    }

    const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
    });

    return result.text || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURED SNIPPET GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateFeaturedSnippetBait(
    config: SnippetConfig,
    apiKey: string
): Promise<string> {
    const { query, format, wordLimit, includeNumbers } = config;

    const formatInstructions = {
        paragraph: `Write a single paragraph of exactly ${wordLimit} words that directly answers the question. Start with a definitive statement.`,
        list: `Write a numbered list of 5-7 items that answers the question. Each item should be 8-12 words. Start with the most important item.`,
        table: `Create a simple 2-column comparison with 4-5 rows. Use | for column separators.`,
    };

    const prompt = `You are a featured snippet optimization expert.

QUESTION TO ANSWER: "${query}"
FORMAT: ${format}
${includeNumbers ? 'REQUIREMENT: Include at least one specific number or statistic.' : ''}

${formatInstructions[format]}

RULES FOR FEATURED SNIPPETS:
1. Start with a DIRECT answer (no "It depends" or qualifiers)
2. Use simple, clear language (8th grade reading level)
3. Be definitive and authoritative
4. For lists: Use consistent formatting
5. Don't include questions in the answer
6. Front-load the most important information

OUTPUT ONLY the answer text/HTML, nothing else.`;

    const response = await callAI(prompt, apiKey, {
        temperature: 0.5,
        maxTokens: 512,
    });

    // Wrap in appropriate HTML based on format
    if (format === 'paragraph') {
        return `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 32px; margin: 36px 0; box-shadow: 0 12px 48px rgba(102,126,234,0.35);">
  <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px;">
    <span style="font-size: 32px;">⚡</span>
    <span style="color: #fff; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;">Quick Answer</span>
  </div>
  <p style="color: #fff; font-size: 19px; line-height: 1.75; margin: 0; font-weight: 500;">${response.trim()}</p>
</div>`;
    }
    
    if (format === 'list') {
        const items = response.split('\n').filter(line => line.trim());
        return `
<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 20px; padding: 32px; margin: 36px 0; border: 1px solid rgba(255,255,255,0.08);">
  <h3 style="color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 20px 0;">📋 Quick Steps</h3>
  <ol style="margin: 0; padding-left: 24px; color: #d1d5db; font-size: 16px; line-height: 2;">
    ${items.map(item => `<li>${item.replace(/^\d+\.\s*/, '')}</li>`).join('\n    ')}
  </ol>
</div>`;
    }

    return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAA (PEOPLE ALSO ASK) FAQ GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generatePAATargetedFAQ(
    config: PAA_Config,
    apiKey: string
): Promise<{ faqs: FAQItem[]; html: string }> {
    const { questions, answerLength, topic } = config;

    const prompt = `Generate FAQ answers optimized for Google's "People Also Ask" feature.

TOPIC: "${topic}"

QUESTIONS TO ANSWER:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

ANSWER REQUIREMENTS:
- Length: ${answerLength.min}-${answerLength.max} words each
- Start with a DIRECT answer in the first sentence
- Include ONE specific fact, number, or statistic
- End with an actionable insight or next step
- Write for position zero extraction
- Use simple, clear language
- No fluff or filler words

OUTPUT JSON:
{
  "faqs": [
    {"question": "exact question", "answer": "comprehensive answer"}
  ]
}`;

    const response = await callAI(prompt, apiKey, {
        jsonMode: true,
        temperature: 0.6,
        maxTokens: 4096,
    });

    const data = JSON.parse(response);
    const faqs: FAQItem[] = data.faqs || [];

    // Generate HTML
    const html = `
<div style="background: #0f172a; border-radius: 24px; padding: 40px; margin: 48px 0; border: 1px solid rgba(255,255,255,0.08);">
  <h2 style="color: #fff; font-size: 28px; font-weight: 800; margin: 0 0 32px 0; display: flex; align-items: center; gap: 14px;">
    <span style="font-size: 32px;">❓</span> Frequently Asked Questions
  </h2>
  
  ${faqs.map(faq => `
  <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding: 28px 0;">
    <h3 style="color: #f1f5f9; font-size: 19px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: flex-start; gap: 12px;">
      <span style="color: #3b82f6; font-size: 22px;">Q:</span> ${faq.question}
    </h3>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 34px;">${faq.answer}</p>
  </div>`).join('\n')}
</div>`;

    return { faqs, html };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON TABLE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateComparisonTable(
    config: ComparisonConfig,
    apiKey: string
): Promise<string> {
    const { topic, items, features, highlightWinner } = config;

    const prompt = `Create a detailed comparison table for "${topic}".

ITEMS TO COMPARE: ${items.join(' vs ')}
FEATURES TO COMPARE: ${features.join(', ')}

REQUIREMENTS:
1. Rate each feature for each item (✓, ✗, or specific value)
2. Be objective and fair
3. Include specific numbers where possible
4. Add a "Best For" row at the end
${highlightWinner ? '5. Highlight the winner in each category' : ''}

OUTPUT: Return ONLY a JSON object with this structure:
{
  "headers": ["Feature", "Item1", "Item2", ...],
  "rows": [
    {"feature": "Feature Name", "values": ["Value1", "Value2", ...]},
    ...
  ],
  "bestFor": {"Item1": "Best for X", "Item2": "Best for Y"}
}`;

    const response = await callAI(prompt, apiKey, {
        jsonMode: true,
        temperature: 0.5,
        maxTokens: 2048,
    });

    const data = JSON.parse(response);

    // Generate styled HTML table
    return `
<div style="overflow-x: auto; margin: 48px 0; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
  <table style="width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 20px; overflow: hidden;">
    <thead>
      <tr style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
        ${data.headers.map((h: string) => `
        <th style="padding: 20px 28px; text-align: ${h === 'Feature' ? 'left' : 'center'}; color: #f1f5f9; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #3b82f6;">${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.rows.map((row: any, i: number) => `
      <tr style="${i % 2 === 1 ? 'background: rgba(255,255,255,0.02);' : ''} border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 18px 28px; color: #e2e8f0; font-weight: 600;">${row.feature}</td>
        ${row.values.map((v: string) => `
        <td style="padding: 18px 28px; text-align: center; color: ${v === '✓' ? '#10b981' : v === '✗' ? '#ef4444' : '#94a3b8'}; font-size: ${v === '✓' || v === '✗' ? '20px' : '14px'};">${v}</td>`).join('')}
      </tr>`).join('')}
    </tbody>
  </table>
  
  ${data.bestFor ? `
  <div style="background: #1e293b; padding: 20px 28px; display: flex; gap: 24px; flex-wrap: wrap;">
    ${Object.entries(data.bestFor).map(([item, desc]) => `
    <div style="flex: 1; min-width: 200px;">
      <span style="color: #3b82f6; font-weight: 700; font-size: 13px;">${item}:</span>
      <span style="color: #94a3b8; font-size: 13px; margin-left: 8px;">${desc}</span>
    </div>`).join('')}
  </div>` : ''}
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS DASHBOARD GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateStatsDashboard(
    config: StatsConfig,
    apiKey: string
): Promise<string> {
    const { topic, stats, sources } = config;

    // If no stats provided, generate them
    let statsToUse = stats;
    
    if (!statsToUse || statsToUse.length === 0) {
        const prompt = `Generate 4 impressive statistics about "${topic}".

OUTPUT JSON:
{
  "stats": [
    {"value": "87%", "label": "Success Rate", "trend": "up"},
    {"value": "2.4x", "label": "ROI Increase", "trend": "up"},
    {"value": "$1.2M", "label": "Average Savings", "trend": "up"},
    {"value": "14 days", "label": "Time to Results", "trend": "down"}
  ]
}

Use realistic, impressive but believable numbers.`;

        const response = await callAI(prompt, apiKey, {
            jsonMode: true,
            temperature: 0.7,
            maxTokens: 512,
        });

        statsToUse = JSON.parse(response).stats;
    }

    const gradients = [
        'linear-gradient(135deg, #00d4ff, #7c3aed)',
        'linear-gradient(135deg, #10b981, #059669)',
        'linear-gradient(135deg, #f59e0b, #ef4444)',
        'linear-gradient(135deg, #ec4899, #8b5cf6)',
    ];

    return `
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin: 48px 0;">
  ${statsToUse.map((stat, i) => `
  <div style="background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; padding: 32px; text-align: center; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
    <div style="font-size: 48px; font-weight: 900; background: ${gradients[i % gradients.length]}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 12px;">
      ${stat.value}
      ${stat.trend ? `<span style="font-size: 20px; margin-left: 8px;">${stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}</span>` : ''}
    </div>
    <div style="color: #94a3b8; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">${stat.label}</div>
  </div>`).join('\n')}
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION BOX GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateDefinitionBox(
    term: string,
    apiKey: string
): Promise<string> {
    const prompt = `Write a clear, authoritative definition for "${term}".

REQUIREMENTS:
- 2-3 sentences
- Start with "{term} is/refers to..."
- Include one specific example or application
- Write at 8th grade reading level
- Be definitive, not wishy-washy

OUTPUT: Just the definition text, nothing else.`;

    const response = await callAI(prompt, apiKey, {
        temperature: 0.5,
        maxTokens: 256,
    });

    return `
<div style="background: linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.08) 100%); border-left: 5px solid #3b82f6; border-radius: 0 16px 16px 0; padding: 28px 32px; margin: 32px 0; box-shadow: 0 4px 24px rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
    <span style="font-size: 24px;">📖</span>
    <span style="color: #3b82f6; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Definition</span>
  </div>
  <p style="color: #d1d5db; font-size: 16px; line-height: 1.75; margin: 0;"><strong>${term}:</strong> ${response.trim()}</p>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR: GENERATE ALL SERP CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateSERPTargetedContent(
    topic: string,
    entityGapData: EntityGapAnalysis | undefined,
    apiKey: string,
    onProgress?: (msg: string) => void
): Promise<SERPContentBlocks> {
    const blocks: SERPContentBlocks = {};

    onProgress?.('🎯 Generating SERP-optimized content blocks...');

    // 1. Featured Snippet / Quick Answer
    if (entityGapData?.featuredSnippetOpportunity !== false) {
        onProgress?.('   → Generating featured snippet bait...');
        try {
            blocks.quickAnswer = await generateFeaturedSnippetBait(
                {
                    query: topic,
                    format: 'paragraph',
                    wordLimit: 55,
                    includeNumbers: true,
                },
                apiKey
            );
        } catch (e) {
            console.warn('Featured snippet generation failed:', e);
        }
    }

    // 2. PAA-Targeted FAQ
    if (entityGapData?.paaQuestions?.length) {
        onProgress?.('   → Generating PAA-targeted FAQs...');
        try {
            const paaResult = await generatePAATargetedFAQ(
                {
                    questions: entityGapData.paaQuestions.slice(0, 10),
                    answerLength: { min: 80, max: 150 },
                    includeSchema: true,
                    topic,
                },
                apiKey
            );
            blocks.paaFAQs = paaResult.faqs;
            blocks.paaHTML = paaResult.html;
        } catch (e) {
            console.warn('PAA FAQ generation failed:', e);
        }
    }

    // 3. Statistics Dashboard
    onProgress?.('   → Generating statistics dashboard...');
    try {
        blocks.statsDashboard = await generateStatsDashboard(
            {
                topic,
                stats: [], // Will be auto-generated
                sources: entityGapData?.validatedReferences,
            },
            apiKey
        );
    } catch (e) {
        console.warn('Stats dashboard generation failed:', e);
    }

    // 4. Comparison Table (if competitors present)
    if (entityGapData?.competitors && entityGapData.competitors.length >= 2) {
        onProgress?.('   → Generating comparison table...');
        try {
            const competitorNames = entityGapData.competitors
                .slice(0, 4)
                .map(c => c.domain || new URL(c.url).hostname);
            
            blocks.comparisonTable = await generateComparisonTable(
                {
                    topic,
                    items: competitorNames,
                    features: ['Content Quality', 'SEO Score', 'User Experience', 'Authority', 'Freshness'],
                    highlightWinner: true,
                },
                apiKey
            );
        } catch (e) {
            console.warn('Comparison table generation failed:', e);
        }
    }

    // 5. Definition Box
    onProgress?.('   → Generating definition box...');
    try {
        blocks.definitionBox = await generateDefinitionBox(topic, apiKey);
    } catch (e) {
        console.warn('Definition box generation failed:', e);
    }

    onProgress?.('✅ SERP content blocks generated');
    
    return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: INSERT SERP BLOCKS INTO CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

export function insertSERPBlocks(
    htmlContent: string,
    blocks: SERPContentBlocks
): string {
    let content = htmlContent;
    
    // Insert Quick Answer after first paragraph
    if (blocks.quickAnswer) {
        const firstPEnd = content.indexOf('</p>');
        if (firstPEnd > -1) {
            content = content.slice(0, firstPEnd + 4) + '\n\n' + blocks.quickAnswer + content.slice(firstPEnd + 4);
        }
    }
    
    // Insert Stats Dashboard after second H2
    if (blocks.statsDashboard) {
        const h2Matches = [...content.matchAll(/<\/h2>/gi)];
        if (h2Matches.length >= 2) {
            const insertPos = h2Matches[1].index! + 5;
            content = content.slice(0, insertPos) + '\n\n' + blocks.statsDashboard + content.slice(insertPos);
        }
    }
    
    // Insert Definition Box after third H2
    if (blocks.definitionBox) {
        const h2Matches = [...content.matchAll(/<\/h2>/gi)];
        if (h2Matches.length >= 3) {
            const insertPos = h2Matches[2].index! + 5;
            content = content.slice(0, insertPos) + '\n\n' + blocks.definitionBox + content.slice(insertPos);
        }
    }
    
    // Insert Comparison Table in middle
    if (blocks.comparisonTable) {
        const h2Matches = [...content.matchAll(/<\/h2>/gi)];
        const midPoint = Math.floor(h2Matches.length / 2);
        if (h2Matches[midPoint]) {
            const insertPos = h2Matches[midPoint].index! + 5;
            content = content.slice(0, insertPos) + '\n\n' + blocks.comparisonTable + content.slice(insertPos);
        }
    }
    
    // Insert FAQ before conclusion (look for "Conclusion" or "Key Takeaways" heading)
    if (blocks.paaHTML) {
        const conclusionMatch = content.match(/<h2[^>]*>.*?(conclusion|takeaway|summary|wrap)/i);
        if (conclusionMatch && conclusionMatch.index) {
            content = content.slice(0, conclusionMatch.index) + '\n\n' + blocks.paaHTML + '\n\n' + content.slice(conclusionMatch.index);
        } else {
            // Append before end
            content = content + '\n\n' + blocks.paaHTML;
        }
    }
    
    return content;
}

export default {
    generateFeaturedSnippetBait,
    generatePAATargetedFAQ,
    generateComparisonTable,
    generateStatsDashboard,
    generateDefinitionBox,
    generateSERPTargetedContent,
    insertSERPBlocks,
};

