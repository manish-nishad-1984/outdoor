import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';

export default function OutdoorOrders() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = () => {
    setLoading(true);
    api.get('/outdoor-orders', { params: { page, limit, search } })
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);

  const del = async id => {
    if (!confirm('Delete this order?')) return;
    await api.delete(`/outdoor-orders/${id}`);
    load();
  };

  const pages = Math.ceil(total / limit);

  const totalAmt   = data.reduce((s, d) => s + Number(d.amount || 0), 0);
  const totalAdv   = data.reduce((s, d) => s + Number(d.advance || 0), 0);
  const totalPend  = data.reduce((s, d) => s + Number(d.total_pending || 0), 0);

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">₹{totalAmt.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Advance Received</div>
          <div className="stat-value">₹{totalAdv.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Amount</div>
          <div className="stat-value" style={{ color: totalPend > 0 ? '#dc2626' : '#16a34a' }}>
            ₹{totalPend.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <Search size={13} className="search-icon" />
              <input placeholder="Search by client, order no…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="toolbar-right">
            <Link to="/outdoor-orders/new" className="btn btn-primary">
              <Plus size={14} strokeWidth={2.5} /> New Order
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="loading">Loading…</div> : (
            <table>
              <thead>
                <tr>
                  <th>Order #</th><th>Client</th><th>Mobile</th><th>Event Type</th>
                  <th>Photographer</th><th>Date</th><th>Amount</th><th>Advance</th>
                  <th>Pending</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={10} className="empty-state">No orders found</td></tr>
                )}
                {data.map(o => {
                  const pending = Number(o.total_pending || 0);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/outdoor-orders/${o.id}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                          {o.order_no}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 500 }}>{o.party_name}</td>
                      <td style={{ color: '#6b7280' }}>{o.party_mobile || '—'}</td>
                      <td>
                        {o.event_type && <span className="badge badge-blue">{o.event_type}</span>}
                      </td>
                      <td style={{ color: '#374151' }}>{o.photographer_name || '—'}</td>
                      <td style={{ color: '#6b7280' }}>{o.event_date ? new Date(o.event_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(o.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#16a34a', fontWeight: 500 }}>₹{Number(o.advance || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: pending > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>₹{pending.toLocaleString('en-IN')}</td>
                      <td>
                        <div className="action-btns">
                          <Link to={`/outdoor-orders/${o.id}`} className="btn-edit" title="Edit">
                            <Pencil size={13} />
                          </Link>
                          <button className="btn-danger-soft" title="Delete" onClick={() => del(o.id)}>
                            <Trash2 size={13} />
                          </button>
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
          <div className="pagination-info">Showing {Math.min((page-1)*limit+1,total)}–{Math.min(page*limit,total)} of {total}</div>
          <div className="pagination-btns">
            <div className={`page-btn${page===1?' active':''}`} onClick={() => setPage(1)}>‹</div>
            {Array.from({length: Math.min(pages,5)},(_,i)=>i+1).map(p=>(
              <div key={p} className={`page-btn${page===p?' active':''}`} onClick={()=>setPage(p)}>{p}</div>
            ))}
            <div className="page-btn" onClick={()=>setPage(Math.min(page+1,pages))}>›</div>
          </div>
        </div>
      </div>
    </div>
  );
}
