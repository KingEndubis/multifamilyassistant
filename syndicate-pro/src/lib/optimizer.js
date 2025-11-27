export function suggestImprovements(inputs, results, itemization) {
  const suggestions = [];
  const units = inputs.units || 0;
  const egi = results.effectiveGrossIncome || 0;

  // Management normalization to 3% of EGI
  const targetMgmtPct = 3 / 100;
  const currentMgmt = inputs.management || 0;
  const targetMgmt = egi * targetMgmtPct;
  if (currentMgmt > targetMgmt && targetMgmt > 0) {
    suggestions.push({
      title: 'Normalize management fee to 3% of EGI',
      annualImpact: Math.max(0, currentMgmt - targetMgmt),
      rationale: 'Common target for stabilized multifamily; negotiate or re-bid management.',
    });
  }

  // Utilities recapture via RUBS (15%)
  const utilities = inputs.utilities || 0;
  const rubsRecapture = utilities * 0.15;
  if (utilities > 0 && rubsRecapture > 0) {
    suggestions.push({
      title: 'Implement RUBS to recapture 15% of utilities',
      annualImpact: rubsRecapture,
      rationale: 'Ratio Utility Billing can reduce owner-paid utilities in many markets.',
    });
  }

  // Repairs/Maint reduction via program (10%) if high per door
  const repairs = inputs.repairs || 0;
  const repairsPerDoor = units > 0 ? repairs / units : repairs;
  if (repairsPerDoor > 500) {
    suggestions.push({
      title: 'Maintenance program to reduce repairs by 10%',
      annualImpact: repairs * 0.10,
      rationale: 'Vendor consolidation and preventative maintenance lowers emergency calls.',
    });
  }

  // Other income uplift to 5% of gross rent via fees
  const gpr = inputs.grossRents || 0;
  const otherIncome = inputs.otherIncome || 0;
  const targetOtherIncome = gpr * 0.05;
  if (otherIncome < targetOtherIncome) {
    suggestions.push({
      title: 'Add pet/parking/laundry to reach 5% other income',
      annualImpact: Math.max(0, targetOtherIncome - otherIncome),
      rationale: 'Common fee structure: pet rent, reserved parking, improved laundry revenue.',
    });
  }

  // Admin reduction 10% if high per door
  const admin = inputs.admin || 0;
  const adminPerDoor = units > 0 ? admin / units : admin;
  if (adminPerDoor > 150) {
    suggestions.push({
      title: 'Trim admin/legal/marketing by 10%',
      annualImpact: admin * 0.10,
      rationale: 'Audit subscriptions and marketing spend; leverage digital channels.',
    });
  }

  // Vacancy stabilization from current to 5%
  const vacancyRate = inputs.vacancyRate || 0;
  if (vacancyRate > 5 && gpr > 0) {
    const delta = (vacancyRate - 5) / 100;
    const annualImpact = gpr * delta;
    suggestions.push({
      title: 'Stabilize vacancy to 5%',
      annualImpact,
      rationale: 'Improve leasing funnel and retention; target market occupancy norms.',
    });
  }

  // Income itemization upsell ideas based on missing fees
  const labels = new Set((itemization?.incomeItems || []).map(i => i.label.toLowerCase()));
  const candidateFees = [
    { label: 'pet rent', amount: units * 20 * 12 },
    { label: 'reserved parking', amount: units * 10 * 12 },
    { label: 'utility billback', amount: utilities * 0.10 },
  ];
  candidateFees.forEach(fee => {
    if (!Array.from(labels).some(l => l.includes('pet') || l.includes('parking') || l.includes('utility billback'))) {
      if (fee.amount > 0) {
        suggestions.push({
          title: `Consider ${fee.label}`,
          annualImpact: fee.amount,
          rationale: 'Adds recurring ancillary income aligned with tenant value.',
        });
      }
    }
  });

  // Sort by impact descending
  suggestions.sort((a, b) => (b.annualImpact || 0) - (a.annualImpact || 0));
  return suggestions;
}