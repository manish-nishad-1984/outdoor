import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, FileText } from 'lucide-react';
import api from '../../api/axios';

export default function Quotations() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/quotations', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!confirm('Delete quotation?')) return;
    await api.delete(`/quotations/${id}`); load();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `â‚¹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{total} total quotations</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input placeholder="Search by order no, company..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loadingâ€¦</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>ORDER NO</th><th>PARTY</th><th>EVENT TYPE</th><th>DATE</th>
                  <th>GROSS AMT</th><th>ADVANCE</th><th>PENDING</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} className="table-empty"><FileText size={32}/><p>No quotations found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.order_no}</span></td>
                      <td>{r.party_name}</td>
                      <td>{r.event_type||'-'}</td>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td>{cur(r.gross_total)}</td>
                      <td>{cur(r.advance)}</td>
                      <td className={r.total_pending > 0 ? 'text-danger' : ''}>{cur(r.total_pending)}</td>
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
