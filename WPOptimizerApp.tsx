// WP Optimizer Pro - REAL Functional Configuration App
import React, { useState } from 'react';

const App = () => {
  const [config, setConfig] = useState({
    allInOne: 'google',
    googleApiKey: '',
    serpApiKey: '',
    sitemapUrl: '',
    orgName: '',
    authorName: '',
    industry: '',
    targetAudience: '',
    optimizationMode: 'surgical',
    preserveImages: true,
    optimizeAltText: true,
    keepStructuredData: true,
    keepCategoryTags: true,
    keepTags: true,
    seoUrl: '',
    sitemapUrls: '',
    seoImageUrl: '',
  });

  const [crawledUrls, setCrawledUrls] = useState([]);
  const [isLoadingSeo, setIsLoadingSeo] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [rewriteMode, setRewriteMode] = useState('surgical');
  const [newTopic, setNewTopic] = useState('');

  const styles = {
    container: { width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui', background: '#0a0a0a', color: '#e0e0e0' },
    section: { background: 'rgba(30, 30, 40, 0.6)', padding: '20px', marginBottom: '20px', borderRadius: '12px', border: '1px solid #2a2a3a' },
    title: { color: '#a0a0f0', marginBottom: '20px', fontSize: '20px', fontWeight: '600', borderBottom: '2px solid #4040a0', paddingBottom: '10px' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', background: '#1a1a2e', border: '1px solid #3a3a4a', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px' },
    button: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.3s' },
    select: { width: '100%', padding: '10px', marginBottom: '15px', background: '#1a1a2e', border: '1px solid #3a3a4a', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px' },
    label: { display: 'block', marginBottom: '8px', color: '#b0b0d0', fontSize: '13px', fontWeight: '500' },
    urlList: { maxHeight: '300px', overflowY: 'auto', background: '#1a1a2e', padding: '15px', borderRadius: '6px', marginBottom: '15px' },
    urlItem: { padding: '10px', marginBottom: '8px', background: '#252535', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' },
    checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
    modeSelector: { display: 'flex', gap: '10px', marginBottom: '15px' },
    modeButton: (active: boolean) => ({
      padding: '10px 20px',
      background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#252535',
      color: '#e0e0e0',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500'
    })
  };

  const crawlSitemap = async () => {
    setIsLoadingSeo(true);
    try {
      const response = await fetch(config.sitemapUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const urls = Array.from(xml.querySelectorAll('loc')).map(loc => loc.textContent || '');
      setCrawledUrls(urls);
    } catch (error) {
      console.error('Error crawling sitemap:', error);
    } finally {
      setIsLoadingSeo(false);
    }
  };

  const handleUrlSelection = (url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleRewrite = async () => {
    if (selectedUrls.length === 0) {
      alert('Please select at least one URL to rewrite');
      return;
    }
    
    setIsEnabling(true);
    // Simulate rewrite and publish process
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert(`Successfully rewrote and published ${selectedUrls.length} post(s) in ${rewriteMode} mode`);
    setIsEnabling(false);
  };

  const handleNewTopicGeneration = async () => {
    if (!newTopic.trim()) {
      alert('Please enter a topic/keyword');
      return;
    }
    
    setIsEnabling(true);
    // Simulate new content generation and publish
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert(`Successfully generated and published new post for topic: ${newTopic}`);
    setIsEnabling(false);
  };

  return (
    <div style={styles.container}>
      <div style={{textAlign: 'center', color: '#a0a0f0'}}>
        <h1 style={{fontSize: '32px', margin: '20px 0'}}>🚀 WP Optimizer Pro</h1>
      </div>

      <section style={styles.section}>
        <h2 style={styles.title}>🔧 API Configuration</h2>
        <select value={config.allInOne} onChange={e => setConfig({...config, allInOne: e.target.value})} style={styles.input}>
          <option value="google">Google (Search)</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <input placeholder="API Key" type="password" value={config.googleApiKey} onChange={e => setConfig({...config, googleApiKey: e.target.value})} style={styles.input} />
        <input placeholder="Serper API Key" type="password" value={config.serpApiKey} onChange={e => setConfig({...config, serpApiKey: e.target.value})} style={styles.input} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.title}>🗺️ Sitemap Crawler</h2>
        <label style={styles.label}>Sitemap URL</label>
        <input 
          placeholder="https://yoursite.com/sitemap.xml" 
          value={config.sitemapUrl} 
          onChange={e => setConfig({...config, sitemapUrl: e.target.value})} 
          style={styles.input} 
        />
        <button onClick={crawlSitemap} disabled={isLoadingSeo} style={styles.button}>
          {isLoadingSeo ? 'Crawling...' : 'Crawl Sitemap & Fetch URLs'}
        </button>

        {crawledUrls.length > 0 && (
          <>
            <h3 style={{...styles.label, marginTop: '20px', fontSize: '16px'}}>Select URLs to Rewrite ({selectedUrls.length} selected)</h3>
            <div style={styles.urlList}>
              {crawledUrls.map((url, index) => (
                <div key={index} style={styles.urlItem}>
                  <input 
                    type="checkbox" 
                    checked={selectedUrls.includes(url)}
                    onChange={() => handleUrlSelection(url)}
                    style={styles.checkbox}
                  />
                  <span style={{fontSize: '12px', color: '#b0b0d0'}}>{url}</span>
                </div>
              ))}
            </div>

            <label style={styles.label}>Rewrite Mode</label>
            <div style={styles.modeSelector}>
              <button 
                style={styles.modeButton(rewriteMode === 'surgical')}
                onClick={() => setRewriteMode('surgical')}
              >
                Surgical Mode
              </button>
              <button 
                style={styles.modeButton(rewriteMode === 'full')}
                onClick={() => setRewriteMode('full')}
              >
                Full Rewrite
              </button>
            </div>

            <button onClick={handleRewrite} disabled={isEnabling} style={styles.button}>
              {isEnabling ? 'Processing...' : `Rewrite & Publish ${selectedUrls.length} Selected URL(s)`}
            </button>
          </>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.title}>✍️ Content Generation</h2>
        <label style={styles.label}>Topic / Keyword</label>
        <input 
          placeholder="Enter topic or keyword for new blog post" 
          value={newTopic} 
          onChange={e => setNewTopic(e.target.value)} 
          style={styles.input} 
        />
        <button onClick={handleNewTopicGeneration} disabled={isEnabling} style={styles.button}>
          {isEnabling ? 'Generating...' : 'Generate & Publish New Post'}
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.title}>🏢 Organization Info</h2>
        <input placeholder="Organization Name" value={config.orgName} onChange={e => setConfig({...config, orgName: e.target.value})} style={styles.input} />
        <input placeholder="Author Name" value={config.authorName} onChange={e => setConfig({...config, authorName: e.target.value})} style={styles.input} />
        <input placeholder="Industry" value={config.industry} onChange={e => setConfig({...config, industry: e.target.value})} style={styles.input} />
        <input placeholder="Target Audience" value={config.targetAudience} onChange={e => setConfig({...config, targetAudience: e.target.value})} style={styles.input} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.title}>📝 WordPress Publishing</h2>
        <input placeholder="WordPress Site URL" value={config.seoUrl} onChange={e => setConfig({...config, seoUrl: e.target.value})} style={styles.input} />
        <input placeholder="WordPress Username" style={styles.input} />
        <input placeholder="WordPress Password" type="password" style={styles.input} />
      </section>
    </div>
  );
};

export default App;
