import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Logo from './components/Logo';

function UserManagement() {
  const navigate  = useNavigate();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ email:'', password:'', role:'member', is_active:true });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const user = JSON.parse(stored);
    if (user.role !== 'leader' && user.role !== 'manager') {
      alert('Access Denied: Only Team Leaders and Managers can manage accounts.');
      navigate('/home');
      return;
    }
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const response = await authAPI.getAllUsers();
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const openCreate = () => {
    setModalMode('create');
    setFormData({ email:'', password:'', role:'member', is_active:true });
    setShowModal(true); setError(''); setMessage('');
  };

  const openEdit = (user) => {
    setModalMode('edit'); setSelectedUser(user);
    setFormData({ email:user.email, password:'', role:user.role, is_active: user.is_active !== false });
    setShowModal(true); setError(''); setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      if (modalMode === 'create') {
        await authAPI.register({ email:formData.email, password:formData.password, role:formData.role });
        setMessage('User created successfully!');
      } else {
        const updateData = { email:formData.email, role:formData.role, is_active:formData.is_active, ...(formData.password && { password:formData.password }) };
        await authAPI.updateUser(selectedUser.id, updateData);
        setMessage('User updated successfully!');
      }
      setTimeout(() => { setShowModal(false); setMessage(''); fetchUsers(); }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    } finally { setLoading(false); }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    setLoading(true); setError('');
    try {
      if (currentStatus) await authAPI.deactivateUser(userId);
      else               await authAPI.activateUser(userId);
      setMessage(`User ${action}d successfully!`);
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError(`Failed to ${action} user`); }
    finally { setLoading(false); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setLoading(true); setError('');
    try {
      await authAPI.deleteUser(userId);
      setMessage('User deleted successfully!');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Failed to delete user'); }
    finally { setLoading(false); }
  };

  const getRoleLabel = (role) => {
    const map = { leader:'Team Leader', member:'Team Member', manager:'Manager' };
    return map[role] || role;
  };

  const getRoleBadge = (role) => {
    if (role === 'manager') return { backgroundColor:'#092A5E', color:'white' };
    if (role === 'leader')  return { backgroundColor:'#70CBF4', color:'white' };
    return { backgroundColor:'#E5E7EB', color:'#374151' };
  };

  return (
    <div style={S.page}>

      {/* Header */}
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
            <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} style={S.logoutBtn}>Logout</button>
          </div>
        </div>
      </div>

      <div style={S.body}>

        {/* Action bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <button onClick={openCreate} style={S.addBtn}>+ Create New Account</button>
          <button onClick={fetchUsers} style={S.refreshBtn}>↺ Refresh</button>
        </div>

        {/* Messages */}
        {message && <div style={S.msgSuccess}>{message}</div>}
        {error   && <div style={S.msgError}>{error}</div>}

        {/* Table */}
        <div style={S.tableWrap}>
          <div style={{ overflowX:'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['ID','Email','Role','Status','Actions'].map(col => (
                    <th key={col} style={S.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr><td colSpan="5" style={S.tdEmpty}>Loading users…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="5" style={S.tdEmpty}>No users found</td></tr>
                ) : users.map((user, i) => (
                  <tr key={user.id} style={{ backgroundColor: i % 2 === 0 ? '#F9FAFB' : 'white' }}>
                    <td style={S.td}>{user.id}</td>
                    <td style={S.td}>{user.email}</td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, ...getRoleBadge(user.role) }}>{getRoleLabel(user.role)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, backgroundColor: user.is_active !== false ? '#16A34A' : '#D40E14', color:'white' }}>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => openEdit(user)} style={S.editBtn}>Edit</button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active !== false)}
                          style={{ ...S.toggleBtn, backgroundColor: user.is_active !== false ? '#F59E0B' : '#16A34A' }}>
                          {user.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDelete(user.id)} style={S.deleteBtn}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>{modalMode === 'create' ? 'Create New Account' : 'Edit Account'}</h2>
            </div>
            <div style={S.modalBody}>
              {message && <div style={{ ...S.msgSuccess, marginBottom:16 }}>{message}</div>}
              {error   && <div style={{ ...S.msgError,   marginBottom:16 }}>{error}</div>}

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={F.label}>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john.doe@tui.com" style={F.input} required />
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={F.label}>Role</label>
                  <select name="role" value={formData.role} onChange={handleChange} style={F.input} required>
                    <option value="member">Team Member</option>
                    <option value="leader">Team Leader</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={F.label}>Password{modalMode === 'edit' ? ' (leave blank to keep current)' : ''}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" style={F.input} required={modalMode === 'create'} />
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', backgroundColor:'#F9FAFB', borderRadius:12 }}>
                  <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} style={{ width:18, height:18, accentColor:'#70CBF4', cursor:'pointer' }} />
                  <label htmlFor="is_active" style={{ fontSize:13, fontWeight:700, color:'#092A5E', cursor:'pointer' }}>Account Active</label>
                </div>

                <div style={{ display:'flex', gap:12, marginTop:8 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={S.cancelBtn}>Cancel</button>
                  <button type="submit" disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Saving…' : modalMode === 'create' ? 'Create' : 'Update'}
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

// ── Form tokens ───────────────────────────────────────────────────────────────
const F = {
  label: { fontSize:11, fontWeight:700, color:'#092A5E', textTransform:'uppercase', letterSpacing:'0.06em' },
  input: { padding:'11px 14px', border:'2px solid #E5E7EB', borderRadius:10, fontSize:13, outline:'none', fontFamily:'Arial, sans-serif', width:'100%', boxSizing:'border-box', backgroundColor:'white' },
};

// ── Page style tokens (mirrors Accueil + DataManagement) ─────────────────────
const S = {
  page:       { minHeight:'100vh', backgroundColor:'#F3F4F6', fontFamily:'Arial, sans-serif' },
  body:       { maxWidth:1100, margin:'0 auto', padding:'32px 24px 60px' },
  header:     { backgroundColor:'white', borderBottom:'1px solid #E5E7EB', padding:'0 24px' },
  headerInner:{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:72 },
  headerLeft: { display:'flex', alignItems:'center', gap:16 },
  headerRight:{ display:'flex', alignItems:'center', gap:10 },
  divider:    { width:1, height:36, backgroundColor:'#E5E7EB' },
  headerMeta: { margin:0, fontSize:11, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 },
  headerPageName:{ margin:0, fontSize:15, color:'#092A5E', fontWeight:700 },
  backBtn:    { padding:'8px 18px', backgroundColor:'white', color:'#092A5E', border:'2px solid #092A5E', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  logoutBtn:  { padding:'8px 20px', backgroundColor:'#D40E14', color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  addBtn:     { padding:'11px 22px', backgroundColor:'#70CBF4', color:'white', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer' },
  refreshBtn: { padding:'11px 16px', border:'2px solid #092A5E', borderRadius:12, fontSize:13, fontWeight:700, color:'#092A5E', cursor:'pointer', backgroundColor:'white' },
  msgSuccess: { padding:'12px 16px', backgroundColor:'#F0FDF4', borderLeft:'4px solid #16A34A', borderRadius:10, fontSize:13, color:'#15803D', marginBottom:16 },
  msgError:   { padding:'12px 16px', backgroundColor:'#FEF2F2', borderLeft:'4px solid #D40E14', borderRadius:10, fontSize:13, color:'#D40E14', marginBottom:16 },
  tableWrap:  { backgroundColor:'white', borderRadius:20, boxShadow:'0 2px 12px rgba(0,0,0,0.07)', overflow:'hidden' },
  table:      { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:         { padding:'14px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.06em', backgroundColor:'#092A5E', whiteSpace:'nowrap' },
  td:         { padding:'12px 16px', color:'#374151', whiteSpace:'nowrap', borderBottom:'1px solid #F3F4F6' },
  tdEmpty:    { padding:'48px 16px', textAlign:'center', color:'#9CA3AF', fontSize:14 },
  badge:      { padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 },
  editBtn:    { padding:'6px 14px', backgroundColor:'#70CBF4', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  toggleBtn:  { padding:'6px 14px', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  deleteBtn:  { padding:'6px 14px', backgroundColor:'#D40E14', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' },
  overlay:    { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:50 },
  modal:      { backgroundColor:'white', borderRadius:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', width:'100%', maxWidth:480 },
  modalHeader:{ padding:'24px 32px', backgroundColor:'#092A5E', borderRadius:'24px 24px 0 0' },
  modalTitle: { margin:0, fontSize:18, fontWeight:800, color:'white' },
  modalBody:  { padding:'28px 32px' },
  cancelBtn:  { flex:1, padding:'13px', border:'2px solid #092A5E', borderRadius:12, fontSize:14, fontWeight:700, color:'#092A5E', cursor:'pointer', backgroundColor:'white' },
  submitBtn:  { flex:1, padding:'13px', border:'none', borderRadius:12, fontSize:14, fontWeight:700, color:'white', cursor:'pointer', backgroundColor:'#70CBF4' },
};

export default UserManagement;