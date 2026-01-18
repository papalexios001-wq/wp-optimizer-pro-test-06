import React, { useState } from 'react';
import { useAppStore } from '../store';

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  // State management
  const {
    content,
    setContent,
    optimizationMode,
    setOptimizationMode,
    siteContext,
    setSiteContext,
    entityAnalysis,
    referenceDiscovery
  } = useAppStore();

  // Local UI state
  const [activeTab, setActiveTab] = useState('quick');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preserveImages, setPreserveImages] = useState(true);
  const [optimizeAltText, setOptimizeAltText] = useState(true);
  const [keepFeaturedImage, setKeepFeaturedImage] = useState(true);
  const [keepCategories, setKeepCategories] = useState(true);
  const [keepTags, setKeepTags] = useState(true);
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [crawlStats, setCrawlStats] = useState({
    totalPages: 0,
    atTarget: 0,
    processing: 0,
    avgScore: 0,
    completed: 0,
    totalWords: 0
  });

  // Site context form fields
  const [orgName, setOrgName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Handlers
  const handleOptimize = async () => {
    // Optimization logic here
    console.log('Starting optimization...');
  };

  const handleCrawlSitemap = async () => {
    if (!sitemapUrl) return;
    console.log('Crawling sitemap:', sitemapUrl);
    // Sitemap crawling logic
  };

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <h1>🚀 WordPress Content Optimizer Pro</h1>
        <div className="header-stats">
          <span>📊 Score: {crawlStats.avgScore}%</span>
          <span>✅ Completed: {crawlStats.completed}</span>
          <span>⚡ Processing: {crawlStats.processing}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Left Sidebar - Content Input */}
        <div className="content-input-section">
          <h2>📝 Content Input</h2>
          <textarea
            className="content-input"
            placeholder="Paste your WordPress content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
          />
          
          {/* File Upload Option */}
          <div className="file-upload">
            <button className="upload-btn">📄 Upload Document</button>
            <span className="file-info">Supports .txt, .docx, .html</span>
          </div>
        </div>

        {/* Center - Optimization Controls */}
        <div className="optimization-controls">
          {/* Tab Navigation */}
          <div className="tab-nav">
            <button 
              className={activeTab === 'quick' ? 'tab-active' : ''}
              onClick={() => setActiveTab('quick')}
            >
              ⚡ Quick Optimize
            </button>
            <button 
              className={activeTab === 'advanced' ? 'tab-active' : ''}
              onClick={() => setActiveTab('advanced')}
            >
              🔧 Advanced Settings
            </button>
            <button 
              className={activeTab === 'sitemap' ? 'tab-active' : ''}
              onClick={() => setActiveTab('sitemap')}
            >
              🗺️ Sitemap Crawler
            </button>
          </div>

          {/* Quick Optimize Tab */}
          {activeTab === 'quick' && (
            <div className="quick-optimize">
              <h3>⚡ Quick Optimization</h3>
              
              {/* Optimization Mode */}
              <div className="option-group">
                <label>🎯 Optimization Mode:</label>
                <select 
                  value={optimizationMode}
                  onChange={(e) => setOptimizationMode(e.target.value)}
                >
                  <option value="surgical">🔬 Surgical Mode</option>
                  <option value="full">📝 Full Rewrite</option>
                  <option value="balanced">⚖️ Balanced</option>
                </select>
              </div>

              {/* Content Preservation Options */}
              <div className="preservation-options">
                <h4>📋 Content Preservation</h4>
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={preserveImages}
                    onChange={(e) => setPreserveImages(e.target.checked)}
                  />
                  🖼️ Preserve Images
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={optimizeAltText}
                    onChange={(e) => setOptimizeAltText(e.target.checked)}
                  />
                  📝 Optimize Alt Text
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={keepFeaturedImage}
                    onChange={(e) => setKeepFeaturedImage(e.target.checked)}
                  />
                  🎨 Keep Featured Image
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={keepCategories}
                    onChange={(e) => setKeepCategories(e.target.checked)}
                  />
                  📁 Keep Categories
                </label>
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={keepTags}
                    onChange={(e) => setKeepTags(e.target.checked)}
                  />
                  🏷️ Keep Tags
                </label>
              </div>

              {/* Optimize Button */}
              <button className="optimize-btn" onClick={handleOptimize}>
                🚀 Optimize Now
              </button>
            </div>
          )}

          {/* Advanced Settings Tab */}
          {activeTab === 'advanced' && (
            <div className="advanced-settings">
              <h3>🔧 Advanced Settings</h3>
              
              {/* Site Context */}
              <div className="site-context">
                <h4>🏢 Site Context</h4>
                <div className="form-group">
                  <label>🏢 Organization Name:</label>
                  <input 
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="form-group">
                  <label>✍️ Author Name:</label>
                  <input 
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Enter author name"
                  />
                </div>
                <div className="form-group">
                  <label>🏭 Industry:</label>
                  <input 
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Enter industry"
                  />
                </div>
                <div className="form-group">
                  <label>👥 Target Audience:</label>
                  <input 
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Enter target audience"
                  />
                </div>
              </div>

              {/* Entity Analysis */}
              <div className="entity-analysis">
                <h4>🔍 Entity Gap Analysis</h4>
                <button className="analysis-btn">
                  📊 Analyze Entity Coverage
                </button>
                <p className="help-text">
                  Identifies missing entities and suggests content improvements
                </p>
              </div>

              {/* Reference Discovery */}
              <div className="reference-discovery">
                <h4>🔗 Reference Discovery</h4>
                <button className="discovery-btn">
                  🌐 Find Authoritative Sources
                </button>
                <p className="help-text">
                  Discovers relevant references to support your content
                </p>
              </div>
            </div>
          )}

          {/* Sitemap Crawler Tab */}
          {activeTab === 'sitemap' && (
            <div className="sitemap-crawler">
              <h3>🗺️ Sitemap Crawler</h3>
              
              {/* Sitemap URL Input */}
              <div className="form-group">
                <label>🗺️ Sitemap URL:</label>
                <input 
                  type="url"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                />
              </div>

              <button className="crawl-btn" onClick={handleCrawlSitemap}>
                🕷️ Crawl Sitemap
              </button>

              {/* Crawl Statistics */}
              <div className="crawl-stats">
                <h4>📊 Content Strategy</h4>
                <div className="stat-item">
                  <span>📄 Total Pages:</span>
                  <strong>{crawlStats.totalPages}</strong>
                </div>
                <div className="stat-item">
                  <span>✓ At Target:</span>
                  <strong>{crawlStats.atTarget}</strong>
                </div>
                <div className="stat-item">
                  <span>⚡ Processing:</span>
                  <strong>{crawlStats.processing}</strong>
                </div>
                <div className="stat-item">
                  <span>📈 Avg Score:</span>
                  <strong>{crawlStats.avgScore}%</strong>
                </div>
                <div className="stat-item">
                  <span>🎯 Completed:</span>
                  <strong>{crawlStats.completed}</strong>
                </div>
                <div className="stat-item">
                  <span>📝 Total Words:</span>
                  <strong>{crawlStats.totalWords.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Output & Analytics */}
        <div className="output-section">
          <h2>✨ Optimized Output</h2>
          <div className="output-display">
            <div className="output-header">
              <span>📊 Quality Score: <strong>85%</strong></span>
              <button className="copy-btn">📋 Copy</button>
            </div>
            <div className="output-content">
              {/* Optimized content will appear here */}
              <p className="placeholder">Optimized content will appear here after processing...</p>
            </div>
          </div>

          {/* Analytics Panel */}
          <div className="analytics-panel">
            <h3>📈 Analytics</h3>
            <div className="metric">
              <span>📝 Word Count:</span>
              <strong>0</strong>
            </div>
            <div className="metric">
              <span>🎯 SEO Score:</span>
              <strong>0/100</strong>
            </div>
            <div className="metric">
              <span>📚 Readability:</span>
              <strong>N/A</strong>
            </div>
            <div className="metric">
              <span>🔗 Internal Links:</span>
              <strong>0</strong>
            </div>
            <div className="metric">
              <span>🌐 External Links:</span>
              <strong>0</strong>
            </div>
          </div>

          {/* Session Stats */}
          <div className="session-stats">
            <h3>⏱️ Session Statistics</h3>
            <div className="stat">
              <span>📄 Articles Optimized:</span>
              <strong>0</strong>
            </div>
            <div className="stat">
              <span>⏱️ Time Saved:</span>
              <strong>0 hrs</strong>
            </div>
            <div className="stat">
              <span>💡 Improvements Made:</span>
              <strong>0</strong>
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="recent-jobs">
            <h3>📋 Recent Jobs</h3>
            <ul className="job-list">
              <li>No recent jobs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
