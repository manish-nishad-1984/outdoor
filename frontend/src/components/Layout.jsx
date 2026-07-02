import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const titles = {
  '/': 'Dashboard',
  '/outdoor-orders': 'Outdoor Orders',
  '/studio-orders': 'Studio Orders',
  '/quotations': 'Quotations',
  '/bookings': 'Bookings',
  '/sales': 'Sales / Invoices',
  '/purchases': 'Purchases',
  '/receipts': 'Receipts',
  '/payments': 'Payments',
  '/accounts': 'Accounts',
  '/design-jobs': 'Design Jobs',
  '/exposing': 'Exposing / Print',
  '/hire-orders': 'Hire Orders',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/payroll': 'Payroll',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = titles[base] || 'OutdoorStudio';
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div className="page-title">{title}</div>
              <div className="breadcrumb">Home / {title}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-chip">
              <div className="user-avatar">{initials}</div>
              <div>
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
