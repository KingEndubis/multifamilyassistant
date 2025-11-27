export function calculateMortgage(principal, rate, amortization) {
  if (rate === 0) return principal / amortization;
  const monthlyRate = rate / 100 / 12;
  const numPayments = amortization * 12;
  if (monthlyRate === 0) return (principal / numPayments) * 12;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments)) * 12;
}

export function analyzeDeal(inputs) {
  const grossPotentialIncome = inputs.grossRents + inputs.otherIncome;
  const vacancyLoss = inputs.grossRents * (inputs.vacancyRate / 100);
  const effectiveGrossIncome = grossPotentialIncome - vacancyLoss;

  const totalExpenses = inputs.taxes + inputs.insurance + inputs.repairs + inputs.management + inputs.utilities + inputs.admin;
  const expenseRatio = effectiveGrossIncome > 0 ? (totalExpenses / effectiveGrossIncome) * 100 : 0;

  const noi = effectiveGrossIncome - totalExpenses;
  const loanAmount = inputs.purchasePrice - inputs.downPayment;
  const annualDebtService = calculateMortgage(loanAmount, inputs.interestRate, inputs.amortization);

  const cashFlow = noi - annualDebtService;
  const cashOnCash = inputs.downPayment > 0 ? (cashFlow / inputs.downPayment) * 100 : 0;
  const capRate = inputs.purchasePrice > 0 ? (noi / inputs.purchasePrice) * 100 : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const marketValue = inputs.marketCapRate > 0 ? noi / (inputs.marketCapRate / 100) : 0;
  const pricePerDoor = inputs.units > 0 ? inputs.purchasePrice / inputs.units : 0;

  return {
    noi,
    cashFlow,
    cashOnCash,
    capRate,
    dscr,
    expenseRatio,
    marketValue,
    effectiveGrossIncome,
    totalExpenses,
    loanAmount,
    annualDebtService,
    pricePerDoor,
  };
}