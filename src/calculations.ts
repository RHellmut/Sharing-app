import { Expense } from './types';

/**
 * raw > 0 → person1 owes person2
 * raw < 0 → person2 owes person1
 */
function rawBalance(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => {
    if (e.paidBy === 'person1') {
      return sum - e.amount * (1 - e.splitRatio);
    } else {
      return sum + e.amount * e.splitRatio;
    }
  }, 0);
}

export interface Balance {
  amount: number;
  /** true = person1 owes person2 */
  debtorIsP1: boolean;
}

export function calculateBalance(expenses: Expense[]): Balance {
  const raw = rawBalance(expenses);
  return { amount: Math.abs(raw), debtorIsP1: raw > 0 };
}

export function totalExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function expensesThisMonth(expenses: Expense[]): Expense[] {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}
