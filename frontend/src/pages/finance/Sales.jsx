import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function Sales() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/sales', { params: { search } })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon green">💰</div><div><div className="stat-label">Total Sales</div><div className="stat-value">{total}</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">✅</div><div><div className="stat-label">Received</div><div className="stat-value">₹{data.reduce((s,d)=>s+Number(d.amount_received||0),0).toLocaleString('en-IN')}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div><div className="stat-label">Pending</div><div className="stat-value">₹{data.reduce((s,d)=>s+Math.max(0,Number(d.net_amount||0)-Number(d.amount_received||0)),0).toLocaleString('en-IN')}</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">🧾</div><div><div className="stat-label">Invoices</div><div className="stat-value">{total}</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Sales Invoices</div>
          <Link to="/sales/new" className="btn btn-primary">＋ New Sale</Link>
        </div>
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-box"><span>🔍</span><input placeholder="Search invoice, client…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <div className="toolbar-right"><button className="btn btn-outline">⬇ Export</button></div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Loading…</div> : (
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Gross</th><th>Discount</th><th>Net Total</th><th>Received</th><th>Pending</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {data.map(s => {
                  const received = Number(s.amount_received || 0);
                  const pending = Number(s.net_amount || 0) - received;
                  const status = pending <= 0 ? { cls: 'badge-green', label: 'Paid' } : received > 0 ? { cls: 'badge-orange', label: 'Partial' } : { cls: 'badge-red', label: 'Due' };
                  return (
                    <tr key={s.id}>
                      <td><Link to={`/sales/${s.id}`} style={{ color: '#3b82f6', fontWeight: 700 }}>{s.invoice_no}</Link></td>
                      <td>{s.party_name}</td>
                      <td>{s.sale_date ? new Date(s.sale_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td>₹{Number(s.gross_amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#ef4444' }}>₹{Number(s.discount||0).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>₹{Number(s.net_amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{received.toLocaleString('en-IN')}</td>
                      <td style={{ color: pending > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>₹{pending.toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${status.cls}`}><span className="badge-dot" />{status.label}</span></td>
                      <td><div className="action-btns"><Link to={`/sales/${s.id}`} className="btn btn-outline btn-sm btn-icon">✏️</Link><button className="btn btn-outline btn-sm btn-icon">🖨</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination">
          <div className="pagination-info">Total: {total} invoices</div>
        </div>
      </div>
    </div>
  );
}
