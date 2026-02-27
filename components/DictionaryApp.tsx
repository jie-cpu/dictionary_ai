'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Book, Settings, Plus, Trash2, Volume2, X, Command, Smartphone, Monitor } from 'lucide-react';

// --- Types ---
interface WordData {
  word: string;
  phonetic: string;
  definition: string;
  scenarios: string[];
  collocations: string[];
  example: string;
  exampleTranslation?: string;
  timestamp?: number;
}

type Platform = 'ios' | 'android' | 'desktop';

// --- Components ---

// 1. Platform Toggle
const PlatformSelector = ({ current, onChange }: { current: Platform; onChange: (p: Platform) => void }) => {
  return (
    <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
      <button
        onClick={() => onChange('ios')}
        className={`p-2 rounded-md transition-all ${current === 'ios' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
        title="iOS Style"
      >
        <Smartphone className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('android')}
        className={`p-2 rounded-md transition-all ${current === 'android' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
        title="Android Style"
      >
        <Smartphone className="w-4 h-4 rounded-none" /> {/* Visual hint for square corners */}
      </button>
      <button
        onClick={() => onChange('desktop')}
        className={`p-2 rounded-md transition-all ${current === 'desktop' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
        title="Desktop Style"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
};

// 2. Main Dictionary App
export default function DictionaryApp() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vocab, setVocab] = useState<WordData[]>([]);
  const [isOpen, setIsOpen] = useState(false); // For the "modal" simulation
  const [platform, setPlatform] = useState<Platform>('ios');
  const [activeTab, setActiveTab] = useState<'search' | 'vocab'>('search');
  const [filterScenario, setFilterScenario] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load vocab from local storage
  useEffect(() => {
    const saved = localStorage.getItem('omnidict-vocab');
    if (saved) {
      try {
        setVocab(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse vocab", e);
      }
    }
  }, []);

  // Save vocab
  useEffect(() => {
    localStorage.setItem('omnidict-vocab', JSON.stringify(vocab));
  }, [vocab]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Initialize Gemini client directly on the client side
      // Note: In a real production app, you might proxy this to hide the key,
      // but for this specific runtime environment, client-side calls are required.
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "" });

      const prompt = `
        Analyze the word "${query}" for a dictionary app. 
        Return ONLY a JSON object (no markdown formatting) with the following structure:
        {
          "word": "${query}",
          "phonetic": "IPA phonetic transcription",
          "definition": "A concise, clear definition",
          "scenarios": ["List 2-3 high-frequency usage scenarios, e.g., 'Daily Conversation', 'Academic', 'Business'"],
          "collocations": ["List 2-3 common collocations"],
          "example": "A natural, colloquial example sentence using the word",
          "exampleTranslation": "Translation of the example sentence (optional, if useful)"
        }
        Ensure the example is natural and fits the high-frequency scenarios.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }

      // Robust JSON parsing (handle potential markdown code blocks)
      const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(jsonString);
      
      setResult(data);
    } catch (err) {
      console.error("Dictionary lookup error:", err);
      setError('Could not find word. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToVocab = () => {
    if (result && !vocab.find((w) => w.word === result.word)) {
      setVocab([{ ...result, timestamp: Date.now() }, ...vocab]);
    }
  };

  const removeFromVocab = (word: string) => {
    setVocab(vocab.filter((w) => w.word !== word));
  };

  // Dynamic Styles based on Platform
  const getContainerStyle = () => {
    switch (platform) {
      case 'ios':
        return 'rounded-3xl font-sans';
      case 'android':
        return 'rounded-none font-sans'; // More square
      case 'desktop':
        return 'rounded-lg font-sans';
      default:
        return 'rounded-2xl';
    }
  };

  const getButtonStyle = (variant: 'primary' | 'secondary' = 'primary') => {
    const base = 'px-4 py-2 font-medium transition-colors flex items-center justify-center gap-2';
    const radius = platform === 'ios' ? 'rounded-full' : platform === 'android' ? 'rounded-sm' : 'rounded-md';
    
    if (variant === 'primary') {
      return `${base} ${radius} bg-blue-600 text-white hover:bg-blue-700 active:scale-95`;
    }
    return `${base} ${radius} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 flex flex-col items-center">
      
      {/* Header / Controls */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
            Od
          </div>
          <h1 className="text-2xl font-bold tracking-tight">OmniDict AI</h1>
        </div>
        <PlatformSelector current={platform} onChange={setPlatform} />
      </header>

      {/* Main Trigger (Simulation) */}
      <div className="text-center mb-12 space-y-4">
        <p className="text-gray-500 dark:text-gray-400">
          Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-md text-sm font-mono">⌘K</kbd> or <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-md text-sm font-mono">Ctrl+K</kbd> to wake the dictionary.
        </p>
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className={getButtonStyle('primary') + " mx-auto shadow-xl shadow-blue-600/20"}
        >
          <Search className="w-5 h-5" />
          <span>Open Dictionary</span>
        </button>
      </div>

      {/* Vocabulary Preview */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-500" />
            Recent Vocabulary
          </h2>
          <span className="text-sm text-gray-500">{vocab.length} words</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {vocab.slice(0, 4).map((word) => (
            <div key={word.word} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 ${platform === 'ios' ? 'rounded-2xl' : platform === 'android' ? 'rounded-sm' : 'rounded-lg'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{word.word}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{word.scenarios[0]}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{word.definition}</p>
            </div>
          ))}
          {vocab.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
              No words saved yet.
            </div>
          )}
        </div>
      </div>

      {/* The "Modal" - The Core Experience */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${getContainerStyle()}`}
            >
              {/* Tab Bar (if needed, or just keep it simple) */}
              <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-3 text-sm font-medium ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Search
                </button>
                <button
                  onClick={() => setActiveTab('vocab')}
                  className={`flex-1 py-3 text-sm font-medium ${activeTab === 'vocab' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Vocabulary ({vocab.length})
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-0">
                {activeTab === 'search' ? (
                  <div className="p-4 space-y-4">
                    {/* Search Input */}
                    <form onSubmit={handleSearch} className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a word (e.g., 'chill')..."
                        className={`w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 outline-none text-lg ${platform === 'ios' ? 'rounded-xl' : 'rounded-md'}`}
                      />
                    </form>

                    {/* Loading State */}
                    {loading && (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Consulting AI Dictionary...</p>
                      </div>
                    )}

                    {/* Error State */}
                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-center">
                        {error}
                      </div>
                    )}

                    {/* Result State */}
                    {result && !loading && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Header: Word & Phonetic */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{result.word}</h2>
                            <div className="flex items-center gap-2 mt-1 text-gray-500">
                              <span className="font-mono text-sm">/{result.phonetic}/</span>
                              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={addToVocab}
                            disabled={!!vocab.find(w => w.word === result.word)}
                            className={`p-2 ${platform === 'ios' ? 'rounded-full' : 'rounded-md'} ${vocab.find(w => w.word === result.word) ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}
                          >
                            {vocab.find(w => w.word === result.word) ? <Book className="w-5 h-5 fill-current" /> : <Plus className="w-5 h-5" />}
                          </button>
                        </div>

                        {/* Definition */}
                        <div>
                          <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">
                            {result.definition}
                          </p>
                        </div>

                        {/* Scenarios & Tags */}
                        <div className="flex flex-wrap gap-2">
                          {result.scenarios.map((tag, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wider rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Collocations */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-2">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">High-Freq Collocations</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.collocations.map((col, i) => (
                              <span key={i} className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Example */}
                        <div className="border-l-4 border-blue-500 pl-4 py-1">
                          <p className="text-lg italic text-gray-700 dark:text-gray-300">"{result.example}"</p>
                          {result.exampleTranslation && (
                            <p className="text-sm text-gray-500 mt-1">{result.exampleTranslation}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Vocabulary Tab
                  <div className="p-4 space-y-4">
                    {vocab.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        Your vocabulary book is empty.
                      </div>
                    ) : (
                      <>
                        {/* Scenario Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          <button
                            onClick={() => setFilterScenario(null)}
                            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                              filterScenario === null
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            All
                          </button>
                          {Array.from(new Set(vocab.flatMap(w => w.scenarios))).map(scenario => (
                            <button
                              key={scenario}
                              onClick={() => setFilterScenario(scenario)}
                              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                                filterScenario === scenario
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              {scenario}
                            </button>
                          ))}
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                          {vocab
                            .filter(w => filterScenario ? w.scenarios.includes(filterScenario) : true)
                            .map((word) => (
                              <div key={word.word} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{word.word}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                      {word.scenarios[0]}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{word.definition}</div>
                                </div>
                                <button
                                  onClick={() => removeFromVocab(word.word)}
                                  className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
