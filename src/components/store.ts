import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SiteContext {
  orgName: string;
  authorName: string;
  industry: string;
  targetAudience: string;
}

interface EntityAnalysis {
  entities: string[];
  missingEntities: string[];
  coverage: number;
}

interface ReferenceDiscovery {
  references: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
}

interface OptimizationResult {
  content: string;
  score: number;
  improvements: string[];
  wordCount: number;
  readability: string;
  seoScore: number;
}

interface AppState {
  // Content
  content: string;
  setContent: (content: string) => void;
  optimizedContent: string;
  setOptimizedContent: (content: string) => void;
  
  // Optimization settings
  optimizationMode: 'surgical' | 'full' | 'balanced';
  setOptimizationMode: (mode: 'surgical' | 'full' | 'balanced') => void;
    customModel: string;
  setCustomModel: (model: string) => void;
  
  // Site context
  siteContext: SiteContext;
  setSiteContext: (context: Partial<SiteContext>) => void;
  
  // Advanced features
  entityAnalysis: EntityAnalysis | null;
  setEntityAnalysis: (analysis: EntityAnalysis) => void;
  referenceDiscovery: ReferenceDiscovery | null;
  setReferenceDiscovery: (discovery: ReferenceDiscovery) => void;
  
  // Optimization results
  currentResult: OptimizationResult | null;
  setCurrentResult: (result: OptimizationResult) => void;
  
  // Session stats
  sessionStats: {
    articlesOptimized: number;
    timeSaved: number;
    improvementsMade: number;
  };
  incrementArticlesOptimized: () => void;
  addTimeSaved: (minutes: number) => void;
  incrementImprovements: (count: number) => void;
  
  // Recent jobs
  recentJobs: Array<{
    id: string;
    title: string;
    timestamp: Date;
    score: number;
  }>;
  addRecentJob: (job: Omit<AppState['recentJobs'][0], 'timestamp'>) => void;
}

export const useAppStore = create<AppState>()(  persist(
    (set) => ({
      // Initial content state
      content: '',
      setContent: (content) => set({ content }),
      optimizedContent: '',
      setOptimizedContent: (optimizedContent) => set({ optimizedContent }),
      
      // Initial optimization settings
      optimizationMode: 'balanced',
      setOptimizationMode: (optimizationMode) => set({ optimizationMode }),
      
  // Custom model for OpenRouter/Groq
  customModel: '',
  setCustomModel: (model: string) => set({ customModel: model }),
      
      // Initial site context
      siteContext: {
        orgName: '',
        authorName: '',
        industry: '',
        targetAudience: '',
      },
      setSiteContext: (context) =>
        set((state) => ({
          siteContext: { ...state.siteContext, ...context },
        })),
      
      // Initial advanced features
      entityAnalysis: null,
      setEntityAnalysis: (entityAnalysis) => set({ entityAnalysis }),
      referenceDiscovery: null,
      setReferenceDiscovery: (referenceDiscovery) => set({ referenceDiscovery }),
      
      // Initial optimization results
      currentResult: null,
      setCurrentResult: (currentResult) => set({ currentResult }),
      
      // Initial session stats
      sessionStats: {
        articlesOptimized: 0,
        timeSaved: 0,
        improvementsMade: 0,
      },
      incrementArticlesOptimized: () =>
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            articlesOptimized: state.sessionStats.articlesOptimized + 1,
          },
        })),
      addTimeSaved: (minutes) =>
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            timeSaved: state.sessionStats.timeSaved + minutes,
          },
        })),
      incrementImprovements: (count) =>
        set((state) => ({
          sessionStats: {
            ...state.sessionStats,
            improvementsMade: state.sessionStats.improvementsMade + count,
          },
        })),
      
      // Initial recent jobs
      recentJobs: [],
      addRecentJob: (job) =>
        set((state) => ({
          recentJobs: [
            { ...job, timestamp: new Date() },
            ...state.recentJobs.slice(0, 9), // Keep only last 10 jobs
          ],
        })),
    }),
    {
      name: 'wp-optimizer-storage',
      partialize: (state) => ({
        siteContext: state.siteContext,
        optimizationMode: state.optimizationMode,
        sessionStats: state.sessionStats,
        recentJobs: state.recentJobs,
      }),
    }
  )
);
