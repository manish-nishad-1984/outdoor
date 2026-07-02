import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function Receipts() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/receipts', { params: { search } })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { load(); }, []);

  const MODE_BADGE = { Cash: 'badge-orange', UPI: 'badge-blue', Cheque: 'badge-purple', Card: 'badge-green' };

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon green">💰</div><div><div className="stat-label">Total Received</div><div className="stat-value">₹{data.reduce((s,d)=>s+Number(d.amount||0),0).toLocaleString('en-IN')}</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📱</div><div><div className="stat-label">UPI / Online</div><div className="stat-value">₹{data.filter(d=>d.payment_mode==='UPI').reduce((s,d)=>s+Number(d.amount),0).toLocaleString('en-IN')}</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">💵</div><div><div className="stat-label">Cash</div><div className="stat-value">₹{data.filter(d=>d.payment_mode==='Cash').reduce((s,d)=>s+Number(d.amount),0).toLocaleString('en-IN')}</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">🏦</div><div><div className="stat-label">Cheque</div><div className="stat-value">₹{data.filter(d=>d.payment_mode==='Cheque').reduce((s,d)=>s+Number(d.amount),0).toLocaleString('en-IN')}</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Receipt Vouchers</div>
          <button className="btn btn-primary">＋ New Receipt</button>
        </div>
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-box"><span>🔍</span><input placeholder="Search client, receipt no…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <div className="toolbar-right"><button className="btn btn-outline">⬇ Export</button></div>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Loading…</div> : (
            <table>
              <thead>
                <tr><th>Receipt #</th><th>Client</th><th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Action</th></tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: '#3b82f6' }}>{r.receipt_no}</td>
                    <td>{r.party_name}</td>
                    <td>{r.receipt_date ? new Date(r.receipt_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#22c55e' }}>₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td><span className={`badge ${MODE_BADGE[r.payment_mode] || 'badge-blue'}`}>{r.payment_mode}</span></td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{r.reference || '—'}</td>
                    <td><div className="action-btns"><button className="btn btn-outline btn-sm btn-icon">🖨</button><button className="btn btn-danger btn-sm btn-icon">🗑</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><div className="pagination-info">Total: {total} receipts</div></div>
      </div>
    </div>
  );
}
