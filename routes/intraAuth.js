const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { JWT_SECRET } = require('./auth');

// Admin Register
router.post('/register-admin', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query(
    'INSERT INTO Admin (name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, hashedPassword, 'ACTIVE'],
    (error, results) => {
      if (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          res.status(409).json({ success: false, message: 'Email or phone already in use.' });
        } else {
          res.status(500).json({ success: false });
        }
      } else {
        res.json({ success: true });
      }
    }
  );
});

// Technician Register
router.post('/register-technician', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query(
    'INSERT INTO Technician (name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, hashedPassword, 'OFF_DUTY'],
    (error, results) => {
      if (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          res.status(409).json({ success: false, message: 'Email or phone already in use.' });
        } else {
          res.status(500).json({ success: false });
        }
      } else {
        res.json({ success: true });
      }
    }
  );
});

// Admin/Technician/Company login
router.post('/login-intra', (req, res) => {
  const { email, password, company_name, company_ssn } = req.body;
  if (company_name && company_ssn) {
    // Company login
    db.query('SELECT * FROM Company WHERE company_name = ? AND company_ssn = ?', [company_name, company_ssn], (error, results) => {
      if (error) return res.status(500).json({ success: false });
      if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      const company = results[0];
      // generate token
  const token = jwt.sign({ companyId: company.company_id, role: 'company', name: company.company_name }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({
        success: true,
        token,
        role: 'company',
        userId: company.company_id,
        name: company.company_name,
        company_name: company.company_name,
        company_location: company.company_location,
        company_ssn: company.company_ssn
      });
    });
    return;
  }
  // Check Admin
  db.query('SELECT * FROM Admin WHERE email = ?', [email], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.length > 0) {
      const user = results[0];
      if (user.status && user.status.toUpperCase() === 'NON_ACTIVE') {
        return res.status(403).json({ success: false, message: 'Account is deactivated.' });
      }
      const isValidPassword = bcrypt.compareSync(password, user.password_hash);
      if (isValidPassword) {
  const token = jwt.sign({ userId: user.user_id, role: 'admin', name: user.name }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ success: true, token, role: 'admin', userId: user.user_id, name: user.name });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
    } else {
      // Then Check Technician
      db.query('SELECT * FROM Technician WHERE email = ?', [email], (error, results) => {
        if (error) return res.status(500).json({ success: false });
        if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        const user = results[0];
        if (String(user.status || '').toUpperCase() === 'NON_ACTIVE') {
          return res.status(403).json({ success: false, message: 'Account is deactivated.' });
        }
        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        if (isValidPassword) {
          const token = jwt.sign({ userId: user.user_id, role: 'technician', name: user.name }, JWT_SECRET, { expiresIn: '1h' });
          res.json({ success: true, token, role: 'technician', userId: user.user_id, name: user.name });
        } else {
          res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
      });
    }
  });
});

const { verifyJWT } = require('./auth');

// Get all Admin (protected: admin/company)
router.get('/employees/admins', verifyJWT('admin', 'company'), (req, res) => {
  db.query('SELECT user_id, name, email, phone, status FROM Admin', (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false });
    } else {
      res.json({ success: true, data: results });
    }
  });
});

// Get all Technician (protected: admin/company/technician)
router.get('/employees/technicians', verifyJWT('admin', 'company', 'technician'), (req, res) => {
  db.query('SELECT user_id, name, email, phone, status FROM Technician', (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false });
    } else {
      res.json({ success: true, data: results });
    }
  });
});

// Update Admin status (protected: admin)
router.put('/employees/admins/:id/status', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;
  db.query('UPDATE Admin SET status = ? WHERE user_id = ?', [status, userId], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Admin not found.' });
    res.json({ success: true });
  });
});

// Update Technician status (protected: admin or technician self handled by admin; keep admin restricted)
router.put('/employees/technicians/:id/status', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { status } = req.body;
  db.query('UPDATE Technician SET status = ? WHERE user_id = ?', [status, userId], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Technician not found.' });
    res.json({ success: true });
  });
});

// Get Technician Skills (protected: admin/company/technician)
router.get('/employees/technicians/:id/skills', verifyJWT('admin', 'company', 'technician'), (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT s.*, i.item_name 
    FROM Skill s 
    JOIN Item i ON s.item_id = i.item_id 
    WHERE s.technician_id = ?
  `;
  db.query(sql, [userId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false });
    } else {
      res.json({ success: true, data: results });
    }
  });
});

// Add Skill for Technician (protected: admin)
router.post('/employees/technicians/:id/skills', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { item_id } = req.body;
  if (!item_id) {
    return res.status(400).json({ success: false, message: 'Item ID is required.' });
  }
  db.query(
    'INSERT IGNORE INTO Skill (technician_id, item_id) VALUES (?, ?)',
    [userId, item_id],
    (error, results) => {
      if (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          res.status(409).json({ success: false, message: 'Skill already exists for this technician.' });
        } else {
          res.status(500).json({ success: false });
        }
      } else {
        if (results.affectedRows === 0) {
          res.status(409).json({ success: false, message: 'Skill already exists for this technician.' });
        } else {
          res.json({ success: true });
        }
      }
    }
  );
});

// delete Skill for Technician (protected: admin)
router.delete('/employees/technicians/:id/skills/:skillId', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const skillId = req.params.skillId;
  db.query(
    'DELETE FROM Skill WHERE technician_id = ? AND item_id = ?',
    [userId, skillId],
    (error, results) => {
      if (error) return res.status(500).json({ success: false });
      if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Skill not found for this technician.' });
      res.json({ success: true });
    }
  );
});

// Reset Admin password (protected: admin)
router.put('/employees/admins/:id/password', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { new_password } = req.body;
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const hashed = bcrypt.hashSync(new_password, 10);
  db.query('UPDATE Admin SET password_hash = ? WHERE user_id = ?', [hashed, userId], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Admin not found.' });
    res.json({ success: true });
  });
});

// Reset Technician password (protected: admin)
router.put('/employees/technicians/:id/password', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { new_password } = req.body;
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  const hashed = bcrypt.hashSync(new_password, 10);
  db.query('UPDATE Technician SET password_hash = ? WHERE user_id = ?', [hashed, userId], (error, results) => {
    if (error) return res.status(500).json({ success: false });
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Technician not found.' });
    res.json({ success: true });
  });
});

// Update Admin profile fields (protected: admin)
router.put('/employees/admins/:id', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { name, email, phone } = req.body || {};
  const fields = [];
  const params = [];
  if (typeof name === 'string' && name.trim()) { fields.push('name = ?'); params.push(name.trim()); }
  if (typeof email === 'string' && email.trim()) { fields.push('email = ?'); params.push(email.trim()); }
  if (typeof phone === 'string' && phone.trim()) { fields.push('phone = ?'); params.push(phone.trim()); }
  if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
  const sql = `UPDATE Admin SET ${fields.join(', ')} WHERE user_id = ?`;
  params.push(userId);
  db.query(sql, params, (error, results) => {
    if (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email or phone already in use.' });
      return res.status(500).json({ success: false });
    }
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Admin not found.' });
    res.json({ success: true });
  });
});

// Update Technician profile fields (protected: admin)
router.put('/employees/technicians/:id', verifyJWT('admin'), (req, res) => {
  const userId = req.params.id;
  const { name, email, phone } = req.body || {};
  const fields = [];
  const params = [];
  if (typeof name === 'string' && name.trim()) { fields.push('name = ?'); params.push(name.trim()); }
  if (typeof email === 'string' && email.trim()) { fields.push('email = ?'); params.push(email.trim()); }
  if (typeof phone === 'string' && phone.trim()) { fields.push('phone = ?'); params.push(phone.trim()); }
  if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
  const sql = `UPDATE Technician SET ${fields.join(', ')} WHERE user_id = ?`;
  params.push(userId);
  db.query(sql, params, (error, results) => {
    if (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email or phone already in use.' });
      return res.status(500).json({ success: false });
    }
    if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Technician not found.' });
    res.json({ success: true });
  });
});

module.exports = router;