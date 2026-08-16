const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Web port of legacy FrmPrintSettings.vb / OPT_PRINT (SRNO=1 singleton row).
// Only the letterhead/print-format fields are ported (see legacy/docs — the SMS-gateway
// and OTP/password step-up columns on OPT_PRINT have no backend here and were deliberately
// left out, not just hidden). *_mode columns collapse each legacy mutually-exclusive
// "Save And Print" / "Save And View" checkbox pair into a single 'print'|'view' value.
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS print_settings (
    id                       INTEGER PRIMARY KEY DEFAULT 1,
    company_name             VARCHAR(200),
    address                  TEXT,
    mobile_no                VARCHAR(50),
    gst_no                   VARCHAR(50),
    email                    VARCHAR(255),
    insta_id                 VARCHAR(100),
    bank_ac                  VARCHAR(200),
    ifsc_branch              VARCHAR(200),
    bill_line_color          VARCHAR(30) DEFAULT 'BLACK',
    default_printer          VARCHAR(200),
    bill_print_size          VARCHAR(30) DEFAULT 'A4',
    studio_bill_copies       INTEGER DEFAULT 1,
    bill_copies              INTEGER DEFAULT 1,
    rate_with_gst            BOOLEAN DEFAULT false,
    display_mobile_in_print  BOOLEAN DEFAULT false,
    display_logo             BOOLEAN DEFAULT true,
    print_message            BOOLEAN DEFAULT true,
    studio_bill_mode         VARCHAR(10) DEFAULT 'view',
    print_detail_mode        VARCHAR(10) DEFAULT 'view',
    quotation_mode           VARCHAR(10) DEFAULT 'view',
    order_mode               VARCHAR(10) DEFAULT 'view',
    bill_mode                VARCHAR(10) DEFAULT 'view',
    logo_image               TEXT,
    signature_image          TEXT,
    package_image_1          TEXT,
    package_image_2          TEXT,
    entered_by               INTEGER,
    updated_by               INTEGER
  );
  INSERT INTO print_settings (id, company_name, address, mobile_no, insta_id)
    VALUES (1, 'Am Photo Studio', '324, 3 Floor, Angel Business Center, 1, Abc Cir, Mota Varachha, Surat,', '+91 99097 96518', '@am_photo_studio_')
    ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error('print_settings table init error:', err.message));

const MODE_FIELDS = ['studio_bill_mode', 'print_detail_mode', 'quotation_mode', 'order_mode', 'bill_mode'];

router.get('/', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT * FROM print_settings WHERE id=1');
    res.json(r.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, async (req, res) => {
  await init;
  try {
    const b = req.body;
    for (const f of MODE_FIELDS) {
      if (b[f] && !['print', 'view'].includes(b[f])) return res.status(400).json({ error: `Invalid value for ${f}` });
    }
    const r = await pool.query(
      `UPDATE print_settings SET
         company_name=$1, address=$2, mobile_no=$3, gst_no=$4, email=$5, insta_id=$6,
         bank_ac=$7, ifsc_branch=$8, bill_line_color=$9, default_printer=$10,
         bill_print_size=$11, studio_bill_copies=$12, bill_copies=$13,
         rate_with_gst=$14, display_mobile_in_print=$15, display_logo=$16, print_message=$17,
         studio_bill_mode=$18, print_detail_mode=$19, quotation_mode=$20, order_mode=$21, bill_mode=$22,
         logo_image=$23, signature_image=$24, package_image_1=$25, package_image_2=$26,
         updated_by=$27
       WHERE id=1 RETURNING *`,
      [
        b.company_name || null, b.address || null, b.mobile_no || null, b.gst_no || null, b.email || null, b.insta_id || null,
        b.bank_ac || null, b.ifsc_branch || null, b.bill_line_color || 'BLACK', b.default_printer || null,
        b.bill_print_size || 'A4', b.studio_bill_copies || 1, b.bill_copies || 1,
        !!b.rate_with_gst, !!b.display_mobile_in_print, b.display_logo !== false, b.print_message !== false,
        b.studio_bill_mode || 'view', b.print_detail_mode || 'view', b.quotation_mode || 'view', b.order_mode || 'view', b.bill_mode || 'view',
        b.logo_image || null, b.signature_image || null, b.package_image_1 || null, b.package_image_2 || null,
        req.user.id,
      ]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
