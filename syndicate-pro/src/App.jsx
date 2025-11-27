import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import * as XLSX from 'xlsx';
import { calculateMortgage, analyzeDeal } from './lib/finance.js';
const IconStub = ({ className }) => (
  <span className={className} aria-hidden="true">★</span>
);

const Building2 = IconStub;
const Calculator = IconStub;
const MapPin = IconStub;
const PieChart = IconStub;
const Menu = IconStub;
const UploadCloud = IconStub;
const Check = IconStub;
const AlertCircle = IconStub;
const ArrowRight = IconStub;
const TrendingUp = IconStub;
const MessageSquare = IconStub;
const X = IconStub;
const FileSpreadsheet = IconStub;
const Settings = IconStub;
const Loader2 = IconStub;
const Globe = IconStub;
const Zap = IconStub;


// --- LOGIC ENGINE --- (moved to src/lib/finance.js)


// --- REAL PARSING ENGINE ---


const CATEGORY_RULES = [
  { key: 'grossRents', keywords: ['gross potential', 'market rent', 'base rent', 'rental income', 'lease income', 'gpr', 'gross rent', 'total income'] },
  { key: 'otherIncome', keywords: ['laundry', 'parking', 'rubbish income', 'utility income', 'pet', 'late fee', 'app fee', 'misc income', 'other income'] },
  { key: 'taxes', keywords: ['real estate tax', 'property tax', 'school tax', 'county tax', 'ad valorem'] },
  { key: 'insurance', keywords: ['hazard insurance', 'liability', 'property insurance', 'umbrella', 'flood'] },
  { key: 'repairs', keywords: ['maintenance', 'repair', 'turnover', 'make ready', 'contract services', 'pest', 'landscaping', 'snow', 'cleaning'] },
  { key: 'management', keywords: ['management fee', 'prop mgmt', 'leasing fee', 'manager salary', 'payroll'] },
  { key: 'utilities', keywords: ['electric', 'water', 'sewer', 'gas', 'trash', 'rubbish expense', 'cable', 'internet'] },
  { key: 'admin', keywords: ['admin', 'legal', 'professional', 'accounting', 'marketing', 'advertising', 'office exp', 'licenses', 'permits'] },
];

// Extract text from a PDF ArrayBuffer using PDF.js loaded from CDN
const extractTextFromPdf = async (arrayBuffer) => {
  try {
    const pdfjsLib = typeof window !== 'undefined' ? window.pdfjsLib : null;
    if (!pdfjsLib) throw new Error('PDF library not loaded.');
    // Configure worker to CDN URL
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it) => it.str).join(' ');
      text += `\n${pageText}`;
    }
    return text;
  } catch (e) {
    console.error('PDF parse error:', e);
    return '';
  }
};


const parseContent = (content, isBinary = false) => {
  const extracted = {};
  extracted.incomeItems = [];
  extracted.expenseItems = [];
  
  const findNumber = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const match = str.toString().match(/-?[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  };


  const safeAdd = (a, b) => Math.round((a + b) * 100) / 100;


  let rows = [];


  if (isBinary) {
    try {
      const workbook = XLSX.read(content, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    } catch (e) {
      console.error("Excel parse error:", e);
      return {};
    }
  } else {
    // Support CSV/TSV/plain text and PDF-extracted text by splitting on newlines and multi-space separators
    rows = content
      .split(/\r?\n/)
      .map(line => line.split(/,|;|\t|\s{2,}/));
  }


  // Header Metadata Scraping
  const metaLimit = Math.min(rows.length, 20);
  for (let i = 0; i < metaLimit; i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    
    if (rowStr.includes('property:') || rowStr.includes('building:')) {
        const parts = rows[i].join(' ').split(/:/);
        if (parts[1] && parts[1].trim().length > 3) {
            extracted.address = parts[1].trim();
        }
    }


    if (rowStr.includes('units') || rowStr.includes('unit count')) {
        const numbers = rows[i].map(cell => findNumber(cell)).filter(n => n > 0 && n < 10000); 
        if (numbers.length > 0) extracted.units = numbers[0];
    }
  }


  // Financial Scraping
  rows.forEach(row => {
    const rowStr = row.join(' ').toLowerCase();
    const numbers = row.map(cell => findNumber(cell)).filter(n => !isNaN(n) && n !== 0);
    const maxVal = numbers.length > 0 ? Math.max(...numbers) : 0;


    if (maxVal > 0) {
      CATEGORY_RULES.forEach(rule => {
        if (rule.keywords.some(k => rowStr.includes(k))) {
          extracted[rule.key] = safeAdd((extracted[rule.key] || 0), maxVal);
          const label = row.join(' ').trim().slice(0, 120);
          const item = { label, amount: maxVal, category: rule.key };
          if (rule.key === 'grossRents' || rule.key === 'otherIncome') {
            extracted.incomeItems.push(item);
          } else {
            extracted.expenseItems.push(item);
          }
        }
      });
    }
  });


  return extracted;
};


// --- COMPONENTS ---


const Card = ({ title, children, className = "", action }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-6 ${className}`}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);


const InputField = ({ label, value, onChange, prefix = "$", type = "number", highlight = false, placeholder = "" }) => (
  <div className="group">
    <label className={`block text-xs font-medium mb-1.5 transition-colors ${highlight ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-2.5 text-zinc-600 text-sm select-none">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-zinc-950 border text-zinc-200 rounded-md py-2 ${prefix ? 'pl-7' : 'pl-3'} pr-3 focus:outline-none focus:ring-1 transition-all text-sm font-mono placeholder-zinc-700 ${highlight ? 'border-emerald-500/50 ring-emerald-500/20' : 'border-zinc-800 focus:border-zinc-600 focus:ring-zinc-600'}`}
      />
    </div>
  </div>
);


const MetricBadge = ({ label, value, suffix = "", status = "neutral", subtext = "" }) => {
  let color = "text-zinc-100";
  if (status === "good") color = "text-emerald-400";
  if (status === "bad") color = "text-rose-400";
  if (status === "warning") color = "text-amber-400";


  return (
    <div>
      <span className="text-zinc-500 text-xs font-medium block mb-1">{label}</span>
      <span className={`text-2xl font-light tracking-tight ${color}`}>
        {value}{suffix}
      </span>
      {subtext && <span className="block text-xs text-zinc-600 mt-1">{subtext}</span>}
    </div>
  );
};


// --- MAIN APP ---


export default function SyndicatePro() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [inputs, setInputs] = useState({
    address: "",
    units: 0,
    yearBuilt: 0,
    purchasePrice: 0,
    downPayment: 0,
    grossRents: 0,
    otherIncome: 0,
    vacancyRate: 5,
    taxes: 0,
    insurance: 0,
    repairs: 0,
    management: 0,
    utilities: 0,
    admin: 0,
    interestRate: 6.5,
    amortization: 25,
    marketCapRate: 6.0
  });


  const [isUploading, setIsUploading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: "System Online. Upload T12 documents to begin." }]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);


  const results = analyzeDeal(inputs);
  const [itemization, setItemization] = useState({ incomeItems: [], expenseItems: [] });


  // File Upload Logic
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;


    setFileName(file.name);
    setIsUploading(true);
    setParseError(null);
    setRecentlyUpdated({});


    const reader = new FileReader();
    const isExcel = file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xlsm');
    const isPdf = file.name.toLowerCase().endsWith('.pdf');


    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        let extractedData = {};

        if (isPdf) {
          const text = await extractTextFromPdf(content);
          if (!text || text.trim().length === 0) {
            throw new Error('Could not extract text from PDF.');
          }
          extractedData = parseContent(text, false);
        } else {
          // Excel or text/CSV
          const isBinaryForParser = isExcel; 
          extractedData = parseContent(content, isBinaryForParser);
        }
        
        if (Object.keys(extractedData).length === 0) {
            setParseError("No standard T-12 keywords found.");
            setIsUploading(false);
            return;
        }


        // Calculation Logic (Math, not simulation)
        // Round numbers to prevent decimals in price/downpayment
        if (!extractedData.purchasePrice && extractedData.grossRents) {
           const estimatedNOI = (extractedData.grossRents * 0.55);
           extractedData.purchasePrice = Math.round(estimatedNOI / (inputs.marketCapRate / 100));
           extractedData.downPayment = Math.round(extractedData.purchasePrice * 0.25);
        }


        setInputs(prev => ({ ...prev, ...extractedData }));
        setItemization({
          incomeItems: extractedData.incomeItems || [],
          expenseItems: extractedData.expenseItems || [],
        });
        try {
          const newInputs = { ...inputs, ...extractedData };
          const newResults = analyzeDeal(newInputs);
          window.localStorage.setItem('ani_itemization', JSON.stringify({
            incomeItems: extractedData.incomeItems || [],
            expenseItems: extractedData.expenseItems || [],
          }));
          window.localStorage.setItem('ani_inputs', JSON.stringify(newInputs));
          window.localStorage.setItem('ani_results', JSON.stringify(newResults));
        } catch (e) {
          // ignore storage errors
        }
        
        const updatedKeys = {};
        Object.keys(extractedData).forEach(key => updatedKeys[key] = true);
        setRecentlyUpdated(updatedKeys);


        let msg = `Extracted ${Object.keys(extractedData).length} data points.`;
        if (extractedData.address) msg += ` Identified: ${extractedData.address}.`;
        
        setMessages(prev => [...prev, { role: 'ai', text: msg }]);
      } catch (err) {
        console.error(err);
        setParseError("Parsing Error: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };

    if (isExcel || isPdf) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };


  // Real Online Research
  const handleResearchProperty = async () => {
    if (!inputs.address) {
        setMessages(prev => [...prev, { role: 'ai', text: "Please enter an address first." }]);
        return;
    }
    
    setIsResearching(true);
    setMessages(prev => [...prev, { role: 'ai', text: `Querying public records for: ${inputs.address}...` }]);


    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputs.address)}`);
        const data = await response.json();


        if (data && data.length > 0) {
            const loc = data[0];
            const displayName = loc.display_name;
            
            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: `✅ Verified Location: ${displayName}.\n\n(Real-time tax/insurance data requires a paid API subscription. Please input values from the T-12 for accuracy.)` 
            }]);
            
            setInputs(prev => ({ ...prev, address: displayName.split(',')[0] }));
        } else {
            setMessages(prev => [...prev, { role: 'ai', text: "❌ Could not verify address. Check spelling." }]);
        }
    } catch (err) {
        setMessages(prev => [...prev, { role: 'ai', text: "Connection Error: Could not reach public DB." }]);
    } finally {
        setIsResearching(false);
    }
  };


  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMessages = [...messages, { role: 'user', text: chatInput }];
    setMessages(newMessages);
    setChatInput("");
    
    setTimeout(() => {
        let response = "";
        if (results.dscr < 1.25) {
            response = `Warning: DSCR is ${results.dscr.toFixed(2)}. Below 1.25 safe threshold.`;
        } else {
            response = `Deal looks stable. DSCR is ${results.dscr.toFixed(2)}.`;
        }
        setMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 600);
  };


  return (
    <div className="h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col md:flex-row overflow-hidden">
      
      <nav className="w-full md:w-16 bg-zinc-950 border-r border-zinc-900 flex md:flex-col items-center py-6 gap-8 z-20 flex-shrink-0">
        <div className="w-8 h-8 bg-zinc-100 rounded flex items-center justify-center shadow-lg shadow-zinc-900/50">
          <Building2 className="text-zinc-900 w-5 h-5" />
        </div>
        <div className="flex md:flex-col gap-6 flex-1 justify-center md:justify-start">
          {['analysis', 'market', 'reports'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`p-2 rounded-lg transition-all ${activeTab === tab ? 'text-zinc-100 bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}`}>
              {tab === 'analysis' && <Calculator className="w-5 h-5" />}
              {tab === 'market' && <MapPin className="w-5 h-5" />}
              {tab === 'reports' && <PieChart className="w-5 h-5" />}
            </button>
          ))}
        </div>
        <button className="hidden md:block text-zinc-600 hover:text-zinc-300"><Settings className="w-5 h-5" /></button>
      </nav>


      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-12 pb-24"> 
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-xl font-light text-zinc-100 tracking-wide">Syndicate<span className="font-semibold">Pro</span></h1>
              <p className="text-zinc-600 text-sm mt-1">Institutional Multifamily Analysis</p>
            </div>
            <div className="flex flex-col items-end w-full md:w-auto">
                <div className="relative group w-full md:w-auto">
                <input type="file" id="file-upload" className="hidden" accept=".csv,.txt,.xls,.xlsx,.xlsm,.pdf" onChange={handleFileUpload} />
                <label htmlFor="file-upload" className={`flex items-center justify-center gap-3 px-6 py-3 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isUploading ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                    <span className="text-sm font-medium text-zinc-300">{isUploading ? "Scanning..." : fileName ? fileName : "Upload T12 / Rent Roll (PDF/Excel)"}</span>
                </label>
                </div>
                {parseError && <p className="text-xs text-rose-400 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {parseError}</p>}
            </div>
          </header>


          {activeTab === 'analysis' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className="lg:col-span-4 space-y-6">
                <Card title="Acquisition & Property" action={
                    <button 
                        onClick={handleResearchProperty}
                        disabled={isResearching}
                        className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-500/30"
                    >
                        {isResearching ? <Loader2 className="w-3 h-3 animate-spin"/> : <Globe className="w-3 h-3" />}
                        {isResearching ? "Checking..." : "Verify Address"}
                    </button>
                }>
                  <div className="space-y-4">
                    <InputField label="Address" value={inputs.address} type="text" prefix="" placeholder="e.g. 500 Main St" onChange={v => setInputs({...inputs, address: v})} highlight={recentlyUpdated.address} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Units" value={inputs.units} prefix="#" onChange={v => setInputs({...inputs, units: v})} highlight={recentlyUpdated.units} />
                        <InputField label="Year Built" value={inputs.yearBuilt} prefix="" onChange={v => setInputs({...inputs, yearBuilt: v})} highlight={recentlyUpdated.yearBuilt} />
                    </div>
                    
                    <div className="h-px bg-zinc-800 my-4"></div>
                    
                    <InputField label="Purchase Price" value={inputs.purchasePrice} onChange={v => setInputs({...inputs, purchasePrice: v})} highlight={recentlyUpdated.purchasePrice} />
                    <InputField label="Down Payment" value={inputs.downPayment} onChange={v => setInputs({...inputs, downPayment: v})} />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Interest Rate %" value={inputs.interestRate} prefix="" onChange={v => setInputs({...inputs, interestRate: v})} />
                      <InputField label="Amortization" value={inputs.amortization} prefix="" onChange={v => setInputs({...inputs, amortization: v})} />
                    </div>
                  </div>
                </Card>


                <Card title="Operating Data">
                  <div className="space-y-4">
                    <InputField label="Gross Potential Rent" value={inputs.grossRents} onChange={v => setInputs({...inputs, grossRents: v})} highlight={recentlyUpdated.grossRents} />
                    <InputField label="Other Income" value={inputs.otherIncome} onChange={v => setInputs({...inputs, otherIncome: v})} highlight={recentlyUpdated.otherIncome} />
                    <div className="pt-2">
                       <div className="flex justify-between text-xs mb-2">
                         <span className="text-zinc-500">Vacancy Rate</span>
                         <span className="text-zinc-300">{inputs.vacancyRate}%</span>
                       </div>
                       <input type="range" min="0" max="15" value={inputs.vacancyRate} onChange={(e) => setInputs({...inputs, vacancyRate: parseInt(e.target.value)})} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>
                  </div>
                </Card>


                <Card title="Categorized Expenses">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <InputField label="Taxes" value={inputs.taxes} onChange={v => setInputs({...inputs, taxes: v})} highlight={recentlyUpdated.taxes} />
                    <InputField label="Insurance" value={inputs.insurance} onChange={v => setInputs({...inputs, insurance: v})} highlight={recentlyUpdated.insurance} />
                    <InputField label="Repairs/Maint" value={inputs.repairs} onChange={v => setInputs({...inputs, repairs: v})} highlight={recentlyUpdated.repairs} />
                    <InputField label="Management" value={inputs.management} onChange={v => setInputs({...inputs, management: v})} highlight={recentlyUpdated.management} />
                    <InputField label="Utilities" value={inputs.utilities} onChange={v => setInputs({...inputs, utilities: v})} highlight={recentlyUpdated.utilities} />
                    <InputField label="Admin/Legal" value={inputs.admin} onChange={v => setInputs({...inputs, admin: v})} highlight={recentlyUpdated.admin} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Total Expenses</span>
                    <span className="text-sm font-mono text-zinc-300">${results.totalExpenses.toLocaleString()}</span>
                  </div>
                </Card>
              </div>


              <div className="lg:col-span-8 space-y-6">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg group hover:border-zinc-700 transition-colors">
                    <MetricBadge label="DSCR" value={results.dscr.toFixed(2)} status={results.dscr >= 1.25 ? "good" : "bad"} subtext="Target: 1.25+" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg group hover:border-zinc-700 transition-colors">
                    <MetricBadge label="NOI" value={results.noi.toLocaleString()} prefix="$" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg group hover:border-zinc-700 transition-colors">
                    <MetricBadge label="Cash on Cash" value={results.cashOnCash.toFixed(1)} suffix="%" status={results.cashOnCash >= 10 ? "good" : "warning"} subtext="Target: 10%+" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg group hover:border-zinc-700 transition-colors">
                    <MetricBadge label="Cap Rate" value={results.capRate.toFixed(2)} suffix="%" />
                  </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card title="Strike Price & Valuation" className="h-full">
                     <div className="flex flex-col h-full justify-between">
                       <div>
                         <p className="text-zinc-500 text-xs mb-1 uppercase tracking-wide">Stabilized Value (Strike Price)</p>
                         <h2 className="text-4xl font-light text-zinc-100 tracking-tight">${results.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                         <p className="text-xs text-zinc-600 mt-2">Calculated using a {inputs.marketCapRate}% Market Cap Rate on Current NOI.</p>
                       </div>
                       
                       <div className="space-y-3 mt-8">
                         <div className="flex justify-between items-center p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                           <span className="text-xs text-zinc-400">Expense Ratio</span>
                           <span className={`text-sm font-mono ${results.expenseRatio < 35 ? 'text-amber-400' : 'text-zinc-300'}`}>{results.expenseRatio.toFixed(1)}% {results.expenseRatio < 35 && "(!)"}</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                           <span className="text-xs text-zinc-400">Price Per Door</span>
                           <span className="text-sm font-mono text-zinc-300">${results.pricePerDoor.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                         </div>
                       </div>
                     </div>
                  </Card>


                  <Card title="5-Year Equity Projection" className="h-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { year: 1, equity: inputs.downPayment },
                        { year: 2, equity: inputs.downPayment * 1.05 + results.cashFlow },
                        { year: 3, equity: inputs.downPayment * 1.10 + (results.cashFlow * 2) },
                        { year: 4, equity: inputs.downPayment * 1.15 + (results.cashFlow * 3) },
                        { year: 5, equity: inputs.downPayment * 1.22 + (results.cashFlow * 4) },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="year" stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" tick={{fontSize: 10}} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{backgroundColor: '#18181b', border: '1px solid #27272a', color: '#e4e4e7'}} labelStyle={{color: '#a1a1aa'}} formatter={(value) => [`$${Math.round(value).toLocaleString()}`, 'Total Equity']} />
                        <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r: 4, fill: '#10b981'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </div>


                <div className="grid grid-cols-1 gap-6">
                   <Card title="Cash Flow Waterfall">
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart layout="vertical" data={[
                             { name: 'Income', value: results.effectiveGrossIncome, fill: '#34d399' },
                             { name: 'Expenses', value: results.totalExpenses, fill: '#fb7185' },
                             { name: 'Debt', value: results.annualDebtService, fill: '#fcd34d' },
                             { name: 'Net Flow', value: results.cashFlow, fill: '#38bdf8' },
                           ]} barSize={12}>
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="name" stroke="#71717a" tick={{fontSize: 11}} width={70} tickLine={false} axisLine={false} />
                             <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#18181b', borderColor: '#27272a'}} />
                             <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                      </div>
                   </Card>
                </div>


              </div>
            </div>
          )}
        </div>
      </main>


      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl overflow-hidden z-50">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-500" /> Analyst AI</h4>
            <button onClick={() => setChatOpen(false)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-zinc-950/30">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
            <input className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" placeholder="Ask about this deal..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
            <button type="submit" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400"><ArrowRight className="w-4 h-4" /></button>
          </form>
        </div>
      )}


      <button onClick={() => setChatOpen(!chatOpen)} className="fixed bottom-6 right-6 w-12 h-12 bg-zinc-100 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-zinc-900 transition-transform active:scale-95 z-50">
        <MessageSquare className="w-5 h-5" />
      </button>


    </div>
  );
}
  // Simple helpers for rendering itemization
  const totalIncomeItems = itemization.incomeItems.reduce((s, it) => s + it.amount, 0);
  const totalExpenseItems = itemization.expenseItems.reduce((s, it) => s + it.amount, 0);