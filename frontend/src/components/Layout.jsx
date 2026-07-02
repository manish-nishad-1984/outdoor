import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

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
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = titles[base] || 'OutdoorStudio';

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">{title}</div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
