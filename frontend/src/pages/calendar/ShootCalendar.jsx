import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, CalendarDays, MapPin, Clock, User, UserX, Plus, ExternalLink,
} from 'lucide-react';
import api from '../../api/axios';
import './calendar.css';

// Month calendar of everything that occupies a date: confirmed order shoots, bookings and
// tentative quotation dates. Days with nothing on them read as "Available".

const TYPES = {
  order:   { label: 'Order',     cls: 'order' },
  booking: { label: 'Booking',   cls: 'booking' },
  quote:   { label: 'Quotation', cls: 'quote' },
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());

// One entry per document per day (an order with 3 items on a date is one shoot, 3 items).
function groupDocs(events) {
  const map = new Map();
  events.forEach(e => {
    const k = `${e.type}:${e.ref_id}`;
    if (!map.has(k)) map.set(k, { ...e, key: k, items: [] });
    map.get(k).items.push(e);
  });
  const order = { order: 0, booking: 1, quote: 2 };
  return [...map.values()].sort((a, b) => order[a.type] - order[b.type]);
}

export default function ShootCalendar() {
  const nav = useNavigate();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(todayStr());
  const [show, setShow] = useState({ order: true, booking: true, quote: true });

  // Grid always starts on the Sunday on/before the 1st and spans 6 weeks.
  const days = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/reports/calendar', { params: { from: ymd(days[0]), to: ymd(days[41]) } })
      .then(r => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const byDate = useMemo(() => {
    const m = {};
    events.filter(e => show[e.type]).forEach(e => { (m[e.date] ||= []).push(e); });
    return m;
  }, [events, show]);

  const today = todayStr();
  const month = cursor.getMonth();
  const statusOf = list => {
    if (!list?.length) return 'free';
    return list.some(e => e.type !== 'quote') ? 'booked' : 'tentative';
  };

  // Month summary (only days inside the visible month, from today onward for "available").
  const summary = useMemo(() => {
    let booked = 0, tentative = 0, free = 0, shoots = 0;
    days.filter(d => d.getMonth() === month).forEach(d => {
      const k = ymd(d), st = statusOf(byDate[k]);
      if (st === 'booked') booked++;
      else if (st === 'tentative') tentative++;
      else if (k >= today) free++;
      shoots += groupDocs((byDate[k] || []).filter(e => e.type !== 'quote')).length;
    });
    return { booked, tentative, free, shoots };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, byDate, month, today]);

  const move = n => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(todayStr()); };

  const selDocs = groupDocs(byDate[selected] || []);
  const selDate = new Date(`${selected}T00:00:00`);
  const openDoc = d => {
    if (d.type === 'order') nav(`/outdoor-orders/${d.ref_id}`);
    else if (d.type === 'quote') nav(`/quotations/${d.ref_id}`);
    else nav('/bookings');
  };
  const missingStaff = d => d.items.some(i => i.staff_req && !i.staff);

  return (
    <div className="cal-page">
      <div className="cal-head">
        <div className="cal-nav">
          <button type="button" onClick={() => move(-1)} title="Previous month"><ChevronLeft size={18} /></button>
          <h1>{cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h1>
          <button type="button" onClick={() => move(1)} title="Next month"><ChevronRight size={18} /></button>
          <button type="button" className="cal-today" onClick={goToday}>Today</button>
        </div>
        <div className="cal-filters">
          {Object.entries(TYPES).map(([k, t]) => (
            <label key={k} className={`cal-filter ${t.cls}${show[k] ? ' on' : ''}`}>
              <input type="checkbox" checked={show[k]} onChange={e => setShow(s => ({ ...s, [k]: e.target.checked }))} />
              <i /> {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="cal-stats">
        <div className="booked"><strong>{summary.booked}</strong><span>Booked days</span></div>
        <div className="tentative"><strong>{summary.tentative}</strong><span>Tentative (quotation only)</span></div>
        <div className="free"><strong>{summary.free}</strong><span>Available days left</span></div>
        <div><strong>{summary.shoots}</strong><span>Shoots this month</span></div>
      </div>

      <div className="cal-layout">
        <div className={`cal-grid-card${loading ? ' loading' : ''}`}>
          <div className="cal-weekdays">{WEEKDAYS.map(w => <span key={w}>{w}</span>)}</div>
          <div className="cal-grid">
            {days.map(d => {
              const k = ymd(d);
              const list = byDate[k] || [];
              const docs = groupDocs(list);
              const st = statusOf(list);
              const out = d.getMonth() !== month;
              const past = k < today;
              const cls = ['cal-day', st, out && 'out', past && 'past', k === today && 'today', k === selected && 'sel']
                .filter(Boolean).join(' ');
              return (
                <button type="button" key={k} className={cls} onClick={() => setSelected(k)}>
                  <span className="cal-day-top">
                    <b>{d.getDate()}</b>
                    {st === 'free' && !past && !out && <span className="cal-free">Available</span>}
                    {docs.some(missingStaff) && <UserX size={13} className="cal-warn" />}
                  </span>
                  <span className="cal-chips">
                    {docs.slice(0, 3).map(doc => (
                      <span key={doc.key} className={`cal-chip ${TYPES[doc.type].cls}`}>
                        {doc.client || '—'}{doc.event ? ` · ${doc.event}` : ''}
                      </span>
                    ))}
                    {docs.length > 3 && <span className="cal-more">+{docs.length - 3} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        <aside className="cal-side">
          <div className="cal-side-head">
            <div>
              <div className="cal-side-date">{selDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <span className={`cal-badge ${statusOf(byDate[selected])}`}>
                {{ booked: 'Booked', tentative: 'Tentative', free: selected < today ? 'Nothing booked' : 'Available' }[statusOf(byDate[selected])]}
              </span>
            </div>
          </div>
          {selDocs.length === 0 ? (
            <div className="cal-side-empty">
              <CalendarDays size={30} />
              <p>{selected < today ? 'No shoot was booked on this date.' : 'This date is free.'}</p>
              {selected >= today && (
                <div className="cal-side-actions">
                  <button type="button" className="btn btn-primary" onClick={() => nav('/quotations/new')}><Plus size={15} /> New Quotation</button>
                  <button type="button" className="btn btn-outline" onClick={() => nav('/outdoor-orders/new')}><Plus size={15} /> New Order</button>
                </div>
              )}
            </div>
          ) : (
            <div className="cal-side-list">
              {selDocs.map(doc => (
                <button type="button" key={doc.key} className={`cal-entry ${TYPES[doc.type].cls}`} onClick={() => openDoc(doc)} title="Open">
                  <span className="cal-entry-head">
                    <span className={`cal-type ${TYPES[doc.type].cls}`}>{TYPES[doc.type].label} #{doc.doc_no}</span>
                    {doc.status && <span className="cal-status">{doc.status}</span>}
                    <ExternalLink size={13} className="cal-open" />
                  </span>
                  <b className="cal-entry-client">{doc.client || '—'}</b>
                  <span className="cal-entry-items">
                    {doc.items.map(it => (
                      <span key={it.id} className="cal-item">
                        <span className="cal-item-name">{it.item || it.event || 'Event'}{it.item && it.event ? <em> · {it.event}</em> : null}</span>
                        <span className="cal-item-meta">
                          {it.time && <span><Clock size={12} /> {it.time}</span>}
                          {it.place && <span><MapPin size={12} /> {it.place}</span>}
                          {it.staff
                            ? <span><User size={12} /> {it.staff}</span>
                            : it.staff_req && <span className="miss"><UserX size={12} /> Staff not assigned</span>}
                        </span>
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
