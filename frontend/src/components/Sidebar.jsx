import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { section: 'Main' },
  { to: '/',                  icon: '🏠', label: 'Dashboard' },
  { section: 'Orders' },
  { to: '/outdoor-orders',    icon: '📸', label: 'Outdoor Orders',   badge: null },
  { to: '/studio-orders',     icon: '🎞', label: 'Studio Orders' },
  { to: '/quotations',        icon: '📋', label: 'Quotations' },
  { to: '/bookings',          icon: '📅', label: 'Bookings' },
  { section: 'Sales & Finance' },
  { to: '/sales',             icon: '🧾', label: 'Sales / Invoices' },
  { to: '/purchases',         icon: '🛒', label: 'Purchases' },
  { to: '/receipts',          icon: '💰', label: 'Receipts' },
  { to: '/payments',          icon: '💳', label: 'Payments' },
  { to: '/accounts',          icon: '🏦', label: 'Accounts' },
  { section: 'Work' },
  { to: '/design-jobs',       icon: '🎨', label: 'Design Jobs' },
  { to: '/exposing',          icon: '🖨', label: 'Exposing / Print' },
  { to: '/hire-orders',       icon: '🎬', label: 'Hire Orders' },
  { section: 'HR' },
  { to: '/employees',         icon: '👥', label: 'Employees' },
  { to: '/attendance',        icon: '✅', label: 'Attendance' },
  { to: '/payroll',           icon: '💵', label: 'Payroll' },
  { section: 'Reports & Settings' },
  { to: '/reports',           icon: '📊', label: 'Reports' },
  { to: '/settings',          icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">📷</div>
        <div className="logo-text">OutdoorStudio <span>Management System</span></div>
      </div>

      <nav style={{ flex: 1 }}>
        {nav.map((item, i) =>
          item.section ? (
            <div key={i} className="nav-section">{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          )
        )}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          Logged in as <strong style={{ color: '#fff' }}>{user?.name}</strong>
        </div>
        <button className="btn btn-outline btn-sm" style={{ width: '100%', color: '#ef4444', borderColor: '#334155' }} onClick={logout}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
