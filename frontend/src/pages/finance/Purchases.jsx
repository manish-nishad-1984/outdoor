import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, ShoppingCart } from 'lucide-react';
import api from '../../api/axios';

export default function Purchases() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/purchases', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete purchase?')) return;
    await api.delete(`/purchases/${id}`); load();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">{total} total purchases</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input placeholder="Search by booking no..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>BOOKING NO</th><th>PARTY</th><th>DATE</th>
                  <th>GROSS TOTAL</th><th>DISCOUNT</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={6} className="table-empty"><ShoppingCart size={32}/><p>No purchases found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.booking_no}</span></td>
                      <td>{r.party_name||'-'}</td>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td>{cur(r.gross_total)}</td>
                      <td>{cur(r.discount_rs)}</td>
                      <td><button className="btn-danger-soft" onClick={() => del(r.id)}><Trash2 size={14}/></button></td>
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
