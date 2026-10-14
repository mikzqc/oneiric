import React, { useState, useMemo } from 'react';
import { TECHNIQUE_CATALOG } from '../types/technique';
import { TechniqueCard } from '../components/techniques/TechniqueCard';
import {
  Compass,
  Search,
  Filter,
  Brain,
  Moon,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const TechniquesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Protocols');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All Levels');

  const categories = [
    'All Protocols',
    'Mnemonic & Mental',
    'Sensory Conditioning',
    'Direct Entry (WILD)',
    'Awakening & REM',
    'Daytime Awareness',
    'Hypnagogic State',
  ];

  const difficulties = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredTechniques = useMemo(() => {
    return TECHNIQUE_CATALOG.filter((tech) => {
      // Category filter
      if (selectedCategory !== 'All Protocols' && tech.category !== selectedCategory) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficulty !== 'All Levels' && tech.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = tech.name.toLowerCase().includes(query);
        const matchesAcronym = tech.acronym.toLowerCase().includes(query);
        const matchesShort = tech.shortDesc.toLowerCase().includes(query);
        const matchesDesc = tech.description.toLowerCase().includes(query);
        const matchesMechanism = tech.scientificMechanism.toLowerCase().includes(query);
        const matchesTiming = tech.recommendedTiming.toLowerCase().includes(query);
        if (
          !matchesName &&
          !matchesAcronym &&
          !matchesShort &&
          !matchesDesc &&
          !matchesMechanism &&
          !matchesTiming
        ) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-blue-400" />
            <span>Induction Protocols & Knowledge Base</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Evidence-based lucid dreaming methodologies, cognitive mechanisms, step-by-step instructions, and execution frameworks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-950/80 text-blue-300 border border-blue-700/60 font-mono">
            {filteredTechniques.length} of {TECHNIQUE_CATALOG.length} Protocols
          </span>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search protocols by name, acronym, mechanism, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500/80 placeholder-slate-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <span>Level:</span>
            </span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {difficulties.map((diff) => (
                <option key={diff} value={diff}>
                  {diff}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm shadow-blue-950 font-semibold'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800/60 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Protocols Grid */}
      {filteredTechniques.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800 text-center space-y-3">
          <p className="text-slate-400 text-sm">No protocols matched your search or filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Protocols');
              setSelectedDifficulty('All Levels');
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTechniques.map((tech) => (
            <TechniqueCard key={tech.id} info={tech} />
          ))}
        </div>
      )}

      {/* Educational Fundamentals & Sleep Architecture Banner */}
      <div className="p-6 rounded-2xl bg-[#0c1222]/90 border border-slate-800/90 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-400" />
          <span>Core Sleep Architecture & Induction Fundamentals</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-blue-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span>REM Sleep Distribution</span>
            </span>
            <p className="leading-relaxed text-slate-400 text-[11px]">
              The human brain experiences ultradian 90-minute sleep cycles. Early cycles are dominated by deep slow-wave NREM sleep; late-morning cycles (cycles 4–6) contain prolonged, vivid REM phases where lucid dreams predominantly manifest.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cognitive Prefrontal Reactivation</span>
            </span>
            <p className="leading-relaxed text-slate-400 text-[11px]">
              During regular dreams, the dorsolateral prefrontal cortex remains largely hypometabolic (deactivated), which is why absurd events feel normal. Techniques like WBTB, MILD, and SSILD gently elevate frontoparietal activity, allowing reflective insight to spark inside the dream.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Protect Sleep Health</span>
            </span>
            <p className="leading-relaxed text-slate-400 text-[11px]">
              Never sacrifice restorative sleep by setting disruptive hourly alarms or forcing awakenings when exhausted. Consistent sleep schedules, daytime awareness, and gentle weekend WBTB practice yield far superior lucidity than erratic sleep patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
