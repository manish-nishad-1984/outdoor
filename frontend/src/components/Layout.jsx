import { Outlet, useLocation } from 'react-router-dom';
import { Sun, Moon, Monitor } from 'lucide-react';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

const titles = {
  '/': 'Dashboard',
  '/outdoor-orders': 'Outdoor Orders',
  '/studio-orders': 'Studio Orders',
  '/quotations': 'Quotations',
  '/bookings': 'Bookings',
  '/sales': 'Sales / Invoices',
  '/purchases': 'Purchases',
  '/receipts': 'Receipts',
  '/payments': 'Party Payment',
  '/accounts': 'Account Master',
  '/design-jobs': 'Design Jobs',
  '/exposing': 'Exposing / Print',
  '/hire-orders': 'Hire Orders',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/payroll': 'Payroll',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/items': 'Item Master',
  '/events': 'Event Master',
  '/account-groups': 'Account Group',
  '/deliverable-items': 'Post Production Item',
};

export default function Layout() {
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = titles[base] || 'OutdoorStudio';
  const { preference, cycleTheme } = useTheme();
  const ThemeIcon = THEME_ICON[preference];

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">{title}</div>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={cycleTheme}
              title={`Theme: ${THEME_LABEL[preference]} (click to change)`}
            >
              <ThemeIcon size={16} />
            </button>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
