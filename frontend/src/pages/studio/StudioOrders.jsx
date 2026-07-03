import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Camera } from 'lucide-react';
import api from '../../api/axios';

export default function StudioOrders() {
  const nav = useNavigate();
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/studio-orders', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete this order?')) return;
    await api.delete(`/studio-orders/${id}`);
    load();
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = (n) => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Studio Orders</h1>
          <p className="page-subtitle">{total} total orders</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input placeholder="Search by customer, contact..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => nav('/studio-orders/new')}><Plus size={16} /> New Order</button>
          </div>

          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>ORDER NO</th><th>CUSTOMER</th><th>CONTACT</th>
                  <th>DATE</th><th>DELIVERY</th><th>AMOUNT</th><th>STATUS</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} className="table-empty"><Camera size={32} /><p>No studio orders found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.order_no}</span></td>
                      <td>{r.customer_name || '-'}</td>
                      <td>{r.customer_contact || '-'}</td>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td>{fmt(r.delivery_date)}</td>
                      <td>{cur(r.gross_total)}</td>
                      <td><span className={`badge ${r.status ? 'badge-green' : 'badge-yellow'}`}>{r.status ? 'Done' : 'Pending'}</span></td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => nav(`/studio-orders/${r.id}`)}><Pencil size={14} /></button>
                          <button className="btn-danger-soft" onClick={() => del(r.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 25 && (
            <div className="pagination">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <span>Page {page} of {Math.ceil(total/25)}</span>
              <button disabled={page>=Math.ceil(total/25)} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
