import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Sun, Moon, Monitor, Search, ChevronDown, User, LogOut, Sparkles } from 'lucide-react';
import Sidebar, { NAV } from './Sidebar';
import LayoutSF from './sf/LayoutSF';
import { readShellPref } from './sf/shellPref';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

const titles = {
  '/': 'Dashboard',
  '/outdoor-orders': 'Outdoor Orders',
  '/quotations': 'Quotations',
  '/bookings': 'Bookings',
  '/calendar': 'Shoot Calendar',
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

// Flatten the sidebar nav tree into a searchable list of { label, to, icon }
const SEARCH_INDEX = NAV.flatMap(item =>
  item.children ? item.children.map(c => ({ ...c, group: item.label })) : [{ ...item, group: null }]
);

// path -> parent nav group label, for the topbar breadcrumb trail
const GROUP_BY_PATH = Object.fromEntries(
  SEARCH_INDEX.filter(i => i.group).map(i => [i.to, i.group])
);

function ModuleSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter(i => i.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const goTo = (to) => {
    navigate(to);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="topbar-search" ref={boxRef}>
      <Search size={15} className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search modules..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) goTo(results[0].to); }}
      />
      <kbd className="kbd-hint">Ctrl K</kbd>
      {open && results.length > 0 && (
        <div className="topbar-search-results">
          {results.map(r => (
            <button key={r.to} type="button" className="topbar-search-result" onClick={() => goTo(r.to)}>
              <r.icon size={14} className="nav-icon" />
              <span>{r.label}</span>
              {r.group && <span className="topbar-search-result-group">{r.group}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="topbar-profile" ref={ref}>
      <button type="button" className="topbar-profile-btn" onClick={() => setOpen(o => !o)}>
        <div className="topbar-profile-avatar">{(user?.username || 'A')[0].toUpperCase()}</div>
        <div className="topbar-profile-text">
          <div className="topbar-profile-name">{user?.username || 'Admin'}</div>
          <div className="topbar-profile-role">{user?.role === 'admin' ? 'Administrator' : user?.role || 'User'}</div>
        </div>
        <ChevronDown size={14} className={`topbar-profile-chevron${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="topbar-profile-menu">
          <NavLink to="/settings" className="topbar-profile-menu-item" onClick={() => setOpen(false)}>
            <User size={14} /> Profile
          </NavLink>
          <button type="button" className="topbar-profile-menu-item danger" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = titles[base] || 'OutdoorStudio';
  const group = GROUP_BY_PATH[base];
  const { preference, cycleTheme } = useTheme();
  const ThemeIcon = THEME_ICON[preference];
  const navigate = useNavigate();
  const themeTitle = `Theme: ${THEME_LABEL[preference]} (click to change)`;

  // Salesforce-style shell preview — opt in with ?ui=new, back with ?ui=classic.
  if (readShellPref(location.search) === 'new') {
    return (
      <LayoutSF
        search={<ModuleSearch />}
        profile={<ProfileMenu />}
        themeIcon={ThemeIcon}
        themeTitle={themeTitle}
        onTheme={cycleTheme}
      />
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            {group && <div className="breadcrumb">{group} / {title}</div>}
            <div className="page-title">{title}</div>
          </div>
          <ModuleSearch />
          <div className="topbar-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => navigate(location.pathname + '?ui=new')}
              title="Try the new look (preview)"
            >
              <Sparkles size={16} />
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={cycleTheme}
              title={themeTitle}
            >
              <ThemeIcon size={16} />
            </button>
            <ProfileMenu />
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
