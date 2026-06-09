export type PersonId = 'person1' | 'person2';

export type CategoryId =
  | 'koofland'
  | 'aldi'
  | 'netto'
  | 'denns'
  | 'edeka'
  | 'rewe'
  | 'dm'
  | 'toogoodtogo'
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

export interface KassensturzPeriodData {
  kassensturz: Kassensturz;
  prevCreatedAt: string | null;
  expenses: Expense[];
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
  gekuendigt: boolean;
  neuerAnbieter: string;
  laeuftAb: string | null;
}

export type CalendarPerson = PersonId | 'both';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;          // YYYY-MM-DD (Startdatum)
  dateEnd?: string;      // YYYY-MM-DD (Enddatum, nur bei mehrtägigen)
  timeStart?: string;    // HH:MM
  timeEnd?: string;      // HH:MM
  person: CalendarPerson;
  notes?: string;
  reminderMinutes?: number;  // minutes before event; 0=at time, 30/60/120/1440=relative offset
  reminderAt?: string;       // "YYYY-MM-DD HH:MM" Vienna local — custom absolute reminder time
  createdAt: string;
}
