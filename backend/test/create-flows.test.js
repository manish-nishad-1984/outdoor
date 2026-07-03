/*
 * Integration smoke tests for every "create" flow in the app.
 *
 * Each test runs the SAME INSERT statement(s) the API route runs, inside a
 * transaction that is ALWAYS rolled back — so it exercises the real schema
 * (column types, FKs, NOT NULLs, enums) against the live database WITHOUT
 * writing any test data.
 *
 * Run:  node test/create-flows.test.js
 * Exit code 0 = all passed, 1 = one or more failed.
 */
const pool = require('../config/db');

const results = [];
let userId, accountId;

async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await fn(c);
    await c.query('ROLLBACK');           // never persist test data
    return null;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    return e.message;
  } finally {
    c.release();
  }
}

async function test(name, fn) {
  const err = await tx(fn);
  results.push({ name, ok: !err, err });
  console.log(`${err ? '✗ FAIL' : '✓ pass'}  ${name}${err ? '  ->  ' + err : ''}`);
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ pass  ${name}`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log(`✗ FAIL  ${name}  ->  ${e.message}`);
  }
}

(async () => {
  const u = await pool.query('SELECT id FROM app_users LIMIT 1');
  userId = u.rows[0].id;
  const a = await pool.query('SELECT id FROM accounts LIMIT 1');
  accountId = a.rows[0]?.id || null;

  console.log('\n=== CREATE FLOWS (rolled back, no data written) ===');

  await test('accounts.create', async c => {
    await c.query(
      `INSERT INTO accounts(account_name,mobile_no,email,permanent_address,opening_balance,credit_debit,remark,status_flag,entered_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,true,$8)`,
      ['Test Party', '9999999999', 'x@y.com', 'addr', 1000, 'Dr', '', userId]);
  });

  await test('outdoor-orders.create (payment_mode=Cash)', async c => {
    const o = await c.query(
      `INSERT INTO outdoor_orders (order_no,company_name,contact_no,event_type,photo_by,gross_total,subtotal,advance,payment_mode,remark,entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10) RETURNING id`,
      ['OUT-TEST', 'Parth', '7476456464', 'Wedding', 'Photog', 5000, 500, 'Cash', 'note', userId]);
    await c.query(`INSERT INTO outdoor_order_items(outdoor_order_id,item_name_snap,rate,box_qty,total) VALUES($1,$2,$3,$4,$5)`,
      [o.rows[0].id, 'Photography', 100, 2, 200]);
  });

  await test('studio-orders.create', async c => {
    await c.query(
      `INSERT INTO studio_orders(order_no,customer_address,customer_contact,inquiry_date,delivery_date,gross_total,subtotal)
       VALUES($1,$2,$3,$4,$5,$6,$6)`,
      ['STU-TEST', 'Cust', '900', '2026-07-03', '2026-07-10', 3000]);
  });

  await test('sales.create (payment_mode=Cash)', async c => {
    await c.query(
      `INSERT INTO sales(order_no,customer_name,inquiry_date,payment_mode,gross_total,discount_rs,advance,total_pending,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      ['INV-TEST', 'Cust', '2026-07-03', 'Cash', 5000, 0, 1000, 4000, false]);
  });

  await test('receipts.create (voucher RCP-0001)', async c => {
    await c.query(
      `INSERT INTO receipts(voucher_no,amount,payment_type,payment_date,cheque_no,remark,inquiry_date)
       VALUES($1,$2,$3,$4,$5,$6,$4)`,
      ['RCP-0001', 12500, 'Cash', '2026-07-03', null, '']);
  });

  await test('payments.create (voucher PAY-0001)', async c => {
    await c.query(
      `INSERT INTO payments(voucher_no,party_id,amount,payment_type,payment_date,cheque_no,remark,inquiry_date)
       VALUES($1,$2,$3,$4,$5,$6,$7,$5)`,
      ['PAY-0001', accountId, 20000, 'UPI', '2026-07-03', null, '']);
  });

  await test('design-jobs.create (employee=app_user)', async c => {
    const j = await c.query(
      `INSERT INTO design_jobs(employee_id,job_type,due_date,status,subtotal,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$5,CURRENT_DATE,$6) RETURNING id`,
      [userId, 'Album', null, 'Pending', 500, userId]);
    await c.query(
      `INSERT INTO design_job_items(design_job_id,couple_name,item_name,job_no,studio_name,unit,quantity,rate,total)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [j.rows[0].id, 'A & B', 'Album', 'J1', '', 'pcs', 1, 500, 500]);
  });

  await test('exposing.create', async c => {
    const j = await c.query(
      `INSERT INTO exposing_jobs(party_name,contact,address,job_type,subtotal,remark,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$5,$6,CURRENT_DATE,$7) RETURNING id`,
      ['Party', '900', 'addr', 'Photos', 300, '', userId]);
    await c.query(
      `INSERT INTO exposing_items(exposing_job_id,file_name,order_date,paid_amount,net_amount,amount)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [j.rows[0].id, 'f.jpg', null, 0, 300, 300]);
  });

  await test('hire-orders.create', async c => {
    const o = await c.query(
      `INSERT INTO hire_orders(customer_name,order_contact,remark,subtotal,gross_total,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$4,CURRENT_DATE,$5) RETURNING id`,
      ['Cust', '900', '', 1000, userId]);
    await c.query(
      `INSERT INTO hire_order_items(hire_order_id,employee_name,item_name,place,order_date,time_slot,quantity,rate,total)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [o.rows[0].id, 'Emp', 'Camera', 'Hall', null, '10-12', 1, 1000, 1000]);
  });

  await test('bookings.create (payment_mode=Cash)', async c => {
    await c.query(
      `INSERT INTO bookings(booking_no,customer_name,customer_contact,event_type,event_date,venue,photo_by,gross_total,advance,total_pending,payment_mode,status,remark,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_DATE,$14)`,
      ['BK-TEST', 'Cust', '900', 'Wedding', '2026-08-01', 'Hall', 'Photog', 50000, 10000, 40000, 'Cash', 'Pending', '', userId]);
  });

  await test('attendance.create', async c => {
    await c.query(`INSERT INTO attendance(employee_id,inquiry_date,remark) VALUES($1,$2,$3)`,
      [userId, '2026-07-03', 'P']);
  });

  await test('employees.register (app_users)', async c => {
    await c.query(`INSERT INTO app_users(username,password_hash,user_type) VALUES($1,$2,$3)`,
      ['test_new_emp', '$2a$10$abcdefghijklmnopqrstuv', 'operator']);
  });

  console.log('\n=== SEQUENCE SYNC (nextval must be > max id) ===');
  const seqs = await pool.query(`
    SELECT c.table_name, c.column_name,
           pg_get_serial_sequence(quote_ident(c.table_name), c.column_name) AS seq
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_name=c.table_name AND t.table_schema='public'
    WHERE c.table_schema='public'
      AND pg_get_serial_sequence(quote_ident(c.table_name), c.column_name) IS NOT NULL`);
  let outOfSync = [];
  for (const r of seqs.rows) {
    const mx = await pool.query(`SELECT COALESCE(MAX(${r.column_name}),0) AS m FROM ${r.table_name}`);
    const nv = await pool.query(`SELECT nextval($1) AS n`, [r.seq]);   // advances, harmless
    if (parseInt(nv.rows[0].n) <= parseInt(mx.rows[0].m)) outOfSync.push(r.table_name);
    // put it back so we don't waste ids
    await pool.query(`SELECT setval($1, $2, true)`, [r.seq, Math.max(parseInt(mx.rows[0].m), 1)]);
  }
  await check(`all ${seqs.rows.length} sequences in sync`, () => {
    if (outOfSync.length) throw new Error('out of sync: ' + outOfSync.join(', '));
  });

  console.log('\n=== MASTER DATA PRESENCE ===');
  const masters = {
    'accounts (parties/vendors)': 'accounts',
    'app_users (staff/designers)': 'app_users',
  };
  for (const [label, table] of Object.entries(masters)) {
    const r = await pool.query(`SELECT COUNT(*) FROM ${table}`);
    await check(`${label} has rows (${r.rows[0].count})`, () => {
      if (parseInt(r.rows[0].count) === 0) throw new Error('empty — dropdowns will be blank');
    });
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`\n================ SUMMARY: ${passed}/${results.length} passed ================`);
  if (failed.length) {
    console.log('FAILURES:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.err}`));
  }
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
