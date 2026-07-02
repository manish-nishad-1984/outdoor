import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';

const chartData = [
  { month: 'Jan', revenue: 38000 }, { month: 'Feb', revenue: 42000 },
  { month: 'Mar', revenue: 51000 }, { month: 'Apr', revenue: 46000 },
  { month: 'May', revenue: 58000 }, { month: 'Jun', revenue: 72000 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange">📸</div>
          <div>
            <div className="stat-label">Monthly Orders</div>
            <div className="stat-value">{stats?.orders?.total ?? '—'}</div>
            <div className="stat-sub">This month</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div>
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-value">₹{stats ? Number(stats.monthly_sales).toLocaleString('en-IN') : '—'}</div>
            <div className="stat-sub">Sales invoiced</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">✅</div>
          <div>
            <div className="stat-label">Collected</div>
            <div className="stat-value">₹{stats ? Number(stats.monthly_receipts).toLocaleString('en-IN') : '—'}</div>
            <div className="stat-sub">Receipts this month</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⏳</div>
          <div>
            <div className="stat-label">Pending Amount</div>
            <div className="stat-value">₹{stats ? Number(stats.pending_amount).toLocaleString('en-IN') : '—'}</div>
            <div className="stat-sub down">Outstanding</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Monthly Revenue</div>
            <span className="badge badge-green">2026</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#f97316" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">⚡ Quick Actions</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/outdoor-orders/new" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>📸 New Outdoor Order</Link>
              <Link to="/sales/new"          className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>🧾 New Sales Invoice</Link>
              <Link to="/receipts"           className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>💰 Add Receipt</Link>
              <Link to="/quotations/new"     className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>📋 New Quotation</Link>
              <Link to="/reports"            className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>📊 View Reports</Link>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">📊 Order Status</div></div>
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
