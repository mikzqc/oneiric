import { db } from '../db/database';
import { GoalItem, GoalStatus, GoalCategory } from '../types/goal';
import { tombstoneService } from '../utils/tombstones';
import { syncService } from './syncService';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  category?: GoalCategory;
  targetDate?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  category?: GoalCategory;
  targetDate?: string;
  status?: GoalStatus;
}

export const DEFAULT_GOAL_CATEGORIES: string[] = [
  'Lucid Dreaming',
  'Dream Recall',
  'Sleep Hygiene',
  'Mindfulness',
  'Nightmares & Fear',
  'Exploration',
  'Personal',
];

export const goalService = {
  /**
   * Retrieves all goals, sorted by creation date newest first
   */
  async getAllGoals(): Promise<GoalItem[]> {
    const goals = await db.goals.toArray();
    return goals.sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Retrieves goals by status ('active', 'completed', 'archived')
   */
  async getGoalsByStatus(status: GoalStatus): Promise<GoalItem[]> {
    const goals = await db.goals.where('status').equals(status).toArray();
    return goals.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * Retrieves a single goal by ID
   */
  async getGoalById(id: string): Promise<GoalItem | undefined> {
    if (!id) return undefined;
    return db.goals.get(id);
  },

  /**
   * Creates a new personal intention / goal
   */
  async createGoal(input: CreateGoalInput): Promise<GoalItem> {
    const cleanTitle = input.title.trim();
    if (!cleanTitle) {
      throw new Error('Goal title cannot be empty.');
    }

    const now = Date.now();
    const newGoal: GoalItem = {
      id: generateId(),
      title: cleanTitle,
      description: input.description?.trim() || undefined,
      category: input.category?.trim() || undefined,
      targetDate: input.targetDate?.trim() || undefined,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.goals.add(newGoal);
    syncService.triggerAutoSync();
    return newGoal;
  },

  /**
   * Updates an existing goal
   */
  async updateGoal(id: string, updates: UpdateGoalInput): Promise<GoalItem> {
    const existing = await db.goals.get(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const now = Date.now();
    const updated: GoalItem = {
      ...existing,
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: updates.description.trim() || undefined }),
      ...(updates.category !== undefined && { category: updates.category.trim() || undefined }),
      ...(updates.targetDate !== undefined && { targetDate: updates.targetDate.trim() || undefined }),
      ...(updates.status !== undefined && {
        status: updates.status,
        completedAt: updates.status === 'completed' ? (existing.completedAt || now) : undefined,
      }),
      updatedAt: now,
    };

    await db.goals.put(updated);
    syncService.triggerAutoSync();
    return updated;
  },

  /**
   * Updates a goal's status (active, completed, archived)
   */
  async setGoalStatus(id: string, status: GoalStatus): Promise<GoalItem> {
    const existing = await db.goals.get(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const now = Date.now();
    const updated: GoalItem = {
      ...existing,
      status,
      completedAt: status === 'completed' ? now : undefined,
      updatedAt: now,
    };

    await db.goals.put(updated);
    syncService.triggerAutoSync();
    return updated;
  },

  /**
   * Deletes a goal and records a tombstone
   */
  async deleteGoal(id: string): Promise<void> {
    if (!id) return;
    await db.goals.delete(id);
    tombstoneService.recordDeletion(id);
    syncService.triggerAutoSync();
  },

  /**
   * Returns distinct categories used across goals
   */
  async getCategories(): Promise<string[]> {
    const goals = await db.goals.toArray();
    const set = new Set<string>(DEFAULT_GOAL_CATEGORIES);
    for (const g of goals) {
      if (g.category && g.category.trim()) {
        set.add(g.category.trim());
      }
    }
    return Array.from(set);
  },
};
