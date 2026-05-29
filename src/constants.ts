import { CategoryId, Settings } from './types';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'koofland', label: 'Koofland', icon: '🏬', bgColor: 'bg-slate-100',  textColor: 'text-slate-700'  },
  { id: 'aldi',     label: 'Aldi',     icon: '🧺', bgColor: 'bg-blue-100',   textColor: 'text-blue-700'   },
  { id: 'netto',    label: 'Netto',    icon: '🛍️', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  { id: 'denns',    label: 'Denns',    icon: '🌿', bgColor: 'bg-green-100',  textColor: 'text-green-700'  },
  { id: 'edeka',    label: 'Edeka',    icon: '🛒', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  { id: 'rewe',     label: 'Rewe',     icon: '🏪', bgColor: 'bg-red-100',    textColor: 'text-red-700'    },
  { id: 'dm',       label: 'DM',       icon: '🧴', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  { id: 'sonstiges',label: 'Sonstiges',icon: '📦', bgColor: 'bg-gray-100',   textColor: 'text-gray-700'   },
  { id: 'ausgleich',label: 'Ausgleich',icon: '💸', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
];

/** Categories shown in the add-expense form (no 'ausgleich') */
export const USER_CATEGORIES = CATEGORIES.filter(c => c.id !== 'ausgleich');

export const DEFAULT_SETTINGS: Settings = {
  person1Name: 'René',
  person2Name: 'Lisa',
};

export const STORAGE_KEY = 'kostenteilung_v1';
