import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_BADGE = {
  pending:     'badge-red',
  confirmed:   'badge-blue',
  in_progress: 'badge-orange',
  delivered:   'badge-green',
};

export default function OutdoorOrders() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = () => {
    setLoading(true);
    api.get('/outdoor-orders', { params: { page, limit, search, status } })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);

  const del = async id => {
    if (!confirm('Delete this order?')) return;
    await api.delete(`/outdoor-orders/${id}`);
    load();
  };

  const pages = Math.ceil(total / limit);

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon orange">📸</div><div><div className="stat-label">Total Orders</div><div className="stat-value">{total}</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">⏳</div><div><div className="stat-label">In Progress</div><div className="stat-value">{data.filter(d => d.status === 'in_progress').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-label">Delivered</div><div className="stat-value">{data.filter(d => d.status === 'delivered').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">💰</div><div><div className="stat-label">Pending Amt</div><div className="stat-value">₹{data.reduce((s,d) => s + (Number(d.amount) - Number(d.amount_received||0)), 0).toLocaleString('en-IN')}</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Outdoor Orders</div>
          <Link to="/outdoor-orders/new" className="btn btn-primary">＋ New Order</Link>
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <span>🔍</span>
              <input placeholder="Search by client, order no…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-outline">⬇ Export</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="loading">Loading…</div> : (
            <table>
              <thead>
                <tr>
                  <th>Order #</th><th>Client</th><th>Event</th><th>Photographer</th>
                  <th>Date</th><th>Amount</th><th>Received</th><th>Pending</th>
                  <th>Workflow</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No orders found</td></tr>
                )}
                {data.map(o => {
                  const received = Number(o.amount_received || 0);
                  const pending = Number(o.amount || 0) - received;
                  return (
                    <tr key={o.id}>
                      <td><Link to={`/outdoor-orders/${o.id}`} style={{ color: '#3b82f6', fontWeight: 700 }}>{o.order_no}</Link></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar av-orange">{o.party_name?.slice(0,2).toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{o.party_name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.party_mobile}</div>
                          </div>
                        </div>
                      </td>
                      <td>{o.event_type}</td>
                      <td>{o.photographer_name || '—'}</td>
                      <td>{o.event_date ? new Date(o.event_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(o.amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#22c55e', fontWeight: 600 }}>₹{received.toLocaleString('en-IN')}</td>
                      <td style={{ color: pending > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>₹{pending.toLocaleString('en-IN')}</td>
                      <td>
                        <div className="workflow">
                          <span className={`wf-step ${o.data_received ? 'done' : 'pending'}`}>{o.data_received ? '✓' : ''} Data</span>
                          <span className={`wf-step ${o.selection_done ? 'done' : 'pending'}`}>{o.selection_done ? '✓' : ''} Sel</span>
                          <span className={`wf-step ${o.design_done ? 'done' : 'pending'}`}>{o.design_done ? '✓' : ''} Design</span>
                          <span className={`wf-step ${o.print_done ? 'done' : 'pending'}`}>{o.print_done ? '✓' : ''} Print</span>
                          <span className={`wf-step ${o.dvd_done ? 'done' : 'pending'}`}>{o.dvd_done ? '✓' : ''} DVD</span>
                        </div>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-blue'}`}><span className="badge-dot" />  {o.status?.replace('_', ' ')}</span></td>
                      <td>
                        <div className="action-btns">
                          <Link to={`/outdoor-orders/${o.id}`} className="btn btn-outline btn-sm btn-icon">✏️</Link>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => del(o.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="pagination">
          <div className="pagination-info">Showing {Math.min((page-1)*limit+1, total)}–{Math.min(page*limit, total)} of {total}</div>
          <div className="pagination-btns">
            <div className={`page-btn${page===1?' active':''}`} onClick={() => setPage(1)}>‹</div>
            {Array.from({length: Math.min(pages,5)}, (_,i) => i+1).map(p => (
              <div key={p} className={`page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>{p}</div>
            ))}
            <div className="page-btn" onClick={() => setPage(Math.min(page+1,pages))}>›</div>
          </div>
        </div>
      </div>
    </div>
  );
}
