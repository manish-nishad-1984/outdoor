const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Web port of legacy FrmVatSettings.vb / OPT_VAT (SRNO=1 singleton row) — the on-screen
// legacy header reads "GST Settings" even though the class/table are still named
// VAT (a pre-GST holdover), so this port uses GST naming throughout.
// Legacy columns PDISC/PAVAT (here purchase_disc/purchase_additional_gst) are kept for
// schema parity — other legacy forms (FrmSale1/FrmPurchase/FrmRawPurchase) read them —
// but are never shown in the legacy form's own UI (TxtPDisc/TxtPAVat are Visible=False
// in the designer), so this port doesn't expose them either.
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS gst_settings (
    id                        INTEGER PRIMARY KEY DEFAULT 1,
    raw_purchase_gst          NUMERIC(5,2) DEFAULT 4,
    purchase_gst              NUMERIC(5,2) DEFAULT 0,
    sale_gst                  NUMERIC(5,2) DEFAULT 4,
    outdoor_gst               NUMERIC(5,2) DEFAULT 1,
    purchase_disc             NUMERIC(5,2) DEFAULT 0,
    purchase_additional_gst   NUMERIC(5,2) DEFAULT 1,
    entered_by                INTEGER,
    updated_by                INTEGER
  );
  INSERT INTO gst_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error('gst_settings table init error:', err.message));

router.get('/', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT * FROM gst_settings WHERE id=1');
    res.json(r.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, async (req, res) => {
  await init;
  try {
    const b = req.body;
    const r = await pool.query(
      `UPDATE gst_settings SET
         raw_purchase_gst=$1, purchase_gst=$2, sale_gst=$3, outdoor_gst=$4,
         purchase_disc=$5, purchase_additional_gst=$6, updated_by=$7
       WHERE id=1 RETURNING *`,
      [
        b.raw_purchase_gst || 0, b.purchase_gst || 0, b.sale_gst || 0, b.outdoor_gst || 0,
        b.purchase_disc || 0, b.purchase_additional_gst || 0,
        req.user.id,
      ]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
