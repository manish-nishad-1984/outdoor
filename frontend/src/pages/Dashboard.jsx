import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera, Wallet, Zap, PieChart, Receipt, FileText, BarChart2, UserX, CheckCircle2, MapPin, Clock,
} from 'lucide-react';
import api from '../api/axios';
import './dashboard.css';

const fmtDay = d => {
  if (!d) return { day: '—', mon: '' };
  const dt = new Date(d);
  return { day: dt.getDate(), mon: dt.toLocaleString('en-IN', { month: 'short' }) };
};
// Days-left label for a function date and its urgency colour class.
const whenLabel = n => {
  if (n == null) return { text: 'No date', cls: 'muted' };
  if (n === 0) return { text: 'Today', cls: 'urgent' };
  if (n === 1) return { text: 'Tomorrow', cls: 'urgent' };
  if (n > 1) return { text: `In ${n} days`, cls: n <= 7 ? 'soon' : 'later' };
  return { text: `${-n} day${n === -1 ? '' : 's'} ago`, cls: 'past' };
};

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [unassigned, setUnassigned] = useState(null);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setStats(r.data)).catch(() => {});
    api.get('/reports/unassigned-staff').then(r => setUnassigned(r.data || [])).catch(() => setUnassigned([]));
  }, []);

  const upcoming = (unassigned || []).filter(u => u.days_left == null || u.days_left >= 0);
  const past = (unassigned || []).filter(u => u.days_left != null && u.days_left < 0);

  const staffRow = u => {
    const { day, mon } = fmtDay(u.function_date);
    const when = whenLabel(u.days_left == null ? null : Number(u.days_left));
    return (
      <button type="button" key={u.id} className={`dash-staff-row ${when.cls}`} onClick={() => nav(`/outdoor-orders/${u.order_id}`)}
        title="Open the order to assign a photographer / staff">
        <span className="dash-date"><b>{day}</b><small>{mon}</small></span>
        <span className="dash-staff-main">
          <span className="dash-staff-title">{u.item_name}{u.event_name && <em> · {u.event_name}</em>}</span>
          <span className="dash-staff-sub">
            <span>#{u.order_no} · {u.client_name}{u.mobile ? ` · ${u.mobile}` : ''}</span>
            {u.place && <span><MapPin size={12} /> {u.place}</span>}
            {u.time_slot && <span><Clock size={12} /> {u.time_slot}</span>}
          </span>
        </span>
        <span className={`dash-when ${when.cls}`}>{when.text}</span>
      </button>
    );
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Monthly Orders</div>
          <div className="stat-value numeric">{stats?.orders?.total ?? '—'}</div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-value numeric">₹{stats ? Number(stats.monthly_sales).toLocaleString('en-IN') : '—'}</div>
          <div className="stat-sub">Sales invoiced</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collected</div>
          <div className="stat-value numeric">₹{stats ? Number(stats.monthly_receipts).toLocaleString('en-IN') : '—'}</div>
          <div className="stat-sub">Receipts this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Amount</div>
          <div className="stat-value numeric">₹{stats ? Number(stats.pending_amount).toLocaleString('en-IN') : '—'}</div>
          <div className="stat-sub down">Outstanding</div>
        </div>
      </div>

      <div className="dash-grid">
        {/* Order items whose Item Master entry is "Staff Required" but no photographer / operator is set */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><UserX size={16} strokeWidth={2} /> Photographer / Staff Not Assigned</div>
            {unassigned?.length > 0 && <span className="badge badge-red">{unassigned.length}</span>}
          </div>
          <div className="dash-staff">
            {unassigned === null && <p className="dash-staff-empty">Loading…</p>}
            {unassigned?.length === 0 && (
              <p className="dash-staff-empty ok"><CheckCircle2 size={30} /> Every shoot that needs staff has someone assigned.</p>
            )}
            {upcoming.length > 0 && <>
              <div className="dash-staff-group">Upcoming functions · {upcoming.length}</div>
              {upcoming.map(staffRow)}
            </>}
            {past.length > 0 && <>
              <div className="dash-staff-group">Date passed, still not assigned · {past.length}</div>
              {past.map(staffRow)}
            </>}
          </div>
          {unassigned?.length > 0 && (
            <p className="dash-staff-note">Items marked “Staff Required” in Item Master. Click a row to open the order and assign an operator.</p>
          )}
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title"><Zap size={16} strokeWidth={2} /> Quick Actions</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/outdoor-orders/new" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}><Camera size={15} /> New Outdoor Order</Link>
              <Link to="/sales/new"          className="btn btn-outline" style={{ justifyContent: 'flex-start' }}><Receipt size={15} /> New Sales Invoice</Link>
              <Link to="/receipts"           className="btn btn-outline" style={{ justifyContent: 'flex-start' }}><Wallet size={15} /> Add Receipt</Link>
              <Link to="/quotations/new"     className="btn btn-outline" style={{ justifyContent: 'flex-start' }}><FileText size={15} /> New Quotation</Link>
              <Link to="/reports"            className="btn btn-outline" style={{ justifyContent: 'flex-start' }}><BarChart2 size={15} /> View Reports</Link>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><PieChart size={16} strokeWidth={2} /> Order Status</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'In Progress', value: stats?.orders?.in_progress ?? 0, color: '#f97316', pct: 45 },
                { label: 'Delivered',   value: stats?.orders?.delivered ?? 0,   color: '#22c55e', pct: 75 },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{item.value}</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${item.pct}%`, background: item.color, borderRadius: 4, height: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
