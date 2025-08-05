/**
 * Lean Semantic Cache for CRAG Implementation
 * Pre-computes and caches results for common educational queries
 * Bootstrap-friendly approach without heavy ML dependencies
 */

interface CacheEntry {
  query: string;
  results: any[];
  response: string;
  agent: string;
  timestamp: number;
  hitCount: number;
  confidence: number;
}

interface SemanticCacheConfig {
  maxEntries: number;
  ttlMs: number; // Time to live in milliseconds
  similarityThreshold: number;
}

/**
 * Lean semantic cache using simple string similarity
 * No external ML models - uses basic text matching for bootstrap friendliness
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: SemanticCacheConfig;

  constructor(config: Partial<SemanticCacheConfig> = {}) {
    this.config = {
      maxEntries: 100,
      ttlMs: 24 * 60 * 60 * 1000, // 24 hours
      similarityThreshold: 0.7,
      ...config
    };
  }

  /**
   * Simple text similarity without ML dependencies
   * Uses Jaccard similarity (intersection over union of words)
   */
  private calculateSimilarity(query1: string, query2: string): number {
    const normalize = (text: string) => 
      text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2)
          .sort();

    const words1 = new Set(normalize(query1));
    const words2 = new Set(normalize(query2));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Find similar cached query
   */
  findSimilar(query: string): CacheEntry | null {
    let bestMatch: CacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.cache.values()) {
      // Skip expired entries
      if (Date.now() - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(this.getCacheKey(entry.query));
        continue;
      }

      const similarity = this.calculateSimilarity(query, entry.query);
      if (similarity > bestScore && similarity >= this.config.similarityThreshold) {
        bestScore = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      console.log(`📄 Semantic cache hit: "${query}" → "${bestMatch.query}" (${(bestScore * 100).toFixed(1)}% similarity)`);
    }

    return bestMatch;
  }

  /**
   * Store query result in cache
   */
  store(query: string, results: any[], response: string, agent: string, confidence: number = 0.9): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const cacheKey = this.getCacheKey(query);
    const entry: CacheEntry = {
      query,
      results,
      response,
      agent,
      timestamp: Date.now(),
      hitCount: 0,
      confidence
    };

    this.cache.set(cacheKey, entry);
    console.log(`💾 Cached enhanced result for: "${query}"`);
  }

  /**
   * Pre-populate cache with common educational queries
   * Bootstrap-friendly - uses hardcoded high-value queries
   */
  async warmCache(): Promise<void> {
    const commonQueries = [
      {
        query: "cybersecurity career path prerequisites",
        response: "Cybersecurity offers excellent career prospects! Our 4-week Cybersecurity Bootcamp ($740 AUD) covers AWS Security, Azure Security, IAM management, and compliance frameworks. No advanced IT background required - just willingness to learn. The field has high demand with roles like Cloud Security Specialist and Cybersecurity Analyst. Would you like to book a consultation to discuss your background and goals?",
        agent: "cybersecurity",
        results: [
          {
            id: "cybersecurity-bootcamp-warm",
            content: "Cybersecurity Bootcamp - 4 weeks, $740 AUD. Focus: AWS Security, Azure Security, risk assessment, compliance frameworks.",
            metadata: { title: "Cybersecurity Bootcamp", category: "course", enhanced: true, cragProcessed: true }
          }
        ]
      },
      {
        query: "visa requirements international students",
        response: "As an international student, I understand the visa complexities! For 485 visa holders, you typically have time to skill up and find employment. Our bootcamps are designed to fit visa work restrictions and help build the skills employers want. All courses are 4 weeks at $740 AUD. Let me connect you with our international student coordinator who can provide specific visa guidance alongside your career planning.",
        agent: "cultural",
        results: [
          {
            id: "visa-guidance-warm",
            content: "International Student Support: Comprehensive guidance for 485, 500, and other visa types. Course scheduling designed for visa requirements.",
            metadata: { title: "Visa Support", category: "career", enhanced: true, cragProcessed: true }
          }
        ]
      },
      {
        query: "data analyst vs business analyst comparison",
        response: "Great question! Data Analyst focuses on Python, SQL, and data visualization ($740 AUD, 4 weeks) - perfect if you enjoy working with numbers and creating insights. Business Analyst is more about requirements gathering, stakeholder management, and process improvement ($740 AUD, 4 weeks) - ideal if you prefer working with people and solving business problems. Both have excellent career prospects. Which appeals more to your interests?",
        agent: "business_analyst", 
        results: [
          {
            id: "analyst-comparison-warm",
            content: "Data Analyst vs Business Analyst: Data focuses on Python/SQL analysis, Business focuses on requirements and stakeholder management.",
            metadata: { title: "Analyst Comparison", category: "course", enhanced: true, cragProcessed: true }
          }
        ]
      },
      {
        query: "full stack developer job market trends",
        response: "Full stack development has strong job market demand! Current trends show high demand for React/Next.js and Node.js skills (covered in our bootcamp). Junior developers start around $60-80K AUD, with growth to $100K+ with experience. The market particularly values developers who can work across frontend and backend. Our 4-week program ($740 AUD) covers modern frameworks and includes portfolio building. Ready to explore this path?",
        agent: "fullstack",
        results: [
          {
            id: "fullstack-market-warm", 
            content: "Full Stack Developer market: High demand for React/Next.js, salary range $60-100K+ AUD, strong career growth prospects.",
            metadata: { title: "Full Stack Market", category: "career", enhanced: true, cragProcessed: true }
          }
        ]
      },
      {
        query: "data science python career path",
        response: "Data science with Python is an excellent career choice! Our 4-week Data & AI Bootcamp ($740 AUD) covers Python programming, SQL databases, machine learning fundamentals, and data visualization. You'll learn pandas, scikit-learn, and matplotlib - essential tools for data scientists. Entry-level positions start around $70-90K AUD. The field is growing rapidly with opportunities in healthcare, finance, and tech. Ready to dive into data?",
        agent: "data_ai",
        results: [
          {
            id: "data-science-warm",
            content: "Data & AI Bootcamp: Python, SQL, machine learning, visualization. Career opportunities in multiple industries.",
            metadata: { title: "Data Science Path", category: "career", enhanced: true, cragProcessed: true }
          }
        ]
      },
      {
        query: "business analyst requirements gathering",
        response: "Requirements gathering is a core BA skill! Our Business Analyst Bootcamp ($740 AUD, 4 weeks) teaches you stakeholder interviews, documentation techniques, process mapping, and analysis tools. You'll practice with real scenarios and learn to translate business needs into technical specifications. BAs are in high demand across industries - from $65-85K AUD starting salary. Want to explore this people-focused career path?",
        agent: "business_analyst",
        results: [
          {
            id: "ba-requirements-warm",
            content: "Business Analyst skills: Requirements gathering, stakeholder management, process analysis, documentation.",
            metadata: { title: "BA Requirements", category: "career", enhanced: true, cragProcessed: true }
          }
        ]
      }
    ];

    console.log('🔥 Warming semantic cache with common educational queries...');
    
    for (const item of commonQueries) {
      this.store(item.query, item.results, item.response, item.agent, 0.95);
    }

    console.log(`✅ Semantic cache warmed with ${commonQueries.length} high-value queries`);
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const avgConfidence = entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length || 0;

    return {
      totalEntries: this.cache.size,
      totalHits,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      cacheHitRate: totalHits > 0 ? totalHits / (totalHits + entries.length) : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
      mostPopular: entries.sort((a, b) => b.hitCount - a.hitCount)[0]?.query || null
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }

  private getCacheKey(query: string): string {
    return query.toLowerCase().trim();
  }
}