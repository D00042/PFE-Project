import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './components/Logo';

const FISCAL_PERIOD_MAP = { 'October':'P1','November':'P2','December':'P3','January':'P4','February':'P5','March':'P6','April':'P7','May':'P8','June':'P9','July':'P10','August':'P11','September':'P12' };
const FISCAL_MONTHS = ['October','November','December','January','February','March','April','May','June','July','August','September'];
const EXPENSE_CATEGORIES = ['General costs','Other Business travel','Other Insurance','Professional fees','Rents and leases','Software licence'];

const REVENUE_EXPENSE_CODES = {
  'PLMT100000T':{ label:'Revenue' },'PLMT120000T':{ label:'Revenue' },'PLMT130000T':{ label:'Revenue' },
  'PLMT299999T':{ label:'Gross Margin' },'PLMT300000T':{ label:'Direct operating costs' },
  'PLMT399999T':{ label:'Gross Profit 1' },'PLMT511000T':{ label:'Staff Costs' },
  'PLMT512000T':{ label:'Overhead Depreciation' },'PLMT514100T':{ label:'Other Overheads' },
  'PLMT514200T':{ label:'Other Overheads' },'PLMT514300T':{ label:'Other Overheads' },
  'PLMT514600T':{ label:'Other Overheads' },'PLMT514700T':{ label:'Other Overheads' },
  'PLMT514800T':{ label:'Other Overheads' },'PLMT514900T':{ label:'Total Miscellaneous Overheads' },
  'PLMT514000T':{ label:'Other Overheads' },'PLMT590300T':{ label:'EBIT' },
  'PLMT600500T':{ label:'Interest' },'PLMT590100T':{ label:'EBT' },'PLMT799999T':{ label:'EBT' },
  'PLMT888555T':{ label:'Profit/(loss) after tax' },'PLMT899999T':{ label:'Retained Profit/(loss)' },
};
const ASSET_LIABILITY_CODES = {
  'BST211000T':{ label:'Other Intangible assets', category:'Assets', subCategory:'SB Non-current Assets' },
  'BST212000T':{ label:'SB Property, plant and equipment', category:'Assets', subCategory:'SB Non-current Assets' },
  'BST216000T':{ label:'Right of Use Assets', category:'Assets', subCategory:'SB Non-current Assets' },
  'BST213000T':{ label:'Non-current trade and other receivables', category:'Assets', subCategory:'SB Non-current Assets' },
  'BST210000T':{ label:'SB Non-current assets', category:'Assets', subCategory:'SB Non-current Assets' },
  'BST223100T':{ label:'Trade receivables', category:'Assets', subCategory:'SB Current Assets' },
  'BST223300T':{ label:'Current prepayments', category:'Assets', subCategory:'SB Current Assets' },
  'BST223155T':{ label:'Current other assets - non-financial instruments', category:'Assets', subCategory:'SB Current Assets' },
  'BST224000T':{ label:'Current income tax recoverable', category:'Assets', subCategory:'SB Current Assets' },
  'BST225000T':{ label:'SB Cash and cash equivalents', category:'Assets', subCategory:'SB Current Assets' },
  'BST220000T':{ label:'SB Current assets', category:'Assets', subCategory:'SB Current Assets' },
  'BST400000T':{ label:'Total Assets', category:'Assets', subCategory:'SB Total Assets' },
  'BST110000T':{ label:'Equity holders of parent', category:'Equity', subCategory:'Total Reserves' },
  'BST100000T':{ label:'Total reserves', category:'Equity', subCategory:'Total Reserves' },
  'BST240000T':{ label:'SB Non-current provisions and liabilities', category:'Liabilities', subCategory:'SB Non-current Provisions and Liabilities' },
  'BST232000T':{ label:'Trade payables', category:'Liabilities', subCategory:'SB Current Provisions And Liabilities' },
  'BST233300T':{ label:'Current prepayments received', category:'Liabilities', subCategory:'SB Current Provisions And Liabilities' },
  'BST236300T':{ label:'Current other liabilities - non-financial instruments', category:'Liabilities', subCategory:'SB Current Provisions And Liabilities' },
  'BST234200T':{ label:'Current income tax payable', category:'Liabilities', subCategory:'SB Current Provisions And Liabilities' },
  'BST231600T':{ label:'Current lease liabilities (IFRS 16)', category:'Liabilities', subCategory:'SB Current Provisions And Liabilities' },
  'BST230000T':{ label:'SB Current provisions and liabilities', category:'Liabilities', subCategory:'SB Current Provisions And Liabilities' },
  'BST300000T':{ label:'Total Equity and liabilities', category:'Liabilities', subCategory:'Grand Total' },
};
const CASH_FLOW_CODES = {
  'MCF000000T':{ label:'Opening Cash Balance' },'MCF110000T':{ label:'Operating Cash Flow' },
  'MCF190000T':{ label:'Net Investments Cash Flow' },'MCF195000T':{ label:'Lease & Asset Financing Repayments' },
  'MCF300000T':{ label:'Adj. Financing Cash Flow' },'MCF500000T':{ label:'Total change in Cash due to FX' },
  'MCF700000T':{ label:'Closing Cash Balance' },
};

// Build label→[first code] map — user picks label, first code auto-fills
const firstCode = (codeMap, targetLabel) => Object.entries(codeMap).find(([, v]) => v.label === targetLabel)?.[0] || '';
const uniqueLabels = (codeMap) => [...new Set(Object.values(codeMap).map(v => v.label))];
const REVENUE_LABELS  = uniqueLabels(REVENUE_EXPENSE_CODES);
const ASSET_LABELS    = uniqueLabels(ASSET_LIABILITY_CODES);
const CASHFLOW_LABELS = uniqueLabels(CASH_FLOW_CODES);

// Aging calculation
function calcAging(netDate, targetDate) {
  if (!netDate || !targetDate) return { days: 0, agingDays: 'Not due', agingYear: null };
  const n = new Date(netDate), t = new Date(targetDate);
  const days = t > n ? Math.floor((t - n) / 86400000) : 0;
  let agingDays = 'Not due', agingYear = null;
  if      (days === 0)  agingDays = 'Not due';
  else if (days <= 30)  agingDays = '0-30 days';
  else if (days <= 61)  agingDays = '31-61 days';
  else if (days <= 90)  agingDays = '61-90 days';
  else if (days <= 180) agingDays = '90-180 days';
  else { agingDays = '>180 days'; agingYear = t.getFullYear(); }
  return { days, agingDays, agingYear };
}

const API_BASE = 'http://localhost:8000';
const api = {
  headers: () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` }),
  get:    (url)       => fetch(`${API_BASE}${url}`, { headers: api.headers() }).then(r => r.json()),
  post:   (url, body) => fetch(`${API_BASE}${url}`, { method:'POST',   headers: api.headers(), body: JSON.stringify(body) }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; }),
  put:    (url, body) => fetch(`${API_BASE}${url}`, { method:'PUT',    headers: api.headers(), body: JSON.stringify(body) }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; }),
  delete: (url)       => fetch(`${API_BASE}${url}`, { method:'DELETE', headers: api.headers() }).then(r => r.json()),
};

const CATEGORIES = [
  { key:'revenue',  label:'Revenue & Expenses',  endpoint:'/revenue-expenses' },
  { key:'assets',   label:'Assets & Liabilities', endpoint:'/asset-liabilities' },
  { key:'cashflow', label:'Cash Flow',            endpoint:'/cash-flows' },
  { key:'clients',  label:'Clients',              endpoint:'/clients' },
];

const FILTER_CONFIG = {
  revenue:  [{ key:'year', label:'Year' },{ key:'month', label:'Month', options:FISCAL_MONTHS },{ key:'type', label:'Type', options:['Actual','Budget'] },{ key:'frequency', label:'Frequency', options:['periodic','year to date'] }],
  assets:   [{ key:'year', label:'Year' },{ key:'month', label:'Month', options:FISCAL_MONTHS },{ key:'category', label:'Category', options:['Assets','Equity','Liabilities'] }],
  cashflow: [{ key:'year', label:'Year' },{ key:'month', label:'Month', options:FISCAL_MONTHS }],
  clients:  [{ key:'year', label:'Year' },{ key:'clientType', label:'Type', options:['supplier','customer'] },{ key:'agingDays', label:'Aging', options:['Not due','0-30 days','31-61 days','61-90 days','90-180 days','>180 days'] }],
};

const emptyForms = {
  revenue:  { label:'', code:'', year:'', month:'October', value:'', frequency:'periodic', type:'Actual', category:'Revenue & Expenses' },
  assets:   { label:'', code:'', category:'', subCategory:'', year:'', month:'October', value:'', type:'Actual' },
  cashflow: { label:'', code:'', year:'', month:'October', value:'' },
  clients:  { clientName:'', clientType:'supplier', amount:'', expenseCategory:'', netDate:'', targetDate:'', year:'', address:'', telephone:'' },
};

export default function DataManagement() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('revenue');
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [modalMode, setModalMode]   = useState('create');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [form, setForm]             = useState(emptyForms.revenue);
  const [message, setMessage]       = useState('');
  const [error, setError]           = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters]     = useState(false);

  const currentUser  = useMemo(() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch { return {}; } }, []);
  const currentCat   = CATEGORIES.find(c => c.key === activeCategory);
  const currentFilters = FILTER_CONFIG[activeCategory] || [];

  // Live aging preview for client form
  const liveAging = useMemo(() => {
    if (activeCategory !== 'clients' || !form.netDate || !form.targetDate) return null;
    return calcAging(form.netDate, form.targetDate);
  }, [activeCategory, form.netDate, form.targetDate]);

  useEffect(() => {
    setSearchQuery(''); setActiveFilters({}); setShowFilters(false); fetchEntries();
  }, [activeCategory]);

  const fetchEntries = async () => {
    setLoading(true); setError('');
    try { const d = await api.get(currentCat.endpoint); setEntries(Array.isArray(d) ? d : []); }
    catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  const filteredEntries = useMemo(() => {
    let r = [...entries];
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (!val) return;
      r = r.filter(e => e[key] != null && String(e[key]).toLowerCase() === val.toLowerCase());
    });
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      r = r.filter(e => Object.values(e).some(v => v != null && String(v).toLowerCase().includes(q)));
    }
    return r;
  }, [entries, activeFilters, searchQuery]);

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length + (searchQuery ? 1 : 0);

  // Label change → auto-fill code (and category/subCategory for assets)
  const handleLabelChange = (label) => {
    let fill = { label };
    if (activeCategory === 'revenue') {
      fill.code = firstCode(REVENUE_EXPENSE_CODES, label);
    }
    if (activeCategory === 'assets') {
      const code = firstCode(ASSET_LIABILITY_CODES, label);
      fill.code = code;
      if (ASSET_LIABILITY_CODES[code]) {
        fill.category    = ASSET_LIABILITY_CODES[code].category;
        fill.subCategory = ASSET_LIABILITY_CODES[code].subCategory;
      }
    }
    if (activeCategory === 'cashflow') {
      fill.code = firstCode(CASH_FLOW_CODES, label);
    }
    setForm(p => ({ ...p, ...fill }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'label') { handleLabelChange(value); return; }
    setForm(p => ({ ...p, [name]: value }));
  };

  const openCreate = () => { setModalMode('create'); setForm(emptyForms[activeCategory]); setShowModal(true); setError(''); setMessage(''); };
  const openEdit   = (entry) => {
    setModalMode('edit'); setSelectedEntry(entry);
    const f = { ...entry };
    if (f.netDate)    f.netDate    = f.netDate.split('T')[0];
    if (f.targetDate) f.targetDate = f.targetDate.split('T')[0];
    setForm(f); setShowModal(true); setError(''); setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { period, createdAt, updatedAt, daysOutstanding, agingDays, agingYear, id, ...payload } = form;
      const final = { ...payload, userId: currentUser?.id ?? 1 };
      if (modalMode === 'create') {
        await api.post(currentCat.endpoint, final);
        setMessage('Entry created!');
      } else {
        const { userId: _u, ...upd } = final;
        await api.put(`${currentCat.endpoint}/${selectedEntry.id}`, upd);
        setMessage('Entry updated!');
      }
      setTimeout(() => { setShowModal(false); setMessage(''); fetchEntries(); }, 1200);
    } catch (err) { setError(err.detail || JSON.stringify(err) || 'Operation failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await api.delete(`${currentCat.endpoint}/${id}`); fetchEntries(); }
    catch { setError('Failed to delete'); }
  };

  const getColumns = () => {
    if (activeCategory === 'revenue')  return ['ID','Label','Code','Year','Month','Amount','Frequency','Type','Actions'];
    if (activeCategory === 'assets')   return ['ID','Label','Code','Category','Sub-Cat','Year','Month','Amount','Type','Actions'];
    if (activeCategory === 'cashflow') return ['ID','Label','Code','Year','Month','Amount','Actions'];
    if (activeCategory === 'clients')  return ['ID','Name','Type','Amount','Expense Cat.','Net Date','Target Date','Days Out.','Aging','Aging Year','Actions'];
    return [];
  };

  const getRow = (e) => {
    const fmt  = n => n != null ? Number(n).toLocaleString() : '—';
    const fmtD = d => d ? d.split('T')[0] : '—';
    if (activeCategory === 'revenue')  return [e.id, e.label, e.code, e.year, e.month, fmt(e.value), e.frequency, e.type];
    if (activeCategory === 'assets')   return [e.id, e.label, e.code, e.category, e.subCategory, e.year, e.month, fmt(e.value), e.type||'—'];
    if (activeCategory === 'cashflow') return [e.id, e.label, e.code, e.year, e.month, fmt(e.value)];
    if (activeCategory === 'clients')  return [e.id, e.clientName, e.clientType, fmt(e.amount), e.expenseCategory||'—', fmtD(e.netDate), fmtD(e.targetDate), e.daysOutstanding??'—', e.agingDays||'—', e.agingYear||'—'];
    return [];
  };

  const renderFields = () => {
    if (activeCategory === 'revenue') return (
      <div style={F.grid2}>
        <div style={F.span2}>
          <Field label="Label *">
            <select name="label" value={form.label} onChange={handleChange} style={F.input} required>
              <option value="">— Select label —</option>
              {REVENUE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Code (auto-filled)"><input value={form.code} readOnly style={F.inputRO} placeholder="Select a label above" /></Field>
        <Field label="Type *">
          <select name="type" value={form.type} onChange={handleChange} style={F.input}>
            <option value="Actual">Actual</option><option value="Budget">Budget</option>
          </select>
        </Field>
        <Field label="Year *"><input type="number" name="year" value={form.year} onChange={handleChange} style={F.input} placeholder="e.g. 2025" required /></Field>
        <Field label="Month *">
          <select name="month" value={form.month} onChange={handleChange} style={F.input}>
            {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Amount *"><input type="number" name="value" value={form.value} onChange={handleChange} style={F.input} placeholder="e.g. 1500000" required /></Field>
        <Field label="Frequency *">
          <select name="frequency" value={form.frequency} onChange={handleChange} style={F.input}>
            <option value="periodic">Periodic</option><option value="year to date">Year to Date</option>
          </select>
        </Field>
      </div>
    );

    if (activeCategory === 'assets') return (
      <div style={F.grid2}>
        <div style={F.span2}>
          <Field label="Label *">
            <select name="label" value={form.label} onChange={handleChange} style={F.input} required>
              <option value="">— Select label —</option>
              {ASSET_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Code (auto-filled)"><input value={form.code} readOnly style={F.inputRO} /></Field>
        <Field label="Type *">
          <select name="type" value={form.type} onChange={handleChange} style={F.input}>
            <option value="Actual">Actual</option><option value="Budget">Budget</option>
          </select>
        </Field>
        <Field label="Category (auto-filled)"><input value={form.category} readOnly style={F.inputRO} /></Field>
        <Field label="Sub-Category (auto-filled)"><input value={form.subCategory} readOnly style={F.inputRO} /></Field>
        <Field label="Year *"><input type="number" name="year" value={form.year} onChange={handleChange} style={F.input} placeholder="e.g. 2025" required /></Field>
        <Field label="Month *">
          <select name="month" value={form.month} onChange={handleChange} style={F.input}>
            {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <div style={F.span2}><Field label="Amount *"><input type="number" name="value" value={form.value} onChange={handleChange} style={F.input} placeholder="e.g. 1500000" required /></Field></div>
      </div>
    );

    if (activeCategory === 'cashflow') return (
      <div style={F.grid2}>
        <div style={F.span2}>
          <Field label="Label *">
            <select name="label" value={form.label} onChange={handleChange} style={F.input} required>
              <option value="">— Select label —</option>
              {CASHFLOW_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Code (auto-filled)"><input value={form.code} readOnly style={F.inputRO} placeholder="Select a label above" /></Field>
        <Field label="Year *"><input type="number" name="year" value={form.year} onChange={handleChange} style={F.input} placeholder="e.g. 2025" required /></Field>
        <Field label="Month *">
          <select name="month" value={form.month} onChange={handleChange} style={F.input}>
            {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <div style={F.span2}><Field label="Amount *"><input type="number" name="value" value={form.value} onChange={handleChange} style={F.input} placeholder="e.g. 320000" required /></Field></div>
      </div>
    );

    if (activeCategory === 'clients') return (
      <div style={F.grid2}>
        <Field label="Client Name *"><input type="text" name="clientName" value={form.clientName} onChange={handleChange} style={F.input} placeholder="e.g. TUI HOLDING SPAIN" required /></Field>
        <Field label="Type *">
          <select name="clientType" value={form.clientType} onChange={handleChange} style={F.input}>
            <option value="supplier">Supplier</option>
            <option value="customer">Customer</option>
          </select>
        </Field>
        <Field label="Amount *"><input type="number" name="amount" value={form.amount} onChange={handleChange} style={F.input} placeholder="e.g. 45000" required /></Field>
        <Field label="Year *"><input type="number" name="year" value={form.year} onChange={handleChange} style={F.input} placeholder="e.g. 2025" required /></Field>
        <div style={F.span2}>
          <Field label="Expense Category">
            <select name="expenseCategory" value={form.expenseCategory} onChange={handleChange} style={F.input}>
              <option value="">— Select category —</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Net Date *"><input type="date" name="netDate" value={form.netDate} onChange={handleChange} style={F.input} required /></Field>
        <Field label="Target Date *"><input type="date" name="targetDate" value={form.targetDate} onChange={handleChange} style={F.input} required /></Field>

        {liveAging && (
          <div style={{ ...F.span2, padding:'12px 16px', backgroundColor:'#F0FDF4', borderRadius:10, borderLeft:'3px solid #16A34A' }}>
            <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#15803D', textTransform:'uppercase', letterSpacing:'0.06em' }}>Auto-calculated Aging</p>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', fontSize:13, color:'#374151' }}>
              <span><strong>Days Outstanding:</strong> {liveAging.days}</span>
              <span><strong>Aging:</strong> {liveAging.agingDays}</span>
              {liveAging.agingYear && <span><strong>Aging Year:</strong> {liveAging.agingYear}</span>}
            </div>
          </div>
        )}

        <Field label="Address"><input type="text" name="address" value={form.address} onChange={handleChange} style={F.input} placeholder="Street, City, Country" /></Field>
        <Field label="Telephone"><input type="text" name="telephone" value={form.telephone} onChange={handleChange} style={F.input} placeholder="+216 XX XXX XXX" /></Field>
      </div>
    );
  };

  const cols = getColumns();

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.headerLeft}>
            <Logo size="medium" />
            <div style={S.divider} />
            <div>
              <p style={S.headerMeta}>Financial Intelligence Platform</p>
              <p style={S.headerPageName}>Data Management</p>
            </div>
          </div>
          <div style={S.headerRight}>
            <button onClick={() => navigate('/home')} style={S.backBtn}>← Home</button>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={S.logoutBtn}>Logout</button>
          </div>
        </div>
      </div>

      <div style={S.body}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setEntries([]); }}
              style={{ padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', border:'2px solid #092A5E', backgroundColor: activeCategory===cat.key?'#092A5E':'white', color: activeCategory===cat.key?'white':'#092A5E', boxShadow: activeCategory===cat.key?'0 4px 14px rgba(9,42,94,0.25)':'none' }}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, marginBottom:16 }}>
          <button onClick={openCreate} style={S.addBtn}>+ Add Entry</button>
          <div style={{ flex:1, minWidth:220, position:'relative' }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </span>
            <input type="text" placeholder={`Search ${currentCat.label.toLowerCase()}…`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...S.searchInput, paddingLeft:36 }} />
            {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9CA3AF' }}>×</button>}
          </div>
          {currentFilters.length > 0 && (
            <button onClick={() => setShowFilters(f => !f)} style={{ ...S.filterBtn, borderColor: showFilters||activeFilterCount>0?'#092A5E':'#D1D5DB', color: showFilters||activeFilterCount>0?'#092A5E':'#6B7280', backgroundColor: showFilters?'#EEF1F7':'white' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters {activeFilterCount > 0 && <span style={{ padding:'1px 7px', borderRadius:12, fontSize:11, fontWeight:700, color:'white', backgroundColor:'#D40E14' }}>{activeFilterCount}</span>}
            </button>
          )}
          {activeFilterCount > 0 && <button onClick={() => { setActiveFilters({}); setSearchQuery(''); }} style={S.clearBtn}>Clear</button>}
          <button onClick={fetchEntries} style={S.refreshBtn}>↺ Refresh</button>
        </div>

        {/* Filters */}
        {showFilters && currentFilters.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:16, padding:'16px 20px', backgroundColor:'white', borderRadius:16, border:'2px solid #E5E7EB', marginBottom:16 }}>
            {currentFilters.map(filter => (
              <div key={filter.key} style={{ display:'flex', flexDirection:'column', gap:6, minWidth:140 }}>
                <label style={F.label}>{filter.label}</label>
                {filter.options ? (
                  <select value={activeFilters[filter.key]||''} onChange={e => setActiveFilters(p => ({ ...p, [filter.key]: e.target.value }))} style={{ ...F.input, margin:0 }}>
                    <option value="">All</option>
                    {filter.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type="number" placeholder="All years" value={activeFilters[filter.key]||''} onChange={e => setActiveFilters(p => ({ ...p, [filter.key]: e.target.value }))} style={{ ...F.input, margin:0 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {activeFilterCount > 0 && <p style={{ fontSize:13, color:'#6B7280', marginBottom:12 }}>Showing <strong style={{ color:'#092A5E' }}>{filteredEntries.length}</strong> of {entries.length} entries</p>}
        {message && <div style={S.msgSuccess}>{message}</div>}
        {error   && <div style={S.msgError}>{error}</div>}

        <div style={S.tableWrap}>
          <div style={{ overflowX:'auto' }}>
            <table style={S.table}>
              <thead><tr>{cols.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={cols.length} style={S.tdEmpty}>Loading…</td></tr>
                ) : filteredEntries.length === 0 && entries.length === 0 ? (
                  <tr><td colSpan={cols.length} style={S.tdEmpty}>No entries yet — click "+ Add Entry" to start.</td></tr>
                ) : filteredEntries.length === 0 ? (
                  <tr><td colSpan={cols.length} style={S.tdEmpty}>No entries match your filters.</td></tr>
                ) : filteredEntries.map((entry, i) => (
                  <tr key={entry.id} style={{ backgroundColor: i%2===0?'#F9FAFB':'white' }}>
                    {getRow(entry).map((val, j) => <td key={j} style={S.td}>{val}</td>)}
                    <td style={S.td}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => openEdit(entry)} style={S.editBtn}>Edit</button>
                        <button onClick={() => handleDelete(entry.id)} style={S.deleteBtn}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>{modalMode==='create'?`Add ${currentCat.label} Entry`:`Edit ${currentCat.label} Entry`}</h2>
            </div>
            <div style={S.modalBody}>
              {message && <div style={{ ...S.msgSuccess, marginBottom:16 }}>{message}</div>}
              {error   && <div style={{ ...S.msgError,   marginBottom:16 }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                {renderFields()}
                <div style={{ display:'flex', gap:12, marginTop:24 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity:loading?0.6:1 }}>
                    {loading?'Saving…':modalMode==='create'?'Create Entry':'Update Entry'}
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

function Field({ label, children }) {
  return <div style={{ display:'flex', flexDirection:'column', gap:6 }}><label style={F.label}>{label}</label>{children}</div>;
}

const F = {
  grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  span2:   { gridColumn:'1 / -1' },
  label:   { fontSize:11, fontWeight:700, color:'#092A5E', textTransform:'uppercase', letterSpacing:'0.06em' },
  input:   { padding:'10px 14px', border:'2px solid #E5E7EB', borderRadius:10, fontSize:13, outline:'none', fontFamily:'Arial, sans-serif', width:'100%', boxSizing:'border-box', backgroundColor:'white', color:'#213547' },
  inputRO: { padding:'10px 14px', border:'2px solid #F3F4F6', borderRadius:10, fontSize:13, fontFamily:'Arial, sans-serif', width:'100%', boxSizing:'border-box', backgroundColor:'#F9FAFB', color:'#9CA3AF' },
};
const S = {
  page:{ minHeight:'100vh', backgroundColor:'#F3F4F6', fontFamily:'Arial, sans-serif' },
  body:{ maxWidth:1300, margin:'0 auto', padding:'32px 24px 60px' },
  header:{ backgroundColor:'white', borderBottom:'1px solid #E5E7EB', padding:'0 24px' },
  headerInner:{ maxWidth:1300, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:72 },
  headerLeft:{ display:'flex', alignItems:'center', gap:16 },
  headerRight:{ display:'flex', alignItems:'center', gap:10 },
  divider:{ width:1, height:36, backgroundColor:'#E5E7EB' },
  headerMeta:{ margin:0, fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 },
  headerPageName:{ margin:0, fontSize:15, color:'#092A5E', fontWeight:700 },
  backBtn:{ padding:'8px 18px', backgroundColor:'white', color:'#092A5E', border:'2px solid #092A5E', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  logoutBtn:{ padding:'8px 20px', backgroundColor:'#D40E14', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  addBtn:{ padding:'11px 22px', backgroundColor:'#70CBF4', color:'white', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' },
  searchInput:{ width:'100%', padding:'11px 14px', border:'2px solid #E5E7EB', borderRadius:12, fontSize:13, outline:'none', fontFamily:'Arial, sans-serif', boxSizing:'border-box', color:'#213547' },
  filterBtn:{ display:'flex', alignItems:'center', gap:6, padding:'11px 16px', border:'2px solid', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' },
  clearBtn:{ padding:'11px 16px', border:'2px solid #E5E7EB', borderRadius:12, fontSize:13, fontWeight:600, color:'#6B7280', cursor:'pointer', backgroundColor:'white' },
  refreshBtn:{ padding:'11px 16px', border:'2px solid #092A5E', borderRadius:12, fontSize:13, fontWeight:700, color:'#092A5E', cursor:'pointer', backgroundColor:'white', whiteSpace:'nowrap' },
  msgSuccess:{ padding:'12px 16px', backgroundColor:'#F0FDF4', borderLeft:'4px solid #16A34A', borderRadius:10, fontSize:13, color:'#15803D', marginBottom:12 },
  msgError:{ padding:'12px 16px', backgroundColor:'#FEF2F2', borderLeft:'4px solid #D40E14', borderRadius:10, fontSize:13, color:'#D40E14', marginBottom:12 },
  tableWrap:{ backgroundColor:'white', borderRadius:20, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', overflow:'hidden' },
  table:{ width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:{ padding:'14px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.06em', backgroundColor:'#092A5E', whiteSpace:'nowrap' },
  td:{ padding:'12px 16px', color:'#374151', whiteSpace:'nowrap', borderBottom:'1px solid #F3F4F6' },
  tdEmpty:{ padding:'48px 16px', textAlign:'center', color:'#9CA3AF', fontSize:14 },
  editBtn:{ padding:'6px 14px', backgroundColor:'#70CBF4', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  deleteBtn:{ padding:'6px 14px', backgroundColor:'#D40E14', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  overlay:{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:50, overflowY:'auto' },
  modal:{ backgroundColor:'white', borderRadius:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', width:'100%', maxWidth:660, margin:'auto' },
  modalHeader:{ padding:'24px 32px', backgroundColor:'#092A5E', borderRadius:'24px 24px 0 0' },
  modalTitle:{ margin:0, fontSize:18, fontWeight:800, color:'white' },
  modalBody:{ padding:'28px 32px' },
  cancelBtn:{ flex:1, padding:'13px', border:'2px solid #092A5E', borderRadius:12, fontSize:14, fontWeight:700, color:'#092A5E', cursor:'pointer', backgroundColor:'white' },
  submitBtn:{ flex:1, padding:'13px', border:'none', borderRadius:12, fontSize:14, fontWeight:700, color:'white', cursor:'pointer', backgroundColor:'#70CBF4' },
};