export type PersonId = 'person1' | 'person2';

export type CategoryId =
  | 'koofland'
  | 'aldi'
  | 'netto'
  | 'denns'
  | 'edeka'
  | 'rewe'
  | 'dm'
  | 'sonstiges'
  | 'urlaub'
  | 'ausgleich';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: CategoryId;
  paidBy: PersonId;
  /** person1's share as a decimal (0.0 – 1.0) */
  splitRatio: number;
  date: string; // YYYY-MM-DD
  receiptImage?: string; // base64 data URL
  notes?: string;
  createdAt: string; // ISO datetime
}

export interface Settings {
  person1Name: string;
  person2Name: string;
}

export interface Kassensturz {
  id: string;
  createdAt: string; // ISO datetime
}

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  createdAt: string;
}

export interface FixkostenAmounts {
  person1Amount: number;
  person2Amount: number;
}

export interface VertragsEntry {
  key: string;
  anbieter: string;
  vertragsbeginn: string | null;
  vertragsende: string | null;
}
