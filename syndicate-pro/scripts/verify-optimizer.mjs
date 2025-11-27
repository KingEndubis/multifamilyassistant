import { analyzeDeal } from '../src/lib/finance.js';
import { suggestImprovements } from '../src/lib/optimizer.js';

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const inputs = {
  rent: 1250,
  units: 24,
  grossRents: 1250 * 24 * 12,
  vacancyRate: 8,
  otherIncome: 12000,
  taxes: 38000,
  insurance: 18000,
  repairs: 54000,
  utilities: 72000,
  management: 60000,
  admin: 24000,
  purchasePrice: 2400000,
  downPaymentPct: 25,
  interestRate: 6.5,
  amortYears: 30,
};

const results = analyzeDeal(inputs);
const itemization = {
  incomeItems: [
    { label: 'Laundry income annual', amount: 5000, category: 'otherIncome' },
    { label: 'Parking income annual', amount: 12000, category: 'otherIncome' },
  ],
  expenseItems: [
    { label: 'Management fee annual', amount: inputs.management, category: 'management' },
    { label: 'Utilities annual', amount: inputs.utilities, category: 'utilities' },
    { label: 'Repairs & maintenance annual', amount: inputs.repairs, category: 'repairs' },
    { label: 'Admin/legal/marketing annual', amount: inputs.admin, category: 'admin' },
  ],
};

const suggestions = suggestImprovements(inputs, results, itemization);
console.log('Top Suggestions:', suggestions.slice(0, 6));
assert(Array.isArray(suggestions) && suggestions.length > 0, 'Suggestions are generated');
assert(suggestions.every(s => (s.annualImpact ?? 0) >= 0), 'Suggestion impacts are non-negative');

console.log('Optimizer verification passed.');