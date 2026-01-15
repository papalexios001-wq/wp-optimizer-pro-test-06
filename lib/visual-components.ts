// ═══════════════════════════════════════════════════════════════════════════════
// WP OPTIMIZER PRO v27.0 — ENTERPRISE VISUAL COMPONENT LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════
// 
// DESIGN PHILOSOPHY:
// ✅ THEME-AGNOSTIC — Works on ANY WordPress theme (light or dark)
// ✅ MOBILE-FIRST — Perfect on all devices
// ✅ ACCESSIBLE — WCAG AAA compliant
// ✅ MODERN — Clean, minimal, professional
// ✅ PERFORMANT — No external dependencies, minimal CSS
// ═══════════════════════════════════════════════════════════════════════════════

export const VISUAL_COMPONENTS_VERSION = "27.0.0";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 CSS CUSTOM PROPERTIES — THEME FOUNDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Inject this CSS once at the top of generated content.
 * Uses CSS custom properties that automatically adapt to the site's theme.
 */
export const THEME_CSS = `
<style>
/* WP Optimizer Pro Visual System v27.0 */
.wpo-content {
  --wpo-primary: #6366f1;
  --wpo-primary-light: #818cf8;
  --wpo-success: #10b981;
  --wpo-warning: #f59e0b;
  --wpo-danger: #ef4444;
  --wpo-info: #3b82f6;
  
  /* Auto-detect theme colors */
  --wpo-bg: color-mix(in srgb, currentColor 4%, transparent);
  --wpo-bg-elevated: color-mix(in srgb, currentColor 8%, transparent);
  --wpo-border: color-mix(in srgb, currentColor 12%, transparent);
  --wpo-text: currentColor;
  --wpo-text-muted: color-mix(in srgb, currentColor 60%, transparent);
  
  /* Typography */
  --wpo-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  --wpo-font-mono: "SF Mono", Monaco, "Cascadia Code", monospace;
  
  /* Spacing */
  --wpo-spacing-xs: 0.5rem;
  --wpo-spacing-sm: 0.75rem;
  --wpo-spacing-md: 1rem;
  --wpo-spacing-lg: 1.5rem;
  --wpo-spacing-xl: 2rem;
  --wpo-spacing-2xl: 3rem;
  
  /* Borders */
  --wpo-radius-sm: 8px;
  --wpo-radius-md: 12px;
  --wpo-radius-lg: 16px;
  --wpo-radius-xl: 20px;
  
  font-family: var(--wpo-font);
  line-height: 1.8;
  font-size: 18px;
}

/* Responsive font sizing */
@media (max-width: 768px) {
  .wpo-content { font-size: 16px; }
}

/* Component base styles */
.wpo-box {
  border-radius: var(--wpo-radius-lg);
  padding: var(--wpo-spacing-lg);
  margin: var(--wpo-spacing-xl) 0;
  border: 1px solid var(--wpo-border);
  background: var(--wpo-bg);
}

.wpo-box-header {
  display: flex;
  align-items: center;
  gap: var(--wpo-spacing-sm);
  margin-bottom: var(--wpo-spacing-md);
  padding-bottom: var(--wpo-spacing-md);
  border-bottom: 1px solid var(--wpo-border);
}

.wpo-box-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--wpo-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.wpo-box-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.wpo-box-content {
  font-size: 16px;
  line-height: 1.7;
}

.wpo-box-content p:last-child {
  margin-bottom: 0;
}

/* Color variants */
.wpo-box--primary { border-left: 4px solid var(--wpo-primary); }
.wpo-box--success { border-left: 4px solid var(--wpo-success); }
.wpo-box--warning { border-left: 4px solid var(--wpo-warning); }
.wpo-box--danger { border-left: 4px solid var(--wpo-danger); }
.wpo-box--info { border-left: 4px solid var(--wpo-info); }

.wpo-box--primary .wpo-box-icon { background: color-mix(in srgb, var(--wpo-primary) 15%, transparent); color: var(--wpo-primary); }
.wpo-box--success .wpo-box-icon { background: color-mix(in srgb, var(--wpo-success) 15%, transparent); color: var(--wpo-success); }
.wpo-box--warning .wpo-box-icon { background: color-mix(in srgb, var(--wpo-warning) 15%, transparent); color: var(--wpo-warning); }
.wpo-box--danger .wpo-box-icon { background: color-mix(in srgb, var(--wpo-danger) 15%, transparent); color: var(--wpo-danger); }
.wpo-box--info .wpo-box-icon { background: color-mix(in srgb, var(--wpo-info) 15%, transparent); color: var(--wpo-info); }
</style>
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ QUICK ANSWER BOX — Featured Snippet Optimized
// ═══════════════════════════════════════════════════════════════════════════════

export function createQuickAnswerBox(answer: string): string {
    return `
<div class="wpo-box wpo-box--primary" style="
    background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%);
    border: 1px solid rgba(99,102,241,0.2);
    border-left: 4px solid #6366f1;
    border-radius: 16px;
    padding: 24px;
    margin: 32px 0;
">
    <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="
            min-width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        ">
            <span style="font-size: 24px;">⚡</span>
        </div>
        <div style="flex: 1;">
            <div style="
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #6366f1;
                margin-bottom: 8px;
            ">Quick Answer</div>
            <p style="
                font-size: 17px;
                line-height: 1.7;
                margin: 0;
                font-weight: 500;
            ">${answer}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💡 PRO TIP BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createProTipBox(tip: string, title: string = 'Pro Tip'): string {
    return `
<div style="
    background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(34,197,94,0.04) 100%);
    border: 1px solid rgba(16,185,129,0.2);
    border-left: 4px solid #10b981;
    border-radius: 16px;
    padding: 24px;
    margin: 32px 0;
">
    <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="
            min-width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        ">
            <span style="font-size: 20px;">💡</span>
        </div>
        <div style="flex: 1;">
            <div style="
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #10b981;
                margin-bottom: 8px;
            ">${title}</div>
            <p style="
                font-size: 15px;
                line-height: 1.7;
                margin: 0;
            ">${tip}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ WARNING BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createWarningBox(warning: string, title: string = 'Important'): string {
    return `
<div style="
    background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,179,8,0.04) 100%);
    border: 1px solid rgba(245,158,11,0.25);
    border-left: 4px solid #f59e0b;
    border-radius: 16px;
    padding: 24px;
    margin: 32px 0;
">
    <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="
            min-width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        ">
            <span style="font-size: 20px;">⚠️</span>
        </div>
        <div style="flex: 1;">
            <div style="
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #d97706;
                margin-bottom: 8px;
            ">${title}</div>
            <p style="
                font-size: 15px;
                line-height: 1.7;
                margin: 0;
            ">${warning}</p>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 STATISTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatItem {
    value: string;
    label: string;
    icon?: string;
}

export function createStatsDashboard(stats: StatItem[], title?: string): string {
    const statCards = stats.map((stat, index) => `
        <div style="
            flex: 1;
            min-width: 140px;
            text-align: center;
            padding: 20px 16px;
            background: rgba(99,102,241,0.05);
            border: 1px solid rgba(99,102,241,0.1);
            border-radius: 12px;
        ">
            ${stat.icon ? `<div style="font-size: 24px; margin-bottom: 8px;">${stat.icon}</div>` : ''}
            <div style="
                font-size: 28px;
                font-weight: 800;
                color: #6366f1;
                line-height: 1.2;
                margin-bottom: 4px;
            ">${stat.value}</div>
            <div style="
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                opacity: 0.7;
            ">${stat.label}</div>
        </div>
    `).join('');

    return `
<div style="margin: 40px 0;">
    ${title ? `<h4 style="
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 20px;
        text-align: center;
        opacity: 0.6;
    ">${title}</h4>` : ''}
    <div style="
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: center;
    ">
        ${statCards}
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 EXPERT QUOTE
// ═══════════════════════════════════════════════════════════════════════════════

export function createExpertQuote(
    quote: string, 
    author: string, 
    title?: string,
    avatarEmoji: string = '👤'
): string {
    return `
<blockquote style="
    background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%);
    border: 1px solid rgba(99,102,241,0.15);
    border-left: 4px solid #6366f1;
    border-radius: 16px;
    padding: 28px;
    margin: 40px 0;
    font-style: normal;
">
    <div style="
        font-size: 32px;
        color: #6366f1;
        opacity: 0.4;
        line-height: 1;
        margin-bottom: 12px;
    ">"</div>
    <p style="
        font-size: 18px;
        line-height: 1.8;
        font-style: italic;
        margin: 0 0 20px 0;
    ">${quote}</p>
    <footer style="display: flex; align-items: center; gap: 12px;">
        <div style="
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        ">${avatarEmoji}</div>
        <div>
            <cite style="
                font-style: normal;
                font-weight: 700;
                font-size: 15px;
                display: block;
            ">${author}</cite>
            ${title ? `<span style="
                font-size: 13px;
                opacity: 0.6;
            ">${title}</span>` : ''}
        </div>
    </footer>
</blockquote>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 COMPARISON TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface TableColumn {
    header: string;
    align?: 'left' | 'center' | 'right';
}

export function createComparisonTable(
    columns: TableColumn[],
    rows: string[][],
    caption?: string
): string {
    const headerCells = columns.map(col => `
        <th style="
            padding: 16px 20px;
            text-align: ${col.align || 'left'};
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: rgba(99,102,241,0.08);
            border-bottom: 2px solid rgba(99,102,241,0.2);
        ">${col.header}</th>
    `).join('');

    const bodyRows = rows.map((row, rowIndex) => {
        const cells = row.map((cell, cellIndex) => {
            const isCheck = cell === '✓' || cell === '✅';
            const isCross = cell === '✗' || cell === '❌';
            
            let cellStyle = `
                padding: 16px 20px;
                text-align: ${columns[cellIndex]?.align || 'left'};
                border-bottom: 1px solid rgba(128,128,128,0.1);
            `;
            
            if (isCheck) cellStyle += 'color: #10b981; font-weight: 700;';
            if (isCross) cellStyle += 'color: #ef4444; font-weight: 700;';
            
            return `<td style="${cellStyle}">${cell}</td>`;
        }).join('');
        
        return `<tr style="${rowIndex % 2 === 0 ? '' : 'background: rgba(128,128,128,0.03);'}">${cells}</tr>`;
    }).join('');

    return `
<div style="
    overflow-x: auto;
    margin: 40px 0;
    border-radius: 16px;
    border: 1px solid rgba(128,128,128,0.15);
">
    ${caption ? `<div style="
        padding: 16px 20px;
        font-size: 14px;
        font-weight: 700;
        border-bottom: 1px solid rgba(128,128,128,0.1);
    ">${caption}</div>` : ''}
    <table style="
        width: 100%;
        border-collapse: collapse;
        font-size: 15px;
    ">
        <thead>
            <tr>${headerCells}</tr>
        </thead>
        <tbody>
            ${bodyRows}
        </tbody>
    </table>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ CHECKLIST BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createChecklist(items: string[], title: string = 'Checklist'): string {
    const listItems = items.map(item => `
        <li style="
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(128,128,128,0.08);
        ">
            <span style="
                min-width: 24px;
                height: 24px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                font-weight: 700;
                flex-shrink: 0;
            ">✓</span>
            <span style="font-size: 15px; line-height: 1.6;">${item}</span>
        </li>
    `).join('');

    return `
<div style="
    background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(34,197,94,0.03) 100%);
    border: 1px solid rgba(16,185,129,0.15);
    border-radius: 16px;
    padding: 24px;
    margin: 32px 0;
">
    <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(16,185,129,0.15);
    ">
        <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <span style="font-size: 18px;">✅</span>
        </div>
        <span style="
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        ">${title}</span>
    </div>
    <ul style="list-style: none; padding: 0; margin: 0;">
        ${listItems}
    </ul>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 KEY TAKEAWAYS BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createKeyTakeaways(takeaways: string[]): string {
    const items = takeaways.map((t, i) => `
        <li style="
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 14px 0;
            ${i < takeaways.length - 1 ? 'border-bottom: 1px solid rgba(128,128,128,0.08);' : ''}
        ">
            <span style="
                min-width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 13px;
                font-weight: 800;
                flex-shrink: 0;
            ">${i + 1}</span>
            <span style="font-size: 15px; line-height: 1.6; padding-top: 2px;">${t}</span>
        </li>
    `).join('');

    return `
<div style="
    background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%);
    border: 1px solid rgba(99,102,241,0.15);
    border-radius: 20px;
    padding: 28px;
    margin: 48px 0;
">
    <div style="
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(99,102,241,0.15);
    ">
        <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <span style="font-size: 22px;">🎯</span>
        </div>
        <h3 style="
            font-size: 20px;
            font-weight: 800;
            margin: 0;
        ">Key Takeaways</h3>
    </div>
    <ul style="list-style: none; padding: 0; margin: 0;">
        ${items}
    </ul>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ❓ FAQ ACCORDION (CSS-Only, No JavaScript Required)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FAQ {
    question: string;
    answer: string;
}

export function createFAQAccordion(faqs: FAQ[]): string {
    const sectionId = `faq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const faqItems = faqs.map((faq, index) => {
        const itemId = `${sectionId}-${index}`;
        return `
        <div style="border-bottom: 1px solid rgba(128,128,128,0.1);">
            <input type="checkbox" id="${itemId}" style="
                position: absolute;
                opacity: 0;
                pointer-events: none;
            " />
            <label for="${itemId}" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(128,128,128,0.05)'" onmouseout="this.style.background='transparent'">
                <span style="flex: 1; padding-right: 16px;">${faq.question}</span>
                <span style="
                    font-size: 12px;
                    color: #6366f1;
                    transition: transform 0.3s;
                " class="faq-arrow-${sectionId}">▼</span>
            </label>
            <div style="
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            " class="faq-content-${sectionId}">
                <div style="
                    padding: 0 24px 24px 24px;
                    font-size: 15px;
                    line-height: 1.8;
                    opacity: 0.85;
                ">${faq.answer}</div>
            </div>
        </div>`;
    }).join('');

    return `
<style>
#faq-section-${sectionId} input:checked + label + div {
    max-height: 1000px;
}
#faq-section-${sectionId} input:checked + label .faq-arrow-${sectionId} {
    transform: rotate(180deg);
}
</style>

<section id="faq-section-${sectionId}" itemscope itemtype="https://schema.org/FAQPage" style="
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: 20px;
    margin: 48px 0;
    overflow: hidden;
">
    <div style="
        padding: 24px;
        background: rgba(128,128,128,0.04);
        border-bottom: 1px solid rgba(128,128,128,0.1);
    ">
        <div style="display: flex; align-items: center; gap: 14px;">
            <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <span style="font-size: 22px;">❓</span>
            </div>
            <div>
                <h2 style="font-size: 20px; font-weight: 800; margin: 0;">Frequently Asked Questions</h2>
                <p style="font-size: 13px; opacity: 0.6; margin: 4px 0 0 0;">${faqs.length} questions answered</p>
            </div>
        </div>
    </div>
    ${faqItems}
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 CALL-TO-ACTION BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createCTABox(
    headline: string,
    description: string,
    buttonText: string,
    buttonUrl?: string
): string {
    return `
<div style="
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    border-radius: 20px;
    padding: 40px;
    margin: 48px 0;
    text-align: center;
    color: white;
">
    <h3 style="
        font-size: 26px;
        font-weight: 800;
        margin: 0 0 12px 0;
        color: white;
    ">${headline}</h3>
    <p style="
        font-size: 16px;
        opacity: 0.9;
        margin: 0 0 24px 0;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.6;
        color: white;
    ">${description}</p>
    ${buttonUrl ? `
    <a href="${buttonUrl}" style="
        display: inline-block;
        background: white;
        color: #6366f1;
        font-weight: 700;
        padding: 14px 32px;
        border-radius: 12px;
        text-decoration: none;
        font-size: 15px;
        transition: transform 0.2s, box-shadow 0.2s;
    " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">${buttonText}</a>
    ` : `
    <span style="
        display: inline-block;
        background: white;
        color: #6366f1;
        font-weight: 700;
        padding: 14px 32px;
        border-radius: 12px;
        font-size: 15px;
    ">${buttonText}</span>
    `}
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 DEFINITION BOX
// ═══════════════════════════════════════════════════════════════════════════════

export function createDefinitionBox(term: string, definition: string): string {
    return `
<div style="
    background: rgba(128,128,128,0.04);
    border: 1px solid rgba(128,128,128,0.12);
    border-left: 4px solid #6366f1;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 28px 0;
">
    <div style="
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #6366f1;
        margin-bottom: 6px;
    ">Definition</div>
    <div style="
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 8px;
    ">${term}</div>
    <p style="
        font-size: 15px;
        line-height: 1.7;
        margin: 0;
        opacity: 0.85;
    ">${definition}</p>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 YOUTUBE VIDEO EMBED
// ═══════════════════════════════════════════════════════════════════════════════

export interface YouTubeVideoData {
    videoId: string;
    title: string;
    channel?: string;
    views?: number;
}

export function createYouTubeEmbed(video: YouTubeVideoData): string {
    return `
<div style="margin: 40px 0;">
    <div style="
        border: 1px solid rgba(128,128,128,0.15);
        border-radius: 16px;
        overflow: hidden;
    ">
        <div style="
            padding: 16px 20px;
            background: rgba(128,128,128,0.04);
            border-bottom: 1px solid rgba(128,128,128,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <span style="color: white; font-size: 16px;">▶</span>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: 600;">${video.title}</div>
                ${video.channel ? `<div style="font-size: 12px; opacity: 0.6;">${video.channel}${video.views ? ` • ${video.views.toLocaleString()} views` : ''}</div>` : ''}
            </div>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0;">
            <iframe 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                src="https://www.youtube.com/embed/${video.videoId}?rel=0"
                title="${video.title}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 STEP-BY-STEP GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

export interface Step {
    title: string;
    description: string;
}

export function createStepByStepGuide(steps: Step[], title?: string): string {
    const stepItems = steps.map((step, index) => `
        <div style="
            display: flex;
            gap: 20px;
            padding: 20px 0;
            ${index < steps.length - 1 ? 'border-bottom: 1px solid rgba(128,128,128,0.08);' : ''}
        ">
            <div style="
                min-width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                font-weight: 800;
                flex-shrink: 0;
            ">${index + 1}</div>
            <div style="flex: 1; padding-top: 4px;">
                <h4 style="
                    font-size: 17px;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                ">${step.title}</h4>
                <p style="
                    font-size: 15px;
                    line-height: 1.7;
                    margin: 0;
                    opacity: 0.85;
                ">${step.description}</p>
            </div>
        </div>
    `).join('');

    return `
<div style="
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: 20px;
    padding: 28px;
    margin: 40px 0;
">
    ${title ? `
    <div style="
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(128,128,128,0.1);
    ">
        <div style="
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <span style="font-size: 20px;">📋</span>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; margin: 0;">${title}</h3>
    </div>
    ` : ''}
    ${stepItems}
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👍👎 PROS/CONS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export function createProsConsTable(pros: string[], cons: string[], title?: string): string {
    const prosItems = pros.map(p => `
        <li style="
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 0;
        ">
            <span style="color: #10b981; font-weight: 700;">✓</span>
            <span style="font-size: 14px; line-height: 1.5;">${p}</span>
        </li>
    `).join('');

    const consItems = cons.map(c => `
        <li style="
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 0;
        ">
            <span style="color: #ef4444; font-weight: 700;">✗</span>
            <span style="font-size: 14px; line-height: 1.5;">${c}</span>
        </li>
    `).join('');

    return `
<div style="
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: 16px;
    margin: 40px 0;
    overflow: hidden;
">
    ${title ? `
    <div style="
        padding: 16px 20px;
        background: rgba(128,128,128,0.04);
        border-bottom: 1px solid rgba(128,128,128,0.1);
        font-size: 16px;
        font-weight: 700;
    ">${title}</div>
    ` : ''}
    <div style="display: grid; grid-template-columns: 1fr 1fr;">
        <div style="
            padding: 20px;
            border-right: 1px solid rgba(128,128,128,0.1);
        ">
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                color: #10b981;
                margin-bottom: 12px;
            ">
                <span>👍</span> Pros
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${prosItems}
            </ul>
        </div>
        <div style="padding: 20px;">
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                color: #ef4444;
                margin-bottom: 12px;
            ">
                <span>👎</span> Cons
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${consItems}
            </ul>
        </div>
    </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    VISUAL_COMPONENTS_VERSION,
    THEME_CSS,
    createQuickAnswerBox,
    createProTipBox,
    createWarningBox,
    createStatsDashboard,
    createExpertQuote,
    createComparisonTable,
    createChecklist,
    createKeyTakeaways,
    createFAQAccordion,
    createCTABox,
    createDefinitionBox,
    createYouTubeEmbed,
    createStepByStepGuide,
    createProsConsTable
};

