import { CategoryId, Settings } from './types';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'lebensmittel', label: 'Lebensmittel', icon: '🛒', bgColor: 'bg-green-100',  textColor: 'text-green-700'  },
  { id: 'haushalt',     label: 'Haushalt',     icon: '🏠', bgColor: 'bg-blue-100',   textColor: 'text-blue-700'   },
  { id: 'restaurant',   label: 'Restaurant',   icon: '🍽️', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  { id: 'freizeit',     label: 'Freizeit',     icon: '🎉', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  { id: 'transport',    label: 'Transport',    icon: '🚗', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  { id: 'gesundheit',   label: 'Gesundheit',   icon: '💊', bgColor: 'bg-red-100',    textColor: 'text-red-700'    },
  { id: 'sonstiges',    label: 'Sonstiges',    icon: '📦', bgColor: 'bg-gray-100',   textColor: 'text-gray-700'   },
  { id: 'ausgleich',    label: 'Ausgleich',    icon: '💸', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
];

/** Categories shown in the add-expense form (no 'ausgleich') */
export const USER_CATEGORIES = CATEGORIES.filter(c => c.id !== 'ausgleich');

export const DEFAULT_SETTINGS: Settings = {
  person1Name: 'René',
  person2Name: 'Lisa',
};

export const STORAGE_KEY = 'kostenteilung_v1';
