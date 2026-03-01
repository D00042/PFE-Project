import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './components/Logo';

const FISCAL_PERIOD_MAP = {
  'October':'P1','November':'P2','December':'P3',
  'January':'P4','February':'P5','March':'P6',
  'April':'P7','May':'P8','June':'P9',
  'July':'P10','August':'P11','September':'P12'
};

const FISCAL_MONTHS = [
  'October','November','December',
  'January','February','March',
  'April','May','June',
  'July','August','September'
];

// CODE → LABEL MAPS
const REVENUE_EXPENSE_CODES = {
  'PLMT100000T': { label: 'Revenue' },
  'PLMT120000T': { label: 'Revenue' },
  'PLMT130000T': { label: 'Revenue' },
  'PLMT299999T': { label: 'Gross Margin' },
  'PLMT300000T': { label: 'Direct operating costs' },
  'PLMT399999T': { label: 'Gross Profit 1' },
  'PLMT511000T': { label: 'Staff Costs' },
  'PLMT512000T': { label: 'Overhead Depreciation' },
  'PLMT514100T': { label: 'Other Overheads' },
  'PLMT514200T': { label: 'Other Overheads' },
  'PLMT514300T': { label: 'Other Overheads' },
  'PLMT514600T': { label: 'Other Overheads' },
  'PLMT514700T': { label: 'Other Overheads' },
  'PLMT514800T': { label: 'Other Overheads' },
  'PLMT514900T': { label: 'Total Miscellaneous Overheads' },
  'PLMT514000T': { label: 'Other Overheads' },
  'PLMT590300T': { label: 'EBIT' },
  'PLMT600500T': { label: 'Interest' },
  'PLMT590100T': { label: 'EBT' },
  'PLMT799999T': { label: 'EBT' },
  'PLMT888555T': { label: 'Profit/(loss) after tax' },
  'PLMT899999T': { label: 'Retained Profit/(loss)' }
};

const ASSET_LIABILITY_CODES = {
  'BST211000T': { label: 'Other Intangible assets', category: 'Assets', subCategory: 'SB Non-current Assets' },
  'BST212000T': { label: 'SB Property, plant and equipment', category: 'Assets', subCategory: 'SB Non-current Assets' },
  'BST216000T': { label: 'Right of Use Assets', category: 'Assets', subCategory: 'SB Non-current Assets' },
  'BST213000T': { label: 'Non-current trade and other receivables', category: 'Assets', subCategory: 'SB Non-current Assets' },
  'BST210000T': { label: 'SB Non-current assets', category: 'Assets', subCategory: 'SB Non-current Assets' },
  'BST223100T': { label: 'Trade receivables', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST223300T': { label: 'Current prepayments', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST223155T': { label: 'Current other assets - non-financial instruments', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST224000T': { label: 'Current income tax recoverable', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST225000T': { label: 'SB Cash and cash equivalents', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST220000T': { label: 'SB Current assets', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST400000T': { label: 'Total Assets', category: 'Assets', subCategory: 'SB Total Assets' },
  'BST110000T': { label: 'Equity holders of parent', category: 'Equity', subCategory: 'Total Reserves' },
  'BST100000T': { label: 'Total reserves', category: 'Equity', subCategory: 'Total Reserves' },
  'BST240000T': { label: 'SB Non-current provisions and liabilities', category: 'Liabilities', subCategory: 'SB Non-current Provisions and Liabilities' },
  'BST232000T': { label: 'Trade payables', category: 'Liabilities', subCategory: 'SB Current Provisions And Liabilities' },
  'BST233300T': { label: 'Current prepayments received', category: 'Liabilities', subCategory: 'SB Current Provisions And Liabilities' },
  'BST236300T': { label: 'Current other liabilities - non-financial instruments', category: 'Liabilities', subCategory: 'SB Current Provisions And Liabilities' },
  'BST234200T': { label: 'Current income tax payable', category: 'Liabilities', subCategory: 'SB Current Provisions And Liabilities' },
  'BST231600T': { label: 'Current lease liabilities (IFRS 16)', category: 'Liabilities', subCategory: 'SB Current Provisions And Liabilities' },
  'BST230000T': { label: 'SB Current provisions and liabilities', category: 'Liabilities', subCategory: 'SB Current Provisions And Liabilities' },
  'BST300000T': { label: 'Total Equity and liabilities', category: 'Liabilities', subCategory: 'Grand Total' }
};

const CASH_FLOW_CODES = {
  'MCF000000T': { label: 'Opening Cash Balance' },
  'MCF110000T': { label: 'Operating Cash Flow' },
  'MCF190000T': { label: 'Net Investments Cash Flow' },
  'MCF195000T': { label: 'Lease & Asset Financing Repayments' },
  'MCF300000T': { label: 'Adj. Financing Cash Flow' },
  'MCF500000T': { label: 'Total change in Cash due to FX' },
  'MCF700000T': { label: 'Closing Cash Balance' },
};

// ─── REVERSE MAPS: label → list of codes ────────────────────────────────────
// Used so that choosing a label can auto-fill the first matching code.
// For labels that map to multiple codes (e.g. "Other Overheads" → 7 codes),
// we pick the first one and let the user refine via the Code dropdown.
const buildLabelMap = (codeMap) => {
  const map = {};
  for (const [code, val] of Object.entries(codeMap)) {
    if (!map[val.label]) map[val.label] = [];
    map[val.label].push(code);
  }
  return map;
};

const REVENUE_LABEL_MAP  = buildLabelMap(REVENUE_EXPENSE_CODES);
const ASSET_LABEL_MAP    = buildLabelMap(ASSET_LIABILITY_CODES);
const CASHFLOW_LABEL_MAP = buildLabelMap(CASH_FLOW_CODES);

// Unique labels in order of first appearance
const uniqueLabels = (codeMap) => [...new Set(Object.values(codeMap).map(v => v.label))];
const REVENUE_LABELS  = uniqueLabels(REVENUE_EXPENSE_CODES);
const ASSET_LABELS    = uniqueLabels(ASSET_LIABILITY_CODES);
const CASHFLOW_LABELS = uniqueLabels(CASH_FLOW_CODES);
// ────────────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const API_BASE = 'http://localhost:8000';

// API HELPERS
const api = {
  get: (url) => fetch(`${API_BASE}${url}`).then(r => r.json()),
  post: (url, body) => fetch(`${API_BASE}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; }),
  put: (url, body) => fetch(`${API_BASE}${url}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; }),
  delete: (url) => fetch(`${API_BASE}${url}`, { method: 'DELETE' }).then(r => r.json()),
};

// CATEGORIES
const CATEGORIES = [
  { key: 'revenue',   label: 'Revenue & Expenses', endpoint: '/revenue-expenses' },
  { key: 'assets',    label: 'Assets & Liabilities', endpoint: '/asset-liabilities' },
  { key: 'cashflow',  label: 'Cash Flow',            endpoint: '/cash-flows' },
  { key: 'suppliers', label: 'Suppliers',             endpoint: '/suppliers' },
  { key: 'customers', label: 'Customers',             endpoint: '/customers' },
];

const emptyForms = {
  revenue:   { code: '', label: '', year: CURRENT_YEAR, month: 'October', value: '', frequency: 'periodic', type: 'Actual', category: 'Revenue & Expenses' },
  assets:    { code: '', label: '', category: '', subCategory: '', year: CURRENT_YEAR, month: 'October', value: '', type: 'Actual' },
  cashflow:  { code: '', label: '', year: CURRENT_YEAR, month: 'October', value: '' },
  suppliers: { vendorName: '', amount: '', expenseCategory: '', netDate: '', targetDate: '', year: CURRENT_YEAR, address: '', telephone: '' },
  customers: { customerName: '', amount: '', netDate: '', targetDate: '', year: CURRENT_YEAR, address: '', telephone: '' },
};

// MAIN COMPONENT
function DataManagement() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('revenue');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState(emptyForms.revenue);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{"id":1}');
  const currentCategory = CATEGORIES.find(c => c.key === activeCategory);

  useEffect(() => { fetchEntries(); }, [activeCategory]);

  const fetchEntries = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get(currentCategory.endpoint);
      setEntries(Array.isArray(data) ? data : []);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  // ── When user picks a CODE → auto-fill label (and category/subCategory for assets)
  const handleCodeChange = (e) => {
    const code = e.target.value;
    let autoFill = { code };
    if (activeCategory === 'revenue' && REVENUE_EXPENSE_CODES[code]) {
      autoFill.label = REVENUE_EXPENSE_CODES[code].label;
    }
    if (activeCategory === 'assets' && ASSET_LIABILITY_CODES[code]) {
      autoFill.label       = ASSET_LIABILITY_CODES[code].label;
      autoFill.category    = ASSET_LIABILITY_CODES[code].category;
      autoFill.subCategory = ASSET_LIABILITY_CODES[code].subCategory;
    }
    if (activeCategory === 'cashflow' && CASH_FLOW_CODES[code]) {
      autoFill.label = CASH_FLOW_CODES[code].label;
    }
    setFormData(prev => ({ ...prev, ...autoFill }));
  };

  // ── When user picks a LABEL → auto-fill code (first match) + category/subCategory for assets
  const handleLabelChange = (e) => {
    const label = e.target.value;
    let autoFill = { label };
    if (activeCategory === 'revenue') {
      const codes = REVENUE_LABEL_MAP[label];
      if (codes) autoFill.code = codes[0]; // pick first matching code
    }
    if (activeCategory === 'assets') {
      const codes = ASSET_LABEL_MAP[label];
      if (codes) {
        autoFill.code = codes[0];
        // fill category/subCategory from the first matched code
        autoFill.category    = ASSET_LIABILITY_CODES[codes[0]].category;
        autoFill.subCategory = ASSET_LIABILITY_CODES[codes[0]].subCategory;
      }
    }
    if (activeCategory === 'cashflow') {
      const codes = CASHFLOW_LABEL_MAP[label];
      if (codes) autoFill.code = codes[0];
    }
    setFormData(prev => ({ ...prev, ...autoFill }));
  };

  const handleChange = (e) => {
    if (e.target.name === 'code')  return handleCodeChange(e);
    if (e.target.name === 'label') return handleLabelChange(e);
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openCreate = () => {
    setModalMode('create');
    setFormData(emptyForms[activeCategory]);
    setShowModal(true);
    setError(''); setMessage('');
  };

  const openEdit = (entry) => {
    setModalMode('edit');
    setSelectedEntry(entry);
    const formatted = { ...entry };
    if (formatted.netDate) formatted.netDate = formatted.netDate.split('T')[0];
    if (formatted.targetDate) formatted.targetDate = formatted.targetDate.split('T')[0];
    setFormData(formatted);
    setShowModal(true);
    setError(''); setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { period, createdAt, updatedAt, ...payload } = formData;
      const finalPayload = { ...payload, userId: currentUser.id || 1 };
      if (modalMode === 'create') {
        await api.post(currentCategory.endpoint, finalPayload);
        setMessage('Entry created successfully!');
      } else {
        const { userId, id, ...updatePayload } = finalPayload;
        await api.put(`${currentCategory.endpoint}/${selectedEntry.id}`, updatePayload);
        setMessage('Entry updated successfully!');
      }
      setTimeout(() => { setShowModal(false); setMessage(''); fetchEntries(); }, 1200);
    } catch (err) {
      setError(err.detail || JSON.stringify(err) || 'Operation failed');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await api.delete(`${currentCategory.endpoint}/${id}`);
      setMessage('Entry deleted');
      fetchEntries();
      setTimeout(() => setMessage(''), 2500);
    } catch { setError('Failed to delete entry'); }
  };

  // STYLES
  const ic = "w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl outline-none focus:border-[#70CBF4] text-sm bg-white";
  const ro = "w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed";
  const lc = "block text-xs font-bold mb-1.5 uppercase tracking-wide";

  // FORM FIELDS
  const renderFormFields = () => {

    // Revenue & Expenses
    if (activeCategory === 'revenue') {
      // Check if the selected label maps to multiple codes (warn the user)
      const codesForLabel = formData.label ? REVENUE_LABEL_MAP[formData.label] : [];
      const isMultiCode = codesForLabel && codesForLabel.length > 1;
      return (
        <div className="grid grid-cols-2 gap-4">
          {/* CODE — picking this fills label */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className={lc} style={{ color: '#092A5E' }}>Code *</label>
              <select name="code" value={formData.code} onChange={handleChange} className={ic} required>
                <option value="">— Select a code —</option>
                {Object.keys(REVENUE_EXPENSE_CODES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* LABEL — picking this fills code */}
            <div>
              <label className={lc} style={{ color: '#092A5E' }}>
                Label *
                <span className="normal-case font-normal text-gray-400 ml-1">(or pick here)</span>
              </label>
              <select name="label" value={formData.label} onChange={handleChange} className={ic} required>
                <option value="">— Select a label —</option>
                {REVENUE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          {/* Warning when one label matches several codes */}
          {isMultiCode && (
            <div className="col-span-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-xl">
              <p className="text-xs text-amber-700 font-semibold">
                ⚠ "{formData.label}" matches {codesForLabel.length} codes. Code auto-set to <strong>{codesForLabel[0]}</strong> — adjust the Code dropdown if needed.
              </p>
            </div>
          )}
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Fiscal Year *</label>
            <select name="year" value={formData.year} onChange={handleChange} className={ic}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Month *</label>
            <select name="month" value={formData.month} onChange={handleChange} className={ic}>
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m} ({FISCAL_PERIOD_MAP[m]})</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Amount *</label>
            <input type="number" name="value" value={formData.value} onChange={handleChange} className={ic} placeholder="e.g. 1500000" required />
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Frequency *</label>
            <select name="frequency" value={formData.frequency} onChange={handleChange} className={ic}>
              <option value="periodic">Periodic</option>
              <option value="year to date">Year to Date</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={lc} style={{ color: '#092A5E' }}>Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} className={ic}>
              <option value="Actual">Actual — real recorded figures</option>
              <option value="Budget">Budget — planned/forecasted figures</option>
            </select>
          </div>
        </div>
      );
    }

    // Assets & Liabilities
    if (activeCategory === 'assets') {
      const codesForLabel = formData.label ? ASSET_LABEL_MAP[formData.label] : [];
      const isMultiCode = codesForLabel && codesForLabel.length > 1;
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Code *</label>
            <select name="code" value={formData.code} onChange={handleChange} className={ic} required>
              <option value="">— Select a code —</option>
              {Object.keys(ASSET_LIABILITY_CODES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>
              Label *
              <span className="normal-case font-normal text-gray-400 ml-1">(or pick here)</span>
            </label>
            <select name="label" value={formData.label} onChange={handleChange} className={ic} required>
              <option value="">— Select a label —</option>
              {ASSET_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {isMultiCode && (
            <div className="col-span-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-xl">
              <p className="text-xs text-amber-700 font-semibold">
                ⚠ "{formData.label}" matches {codesForLabel.length} codes. Code auto-set to <strong>{codesForLabel[0]}</strong> — adjust the Code dropdown if needed.
              </p>
            </div>
          )}
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Category <span className="normal-case font-normal text-gray-400">(auto)</span></label>
            <input type="text" value={formData.category} readOnly className={ro} />
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Sub-Category <span className="normal-case font-normal text-gray-400">(auto)</span></label>
            <input type="text" value={formData.subCategory} readOnly className={ro} />
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Fiscal Year *</label>
            <select name="year" value={formData.year} onChange={handleChange} className={ic}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Month *</label>
            <select name="month" value={formData.month} onChange={handleChange} className={ic}>
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m} ({FISCAL_PERIOD_MAP[m]})</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Amount *</label>
            <input type="number" name="value" value={formData.value} onChange={handleChange} className={ic} placeholder="e.g. 1500000" required />
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className={ic}>
              <option value="Actual">Actual — real recorded figures</option>
              <option value="Budget">Budget — planned/forecasted figures</option>
            </select>
          </div>
        </div>
      );
    }

    // Cash Flow
    if (activeCategory === 'cashflow') {
      const codesForLabel = formData.label ? CASHFLOW_LABEL_MAP[formData.label] : [];
      const isMultiCode = codesForLabel && codesForLabel.length > 1;
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Code *</label>
            <select name="code" value={formData.code} onChange={handleChange} className={ic} required>
              <option value="">— Select a code —</option>
              {Object.keys(CASH_FLOW_CODES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>
              Label *
              <span className="normal-case font-normal text-gray-400 ml-1">(or pick here)</span>
            </label>
            <select name="label" value={formData.label} onChange={handleChange} className={ic} required>
              <option value="">— Select a label —</option>
              {CASHFLOW_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {isMultiCode && (
            <div className="col-span-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-xl">
              <p className="text-xs text-amber-700 font-semibold">
                ⚠ "{formData.label}" matches {codesForLabel.length} codes. Code auto-set to <strong>{codesForLabel[0]}</strong> — adjust the Code dropdown if needed.
              </p>
            </div>
          )}
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Fiscal Year *</label>
            <select name="year" value={formData.year} onChange={handleChange} className={ic}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lc} style={{ color: '#092A5E' }}>Month *</label>
            <select name="month" value={formData.month} onChange={handleChange} className={ic}>
              {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m} ({FISCAL_PERIOD_MAP[m]})</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={lc} style={{ color: '#092A5E' }}>Amount *</label>
            <input type="number" name="value" value={formData.value} onChange={handleChange} className={ic} placeholder="e.g. 320000" required />
          </div>
        </div>
      );
    }

    // Suppliers
    if (activeCategory === 'suppliers') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={lc} style={{ color: '#092A5E' }}>Vendor Name *</label>
          <input type="text" name="vendorName" value={formData.vendorName} onChange={handleChange} className={ic} placeholder="e.g. TUI HOLDING SPAIN" required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Amount *</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={ic} placeholder="e.g. 45000" required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Fiscal Year *</label>
          <select name="year" value={formData.year} onChange={handleChange} className={ic}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={lc} style={{ color: '#092A5E' }}>Expense Category</label>
          <input type="text" name="expenseCategory" value={formData.expenseCategory} onChange={handleChange} className={ic} placeholder="e.g. General costs" />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Net Date *</label>
          <input type="date" name="netDate" value={formData.netDate} onChange={handleChange} className={ic} required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Target Date *</label>
          <input type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} className={ic} required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Address</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} className={ic} placeholder="Street, City, Country" />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Telephone</label>
          <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} className={ic} placeholder="+216 XX XXX XXX" />
        </div>
      </div>
    );

    // Customers
    if (activeCategory === 'customers') return (
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={lc} style={{ color: '#092A5E' }}>Customer Name *</label>
          <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} className={ic} placeholder="e.g. TUIAG" required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Amount *</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={ic} placeholder="e.g. 45000" required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Fiscal Year *</label>
          <select name="year" value={formData.year} onChange={handleChange} className={ic}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Net Date *</label>
          <input type="date" name="netDate" value={formData.netDate} onChange={handleChange} className={ic} required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Target Date *</label>
          <input type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} className={ic} required />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Address</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} className={ic} placeholder="Street, City, Country" />
        </div>
        <div>
          <label className={lc} style={{ color: '#092A5E' }}>Telephone</label>
          <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} className={ic} placeholder="+216 XX XX X XXX" />
        </div>
      </div>
    );
  };

  // TABLE CONFIG
  const getColumns = () => {
    if (activeCategory === 'revenue')   return ['ID','Code','Label','Year','Period','Month','Amount','Frequency','Type','Actions'];
    if (activeCategory === 'assets')    return ['ID','Code','Label','Category','Sub-Cat','Year','Period','Month','Amount','Type','Actions'];
    if (activeCategory === 'cashflow')  return ['ID','Code','Label','Year','Period','Month','Amount','Actions'];
    if (activeCategory === 'suppliers') return ['ID','Vendor','Amount','Year','Expense Cat.','Net Date','Target Date','Actions'];
    if (activeCategory === 'customers') return ['ID','Customer','Amount','Year','Net Date','Target Date','Actions'];
    return [];
  };

  const getRow = (e) => {
    const fmt = (n) => n != null ? Number(n).toLocaleString() : '—';
    const fmtDate = (d) => d ? d.split('T')[0] : '—';
    if (activeCategory === 'revenue')   return [e.id, e.code, e.label, e.year, e.period, e.month, fmt(e.value), e.frequency, e.type];
    if (activeCategory === 'assets')    return [e.id, e.code, e.label, e.category, e.subCategory, e.year, e.period, e.month, fmt(e.value), e.type || '—'];
    if (activeCategory === 'cashflow')  return [e.id, e.code, e.label, e.year, e.period, e.month, fmt(e.value)];
    if (activeCategory === 'suppliers') return [e.id, e.vendorName, fmt(e.amount), e.year, e.expenseCategory || '—', fmtDate(e.netDate), fmtDate(e.targetDate)];
    if (activeCategory === 'customers') return [e.id, e.customerName, fmt(e.amount), e.year, fmtDate(e.netDate), fmtDate(e.targetDate)];
    return [];
  };

  // RENDER
  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#f3f4f6' }}>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-3xl shadow-xl p-6" style={{ borderTop: '4px solid #092A5E' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo size="medium" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#092A5E' }}>Data Management</h1>
                <p className="text-sm text-gray-500">Add and manage enterprise financial data</p>
              </div>
            </div>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }}
              className="px-6 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: '#D40E14' }}>Logout</button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat.key}
            onClick={() => { setActiveCategory(cat.key); setEntries([]); }}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              backgroundColor: activeCategory === cat.key ? '#092A5E' : 'white',
              color: activeCategory === cat.key ? 'white' : '#092A5E',
              border: '2px solid #092A5E',
              boxShadow: activeCategory === cat.key ? '0 4px 14px rgba(9,42,94,0.3)' : 'none'
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <button onClick={openCreate}
          className="px-6 py-3 rounded-xl text-white font-bold shadow-lg"
          style={{ backgroundColor: '#70CBF4' }}>+ Add Entry</button>
        <button onClick={fetchEntries}
          className="px-5 py-2.5 rounded-xl border-2 font-semibold text-sm"
          style={{ borderColor: '#092A5E', color: '#092A5E' }}>🔄 Refresh</button>
      </div>

      {/* Messages */}
      {message && <div className="max-w-7xl mx-auto mb-4 p-4 rounded-xl bg-green-50 border-l-4 border-green-600 text-green-700 text-sm">{message}</div>}
      {error   && <div className="max-w-7xl mx-auto mb-4 p-4 rounded-xl border-l-4 text-sm" style={{ backgroundColor: '#fee2e2', borderLeftColor: '#D40E14', color: '#D40E14' }}>{error}</div>}

      {/* Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: '#092A5E' }}>
              <tr>
                {getColumns().map(col => (
                  <th key={col} className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={getColumns().length} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={getColumns().length} className="px-4 py-10 text-center text-gray-400">No entries yet — click "+ Add Entry" to start.</td></tr>
              ) : entries.map((entry, i) => (
                <tr key={entry.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  {getRow(entry).map((val, j) => (
                    <td key={j} className="px-4 py-3 text-gray-700 whitespace-nowrap">{val}</td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(entry)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: '#70CBF4' }}>Edit</button>
                      <button onClick={() => handleDelete(entry.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: '#D40E14' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto">
            <div className="px-8 py-6 rounded-t-3xl" style={{ backgroundColor: '#092A5E' }}>
              <h2 className="text-xl font-bold text-white">
                {modalMode === 'create' ? `Add ${currentCategory.label} Entry` : `Edit ${currentCategory.label} Entry`}
              </h2>
            </div>
            <div className="px-8 py-6">
              {message && <div className="mb-4 p-3 rounded-xl bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">{message}</div>}
              {error   && <div className="mb-4 p-3 rounded-xl border-l-4 text-sm" style={{ backgroundColor:'#fee2e2', borderLeftColor:'#D40E14', color:'#D40E14' }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                {renderFormFields()}
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 font-semibold text-sm"
                    style={{ borderColor: '#092A5E', color: '#092A5E' }}>Cancel</button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 rounded-xl text-white font-bold text-sm"
                    style={{ backgroundColor: loading ? '#a3d9f0' : '#70CBF4' }}>
                    {loading ? 'Saving...' : modalMode === 'create' ? 'Create Entry' : 'Update Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagement;