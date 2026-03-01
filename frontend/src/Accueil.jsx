import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './components/Logo';

function Accueil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    setUser(JSON.parse(stored));
    setTimeout(() => setVisible(true), 80);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    const map = { leader: 'Team Leader', member: 'Team Member', manager: 'Manager' };
    return map[role] || role;
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'manager') return { backgroundColor: '#092A5E', color: 'white' };
    if (role === 'leader')  return { backgroundColor: '#70CBF4', color: 'white' };
    return { backgroundColor: '#E5E7EB', color: '#374151' };
  };

  const allCards = [
    {
      key: 'data', roles: ['member', 'leader', 'manager'],
      title: 'Data Management',
      description: 'Add, edit, and manage financial data across Revenue & Expenses, Assets & Liabilities, Cash Flow, Suppliers, and Customers.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
      route: '/data', color: '#70CBF4', lightBg: '#EBF7FE', label: 'Go to Data',
    },
    {
      key: 'users', roles: ['leader', 'manager'],
      title: 'Account Management',
      description: 'Create, activate, deactivate, and edit user accounts. Assign roles to control access across the platform.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      route: '/users', color: '#092A5E', lightBg: '#EEF1F7', label: 'Manage Accounts',
    },
    {
      key: 'dashboard', roles: ['leader', 'manager'],
      title: 'Dashboards',
      description: 'Consult interactive financial dashboards — Profitability, Balance Sheet, Liquidity Analysis, and DPO & DSO.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      route: '/dashboard', color: '#FEDB00', lightBg: '#FFFBEA', label: 'View Dashboards',
    },
    {
      key: 'access', roles: ['manager'],
      title: 'Dashboard Access Control',
      description: 'Grant or revoke dashboard visibility for team members. Control who sees what across all financial dashboards.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      route: '/access-control', color: '#D40E14', lightBg: '#FEF2F2', label: 'Manage Access',
    },
  ];

  const visibleCards = user ? allCards.filter(c => c.roles.includes(user.role)) : [];
  if (!user) return null;

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
              <p style={S.headerPageName}>Home</p>
            </div>
          </div>
          <div style={S.headerRight}>
            <span style={{ ...S.badge, ...getRoleBadgeStyle(user.role) }}>{getRoleLabel(user.role)}</span>
            <span style={S.emailText}>{user.email}</span>
            <button onClick={handleLogout} style={S.logoutBtn}>Logout</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ ...S.hero, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}>
        <div style={S.heroInner}>
          <div style={S.heroAccent} />
          <h1 style={S.heroHeading}>Hello, {user.email.split('@')[0]}</h1>
          <p style={S.heroSub}>Welcome to the TUI Financial Intelligence Platform. Select a module below to get started.</p>
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>

        {/* Stats strip */}
        <div style={S.statsRow}>
          {[
            { label: 'Your Role',         value: getRoleLabel(user.role) },
            { label: 'Available Modules', value: visibleCards.length },
            { label: 'Platform',          value: 'TGBST Finance' },
          ].map(stat => (
            <div key={stat.label} style={S.statCard}>
              <p style={S.statLabel}>{stat.label}</p>
              <p style={S.statValue}>{stat.value}</p>
            </div>
          ))}
        </div>

        <p style={S.sectionLabel}>Your Modules</p>

        <div style={S.cardsGrid}>
          {visibleCards.map((card, i) => (
            <NavCard key={card.key} card={card} delay={i * 80} visible={visible} onClick={() => navigate(card.route)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavCard({ card, delay, visible, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = card.color === '#FEDB00' ? '#5a4a00' : card.color;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'white', borderRadius: 20, padding: '28px 28px 24px', cursor: 'pointer',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.13)' : '0 2px 8px rgba(0,0,0,0.07)',
        border: `2px solid ${hovered ? card.color : 'transparent'}`,
        transition: 'all 0.22s ease',
        transform: visible ? (hovered ? 'translateY(-4px)' : 'translateY(0)') : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transitionDelay: visible ? `${delay}ms` : '0ms',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: card.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        {card.icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#092A5E', lineHeight: 1.3 }}>{card.title}</h3>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{card.description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{card.label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: card.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: hovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Style tokens (all pages import and reuse these conventions) ───────────────
const S = {
  // Layout
  page:         { minHeight: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'Arial, sans-serif' },
  body:         { maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' },
  // Header
  header:       { backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', padding: '0 24px' },
  headerInner:  { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 },
  headerLeft:   { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight:  { display: 'flex', alignItems: 'center', gap: 12 },
  divider:      { width: 1, height: 36, backgroundColor: '#E5E7EB' },
  headerMeta:   { margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 },
  headerPageName:{ margin: 0, fontSize: 15, color: '#092A5E', fontWeight: 700 },
  // Header elements
  badge:        { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  emailText:    { fontSize: 13, color: '#6B7280' },
  logoutBtn:    { padding: '8px 20px', backgroundColor: '#D40E14', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  backBtn:      { padding: '8px 18px', backgroundColor: 'white', color: '#092A5E', border: '2px solid #092A5E', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  // Hero
  hero:         { background: 'linear-gradient(135deg, #092A5E 0%, #0d3a7a 60%, #1a5298 100%)', padding: '52px 24px 44px', transition: 'opacity 0.5s, transform 0.5s' },
  heroInner:    { maxWidth: 1100, margin: '0 auto' },
  heroAccent:   { width: 48, height: 4, backgroundColor: '#D40E14', borderRadius: 2, marginBottom: 20 },
  heroHeading:  { margin: 0, fontSize: 34, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' },
  heroSub:      { margin: '10px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 520 },
  // Stats
  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 36 },
  statCard:     { backgroundColor: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  statLabel:    { margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 },
  statValue:    { margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#092A5E' },
  sectionLabel: { margin: '0 0 20px', fontSize: 13, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 },
  cardsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
};

export default Accueil;