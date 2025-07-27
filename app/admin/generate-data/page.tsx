'use client';

import { useState } from 'react';
import { Database, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GenerateDataPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const generateData = async () => {
    setIsGenerating(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/admin/import-personas', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage(`Successfully imported ${result.count} personas, ${result.vectors} Q&As, and ${result.patterns} response patterns!`);
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to import persona data');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Database className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Import Phase 9 Persona Data
            </h1>
            <p className="text-gray-600">
              This will import real student personas with their journey questions and 
              empathetic responses for the persona-aware RAG system.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What this will create:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 3 detailed student personas (Rohan Patel, Priya Sharma, Marcus Johnson)</li>
                <li>• Real journey-based questions and empathetic answers</li>
                <li>• Persona detection patterns and response guidelines</li>
                <li>• Vector embeddings for persona-aware search</li>
                <li>• Emotional support and cultural considerations</li>
              </ul>
            </div>

            <button
              onClick={generateData}
              disabled={isGenerating}
              className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Data...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Import Persona Data</span>
                </div>
              )}
            </button>

            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Success!</span>
                </div>
                <p className="text-green-800 mt-1">{message}</p>
                <p className="text-sm text-green-700 mt-2">
                  You can now go back to the main page and try searching!
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Error</span>
                </div>
                <p className="text-red-800 mt-1">{message}</p>
              </div>
            )}

            <div className="text-center">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Main Page
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}