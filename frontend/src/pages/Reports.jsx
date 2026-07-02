import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Reports() {
  const [from, setFrom] = useState(new Date().toISOString().slice(0,7) + '-01');
  const [to,   setTo]   = useState(new Date().toISOString().slice(0,10));
  const [pl, setPl] = useState(null);

  const loadPL = () => {
    api.get('/reports/pl', { params: { from, to } }).then(r => setPl(r.data));
  };

  useEffect(() => { loadPL(); }, []);

  const reportTypes = [
    { icon: '📊', title: 'Sales Report',        sub: 'Revenue, Invoices, Outstanding' },
    { icon: '📸', title: 'Order-wise Report',    sub: 'Outdoor & Studio orders detail' },
    { icon: '👥', title: 'Photographer Report',  sub: 'Performance by photographer' },
    { icon: '💰', title: 'Cash / Bank Book',     sub: 'Day-wise cash & bank entries' },
    { icon: '📋', title: 'Party Ledger',         sub: 'Client & vendor outstanding' },
    { icon: '📈', title: 'P&L Statement',        sub: 'Profit & Loss for period' },
    { icon: '🏦', title: 'Trial Balance',        sub: 'All accounts balance sheet' },
    { icon: '🛒', title: 'Purchase Report',      sub: 'Vendor-wise, category-wise' },
    { icon: '👤', title: 'Attendance Report',    sub: 'Staff attendance summary' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {reportTypes.map(r => (
          <div key={r.title} className="card" style={{ cursor: 'pointer' }}>
            <div className="card-body" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{r.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{r.sub}</div>
              <button className="btn btn-primary" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>Generate</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📈 P&L Summary</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" className="filter-select" value={from} onChange={e => setFrom(e.target.value)} />
            <input type="date" className="filter-select" value={to}   onChange={e => setTo(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={loadPL}>Apply</button>
          </div>
        </div>
        {pl && (
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12, color: '#166534' }}>INCOME</div>
                <div className="summary-box">
                  <div className="summary-row"><span>Total Sales</span><span style={{ color: '#22c55e' }}>₹{Number(pl.income).toLocaleString('en-IN')}</span></div>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12, color: '#991b1b' }}>EXPENDITURE</div>
                <div className="summary-box">
                  <div className="summary-row"><span>Total Purchases</span><span style={{ color: '#ef4444' }}>₹{Number(pl.expenses).toLocaleString('en-IN')}</span></div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>Net Profit</div>
                <div style={{ fontSize: 12, color: '#22c55e' }}>Selected period</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>₹{Number(pl.profit).toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
