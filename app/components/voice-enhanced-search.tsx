'use client';

import { useState, useRef, useCallback } from 'react';
import { useVoiceRecognition, useTextToSpeech } from '@/lib/hooks/use-voice';
import { enhancedSearchAction, EnhancedSearchResponse } from '@/app/actions/enhanced-search';
import { 
  Search, 
  Mic, 
  MicOff, 
  Settings, 
  Brain, 
  Sparkles, 
  Target,
  GitBranch,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
}

interface Intent {
  type: string;
  confidence: number;
  entities: string[];
  searchStrategy: string;
  clarificationNeeded: boolean;
  suggestedQueries?: string[];
}

export default function VoiceEnhancedSearch() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState('');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [searchMode, setSearchMode] = useState<'semantic' | 'relationship' | 'hybrid'>('hybrid');
  const [generateSummary, setGenerateSummary] = useState(true);
  const [useMemory, setUseMemory] = useState(true);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const formRef = useRef<HTMLFormElement>(null);

  // Voice recognition setup
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition({
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setQuery(prev => prev + text);
        resetTranscript();
      }
    }
  });

  // Text-to-speech setup
  const {
    isSupported: ttsSupported,
    isSpeaking,
    speak,
    stop: stopSpeaking
  } = useTextToSpeech();

  const handleSearch = useCallback(async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('query', searchQuery.trim());
      formData.append('generateSummary', generateSummary.toString());
      formData.append('useMemory', useMemory.toString());
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      const response: EnhancedSearchResponse = await enhancedSearchAction(formData);
      
      if (response.success) {
        setResults(response.results || []);
        setSummary(response.summary || '');
        setIntent(response.intent);
        setConversationId(response.conversationId);
        setSuggestions(response.suggestions || []);
        
        // Add to search history
        setSearchHistory(prev => [
          searchQuery.trim(),
          ...prev.filter(q => q !== searchQuery.trim()).slice(0, 4)
        ]);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query, generateSummary, useMemory, conversationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleSpeakSummary = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (summary) {
      speak(summary);
    }
  };

  const toggleResultExpansion = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const getIntentIcon = (intentType: string) => {
    switch (intentType) {
      case 'definition': return <Brain className="w-4 h-4" />;
      case 'prerequisite': return <Target className="w-4 h-4" />;
      case 'career_path': return <GitBranch className="w-4 h-4" />;
      case 'next_steps': return <Zap className="w-4 h-4" />;
      case 'relationship': return <GitBranch className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Search Interface */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything about learning, careers, or prerequisites..."
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                {interimTranscript && (
                  <div className="absolute inset-x-0 top-full mt-1 text-sm text-gray-500 italic pl-12">
                    "{interimTranscript}"
                  </div>
                )}
              </div>
              
              {voiceSupported && (
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  className={cn(
                    "p-4 rounded-xl transition-all duration-200",
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-4 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Strategy
                  </label>
                  <select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="semantic">Semantic Search</option>
                    <option value="relationship">Relationship Search</option>
                    <option value="hybrid">Hybrid Search</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={generateSummary}
                      onChange={(e) => setGenerateSummary(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Generate AI Summary</span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useMemory}
                      onChange={(e) => setUseMemory(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Use Conversation Memory</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Recent Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((historyQuery, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(historyQuery);
                    handleSearch(historyQuery);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {historyQuery}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-800 font-medium">Search Error</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Intent Analysis */}
      {intent && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getIntentIcon(intent.type)}
              <span className="font-semibold text-blue-900">Intent Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-700">Confidence:</span>
              <div className="w-20 bg-blue-200 rounded-full h-2">
                <div 
                  className={cn("h-2 rounded-full transition-all", getConfidenceColor(intent.confidence))}
                  style={{ width: `${intent.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-blue-900">
                {Math.round(intent.confidence * 100)}%
              </span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Type:</span>
              <span className="ml-2 capitalize text-blue-700">{intent.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Strategy:</span>
              <span className="ml-2 capitalize text-blue-700">{intent.searchStrategy}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Entities:</span>
              <span className="ml-2 text-blue-700">{intent.entities.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-900">AI Summary</h3>
            </div>
            {ttsSupported && (
              <button
                onClick={handleSpeakSummary}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isSpeaking
                    ? "bg-purple-600 text-white"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                )}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="text-purple-800 leading-relaxed">
            {summary}
          </div>
        </div>
      )}

      {/* Suggested Queries */}
      {suggestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-900 mb-3">Suggested Follow-up Questions</h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  handleSearch(suggestion);
                }}
                className="block w-full text-left px-3 py-2 text-yellow-800 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Search Results ({results.length})
          </h2>
          
          {results.map((result, index) => (
            <div key={result.id || index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {result.metadata?.title || `Result ${index + 1}`}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Score: {(result.score * 100).toFixed(1)}%</span>
                    {result.metadata?.category && (
                      <span>Category: {result.metadata.category}</span>
                    )}
                    {result.metadata?.difficulty && (
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        result.metadata.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        result.metadata.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {result.metadata.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleResultExpansion(result.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {expandedResults.has(result.id) ? 
                    <ChevronUp className="w-5 h-5" /> : 
                    <ChevronDown className="w-5 h-5" />
                  }
                </button>
              </div>
              
              <div className="text-gray-700 mb-3">
                {result.content || result.metadata?.content || 'No content available'}
              </div>
              
              {expandedResults.has(result.id) && result.metadata && (
                <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                  {result.metadata.prerequisites && result.metadata.prerequisites.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-800">Prerequisites:</span>
                      <span className="ml-2 text-gray-600">{result.metadata.prerequisites.join(', ')}</span>
                    </div>
                  )}
                  {result.metadata.leadsTo && result.metadata.leadsTo.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-800">Leads to:</span>
                      <span className="ml-2 text-gray-600">{result.metadata.leadsTo.join(', ')}</span>
                    </div>
                  )}
                  {result.metadata.tags && result.metadata.tags.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-800">Tags:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {result.metadata.tags.map((tag: string, tagIndex: number) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && results.length === 0 && query && !error && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No results found for your query.</p>
          <p className="text-sm mt-1">Try rephrasing your question or using different keywords.</p>
        </div>
      )}
    </div>
  );
}