import { CategoryId, Settings } from './types';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string;       // emoji fallback
  logoUrl?: string;   // Clearbit logo URL
  bgColor: string;
  textColor: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'koofland', label: 'Koofland', icon: '🏬', logoUrl: '/logos/kaufland.svg', bgColor: 'bg-red-100',    textColor: 'text-red-700'    },
  { id: 'aldi',     label: 'Aldi',     icon: '🧺', logoUrl: '/logos/aldi.svg',     bgColor: 'bg-blue-100',   textColor: 'text-blue-700'   },
  { id: 'netto',    label: 'Netto',    icon: '🛍️', logoUrl: '/logos/netto.svg',    bgColor: 'bg-gray-900',   textColor: 'text-yellow-400' },
  { id: 'denns',    label: 'Denns',    icon: '🌿', logoUrl: '/logos/denns.svg',    bgColor: 'bg-green-100',  textColor: 'text-green-700'  },
  { id: 'edeka',    label: 'Edeka',    icon: '🛒', logoUrl: '/logos/edeka.svg',    bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  { id: 'rewe',     label: 'Rewe',     icon: '🏪', logoUrl: '/logos/rewe.svg',     bgColor: 'bg-red-100',    textColor: 'text-red-700'    },
  { id: 'dm',       label: 'DM',       icon: '🧴', logoUrl: '/logos/dm.svg',       bgColor: 'bg-slate-100',  textColor: 'text-slate-700'  },
  { id: 'urlaub',   label: 'Urlaub',   icon: '🚢', logoUrl: '/logos/urlaub.svg',   bgColor: 'bg-sky-100',    textColor: 'text-sky-700'    },
  { id: 'sonstiges',label: 'Sonstiges',icon: '📦',                                 bgColor: 'bg-gray-100',   textColor: 'text-gray-700'   },
  { id: 'ausgleich',label: 'Ausgleich',icon: '💸',                                 bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
];

/** Categories shown in the add-expense form (no 'ausgleich') */
export const USER_CATEGORIES = CATEGORIES.filter(c => c.id !== 'ausgleich');

export const DEFAULT_SETTINGS: Settings = {
  person1Name: 'René',
  person2Name: 'Lisa',
};

export const STORAGE_KEY = 'kostenteilung_v1';
