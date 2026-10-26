import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Camera, FileText, CalendarCheck, CalendarDays,
  ShoppingCart, Package, Receipt, CreditCard, BookOpen,
  Palette, Printer, Truck, Users, Clock, Wallet, UserPlus, ShieldCheck,
  BarChart2, Settings, LogOut, ChevronDown, ChevronRight, Layers, ListChecks, MessageCircle, Percent
} from 'lucide-react';

// Group order/labels follow the legacy MainForm menu bar
// (Master Setup, Outdoor, Transaction, Xpozing, Utility, Report) rather than a
// re-invented IA — see legacy/docs/03-MIGRATION-MAP.md. Pages with no legacy menu
// slot at all (Bookings, Sales, HR, Design Jobs, Hire Orders) are
// folded into whichever legacy section is the closest conceptual fit.
export const NAV = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, exact: true },
  {
    label: 'Master Setup', icon: Package,
    children: [
      { to: '/items',             label: 'Item Master',          icon: Package },
      { to: '/events',            label: 'Event Master',         icon: CalendarCheck },
      { to: '/accounts',          label: 'Account Master',       icon: BookOpen },
      { to: '/account-groups',    label: 'Account Group',        icon: Layers },
      { to: '/deliverable-items', label: 'Post Production Item', icon: ListChecks },
    ]
  },
  {
    label: 'Outdoor', icon: Camera,
    children: [
      { to: '/quotations',       label: 'Quotation',              icon: FileText },
      { to: '/outdoor-orders',   label: 'Order / Bill',           icon: Camera },
      { to: '/bookings',         label: 'Bookings',               icon: CalendarCheck },
      { to: '/calendar',         label: 'Calendar',               icon: CalendarDays },
      { to: '/outdoor-payments', label: 'Outdoor Party Payment',  icon: CreditCard },
      { to: '/receipts',         label: 'Receipt',                icon: Receipt },
    ]
  },
  {
    label: 'Transaction', icon: ShoppingCart,
    children: [
      { to: '/purchases', label: 'Purchase',      icon: Package },
      { to: '/payments',  label: 'Party Payment',  icon: CreditCard },
      { to: '/sales',     label: 'Sale',           icon: ShoppingCart },
    ]
  },
  {
    label: 'Xpozing', icon: Palette,
    children: [
      { to: '/exposing',    label: 'Exposing / Print', icon: Printer },
      { to: '/design-jobs', label: 'Design Jobs',      icon: Palette },
      { to: '/hire-orders', label: 'Hire Orders',      icon: Truck },
    ]
  },
  {
    label: 'Utility', icon: Settings,
    children: [
      { to: '/print-settings', label: 'Print Settings', icon: Printer },
      { to: '/whatsapp-setting', label: 'WhatsApp Setting', icon: MessageCircle },
      { to: '/gst-settings', label: 'GST Settings', icon: Percent },
      { to: '/user-creation',  label: 'User Creation',  icon: UserPlus },
      { to: '/user-permission', label: 'User Permission', icon: ShieldCheck },
      { to: '/employees',  label: 'Employees',  icon: Users },
      { to: '/attendance', label: 'Attendance', icon: Clock },
      { to: '/payroll',    label: 'Payroll',    icon: Wallet },
      { to: '/settings',   label: 'Settings',   icon: Settings },
    ]
  },
  { label: 'Report', to: '/reports', icon: BarChart2 },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
          <div className="bg-primary text-primary-foreground" style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Camera size={16} strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-main">OutdoorStudio</span>
              <span className="logo-sub">Management System</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>
      {collapsed && (
        <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)} title="Expand"
          style={{ margin: '8px auto 4px', display: 'flex' }}>
          <ChevronRight size={14} style={{ transform: 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>
      )}

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
