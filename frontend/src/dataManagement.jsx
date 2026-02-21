import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './components/Logo';

// ─── CODE → LABEL MAPS ────────────────────────────────────────────────────────

const REVENUE_EXPENSE_CODES = {
  'PLMT100000T': { label: 'Revenue', category: 'Revenue & Expenses' },
  'PLMT200000T': { label: 'Cost of Sales', category: 'Revenue & Expenses' },
  'PLMT299999T': { label: 'Gross Profit', category: 'Revenue & Expenses' },
  'PLMT300000T': { label: 'Operating Expenses', category: 'Revenue & Expenses' },
  'PLMT400000T': { label: 'Personnel Costs', category: 'Revenue & Expenses' },
  'PLMT500000T': { label: 'Overhead Costs', category: 'Revenue & Expenses' },
  'PLMT590300T': { label: 'EBIT', category: 'Revenue & Expenses' },
  'PLMT700000T': { label: 'Financial Income', category: 'Revenue & Expenses' },
  'PLMT800000T': { label: 'Financial Expenses', category: 'Revenue & Expenses' },
  'PLMT899999T': { label: 'Net Profit', category: 'Revenue & Expenses' },
};

const ASSET_LIABILITY_CODES = {
  'BST100000T': { label: 'Total Equity', category: 'Liabilities', subCategory: 'SB Equity' },
  'BST110000T': { label: 'Share Capital', category: 'Liabilities', subCategory: 'SB Equity' },
  'BST200000T': { label: 'Total Assets', category: 'Assets', subCategory: 'SB Total Assets' },
  'BST210000T': { label: 'Non-Current Assets', category: 'Assets', subCategory: 'SB Non-Current Assets' },
  'BST220000T': { label: 'Current Assets', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST223100T': { label: 'Accounts Receivable', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST225000T': { label: 'Cash and Cash Equivalents', category: 'Assets', subCategory: 'SB Current Assets' },
  'BST230000T': { label: 'Current Liabilities', category: 'Liabilities', subCategory: 'SB Current Liabilities' },
  'BST232000T': { label: 'Accounts Payable', category: 'Liabilities', subCategory: 'SB Current Liabilities' },
  'BST240000T': { label: 'Non-Current Liabilities', category: 'Liabilities', subCategory: 'SB Non-Current Liabilities' },
  'BST400000T': { label: 'Total Liabilities and Equity', category: 'Liabilities', subCategory: 'SB Total' },
};

const CASH_FLOW_CODES = {
  'MCF000000T': { label: 'Opening Cash Balance', category: 'Cash Flow' },
  'MCF110000T': { label: 'Operating Cash Flow', category: 'Cash Flow' },
  'MCF190000T': { label: 'Investing Cash Flow', category: 'Cash Flow' },
  'MCF195000T': { label: 'Financing Cash Flow', category: 'Cash Flow' },
  'MCF700000T': { label: 'Closing Cash Balance', category: 'Cash Flow' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PERIODS = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const API_BASE = 'http://localhost:8000';

// ─── API HELPERS ──────────────────────────────────────────────────────────────

const api = {
  get: (url) => fetch(`${API_BASE}${url}`).then(r => r.json()),
  post: (url, body) => fetch(`${API_BASE}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; }),
  put: (url, body) => fetch(`${API_BASE}${url}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; }),
  delete: (url) => fetch(`${API_BASE}${url}`, { method: 'DELETE' }).then(r => r.json()),
};

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'revenue', label: 'Revenue & Expenses', endpoint: '/revenue-expenses', color: '#092A5E' },
  { key: 'assets',  label: 'Assets & Liabilities', endpoint: '/asset-liabilities', color: '#1a4a8a' },
  { key: 'cashflow',label: 'Cash Flow',            endpoint: '/cash-flows',        color: '#0d3d6e' },
  { key: 'suppliers',label: 'Suppliers',           endpoint: '/suppliers',         color: '#70CBF4' },
  { key: 'customers',label: 'Customers',           endpoint: '/customers',         color: '#4ab8e8' },
];

// ─── EMPTY FORM STATES ────────────────────────────────────────────────────────

const emptyForms = {
  revenue: { code: '', label: '', year: CURRENT_YEAR, period: 'P1', month: 'January', value: '', frequency: 'periodic', type: 'Actual', category: '' },
  assets:  { code: '', label: '', category: '', subCategory: '', year: CURRENT_YEAR, period: 'P1', month: 'January', value: '', frequency: 'periodic', type: 'Actual' },
  cashflow:{ code: '', label: '', year: CURRENT_YEAR, month: 'January', value: '', category: '', type: 'Actual' },
  suppliers:{ vendorName: '', amount: '', agingBucket: '', netDate: '', targetDate: '', year: CURRENT_YEAR, address: '', telephone: '', category: '' },
  customers:{ customerName: '', amount: '', agingBucket: '', expenseCategory: '', netDate: '', targetDate: '', year: CURRENT_YEAR, address: '', telephone: '' },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentCategory = CATEGORIES.find(c => c.key === activeCategory);

  useEffect(() => {
    fetchEntries();
  }, [activeCategory]);

  const fetchEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(currentCategory.endpoint);
      setEntries(data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ── Code → auto-fill label (and subCategory for assets) ──────────────────
  const handleCodeChange = (e) => {
    const selectedCode = e.target.value;
    let autoFill = { code: selectedCode };

    if (activeCategory === 'revenue' && REVENUE_EXPENSE_CODES[selectedCode]) {
      autoFill.label = REVENUE_EXPENSE_CODES[selectedCode].label;
      autoFill.category = REVENUE_EXPENSE_CODES[selectedCode].category;
    }
    if (activeCategory === 'assets' && ASSET_LIABILITY_CODES[selectedCode]) {
      autoFill.label = ASSET_LIABILITY_CODES[selectedCode].label;
      autoFill.category = ASSET_LIABILITY_CODES[selectedCode].category;
      autoFill.subCategory = ASSET_LIABILITY_CODES[selectedCode].subCategory;
    }
    if (activeCategory === 'cashflow' && CASH_FLOW_CODES[selectedCode]) {
      autoFill.label = CASH_FLOW_CODES[selectedCode].label;
      autoFill.category = CASH_FLOW_CODES[selectedCode].category;
    }

    setFormData(prev => ({ ...prev, ...autoFill }));
  };

  const handleChange = (e) => {
    if (e.target.name === 'code') return handleCodeChange(e);
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openCreate = () => {
    setModalMode('create');
    setFormData(emptyForms[activeCategory]);
    setShowModal(true);
    setError('');
    setMessage('');
  };

  const openEdit = (entry) => {
    setModalMode('edit');
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setShowModal(true);
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...formData, userId: currentUser.id || 1 };
      if (modalMode === 'create') {
        await api.post(currentCategory.endpoint, payload);
        setMessage('Entry created successfully!');
      } else {
        await api.put(`${currentCategory.endpoint}/${selectedEntry.id}`, formData);
        setMessage('Entry updated successfully!');
      }
      setTimeout(() => { setShowModal(false); setMessage(''); fetchEntries(); }, 1200);
    } catch (err) {
      setError(err.detail || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`${currentCategory.endpoint}/${id}`);
      setMessage('Entry deleted');
      fetchEntries();
      setTimeout(() => setMessage(''), 2500);
    } catch {
      setError('Failed to delete');
    }
  };

  // ─── FORM FIELDS per category ───────────────────────────────────────────────

  const getCodeOptions = () => {
    if (activeCategory === 'revenue') return Object.keys(REVENUE_EXPENSE_CODES);
    if (activeCategory === 'assets')  return Object.keys(ASSET_LIABILITY_CODES);
    if (activeCategory === 'cashflow') return Object.keys(CASH_FLOW_CODES);
    return [];
  };

  const renderFormFields = () => {
    const inputClass = "w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl outline-none focus:border-[#70CBF4] text-sm bg-white";
    const labelClass = "block text-xs font-bold mb-1.5 uppercase tracking-wide";
    const readonlyClass = "w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed";

    if (['revenue', 'assets', 'cashflow'].includes(activeCategory)) {
      const codeOptions = getCodeOptions();
      return (
        <div className="grid grid-cols-2 gap-4">
          {/* Code dropdown */}
          <div className="col-span-2">
            <label className={labelClass} style={{ color: '#092A5E' }}>Code *</label>
            <select name="code" value={formData.code} onChange={handleChange} className={inputClass} required>
              <option value="">— Select a code —</option>
              {codeOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Label — auto-filled, readonly */}
          <div className="col-span-2">
            <label className={labelClass} style={{ color: '#092A5E' }}>
              Label <span className="text-xs font-normal text-gray-400 normal-case">(auto-filled from code)</span>
            </label>
            <input type="text" value={formData.label} readOnly className={readonlyClass} placeholder="Select a code above..." />
          </div>

          {/* Category — auto-filled */}
          {activeCategory !== 'cashflow' && (
            <div>
              <label className={labelClass} style={{ color: '#092A5E' }}>Category</label>
              <input type="text" value={formData.category} readOnly className={readonlyClass} />
            </div>
          )}

          {/* SubCategory for assets */}
          {activeCategory === 'assets' && (
            <div>
              <label className={labelClass} style={{ color: '#092A5E' }}>Sub-Category</label>
              <input type="text" value={formData.subCategory} readOnly className={readonlyClass} />
            </div>
          )}

          {/* Year */}
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Year *</label>
            <select name="year" value={formData.year} onChange={handleChange} className={inputClass}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Month *</label>
            <select name="month" value={formData.month} onChange={handleChange} className={inputClass}>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Period (not for cashflow) */}
          {activeCategory !== 'cashflow' && (
            <div>
              <label className={labelClass} style={{ color: '#092A5E' }}>Period *</label>
              <select name="period" value={formData.period} onChange={handleChange} className={inputClass}>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {/* Amount / Value */}
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Amount *</label>
            <input type="number" name="value" value={formData.value} onChange={handleChange} className={inputClass} placeholder="e.g. 1500000" required />
          </div>

          {/* Frequency (revenue + assets) */}
          {activeCategory !== 'cashflow' && (
            <div>
              <label className={labelClass} style={{ color: '#092A5E' }}>Frequency *</label>
              <select name="frequency" value={formData.frequency} onChange={handleChange} className={inputClass}>
                <option value="periodic">Periodic</option>
                <option value="year to date">Year to Date</option>
              </select>
            </div>
          )}

          {/* Type */}
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} className={inputClass}>
              <option value="Actual">Actual</option>
              <option value="Budget">Budget</option>
            </select>
          </div>
        </div>
      );
    }

    // Suppliers & Customers — no code, free text
    if (activeCategory === 'suppliers') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass} style={{ color: '#092A5E' }}>Vendor Name *</label>
            <input type="text" name="vendorName" value={formData.vendorName} onChange={handleChange} className={inputClass} placeholder="e.g. TUI HOLDING SPAIN" required />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Amount *</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={inputClass} placeholder="e.g. 45000" required />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Year *</label>
            <select name="year" value={formData.year} onChange={handleChange} className={inputClass}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Aging Bucket</label>
            <select name="agingBucket" value={formData.agingBucket} onChange={handleChange} className={inputClass}>
              <option value="">— Select —</option>
              <option value="0-30">0–30 days</option>
              <option value="31-60">31–60 days</option>
              <option value="61-90">61–90 days</option>
              <option value="90+">90+ days</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Category</label>
            <input type="text" name="category" value={formData.category} onChange={handleChange} className={inputClass} placeholder="e.g. General costs" />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Net Date</label>
            <input type="date" name="netDate" value={formData.netDate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Target Date</label>
            <input type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Address</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="Street, City, Country" />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Telephone</label>
            <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} className={inputClass} placeholder="+1 234 567 890" />
          </div>
        </div>
      );
    }

    if (activeCategory === 'customers') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass} style={{ color: '#092A5E' }}>Customer Name *</label>
            <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} className={inputClass} placeholder="e.g. TUIAG" required />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Amount *</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={inputClass} placeholder="e.g. 45000" required />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Year *</label>
            <select name="year" value={formData.year} onChange={handleChange} className={inputClass}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Aging Bucket</label>
            <select name="agingBucket" value={formData.agingBucket} onChange={handleChange} className={inputClass}>
              <option value="">— Select —</option>
              <option value="0-30">0–30 days</option>
              <option value="31-60">31–60 days</option>
              <option value="61-90">61–90 days</option>
              <option value="90+">90+ days</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Expense Category</label>
            <input type="text" name="expenseCategory" value={formData.expenseCategory} onChange={handleChange} className={inputClass} placeholder="e.g. General costs" />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Net Date</label>
            <input type="date" name="netDate" value={formData.netDate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Target Date</label>
            <input type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Address</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="Street, City, Country" />
          </div>
          <div>
            <label className={labelClass} style={{ color: '#092A5E' }}>Telephone</label>
            <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} className={inputClass} placeholder="+1 234 567 890" />
          </div>
        </div>
      );
    }
  };

  // ─── TABLE COLUMNS per category ─────────────────────────────────────────────

  const getTableColumns = () => {
    if (activeCategory === 'revenue')   return ['ID','Code','Label','Year','Period','Month','Amount','Frequency','Type','Actions'];
    if (activeCategory === 'assets')    return ['ID','Code','Label','Category','Sub-Category','Year','Month','Amount','Actions'];
    if (activeCategory === 'cashflow')  return ['ID','Code','Label','Year','Month','Amount','Type','Actions'];
    if (activeCategory === 'suppliers') return ['ID','Vendor','Amount','Year','Aging','Category','Net Date','Actions'];
    if (activeCategory === 'customers') return ['ID','Customer','Amount','Year','Aging','Expense Cat.','Net Date','Actions'];
    return [];
  };

  const getRowValues = (entry) => {
    if (activeCategory === 'revenue')   return [entry.id, entry.code, entry.label, entry.year, entry.period, entry.month, entry.value?.toLocaleString(), entry.frequency, entry.type];
    if (activeCategory === 'assets')    return [entry.id, entry.code, entry.label, entry.category, entry.subCategory, entry.year, entry.month, entry.value?.toLocaleString()];
    if (activeCategory === 'cashflow')  return [entry.id, entry.code, entry.label, entry.year, entry.month, entry.value?.toLocaleString(), entry.type];
    if (activeCategory === 'suppliers') return [entry.id, entry.vendorName, entry.amount?.toLocaleString(), entry.year, entry.agingBucket || '—', entry.category || '—', entry.netDate ? entry.netDate.split('T')[0] : '—'];
    if (activeCategory === 'customers') return [entry.id, entry.customerName, entry.amount?.toLocaleString(), entry.year, entry.agingBucket || '—', entry.expenseCategory || '—', entry.netDate ? entry.netDate.split('T')[0] : '—'];
    return [];
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

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
            <button
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
              className="px-6 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: '#D40E14' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setEntries([]); }}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: activeCategory === cat.key ? '#092A5E' : 'white',
                color: activeCategory === cat.key ? 'white' : '#092A5E',
                border: '2px solid #092A5E',
                boxShadow: activeCategory === cat.key ? '0 4px 14px rgba(9,42,94,0.3)' : 'none'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={openCreate}
          className="px-6 py-3 rounded-xl text-white font-bold shadow-lg"
          style={{ backgroundColor: '#70CBF4' }}
        >
          + Add Entry
        </button>
        <button onClick={fetchEntries} className="px-5 py-2.5 rounded-xl border-2 font-semibold text-sm"
          style={{ borderColor: '#092A5E', color: '#092A5E' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Messages */}
      {message && <div className="max-w-7xl mx-auto mb-4 p-4 rounded-xl bg-green-50 border-l-4 border-green-600 text-green-700">{message}</div>}
      {error   && <div className="max-w-7xl mx-auto mb-4 p-4 rounded-xl border-l-4" style={{ backgroundColor: '#fee2e2', borderLeftColor: '#D40E14', color: '#D40E14' }}>{error}</div>}

      {/* Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: '#092A5E' }}>
              <tr>
                {getTableColumns().map(col => (
                  <th key={col} className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={getTableColumns().length} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={getTableColumns().length} className="px-4 py-8 text-center text-gray-400">No entries yet. Click "+ Add Entry" to start.</td></tr>
              ) : entries.map((entry, i) => (
                <tr key={entry.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  {getRowValues(entry).map((val, j) => (
                    <td key={j} className="px-4 py-3 text-gray-700">{val}</td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(entry)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: '#70CBF4' }}>Edit</button>
                      <button onClick={() => handleDelete(entry.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
            <div className="px-8 py-6 rounded-t-3xl" style={{ backgroundColor: '#092A5E' }}>
              <h2 className="text-xl font-bold text-white">
                {modalMode === 'create' ? `Add ${currentCategory.label} Entry` : `Edit ${currentCategory.label} Entry`}
              </h2>
              <p className="text-blue-200 text-sm mt-1">
                {['revenue','assets','cashflow'].includes(activeCategory)
                  ? 'Select a code — label will fill automatically'
                  : 'Fill in the entry details below'}
              </p>
            </div>

            <div className="px-8 py-6">
              {message && <div className="mb-4 p-3 rounded-xl bg-green-50 border-l-4 border-green-600 text-green-700 text-sm">{message}</div>}
              {error   && <div className="mb-4 p-3 rounded-xl border-l-4 text-sm" style={{ backgroundColor: '#fee2e2', borderLeftColor: '#D40E14', color: '#D40E14' }}>{error}</div>}

              <form onSubmit={handleSubmit}>
                {renderFormFields()}
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 font-semibold"
                    style={{ borderColor: '#092A5E', color: '#092A5E' }}>Cancel</button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 rounded-xl text-white font-bold"
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