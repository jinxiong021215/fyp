const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyJWT } = require('./auth');

// Get item
router.get('/items', verifyJWT('admin', 'company', 'technician', 'customer'), (req, res) => {
  db.query('SELECT * FROM Item', (err, results) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, data: results });
  });
});

// Add item
router.post('/items', verifyJWT('admin', 'company'), (req, res) => {
  const { item_name, price } = req.body;
  db.query('INSERT INTO Item (item_name, price) VALUES (?, ?)', [item_name, price], (err, results) => {
    if (err) return res.json({ success: false, message: 'Add failed.' });
    res.json({ success: true });
  });
});

// Delete item
router.delete('/items/:id', verifyJWT('admin', 'company'), (req, res) => {
  db.query('DELETE FROM Item WHERE item_id = ?', [req.params.id], (err, results) => {
    if (err) return res.json({ success: false, message: 'Delete failed.' });
    res.json({ success: true });
  });
});

// Edit item
router.put('/items/:id', verifyJWT('admin', 'company'), (req, res) => {
  const { item_name, price } = req.body;
  db.query('UPDATE Item SET item_name=?, price=? WHERE item_id=?', [item_name, price, req.params.id], (err, results) => {
    if (err) return res.json({ success: false, message: 'Update failed.' });
    res.json({ success: true });
  });
});

module.exports = router;