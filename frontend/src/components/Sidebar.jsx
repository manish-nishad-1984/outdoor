import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Camera, Building2, FileText, CalendarCheck,
  ShoppingCart, Package, Receipt, CreditCard, BookOpen,
  Palette, Printer, Truck, Users, Clock, Wallet,
  BarChart2, Settings, LogOut, ChevronDown, ChevronRight
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, exact: true },
  {
    label: 'Orders', icon: Camera,
    children: [
      { to: '/outdoor-orders', label: 'Outdoor Orders', icon: Camera },
      { to: '/studio-orders',  label: 'Studio Orders',  icon: Building2 },
      { to: '/quotations',     label: 'Quotations',     icon: FileText },
      { to: '/bookings',       label: 'Bookings',       icon: CalendarCheck },
    ]
  },
  {
    label: 'Sales & Finance', icon: ShoppingCart,
    children: [
      { to: '/sales',     label: 'Sales / Invoices', icon: ShoppingCart },
      { to: '/purchases', label: 'Purchases',         icon: Package },
      { to: '/receipts',  label: 'Receipts',          icon: Receipt },
      { to: '/payments',  label: 'Payments',          icon: CreditCard },
      { to: '/outdoor-payments', label: 'Outdoor Party Payment', icon: CreditCard },
      { to: '/accounts',  label: 'Accounts',          icon: BookOpen },
    ]
  },
  {
    label: 'Work', icon: Palette,
    children: [
      { to: '/design-jobs', label: 'Design Jobs',      icon: Palette },
      { to: '/exposing',    label: 'Exposing / Print', icon: Printer },
      { to: '/hire-orders', label: 'Hire Orders',      icon: Truck },
    ]
  },
  {
    label: 'HR', icon: Users,
    children: [
      { to: '/employees',  label: 'Employees',  icon: Users },
      { to: '/attendance', label: 'Attendance', icon: Clock },
      { to: '/payroll',    label: 'Payroll',    icon: Wallet },
    ]
  },
  {
    label: 'Masters', icon: Package,
    children: [
      { to: '/items', label: 'Item Master', icon: Package },
      { to: '/events', label: 'Event Master', icon: CalendarCheck },
      { to: '/accounts', label: 'Account Master', icon: BookOpen },
    ]
  },
  { label: 'Reports',  to: '/reports',  icon: BarChart2 },
  { label: 'Settings', to: '/settings', icon: Settings },
];

function isGroupActive(group, pathname) {
  return group.children?.some(c => pathname === c.to || pathname.startsWith(c.to + '/'));
}

function Group({ group, defaultOpen }) {
  const location = useLocation();
  const active = isGroupActive(group, location.pathname);
  const [open, setOpen] = useState(defaultOpen || active);

  return (
    <div className="nav-group">
      <button
        className={`nav-group-toggle${active ? ' group-active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="nav-group-left">
          <group.icon size={16} strokeWidth={1.75} className="nav-icon" />
          <span className="nav-group-label">{group.label}</span>
        </span>
        <span className={`nav-chevron${open ? ' open' : ''}`}>
          <ChevronDown size={14} />
        </span>
      </button>
      {open && (
        <div className="nav-children">
          {group.children.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-child${isActive ? ' active' : ''}`}
            >
              <span className="nav-child-dot" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-main">OutdoorStudio</span>
            <span className="logo-sub">Management System</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((item, i) =>
          item.children ? (
            <Group key={i} group={item} defaultOpen={isGroupActive(item, location.pathname)} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} strokeWidth={1.75} className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          )
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{(user?.username||'A')[0].toUpperCase()}</div>
            <div>
              <div className="sidebar-user-name">{user?.username || 'Admin'}</div>
              <div className="sidebar-user-role">{user?.role === 'admin' ? 'Administrator' : user?.role || 'User'}</div>
            </div>
          </div>
        )}
        <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={15} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
