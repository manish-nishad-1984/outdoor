import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Printer } from 'lucide-react';
import api from '../../api/axios';

export default function Exposing() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/exposing', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete exposing job?')) return;
    await api.delete(`/exposing/${id}`); load();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `â‚¹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exposing / Printing</h1>
          <p className="page-subtitle">{total} total jobs</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by party name, contact..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loadingâ€¦</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>PARTY NAME</th><th>CONTACT</th><th>DATE</th><th>SUBTOTAL</th><th>REMARK</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={6} className="table-empty"><Printer size={32}/><p>No exposing jobs found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td>{r.party_name}</td>
                      <td>{r.contact||'-'}</td>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td>{cur(r.subtotal)}</td>
                      <td>{r.remark||'-'}</td>
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
