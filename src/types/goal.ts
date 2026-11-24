export type GoalStatus = 'active' | 'completed' | 'archived';

export type GoalCategory =
  | 'Lucid Dreaming'
  | 'Dream Recall'
  | 'Sleep Hygiene'
  | 'Mindfulness'
  | 'Nightmares & Fear'
  | 'Exploration'
  | 'Personal'
  | string;

export interface GoalItem {
  id: string;
  title: string;
  description?: string;
  category?: GoalCategory;
  targetDate?: string; // YYYY-MM-DD
  status: GoalStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
