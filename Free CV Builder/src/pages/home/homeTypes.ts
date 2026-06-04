import type { AuthUser } from '../../utils/api';

export interface CvCreationQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan?: 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';
}

export interface DownloadQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
  plan?: 'free' | 'payg' | 'monthly' | 'quarterly' | 'unlimited';
  resetAt?: string;
}

export type UpgradePrompt = {
  title: string;
  message: string;
  source: 'save' | 'download' | 'ai';
};

export type UpgradePlan = 'free' | 'payg' | 'monthly' | 'quarterly';

export type ThemeTransitionState = {
  x: number;
  y: number;
  key: number;
  targetDark: boolean;
};

export type AuthPlan = AuthUser['plan'];
