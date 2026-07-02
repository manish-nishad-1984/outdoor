import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Palette } from 'lucide-react';
import api from '../../api/axios';

export default function DesignJobs() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/design-jobs', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete design job?')) return;
    await api.delete(`/design-jobs/${id}`); load();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `â‚¹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Design Jobs</h1>
          <p className="page-subtitle">{total} total jobs</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by couple name..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loadingâ€¦</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>DATE</th><th>EMPLOYEE</th><th>ITEMS</th><th>SUBTOTAL</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={5} className="table-empty"><Palette size={32}/><p>No design jobs found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td>{r.employee_name||'-'}</td>
                      <td><span className="badge badge-gray">{r.item_count} items</span></td>
                      <td>{cur(r.subtotal)}</td>
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
