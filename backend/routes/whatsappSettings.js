const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Web port of legacy FrmWhatsAppSetting.vb / OPT_WSMS (SRNO=1 singleton row).
// The legacy form's live wa.apikaro.in QR-pairing/device-connection integration is
// deliberately NOT ported here — see legacy/docs/01-OVERVIEW.md §6 and
// 03-MIGRATION-MAP.md, which already recommend against replicating that gateway
// (hardcoded FTP creds for file sending, fragile HTML-scrape QR fallback). This route
// only persists the settings fields; master_key/api_key are stored as plain text
// (auth-protected, same trust model as this app's other credentials) rather than
// replicating the legacy XOR "encryption", which was obfuscation, not real security.
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    master_key       TEXT,
    api_key          TEXT,
    send_on_save     BOOLEAN DEFAULT false,
    message_mode     VARCHAR(10) DEFAULT 'text',
    portal_username  VARCHAR(200),
    portal_password  VARCHAR(200),
    entered_by       INTEGER,
    updated_by       INTEGER
  );
  INSERT INTO whatsapp_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error('whatsapp_settings table init error:', err.message));

const MESSAGE_MODES = ['text', 'file', 'text_file'];

router.get('/', auth, async (req, res) => {
  await init;
  try {
    const r = await pool.query('SELECT * FROM whatsapp_settings WHERE id=1');
    res.json(r.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, async (req, res) => {
  await init;
  try {
    const b = req.body;
    if (b.message_mode && !MESSAGE_MODES.includes(b.message_mode)) {
      return res.status(400).json({ error: 'Invalid value for message_mode' });
    }
    const r = await pool.query(
      `UPDATE whatsapp_settings SET
         master_key=$1, api_key=$2, send_on_save=$3, message_mode=$4,
         portal_username=$5, portal_password=$6, updated_by=$7
       WHERE id=1 RETURNING *`,
      [
        b.master_key || null, b.api_key || null, !!b.send_on_save, b.message_mode || 'text',
        b.portal_username || null, b.portal_password || null,
        req.user.id,
      ]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
