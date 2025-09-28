const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { JWT_SECRET } = require('./auth');

// Customer Register
router.post('/register-customer', (req, res) => {
  const { name, email, phone, password, location, state } = req.body;
  console.log('Registering customer:', { name, email, phone, location, state });
  if (!name || !email || !phone || !password || !location || !state) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query(
    'INSERT INTO Customer (name, email, phone, password_hash, location, state) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, phone, hashedPassword, location, state],
    (error, results) => {
      if (error) {
        console.error('DB insert error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
          res.status(409).json({ success: false, message: 'Email or phone already in use.' });
        } else {
          res.status(500).json({ success: false });
        }
      } else {
        console.log('Customer registered successfully, user_id:', results.insertId);
        res.json({ success: true });
      }
    }
  );
});

// Customer login
router.post('/login-customer', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM Customer WHERE email = ?', [email], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    const user = results[0];
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (isValidPassword) {
  const token = jwt.sign({ userId: user.user_id, role: 'customer', name: user.name }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ success: true, token, role: 'customer', userId: user.user_id, name: user.name });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
  });
});

// Customer forgot password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  db.query('SELECT * FROM Customer WHERE email = ?', [email], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.length === 0) return res.status(404).json({ success: false });
    // here can add email sending logic if needed
    res.json({ success: true });
  });
});

// Customer reset password
router.put('/reset-password', (req, res) => {
  const { email, new_password } = req.body;
  if (!email || !new_password) return res.status(400).json({ success: false, message: 'Missing fields' });
  if (String(new_password).length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  const hashed = bcrypt.hashSync(new_password, 10);
  db.query('UPDATE Customer SET password_hash = ? WHERE email = ?', [hashed, email], (err, results) => {
    if (err) return res.status(500).json({ success: false });
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Email not found.' });
    res.json({ success: true });
  });
});

// Get all customers
router.get('/customers', (req, res) => {
  db.query('SELECT * FROM Customer', (err, results) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, data: results });
  });
});

module.exports = router;