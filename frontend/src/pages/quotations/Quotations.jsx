import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, FileText, Plus, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';

export default function Quotations() {
  const nav = useNavigate();
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

  const del = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete quotation?')) return;
    await api.delete(`/quotations/${id}`); load();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';
  const lastPage = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by quo no, client, couple, contact..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <span className="text-[12.5px] text-slate-500">{total} total</span>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[.98]"
            onClick={() => nav('/quotations/new')}
          >
            <Plus size={16}/> New Quotation
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[13px] text-slate-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Quo No</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Couple</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <FileText size={30} className="mx-auto mb-2 text-slate-300" />
                      <p>No quotations found</p>
                    </td>
                  </tr>
                )}
                {rows.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => nav(`/quotations/${r.id}`)}
                    className="group cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11.5px] font-semibold text-blue-700">{r.quo_no}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.client_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.couple_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.contact_no || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{fmt(r.quo_date)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{cur(r.discount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{cur(r.grand_total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); nav(`/quotations/${r.id}`); }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        ><Pencil size={14}/></button>
                        <button
                          onClick={(e) => del(e, r.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        ><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 25 && (
          <div className="flex items-center justify-center gap-4 border-t border-slate-100 p-3.5">
            <button
              disabled={page===1}
              onClick={() => setPage(p=>p-1)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            ><ChevronLeft size={14}/> Prev</button>
            <span className="text-[12.5px] text-slate-500">Page {page} of {lastPage}</span>
            <button
              disabled={page>=lastPage}
              onClick={() => setPage(p=>p+1)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >Next <ChevronRight size={14}/></button>
          </div>
        )}
      </div>
    </div>
  );
}
