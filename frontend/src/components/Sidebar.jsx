import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Camera, Building2, FileText, CalendarCheck,
  ShoppingCart, Package, Receipt, CreditCard, BookOpen,
  Palette, Printer, Truck, Users, Clock, Wallet,
  BarChart2, Settings, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV = [
  { section: 'Main', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  ]},
  { section: 'Orders', items: [
    { to: '/outdoor-orders', label: 'Outdoor Orders', icon: Camera },
    { to: '/studio-orders',  label: 'Studio Orders',  icon: Building2 },
    { to: '/quotations',     label: 'Quotations',     icon: FileText },
    { to: '/bookings',       label: 'Bookings',       icon: CalendarCheck },
  ]},
  { section: 'Sales & Finance', items: [
    { to: '/sales',     label: 'Sales / Invoices', icon: ShoppingCart },
    { to: '/purchases', label: 'Purchases',         icon: Package },
    { to: '/receipts',  label: 'Receipts',          icon: Receipt },
    { to: '/payments',  label: 'Payments',          icon: CreditCard },
    { to: '/accounts',  label: 'Accounts',          icon: BookOpen },
  ]},
  { section: 'Work', items: [
    { to: '/design-jobs', label: 'Design Jobs',      icon: Palette },
    { to: '/exposing',    label: 'Exposing / Print', icon: Printer },
    { to: '/hire-orders', label: 'Hire Orders',      icon: Truck },
  ]},
  { section: 'HR', items: [
    { to: '/employees',  label: 'Employees',  icon: Users },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/payroll',    label: 'Payroll',    icon: Wallet },
  ]},
  { section: 'Reports & Settings', items: [
    { to: '/reports',  label: 'Reports',  icon: BarChart2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        {!collapsed && (
          <div className="logo-text">
            OutdoorStudio
            <span>Management System</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={15} className="nav-icon" strokeWidth={1.75} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user?.username || 'Admin'}</div>
            <div className="sidebar-user-role">{user?.role || 'Administrator'}</div>
          </div>
        )}
        <div className="sidebar-actions">
          <button className="sidebar-action-btn" title="Logout" onClick={handleLogout}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
