import React from 'react';
import ReactDOM from 'react-dom/client';
import { suggestImprovements } from '../lib/optimizer.js';

function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function Panels() {
  const [itemization, setItemization] = React.useState(readJSON('ani_itemization', { incomeItems: [], expenseItems: [] }));
  const [inputs, setInputs] = React.useState(readJSON('ani_inputs', {}));
  const [results, setResults] = React.useState(readJSON('ani_results', {}));

  React.useEffect(() => {
    const id = setInterval(() => {
      setItemization(readJSON('ani_itemization', { incomeItems: [], expenseItems: [] }));
      setInputs(readJSON('ani_inputs', {}));
      setResults(readJSON('ani_results', {}));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const totalIncomeItems = (itemization.incomeItems || []).reduce((s, it) => s + (it.amount || 0), 0);
  const totalExpenseItems = (itemization.expenseItems || []).reduce((s, it) => s + (it.amount || 0), 0);
  const suggestions = suggestImprovements(inputs || {}, results || {}, itemization || { incomeItems: [], expenseItems: [] });

  return (
    <div style={{ marginTop: '1rem', display: 'grid', gap: '12px' }}>
      <div className="card">
        <h3>Itemized T12 Snapshot</h3>
        <div>
          <strong>Income Items</strong> (Total: ${Math.max(0, totalIncomeItems).toFixed(0)})
          <ul>
            {(itemization.incomeItems || []).slice(0, 12).map((it, idx) => (
              <li key={`inc-${idx}`}>{it.label} — ${Math.max(0, it.amount || 0).toFixed(0)}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Expense Items</strong> (Total: ${Math.max(0, totalExpenseItems).toFixed(0)})
          <ul>
            {(itemization.expenseItems || []).slice(0, 12).map((it, idx) => (
              <li key={`exp-${idx}`}>{it.label} — ${Math.max(0, it.amount || 0).toFixed(0)}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="card">
        <h3>Profit & Overhead Opportunities</h3>
        <ul>
          {(suggestions || []).slice(0, 10).map((sug, idx) => (
            <li key={`sug-${idx}`}>
              <strong>{sug.title}</strong> — Annual impact: ${Math.max(0, sug.annualImpact || 0).toFixed(0)}
              <div style={{ fontSize: '0.9em', color: '#555' }}>{sug.rationale}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const mountEl = document.getElementById('ani-panels');
if (mountEl) {
  const root = ReactDOM.createRoot(mountEl);
  root.render(<Panels />);
}