import VoiceEnhancedSearch from './components/voice-enhanced-search';
import { Brain, Sparkles, Target, GitBranch } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agentic RAG System
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Intelligent knowledge discovery with relationship-aware search. 
            Find prerequisites, unlock career paths, and explore learning journeys.
          </p>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">AI-Powered Intent Analysis</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Smart Query Routing</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
              <GitBranch className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Relationship Mapping</span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto">
          <VoiceEnhancedSearch />
        </main>

        <section className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8">
            Example Queries to Try
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-blue-600 mb-2">Prerequisites</h3>
              <p className="text-sm text-gray-600 mb-3">
                Discover what you need to learn first
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• "What should I know before React?"</li>
                <li>• "Prerequisites for machine learning"</li>
                <li>• "Basics needed for AWS"</li>
              </ul>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-green-600 mb-2">Career Paths</h3>
              <p className="text-sm text-gray-600 mb-3">
                Plan your professional journey
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• "How to become a data scientist"</li>
                <li>• "Path to full-stack developer"</li>
                <li>• "Skills for ML engineer"</li>
              </ul>
            </div>
            
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-purple-600 mb-2">Next Steps</h3>
              <p className="text-sm text-gray-600 mb-3">
                Discover what to learn next
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• "What comes after JavaScript?"</li>
                <li>• "Advanced topics after Python"</li>
                <li>• "Next steps after HTML/CSS"</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-20 text-center text-sm text-gray-500 pb-8">
          <p>Phase 3: Voice-Enabled Intelligent Search</p>
          <p className="mt-1">Powered by Web Speech API • Groq LLMs • Upstash Vector • Next.js 15</p>
        </footer>
      </div>
    </div>
  );
}