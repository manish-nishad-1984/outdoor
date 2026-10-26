import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Camera, FileText, Receipt, ShoppingCart, Wallet, LayoutPanelLeft } from 'lucide-react';
import { NAV } from '../Sidebar';
import './sf.css';

// Salesforce Lightning-style shell (preview): navy icon rail of modules on the left, white
// header, the active module's pages as tabs, and a utility bar at the bottom. It reuses the v1
// NAV config and renders the same v1 pages through <Outlet/>, so every page works unchanged.

const SHORT = {
  Dashboard: 'Home', 'Master Setup': 'Masters', Outdoor: 'Outdoor', Transaction: 'Transaction',
  Xpozing: 'Xpozing', Utility: 'Utility', Report: 'Reports',
};

const matches = (pathname, to) => pathname === to || pathname.startsWith(to + '/');

function moduleFor(pathname) {
  return NAV.find(m => m.children
    ? m.children.some(c => matches(pathname, c.to))
    : (m.exact ? pathname === m.to : matches(pathname, m.to))) || NAV[0];
}

const UTILITIES = [
  { to: '/quotations/new',     label: 'New Quotation', icon: FileText },
  { to: '/outdoor-orders/new', label: 'New Order',     icon: Camera },
  { to: '/sales/new',          label: 'New Sale',      icon: ShoppingCart },
  { to: '/receipts',           label: 'Receipt',       icon: Wallet },
  { to: '/payments',           label: 'Party Payment', icon: Receipt },
];

export default function LayoutSF({ search, profile, themeIcon: ThemeIcon, themeTitle, onTheme }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = moduleFor(pathname);
  const tabs = active.children || [active];

  return (
    <div className="sf">
      <nav className="sf-rail" aria-label="Modules">
        {NAV.map(m => {
          const Icon = m.icon;
          const to = m.children ? m.children[0].to : m.to;
          return (
            <Link key={m.label} to={to} className={`sf-rail-item${m === active ? ' active' : ''}`} title={m.label}>
              <span className="sf-rail-ic"><Icon size={22} strokeWidth={1.9} /></span>
              <span className="lbl">{SHORT[m.label] || m.label}</span>
            </Link>
          );
        })}
      </nav>

      <header className="sf-head">
        <Link to="/" className="sf-logo">
          <span className="sf-logo-mark"><Camera size={15} strokeWidth={2.2} /></span>
          <span className="sf-logo-text">OutdoorStudio</span>
        </Link>
        <div className="sf-head-search">{search}</div>
        <div className="sf-head-right">
          <button type="button" className="sf-icon-btn" onClick={onTheme} title={themeTitle}><ThemeIcon size={18} /></button>
          {profile}
        </div>
      </header>

      <div className="sf-tabs">
        <span className="sf-app">{active.label === 'Dashboard' ? 'Home' : active.label}</span>
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.exact} className={({ isActive }) => `sf-tab${isActive ? ' active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <main className="sf-body">
        <Outlet />
      </main>

      <footer className="sf-foot">
        {UTILITIES.map(u => {
          const Icon = u.icon;
          return <Link key={u.to} to={u.to}><Icon size={14} /> {u.label}</Link>;
        })}
        <span className="spacer" />
        <button type="button" onClick={() => navigate(pathname + '?ui=classic')} title="Switch back to the current look">
          <LayoutPanelLeft size={14} /> Classic look
        </button>
      </footer>
    </div>
  );
}
