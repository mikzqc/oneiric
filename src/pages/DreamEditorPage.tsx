import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { dreamService } from '../services/dreamService';
import { DreamEntry } from '../types/dream';
import { DreamEditor } from '../components/journal/DreamEditor';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const DreamEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [initialDream, setInitialDream] = useState<DreamEntry | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!!id);

  const prefillDate = searchParams.get('date');

  useEffect(() => {
    if (id) {
      dreamService.getDreamById(id).then((dream) => {
        if (dream) {
          setInitialDream(dream);
        } else {
          navigate('/journal');
        }
        setIsLoading(false);
      });
    }
  }, [id, navigate]);

  const handleSaved = (_saved: DreamEntry) => {
    navigate('/journal');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // If prefilling date for a new dream
  const dreamWithPrefill = initialDream
    ? initialDream
    : prefillDate
    ? ({
        date: prefillDate,
        title: '',
        narrative: '',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
      } as unknown as DreamEntry)
    : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Top breadcrumb navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>

        <span className="text-xs text-slate-400">
          {id ? 'Editing Dream' : 'New Dream Entry'}
        </span>
      </div>

      <div className="p-6 sm:p-8 rounded-xl bg-slate-900/60 border border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mb-1">
          {id ? 'Edit Dream' : 'New Dream Entry'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          Record narrative details, vividness, lucidity cues, and tags.
        </p>

        <DreamEditor
          initialDream={dreamWithPrefill}
          onSaved={handleSaved}
          onCancel={() => navigate(-1)}
          isModal={false}
        />
      </div>
    </div>
  );
};
