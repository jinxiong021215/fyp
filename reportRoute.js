const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyJWT } = require('./auth');

// GET /reports/payments/monthly?year=YYYY&month=MM
// Returns total completed payments for the given month
router.get('/reports/payments/monthly', verifyJWT('admin', 'company'), (req, res) => {
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);
  if (!year || !month) {
    return res.json({ success: false, message: 'Missing year or month' });
  }
  const sql = `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM Payment
    WHERE status = 'COMPLETE'
      AND YEAR(transaction_date) = ?
      AND MONTH(transaction_date) = ?
  `;
  db.query(sql, [year, month], (err, rows) => {
    if (err) {
      console.error('Monthly payments report error:', err);
      return res.json({ success: false, message: err.message || 'DB error' });
    }
    const total = rows && rows.length ? Number(rows[0].total || 0) : 0;
    res.json({ success: true, data: { year, month, total } });
  });
});

// GET /reports/payments/by-month?months=6
// Returns an array of last N months (yyyy-mm) totals for completed payments
router.get('/reports/payments/by-month', verifyJWT('admin', 'company'), (req, res) => {
  let months = parseInt(req.query.months, 10);
  if (!months || months < 1 || months > 36) months = 6;
  const sql = `
    SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS ym, SUM(amount) AS total
    FROM Payment
    WHERE status = 'COMPLETE' AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY ym
    ORDER BY ym
  `;
  db.query(sql, [months], (err, rows) => {
    if (err) {
      console.error('By-month payments report error:', err);
      return res.json({ success: false, message: err.message || 'DB error' });
    }
    const data = (rows || []).map(r => ({ ym: r.ym, total: Number(r.total || 0) }));
    res.json({ success: true, data });
  });
});

module.exports = router;
