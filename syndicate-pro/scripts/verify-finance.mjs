/*
 Verify finance functions for SyndicatePro
 - Checks core metrics and identities for a sample deal
 */
import { analyzeDeal, calculateMortgage } from '../src/lib/finance.js';

const epsilon = 1e-6;
const close = (a, b, tol = epsilon) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

function assert(label, cond, expected, actual) {
  if (!cond) {
    console.error(`✖ ${label} | expected: ${expected}, actual: ${actual}`);
    return false;
  }
  console.log(`✔ ${label}`);
  return true;
}

const inputs = {
  purchasePrice: 1200000,
  downPayment: 300000,
  interestRate: 6.5,
  amortization: 25,
  grossRents: 240000,
  otherIncome: 12000,
  vacancyRate: 5,
  taxes: 18000,
  insurance: 10000,
  repairs: 25000,
  management: 12000,
  utilities: 35000,
  admin: 8000,
  units: 24,
  marketCapRate: 6.0,
};

const r = analyzeDeal(inputs);

let pass = true;

// Independent expectations
const grossPotentialIncome = inputs.grossRents + inputs.otherIncome; // 252000
const vacancyLoss = inputs.grossRents * (inputs.vacancyRate / 100); // 12000
const effectiveGrossIncome = grossPotentialIncome - vacancyLoss; // 240000
const totalExpenses = inputs.taxes + inputs.insurance + inputs.repairs + inputs.management + inputs.utilities + inputs.admin; // 108000
const expectedNOI = effectiveGrossIncome - totalExpenses; // 132000
const loanAmount = inputs.purchasePrice - inputs.downPayment; // 900000
const expectedAnnualDebt = calculateMortgage(loanAmount, inputs.interestRate, inputs.amortization);
const expectedCashFlow = expectedNOI - expectedAnnualDebt;
const expectedCoC = inputs.downPayment > 0 ? (expectedCashFlow / inputs.downPayment) * 100 : 0;
const expectedCapRate = inputs.purchasePrice > 0 ? (expectedNOI / inputs.purchasePrice) * 100 : 0;
const expectedDSCR = expectedAnnualDebt > 0 ? expectedNOI / expectedAnnualDebt : 0;
const expectedMarketValue = inputs.marketCapRate > 0 ? expectedNOI / (inputs.marketCapRate / 100) : 0; // 2.2M
const expectedPPD = inputs.units > 0 ? inputs.purchasePrice / inputs.units : 0; // 50k
const expectedExpenseRatio = effectiveGrossIncome > 0 ? (totalExpenses / effectiveGrossIncome) * 100 : 0; // 45%

pass &= assert('Effective Gross Income', close(r.effectiveGrossIncome, effectiveGrossIncome), effectiveGrossIncome, r.effectiveGrossIncome);
pass &= assert('Total Expenses', close(r.totalExpenses, totalExpenses), totalExpenses, r.totalExpenses);
pass &= assert('NOI', close(r.noi, expectedNOI), expectedNOI, r.noi);
pass &= assert('Loan Amount', close(r.loanAmount, loanAmount), loanAmount, r.loanAmount);
pass &= assert('Annual Debt Service', close(r.annualDebtService, expectedAnnualDebt), expectedAnnualDebt, r.annualDebtService);
pass &= assert('Cash Flow', close(r.cashFlow, expectedCashFlow), expectedCashFlow, r.cashFlow);
pass &= assert('Cash-on-Cash', close(r.cashOnCash, expectedCoC), expectedCoC, r.cashOnCash);
pass &= assert('Cap Rate', close(r.capRate, expectedCapRate), expectedCapRate, r.capRate);
pass &= assert('DSCR', close(r.dscr, expectedDSCR), expectedDSCR, r.dscr);
pass &= assert('Expense Ratio', close(r.expenseRatio, expectedExpenseRatio), expectedExpenseRatio, r.expenseRatio);
pass &= assert('Market Value', close(r.marketValue, expectedMarketValue), expectedMarketValue, r.marketValue);
pass &= assert('Price Per Door', close(r.pricePerDoor, expectedPPD), expectedPPD, r.pricePerDoor);

console.log('\n=== Results ===');
console.log(JSON.stringify(r, null, 2));

if (!pass) {
  console.error('✖ Finance verification failed.');
  process.exit(1);
}
console.log('✔ Finance verification passed.');