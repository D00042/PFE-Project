import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import accountService from '../services/accountService';

const TEAMS = ['Record-to-Report', 'Purchase-to-Pay', 'Order-to-Cash'];

export default function UserManagement() {

  const navigate = useNavigate();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [message, setMessage]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ email:'', password:'', role:'member', fullName:'', telephone:'', team:'' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'leader') { alert('Access denied'); navigate('/home'); return; }
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await accountService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setForm({ email:'', password:'', role:'member', fullName:'', telephone:'', team:'' });
    setFormErrors({});
    setShowModal(true); setError(''); setMessage('');
  };

  const openEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    // Only load role and team for edit — leader can only change these
    setForm({ role: user.role, team: user.team || '' });
    setFormErrors({});
    setShowModal(true); setError(''); setMessage('');
  };

  const validateTelephone = (value) => {
    if (!value) return "";
    const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
    if (!phoneRegex.test(value)) return "Invalid phone number format.";
    if (value.replace(/\D/g, "").length < 7) return "Phone number too short.";
    return "";
  };

  const validateEmail = (value) => {
    if (!value) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Invalid email address.";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(value)) return "Password must contain at least one number.";
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    // live validation for create mode
    if (modalMode === 'create') {
      if (name === 'telephone') setFormErrors(p => ({ ...p, telephone: validateTelephone(value) }));
      if (name === 'email')     setFormErrors(p => ({ ...p, email: validateEmail(value) }));
      if (name === 'password')  setFormErrors(p => ({ ...p, password: validatePassword(value) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalMode === 'create') {
      const emailErr = validateEmail(form.email);
      const passErr  = validatePassword(form.password);
      const telErr   = validateTelephone(form.telephone);
      if (emailErr || passErr || telErr) {
        setFormErrors({ email: emailErr, password: passErr, telephone: telErr });
        return;
      }
    }

    setLoading(true); setError('');
    try {
      if (modalMode === 'create') {
        await accountService.createAccount(form);
        setMessage(`Account created! Credentials sent to ${form.email}.`);
      } else {
        // Only send role and team — the only fields a leader can edit
        await accountService.editAccount(selectedUser.id, {
          role: form.role,
          team: form.team,
        });
        setMessage('Account updated successfully!');
      }
      setTimeout(() => { setShowModal(false); fetchUsers(); }, 1600);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err?.response?.data?.detail || JSON.stringify(err) || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    if (!window.confirm(`${isActive ? 'Deactivate' : 'Activate'} this account?`)) return;
    try {
      if (isActive) {
        await accountService.deactivateAccount(id);
      } else {
        await accountService.activateAccount(id);
      }
      setMessage(`Account ${isActive ? 'deactivated' : 'activated'}!`);
      fetchUsers();
      setTimeout(() => setMessage(''), 2500);
    } catch {
      setError('Failed to update status');
    }
  };

  const roleBadge = (role) => {
    if (role === 'manager') return { backgroundColor:'#092A5E', color:'white' };
    if (role === 'leader')  return { backgroundColor:'#70CBF4', color:'white' };
    return { backgroundColor:'#E5E7EB', color:'#374151' };
  };
  const roleLabel = (r) => ({ leader:'Team Leader', member:'Team Member', manager:'Manager' })[r] || r;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.headerLeft}>
            <Logo size="medium" />
            <div style={S.divider} />
            <div>
              <p style={S.headerMeta}>Financial Intelligence Platform</p>
              <p style={S.headerPageName}>Account Management</p>
            </div>
          </div>
          <div style={S.headerRight}>
            <button onClick={() => navigate('/home')} style={S.backBtn}>← Home</button>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={S.logoutBtn}>Logout</button>
          </div>
        </div>
      </div>

      <div style={S.body}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <button onClick={openCreate} style={S.addBtn}>+ Create New Account</button>
          <button onClick={fetchUsers} style={S.refreshBtn}>↺ Refresh</button>
        </div>
        {message && <div style={S.msgSuccess}>{message}</div>}
        {error   && <div style={S.msgError}>{error}</div>}

        <div style={S.tableWrap}>
          <div style={{ overflowX:'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>{['ID','Full Name','Email','Telephone','Team','Role','Status','Actions'].map(c => <th key={c} style={S.th}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr><td colSpan="8" style={S.tdEmpty}>Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="8" style={S.tdEmpty}>No accounts found</td></tr>
                ) : users.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: i%2===0?'#F9FAFB':'white' }}>
                    <td style={S.td}>{u.id}</td>
                    <td style={S.td}>{u.fullName||'—'}</td>
                    <td style={S.td}>{u.email}</td>
                    <td style={S.td}>{u.telephone||'—'}</td>
                    <td style={S.td}>{u.team||'—'}</td>
                    <td style={S.td}><span style={{ ...S.badge, ...roleBadge(u.role) }}>{roleLabel(u.role)}</span></td>
                    <td style={S.td}><span style={{ ...S.badge, backgroundColor: u.is_active!==false?'#16A34A':'#D40E14', color:'white' }}>{u.is_active!==false?'Active':'Inactive'}</span></td>
                    <td style={S.td}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => openEdit(u)} style={S.editBtn}>Edit</button>
                        <button onClick={() => handleToggle(u.id, u.is_active!==false)}
                          style={{ ...S.toggleBtn, backgroundColor: u.is_active!==false?'#F59E0B':'#16A34A' }}>
                          {u.is_active!==false?'Deactivate':'Activate'}
                        </button>
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
              <h2 style={S.modalTitle}>{modalMode==='create'?'Create New Account':'Edit Account'}</h2>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'rgba(255,255,255,0.7)' }}>
                {modalMode==='create'
                  ? 'Login credentials will be emailed to the user.'
                  : 'You can only update the role and team assignment.'}
              </p>
            </div>
            <div style={S.modalBody}>
              {message && <div style={{ ...S.msgSuccess, marginBottom:12 }}>{message}</div>}
              {error   && <div style={{ ...S.msgError,   marginBottom:12 }}>{error}</div>}

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

                {/* ── Create-only fields ── */}
                {modalMode === 'create' && (
                  <>
                    <Field label="Full Name">
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Sarah Johnson"
                        style={F.input}
                      />
                    </Field>

                    <Field label="Email Address *">
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="sarah@tui.com"
                        style={{ ...F.input, borderColor: formErrors.email ? '#D40E14' : '#E5E7EB' }}
                        required
                      />
                      {formErrors.email && <span style={F.err}>{formErrors.email}</span>}
                    </Field>

                    <Field label="Temporary Password *">
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        style={{ ...F.input, borderColor: formErrors.password ? '#D40E14' : '#E5E7EB' }}
                        required
                      />
                      {formErrors.password && <span style={F.err}>{formErrors.password}</span>}
                    </Field>

                    <Field label="Telephone">
                      <input
                        type="text"
                        name="telephone"
                        value={form.telephone}
                        onChange={handleChange}
                        placeholder="+216 XX XXX XXX"
                        style={{ ...F.input, borderColor: formErrors.telephone ? '#D40E14' : '#E5E7EB' }}
                      />
                      {formErrors.telephone && <span style={F.err}>{formErrors.telephone}</span>}
                    </Field>
                  </>
                )}

                {/* ── Edit-only notice ── */}
                {modalMode === 'edit' && (
                  <div style={{ padding:'10px 14px', backgroundColor:'#FEF9EC', borderRadius:10, fontSize:12, color:'#92400E', borderLeft:'3px solid #F59E0B' }}>
                    ⚠ Personal information (name, email, phone, password) can only be changed by the account owner from their profile.
                  </div>
                )}

                {/* ── Shared fields: Role + Team ── */}
                <Field label="Role *">
                  <select name="role" value={form.role} onChange={handleChange} style={F.input} required>
                    <option value="member">Team Member</option>
                    <option value="leader">Team Leader</option>
                    <option value="manager">Manager</option>
                  </select>
                </Field>

                <Field label="Team">
                  <select name="team" value={form.team} onChange={handleChange} style={F.input}>
                    <option value="">— Select team —</option>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>

                <div style={{ display:'flex', gap:12, marginTop:8 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity:loading?0.6:1 }}>
                    {loading ? 'Saving…' : modalMode==='create' ? 'Create & Send Credentials' : 'Save Changes'}
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
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={F.label}>{label}</label>
      {children}
    </div>
  );
}

const F = {
  label: { fontSize:11, fontWeight:700, color:'#092A5E', textTransform:'uppercase', letterSpacing:'0.06em' },
  input: { padding:'11px 14px', border:'2px solid #E5E7EB', borderRadius:10, fontSize:13, outline:'none', fontFamily:'Arial, sans-serif', width:'100%', boxSizing:'border-box', backgroundColor:'white', color:'#213547' },
  err:   { fontSize:11, color:'#D40E14', marginTop:3 },
};

const S = {
  page:          { minHeight:'100vh', backgroundColor:'#F3F4F6', fontFamily:'Arial, sans-serif' },
  body:          { maxWidth:1200, margin:'0 auto', padding:'32px 24px 60px' },
  header:        { backgroundColor:'white', borderBottom:'1px solid #E5E7EB', padding:'0 24px' },
  headerInner:   { maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:72 },
  headerLeft:    { display:'flex', alignItems:'center', gap:16 },
  headerRight:   { display:'flex', alignItems:'center', gap:10 },
  divider:       { width:1, height:36, backgroundColor:'#E5E7EB' },
  headerMeta:    { margin:0, fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 },
  headerPageName:{ margin:0, fontSize:15, color:'#092A5E', fontWeight:700 },
  backBtn:       { padding:'8px 18px', backgroundColor:'white', color:'#092A5E', border:'2px solid #092A5E', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  logoutBtn:     { padding:'8px 20px', backgroundColor:'#D40E14', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  addBtn:        { padding:'11px 22px', backgroundColor:'#70CBF4', color:'white', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer' },
  refreshBtn:    { padding:'11px 16px', border:'2px solid #092A5E', borderRadius:12, fontSize:13, fontWeight:700, color:'#092A5E', cursor:'pointer', backgroundColor:'white' },
  msgSuccess:    { padding:'12px 16px', backgroundColor:'#F0FDF4', borderLeft:'4px solid #16A34A', borderRadius:10, fontSize:13, color:'#15803D', marginBottom:16 },
  msgError:      { padding:'12px 16px', backgroundColor:'#FEF2F2', borderLeft:'4px solid #D40E14', borderRadius:10, fontSize:13, color:'#D40E14', marginBottom:16 },
  tableWrap:     { backgroundColor:'white', borderRadius:20, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', overflow:'hidden' },
  table:         { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:            { padding:'14px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.06em', backgroundColor:'#092A5E', whiteSpace:'nowrap' },
  td:            { padding:'12px 16px', color:'#374151', whiteSpace:'nowrap', borderBottom:'1px solid #F3F4F6' },
  tdEmpty:       { padding:'48px 16px', textAlign:'center', color:'#9CA3AF', fontSize:14 },
  badge:         { padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 },
  editBtn:       { padding:'6px 14px', backgroundColor:'#70CBF4', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  toggleBtn:     { padding:'6px 14px', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  overlay:       { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:50, overflowY:'auto' },
  modal:         { backgroundColor:'white', borderRadius:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', width:'100%', maxWidth:500, margin:'auto' },
  modalHeader:   { padding:'24px 32px', backgroundColor:'#092A5E', borderRadius:'24px 24px 0 0' },
  modalTitle:    { margin:0, fontSize:18, fontWeight:800, color:'white' },
  modalBody:     { padding:'28px 32px' },
  cancelBtn:     { flex:1, padding:'13px', border:'2px solid #092A5E', borderRadius:12, fontSize:14, fontWeight:700, color:'#092A5E', cursor:'pointer', backgroundColor:'white' },
  submitBtn:     { flex:1, padding:'13px', border:'none', borderRadius:12, fontSize:14, fontWeight:700, color:'white', cursor:'pointer', backgroundColor:'#70CBF4' },
};