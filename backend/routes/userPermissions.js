const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Web port of legacy FrmOptUserPermission.vb (OPT_UPERMISSION) — one row per user,
// 177 boolean flags. Column names below are the semantic web-app equivalents of the
// legacy columns (M2..M30/T2..T100/S1..S19 etc were meaningless numeric slots there);
// grouping/labels for the UI live in frontend/src/pages/settings/UserPermission.jsx —
// this list is the whitelist used to build safe dynamic SELECT/UPDATE statements.
const PERMISSION_COLUMNS = [
  // Report tab
  'report_purchase', 'report_job_summary', 'report_expenses', 'report_income', 'report_stock', 'report_customer_list',
  // Transaction tab
  'txn_purchase_open', 'txn_purchase_insert', 'txn_purchase_update', 'txn_purchase_delete', 'txn_purchase_print',
  'txn_party_payment_open', 'txn_party_payment_insert', 'txn_party_payment_update', 'txn_party_payment_delete', 'txn_party_payment_print',
  'txn_job_print_open', 'txn_job_print_insert', 'txn_job_print_update', 'txn_job_print_delete', 'txn_job_print_print',
  'txn_general_voucher_open', 'txn_general_voucher_insert', 'txn_general_voucher_update', 'txn_general_voucher_delete', 'txn_general_voucher_print',
  'txn_reminder_book_open', 'txn_reminder_book_insert', 'txn_reminder_book_update', 'txn_reminder_book_delete', 'txn_reminder_book_print',
  // Master Setup tab
  'master_product_open', 'master_product_insert', 'master_product_update', 'master_product_delete', 'master_product_print',
  'master_item_open', 'master_item_insert', 'master_item_update', 'master_item_delete', 'master_item_print',
  'master_account_open', 'master_account_insert', 'master_account_update', 'master_account_delete', 'master_account_print',
  // Bill tab
  'bill_appointment_open', 'bill_appointment_insert', 'bill_appointment_update', 'bill_appointment_delete',
  'bill_order_open', 'bill_order_insert', 'bill_order_update', 'bill_order_delete', 'bill_order_print',
  'bill_bill_open', 'bill_bill_insert', 'bill_bill_update', 'bill_bill_delete', 'bill_bill_print',
  'bill_receipt_open', 'bill_receipt_insert', 'bill_receipt_update', 'bill_receipt_delete', 'bill_receipt_print',
  'bill_book_master_open', 'bill_book_master_insert', 'bill_book_master_update', 'bill_book_master_delete',
  'bill_appointment_report', 'bill_studio_order_report', 'bill_studio_bill_report', 'bill_customer_report', 'bill_search_report',
  // OutDoor tab
  'outdoor_quotation_open', 'outdoor_quotation_insert', 'outdoor_quotation_update', 'outdoor_quotation_delete', 'outdoor_quotation_print',
  'outdoor_order_open', 'outdoor_order_insert', 'outdoor_order_update', 'outdoor_order_delete', 'outdoor_order_print',
  'outdoor_bill_open', 'outdoor_bill_insert', 'outdoor_bill_update', 'outdoor_bill_delete', 'outdoor_bill_print',
  'outdoor_operator_hier_open', 'outdoor_operator_hier_insert', 'outdoor_operator_hier_update', 'outdoor_operator_hier_delete', 'outdoor_operator_hier_print',
  'outdoor_bill_book_master_open', 'outdoor_bill_book_master_insert', 'outdoor_bill_book_master_update', 'outdoor_bill_book_master_delete',
  'outdoor_receipt_open', 'outdoor_receipt_insert', 'outdoor_receipt_update', 'outdoor_receipt_delete', 'outdoor_receipt_print',
  'outdoor_quotation_report', 'outdoor_order_report', 'outdoor_bill_report', 'outdoor_operator_hier_report', 'outdoor_customer_report', 'outdoor_party_report',
  // Xposing tab
  'xposing_term_open', 'xposing_term_insert', 'xposing_term_update', 'xposing_term_delete', 'xposing_term_print',
  'xposing_term_report',
  // Raw Purchase tab
  'rawpur_item_master_open', 'rawpur_item_master_insert', 'rawpur_item_master_update', 'rawpur_item_master_delete', 'rawpur_item_master_print',
  'rawpur_product_master_open', 'rawpur_product_master_insert', 'rawpur_product_master_update', 'rawpur_product_master_delete', 'rawpur_product_master_print',
  'rawpur_purchase_open', 'rawpur_purchase_insert', 'rawpur_purchase_update', 'rawpur_purchase_delete', 'rawpur_purchase_print',
  'rawpur_party_payment_open', 'rawpur_party_payment_insert', 'rawpur_party_payment_update', 'rawpur_party_payment_delete', 'rawpur_party_payment_print',
  'rawpur_report', 'rawpur_party_report',
  // Employee tab
  'emp_entry_design_open', 'emp_entry_design_insert', 'emp_entry_design_update', 'emp_entry_design_delete', 'emp_entry_design_print',
  'emp_payment_open', 'emp_payment_insert', 'emp_payment_update', 'emp_payment_delete', 'emp_payment_print',
  'emp_entry_design_report', 'emp_payment_report',
  // Discount tab
  'discount_sale_open', 'discount_sale_insert', 'discount_sale_update', 'discount_sale_delete', 'discount_sale_print',
  'discount_sale_report',
  // Utility tab
  'utility_print_settings', 'utility_backup_restore', 'utility_reset_data', 'utility_reminder_panel',
  'utility_user_setting', 'utility_user_permission', 'utility_email_settings', 'utility_sms',
  'utility_gst_setting', 'utility_phone_book', 'utility_cheque_settings', 'utility_envelope_print',
  // Sheet tab
  'sheet_cash_book', 'sheet_bank_book', 'sheet_day_book', 'sheet_account_sheet', 'sheet_voucher_sheet',
  'sheet_balance_sheet', 'sheet_cash_bank_book', 'sheet_cash_bank_book_date', 'sheet_pl_status',
  // Top-level
  'date_change',
];

// NOTE: an older, unrelated `user_permissions` table already exists in this DB
// (simple permission_key/allowed rows, ~60 rows, nothing in this codebase reads it).
// This feature intentionally uses a different table name to avoid colliding with it.
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS user_module_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
    ${PERMISSION_COLUMNS.map(c => `${c} BOOLEAN DEFAULT false`).join(',\n    ')},
    entered_by INTEGER,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('user_module_permissions init error:', err.message));

router.get('/:userId', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM user_module_permissions WHERE user_id=$1', [req.params.userId]);
    res.json(r.rows[0] || { user_id: Number(req.params.userId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:userId', auth, async (req, res) => {
  const userId = req.params.userId;
  const cols = PERMISSION_COLUMNS.filter(c => c in req.body);
  const vals = cols.map(c => !!req.body[c]);
  try {
    const existing = await pool.query('SELECT id FROM user_module_permissions WHERE user_id=$1', [userId]);
    let r;
    if (existing.rows.length) {
      const setSql = cols.map((c, i) => `${c}=$${i + 1}`).join(', ');
      r = await pool.query(
        `UPDATE user_module_permissions SET ${setSql}, updated_by=$${cols.length + 1}, updated_at=NOW() WHERE user_id=$${cols.length + 2} RETURNING *`,
        [...vals, req.user.id, userId]);
    } else {
      const colSql = ['user_id', ...cols, 'entered_by'].join(', ');
      const ph = [...cols, 'entered_by'].map((_, i) => `$${i + 2}`).join(', ');
      r = await pool.query(
        `INSERT INTO user_module_permissions (user_id, ${cols.join(', ')}, entered_by) VALUES ($1, ${ph}) RETURNING *`,
        [userId, ...vals, req.user.id]);
    }
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
