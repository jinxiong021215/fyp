const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyJWT } = require('./auth');

// Customer Submit a Case (Request Ticket)
// Create case (customer)
router.post('/cases', verifyJWT('customer'), (req, res) => {
  const { description, type, item_id, customer_id } = req.body;
  if (!item_id) {
    return res.json({ success: false, message: 'Item is required' });
  }
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.json({ success: false, message: 'Transaction failed' });
    }
    // Insert case
    db.query(
      'INSERT INTO cases (description, type, status, draft_status, customer_id) VALUES (?, ?, ?, NOW(), ?)',
      [description, type, 'draft', customer_id],
      (err, results) => {
        if (err) {
          console.error('Case insert error:', err);
          return db.rollback(() => res.json({ success: false, message: 'Case creation failed' }));
        }
        const caseId = results.insertId;
        // Insert bill
        db.query(
          'INSERT INTO Bill (description, amount, case_id) VALUES (?, 0, ?)',
          [description, caseId],
          (err2, results2) => {
            if (err2) {
              console.error('Bill insert error:', err2);
              return db.rollback(() => res.json({ success: false, message: 'Bill creation failed' }));
            }
            const billId = results2.insertId;
            // Get item price
            db.query('SELECT price FROM Item WHERE item_id = ?', [item_id], (err3, results3) => {
              if (err3 || !results3.length) {
                console.error('Item fetch error:', err3);
                return db.rollback(() => res.json({ success: false, message: 'Item not found' }));
              }
              let price = results3[0].price;
              if (price == null) price = 0; // Handle null price
              // Set bill amount: 0 for warranty, price for non-warranty
              const billAmount = (type === 'warranty') ? 0 : price;
              // Update bill with amount
              db.query(
                'UPDATE Bill SET amount = ? WHERE bill_id = ?',
                [billAmount, billId],
                (err4, results4) => {
                  if (err4) {
                    console.error('Bill update error:', err4);
                    return db.rollback(() => res.json({ success: false, message: 'Bill update failed' }));
                  }
                  // Insert billitem with only bill_id and item_id
                  db.query(
                    'INSERT INTO BillItem (bill_id, item_id) VALUES (?, ?)',
                    [billId, item_id],
                    (err5, results5) => {
                      if (err5) {
                        console.error('BillItem insert error:', err5);
                        return db.rollback(() => res.json({ success: false, message: 'BillItem creation failed' }));
                      }
                      db.commit((err6) => {
                        if (err6) {
                          console.error('Commit error:', err6);
                          return db.rollback(() => res.json({ success: false, message: 'Commit failed' }));
                        }
                        res.json({ success: true });
                      });
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  });
});

// Get all Cases
// List cases (admin/company/technician/customer)
router.get('/cases', verifyJWT('admin', 'company', 'technician', 'customer'), (req, res) => {
  // Use consolidated view for dashboard lists and counts
  const status = req.query.status; // e.g., DRAFT/ASSIGNED/...
  const technician_id = req.query.technician_id; // optional filter
  let sql = `SELECT vw.* FROM vw_case_search vw`;
  const params = [];
  const clauses = [];
  if (technician_id) {
    clauses.push(`EXISTS (SELECT 1 FROM Technician_Case tc WHERE tc.case_id = vw.case_id AND tc.technician_id = ?)`);
    params.push(technician_id);
  }
  if (status) {
    clauses.push(`vw.status = ?`);
    params.push(status);
  }
  if (clauses.length) sql += ` WHERE ` + clauses.join(' AND ');
  sql += ` ORDER BY vw.case_id DESC`;
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('DB error (vw_case_search):', err);
      return res.json({ success: false, message: 'DB error' });
    }
    res.json({ success: true, data: results });
  });
});

// flexible search endpoint using the consolidated view
router.get('/cases/search', verifyJWT('admin', 'company', 'technician', 'customer'), (req, res) => {
  const q = req.query.q || '';
  const status = req.query.status || '';
  const customer_id = req.query.customer_id ? Number(req.query.customer_id) : null;
  const technician_id = req.query.technician_id ? Number(req.query.technician_id) : null;

  // Build dynamic WHERE over the view (avoids requiring stored procs on some hosts)
  let sql = `SELECT vw.* FROM vw_case_search vw`;
  const params = [];
  const clauses = [];
  if (q) {
    clauses.push(`(CAST(vw.case_id AS CHAR) LIKE CONCAT('%', ?, '%')
      OR vw.description LIKE CONCAT('%', ?, '%')
      OR vw.customer_name LIKE CONCAT('%', ?, '%')
      OR vw.item_name LIKE CONCAT('%', ?, '%')
      OR vw.admin_name LIKE CONCAT('%', ?, '%'))`);
    params.push(q, q, q, q, q);
  }
  if (status) { clauses.push(`vw.status = ?`); params.push(status); }
  if (customer_id != null && !Number.isNaN(customer_id)) { clauses.push(`vw.customer_id = ?`); params.push(customer_id); }
  if (technician_id != null && !Number.isNaN(technician_id)) {
    clauses.push(`EXISTS (SELECT 1 FROM Technician_Case tc WHERE tc.case_id = vw.case_id AND tc.technician_id = ?)`);
    params.push(technician_id);
  }
  if (clauses.length) sql += ` WHERE ` + clauses.join(' AND ');
  sql += ` ORDER BY vw.case_id DESC`;
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('DB error (/cases/search):', err);
      return res.json({ success: false, message: 'DB error' });
    }
    res.json({ success: true, data: results });
  });
});

// Admin Assign Technician to Case
router.post('/cases/:id/assign', verifyJWT('admin'), (req, res) => {
  console.log('Assign route called', req.body);
  const caseId = req.params.id;
  const { technician_id, admin_id } = req.body;

  // First, check current case status
  db.query('SELECT status FROM cases WHERE case_id = ?', [caseId], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.json({ success: false, message: err.message || 'DB error' });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: 'Case not found' });
    }

    const currentStatus = results[0].status;

    // If case is already assigned or in progress, only add technician without changing status
    if (currentStatus === 'ASSIGNED' || currentStatus === 'IN_PROGRESS') {
      // Just insert into technician_case table
      db.query(
        'INSERT IGNORE INTO technician_case (technician_id, case_id) VALUES (?, ?)',
        [technician_id, caseId],
        (err2, results2) => {
          if (err2) {
            console.error('DB error:', err2);
            return res.json({ success: false, message: err2.message || 'DB error' });
          }
          res.json({ success: true });
        }
      );
    } else {
      // Initial assignment: update status and timestamp, then add technician
      let sql = 'UPDATE cases SET status = ?, assigned_status = NOW()';
      const params = ['ASSIGNED'];
      if (admin_id) { sql += ', admin_id = ?'; params.push(admin_id); }
      sql += ' WHERE case_id = ?';
      params.push(caseId);
      db.query(
        sql,
        params,
        (err2, results2) => {
          if (err2) {
            console.error('DB error:', err2);
            return res.json({ success: false, message: err2.message || 'DB error' });
          }
          // Then, insert into technician_case
          db.query(
            'INSERT IGNORE INTO technician_case (technician_id, case_id) VALUES (?, ?)',
            [technician_id, caseId],
            (err3, results3) => {
              if (err3) {
                console.error('DB error:', err3);
                return res.json({ success: false, message: err3.message || 'DB error' });
              }
              res.json({ success: true });
            }
          );
        }
      );
    }
  });
});

// Update case status
router.put('/cases/:id/status', verifyJWT('admin', 'technician'), (req, res) => {
  const caseId = req.params.id;
  const { status, technician_id, priority, admin_id, reason, user_id } = req.body;
  // If technician_id provided, check if the case is assigned to this technician
  if (technician_id) {
    db.query(
      'SELECT * FROM technician_case WHERE technician_id = ? AND case_id = ?',
      [technician_id, caseId],
      (err, results) => {
        if (err) {
          console.error('DB error:', err);
          return res.json({ success: false, message: 'DB error' });
        }
        if (results.length === 0) {
          return res.json({ success: false, message: 'Unauthorized: Case not assigned to this technician' });
        }
        // Proceed to update
        updateStatus();
      }
    );
  } else {
    // No technician_id, assume admin or other role
    updateStatus();
  }

  function updateStatus() {
    // Special handling: if setting to COMPLETE and the case is warranty,
    // auto mark as PAID and create a zero-amount completed payment with "-warranty" suffix
    if (status === 'COMPLETE') {
      // Look up case type and bill
      const sqlInfo = `
        SELECT cases.type, Bill.bill_id, Bill.description
        FROM cases
        LEFT JOIN Bill ON cases.case_id = Bill.case_id
        WHERE cases.case_id = ?
      `;
      db.query(sqlInfo, [caseId], (errInfo, rowsInfo) => {
        if (errInfo) {
          console.error('DB error:', errInfo);
          return res.json({ success: false, message: errInfo.message || 'DB error' });
        }
        if (!rowsInfo || !rowsInfo.length) {
          return res.json({ success: false, message: 'Case not found' });
        }
        const row = rowsInfo[0];
        const caseType = (row.type || '').toLowerCase();
        const billId = row.bill_id;
        const billDesc = row.description || 'Case payment';

        if (caseType === 'warranty') {
          // Transaction: set case to PAID, ensure payment exists as COMPLETE with zero amount and suffixed description
          db.beginTransaction((errTx) => {
            if (errTx) {
              console.error('Transaction start error:', errTx);
              return res.json({ success: false, message: 'Transaction failed' });
            }
            // Update case to PAID; also set complete_status if not already set
            let sqlUpdate = `UPDATE cases SET status = 'PAID', paid_status = NOW(), complete_status = IFNULL(complete_status, NOW())`;
            const paramsUpdate = [];
            if (priority) {
              sqlUpdate += `, priority = ?`;
              paramsUpdate.push(priority);
            }
            sqlUpdate += ` WHERE case_id = ?`;
            paramsUpdate.push(caseId);
            db.query(sqlUpdate, paramsUpdate, (errUp) => {
              if (errUp) {
                return db.rollback(() => res.json({ success: false, message: errUp.message || 'DB error' }));
              }

              // Ensure payment exists/complete for this bill
              if (!billId) {
                // No bill found; commit case update anyway
                return db.commit((errC) => {
                  if (errC) {
                    return db.rollback(() => res.json({ success: false, message: 'Commit failed' }));
                  }
                  return res.json({ success: true });
                });
              }

              db.query('SELECT * FROM Payment WHERE bill_id = ? ORDER BY payment_id DESC LIMIT 1', [billId], (errPay, payRows) => {
                if (errPay) {
                  return db.rollback(() => res.json({ success: false, message: errPay.message || 'DB error' }));
                }
                const suffix = ' -warranty';
                const descWithSuffix = billDesc.endsWith(suffix) ? billDesc : (billDesc + suffix);
                if (payRows && payRows.length && payRows[0].status === 'COMPLETE') {
                  // Optionally update description/amount to ensure zero and suffix
                  const p = payRows[0];
                  db.query(
                    `UPDATE Payment SET description = ?, amount = 0 WHERE payment_id = ?`,
                    [descWithSuffix, p.payment_id],
                    (errUpdPay) => {
                      if (errUpdPay) {
                        return db.rollback(() => res.json({ success: false, message: errUpdPay.message || 'DB error' }));
                      }
                      db.commit((errCommit) => {
                        if (errCommit) {
                          return db.rollback(() => res.json({ success: false, message: 'Commit failed' }));
                        }
                        return res.json({ success: true });
                      });
                    }
                  );
                } else {
                  // Insert new COMPLETE payment, zero amount, with suffix
                  db.query(
                    `INSERT INTO Payment (description, amount, status, complete_status, transaction_date, bill_id)
                     VALUES (?, 0, 'COMPLETE', NOW(), NOW(), ?)`,
                    [descWithSuffix, billId],
                    (errIns) => {
                      if (errIns) {
                        return db.rollback(() => res.json({ success: false, message: errIns.message || 'DB error' }));
                      }
                      db.commit((errCommit) => {
                        if (errCommit) {
                          return db.rollback(() => res.json({ success: false, message: 'Commit failed' }));
                        }
                        return res.json({ success: true });
                      });
                    }
                  );
                }
              });
            });
          });
        } else {
          // Non-warranty: original behavior, set to COMPLETE and timestamp
          let sql = `UPDATE cases SET status = 'COMPLETE', complete_status = NOW()`;
          const params = [];
          if (priority) {
            sql += `, priority = ?`;
            params.push(priority);
          }
          sql += ` WHERE case_id = ?`;
          params.push(caseId);
          db.query(sql, params, (err, results) => {
            if (err) {
              console.error('DB error:', err);
              return res.json({ success: false, message: err.message || 'DB error' });
            }
            res.json({ success: true });
          });
        }
      });
      return; // early return; async handling above
    }

    // All other statuses: original update path
    let updateField = '';
    if (status === 'ASSIGNED') updateField = 'assigned_status = NOW()';
    else if (status === 'IN_PROGRESS') updateField = 'progress_status = NOW()';
    else if (status === 'CANCELED') updateField = 'canceled_status = NOW()';
    else if (status === 'PAID') updateField = 'paid_status = NOW()';
    let sql = `UPDATE cases SET status = ?`;
    let params = [status];
    if (updateField) {
      sql += `, ${updateField}`;
    }
    if (status === 'ASSIGNED' && admin_id) {
      sql += `, admin_id = ?`;
      params.push(admin_id);
    }
    if (priority) {
      sql += `, priority = ?`;
      params.push(priority);
    }
    sql += ` WHERE case_id = ?`;
    params.push(caseId);
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.json({ success: false, message: err.message || 'DB error' });
      }
      // If canceled with reason, record as a case comment by admin
      if (status === 'CANCELED' && reason) {
        const authorId = admin_id || user_id || null;
        const content = `Cancel reason: ${reason}`;
        if (authorId) {
          db.query(
            'INSERT INTO CaseComment (case_id, user_id, user_role, content) VALUES (?, ?, ?, ?)',
            [caseId, authorId, 'admin', content],
            () => res.json({ success: true })
          );
        } else {
          // No admin id to attach; still succeed on status update
          res.json({ success: true });
        }
      } else {
        res.json({ success: true });
      }
    });
  }
});

// Get assigned technicians for a case
router.get('/cases/:id/assigned-technicians', verifyJWT('admin', 'company', 'technician', 'customer'), (req, res) => {
  const caseId = req.params.id;
  db.query(
    'SELECT Technician.user_id, Technician.name, Technician.email FROM Technician_Case tc JOIN Technician ON tc.technician_id = Technician.user_id WHERE tc.case_id = ?',
    [caseId],
    (err, results) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, data: results });
    }
  );
});

// Remove technician from case
router.delete('/cases/:id/technicians/:techId', verifyJWT('admin'), (req, res) => {
  const caseId = req.params.id;
  const techId = req.params.techId;

  // First, ensure this isn't the last assigned technician
  db.query('SELECT COUNT(*) AS cnt FROM Technician_Case WHERE case_id = ?', [caseId], (countErr, countRows) => {
    if (countErr) {
      console.error('Error counting assigned technicians:', countErr);
      return res.json({ success: false, message: 'Failed to verify assigned technicians' });
    }
    const count = (countRows && countRows[0] && countRows[0].cnt) || 0;
    if (count <= 1) {
      return res.json({ success: false, message: 'Cannot remove the last assigned technician' });
    }

    // Proceed with removal
    db.query(
      'DELETE FROM Technician_Case WHERE case_id = ? AND technician_id = ?',
      [caseId, techId],
      (err, results) => {
        if (err) {
          console.error('Error removing technician:', err);
          return res.json({ success: false, message: 'Failed to remove technician' });
        }
        if (results.affectedRows === 0) {
          return res.json({ success: false, message: 'Technician assignment not found' });
        }
        res.json({ success: true, message: 'Technician removed successfully' });
      }
    );
  });
});

// Create admin notification for technician rejection
router.post('/cases/:id/rejection-notification', verifyJWT('technician', 'admin'), (req, res) => {
  const caseId = req.params.id;
  const { technician_id, reason } = req.body;
  
  // Get technician name and case admin info
  db.query(
    'SELECT t.name as tech_name, c.admin_id FROM Technician t, Cases c WHERE t.user_id = ? AND c.case_id = ?',
    [technician_id, caseId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.json({ success: false, message: 'Failed to get case/technician info' });
      }
      
      const techName = results[0].tech_name;
      const adminId = results[0].admin_id;
      
      // Create a comment/notification for the admin
      const notificationContent = `🚨 REJECTION ALERT: Technician ${techName} has rejected this case assignment. Reason: ${reason}`;
      
      db.query(
        'INSERT INTO CaseComment (case_id, user_id, user_role, content) VALUES (?, ?, ?, ?)',
        [caseId, adminId || 0, 'admin', notificationContent],
        (err2, results2) => {
          if (err2) {
            console.error('Error creating notification:', err2);
            return res.json({ success: false, message: 'Failed to create notification' });
          }
          res.json({ success: true, message: 'Rejection notification created' });
        }
      );
    }
  );
});

// Get case details (for caseDetail page)
router.get('/cases/:id', verifyJWT('admin', 'company', 'technician', 'customer'), (req, res) => {
  const caseId = req.params.id;
  const sql = `
    SELECT cases.*, Customer.name AS customer_name, Customer.location, Item.item_name, BillItem.item_id,
           Bill.bill_id AS bill_id, Bill.amount AS bill_amount,
           Admin.name AS admin_name, Admin.email AS admin_email
    FROM cases
    LEFT JOIN Customer ON cases.customer_id = Customer.user_id
    LEFT JOIN Bill ON cases.case_id = Bill.case_id
    LEFT JOIN BillItem ON Bill.bill_id = BillItem.bill_id
    LEFT JOIN Item ON BillItem.item_id = Item.item_id
    LEFT JOIN Admin ON cases.admin_id = Admin.user_id
    WHERE cases.case_id = ?
  `;
  db.query(sql, [caseId], (err, results) => {
    if (err) return res.json({ success: false });
    if (results.length === 0) return res.json({ success: false, message: 'Case not found' });
    const caseData = results[0];
    // Get assigned technicians
    db.query(
      'SELECT Technician.user_id, Technician.name, Technician.email FROM Technician_Case tc JOIN Technician ON tc.technician_id = Technician.user_id WHERE tc.case_id = ?',
      [caseId],
      (err2, techResults) => {
        if (err2) return res.json({ success: false });
        caseData.technician = techResults.length > 0 ? techResults[0] : null; // Assuming one technician for simplicity
        // Also attach latest payment status (if any)
        if (caseData.bill_id) {
          db.query('SELECT * FROM Payment WHERE bill_id = ? ORDER BY payment_id DESC LIMIT 1', [caseData.bill_id], (err3, payRows) => {
            if (!err3 && payRows && payRows.length) {
              caseData.payment = payRows[0];
            }
            return res.json({ success: true, data: caseData });
          });
        } else {
          return res.json({ success: true, data: caseData });
        }
      }
    );
  });
});

// Get bill and payment info for a case
router.get('/cases/:id/bill', verifyJWT('admin', 'company', 'technician', 'customer'), (req, res) => {
  const caseId = req.params.id;
  const sql = `
    SELECT Bill.bill_id, Bill.amount, Bill.case_id
    FROM Bill
    WHERE Bill.case_id = ?
  `;
  db.query(sql, [caseId], (err, billRows) => {
    if (err) return res.json({ success: false, message: err.message || 'DB error' });
    if (!billRows || billRows.length === 0) return res.json({ success: false, message: 'Bill not found' });
    const bill = billRows[0];
    db.query('SELECT * FROM Payment WHERE bill_id = ? ORDER BY payment_id DESC LIMIT 1', [bill.bill_id], (err2, payRows) => {
      if (err2) return res.json({ success: false, message: err2.message || 'DB error' });
      const payment = payRows && payRows.length ? payRows[0] : null;
      res.json({ success: true, data: { bill, payment } });
    });
  });
});

// Complete a payment for a given bill
router.post('/payments/complete', verifyJWT('admin', 'company'), (req, res) => {
  const { bill_id } = req.body;
  console.log('Payment completion requested for bill_id:', bill_id);
  if (!bill_id) return res.json({ success: false, message: 'bill_id is required' });
  
  // Start transaction to ensure both payment and case status are updated together
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.json({ success: false, message: 'Transaction failed' });
    }
    
    // Check existing payment
    db.query('SELECT * FROM Payment WHERE bill_id = ? ORDER BY payment_id DESC LIMIT 1', [bill_id], (err, rows) => {
      if (err) {
        return db.rollback(() => res.json({ success: false, message: err.message || 'DB error' }));
      }
      
      if (rows && rows.length) {
        const p = rows[0];
        if (p.status === 'COMPLETE') {
          return db.rollback(() => res.json({ success: true }));
        }
        
        // Update payment to COMPLETE
        db.query(
          `UPDATE Payment SET status = 'COMPLETE', complete_status = NOW(), transaction_date = NOW() WHERE payment_id = ?`,
          [p.payment_id],
          (err2) => {
            if (err2) {
              return db.rollback(() => res.json({ success: false, message: err2.message || 'DB error' }));
            }
            
            // Update case status to PAID
            updateCaseStatusToPaid();
          }
        );
      } else {
        // Insert a new COMPLETE payment with amount from bill (and suffix -warranty + set 0 amount if case is warranty)
        db.query('SELECT amount, description, case_id FROM Bill WHERE bill_id = ?', [bill_id], (err3, billRows) => {
          if (err3 || !billRows || !billRows.length) {
            return db.rollback(() => res.json({ success: false, message: 'Bill not found' }));
          }
          
          const rawAmount = billRows[0].amount || 0;
          const billDesc = billRows[0].description || 'Case payment';
          const caseIdFromBill = billRows[0].case_id;
          // Check case type for warranty
          db.query('SELECT type FROM cases WHERE case_id = ?', [caseIdFromBill], (errType, typeRows) => {
            if (errType || !typeRows || !typeRows.length) {
              return db.rollback(() => res.json({ success: false, message: 'Case not found for bill' }));
            }
            const isWarranty = String(typeRows[0].type || '').toLowerCase() === 'warranty';
            const suffix = ' -warranty';
            const desc = billDesc.endsWith(suffix) ? billDesc : (billDesc + (isWarranty ? suffix : ''));
            const amount = isWarranty ? 0 : rawAmount;
            db.query(
              `INSERT INTO Payment (description, amount, status, complete_status, transaction_date, bill_id)
               VALUES (?, ?, 'COMPLETE', NOW(), NOW(), ?)`,
              [desc, amount, bill_id],
              (err4) => {
                if (err4) {
                  return db.rollback(() => res.json({ success: false, message: err4.message || 'DB error' }));
                }
                // Update case status to PAID
                updateCaseStatusToPaid();
              }
            );
          });
        });
      }
      
      function updateCaseStatusToPaid() {
        // Get case_id from bill
        db.query('SELECT case_id FROM Bill WHERE bill_id = ?', [bill_id], (err5, caseRows) => {
          if (err5 || !caseRows || !caseRows.length) {
            return db.rollback(() => res.json({ success: false, message: 'Case not found for bill' }));
          }
          
          const case_id = caseRows[0].case_id;
          
          // Update case status to PAID
          db.query(
            'UPDATE Cases SET status = ?, paid_status = NOW() WHERE case_id = ?',
            ['PAID', case_id],
            (err6) => {
              if (err6) {
                console.error('Error updating case to PAID status:', err6);
                return db.rollback(() => res.json({ success: false, message: err6.message || 'DB error' }));
              }
              
              console.log('Successfully updated case', case_id, 'to PAID status');
              
              // Commit transaction
              db.commit((err7) => {
                if (err7) {
                  console.error('Transaction commit error:', err7);
                  return db.rollback(() => res.json({ success: false, message: 'Commit failed' }));
                }
                console.log('Payment completion transaction committed successfully');
                res.json({ success: true });
              });
            }
          );
        });
      }
    });
  });
});

// Get comments for a case
router.get('/cases/:id/comments', (req, res) => {
  const caseId = req.params.id;
  const sql = `
    SELECT cc.*, COALESCE(a.name, t.name, cu.name) AS author_name
    FROM CaseComment cc
    LEFT JOIN Admin a ON (cc.user_role = 'admin' AND cc.user_id = a.user_id)
    LEFT JOIN Technician t ON (cc.user_role = 'technician' AND cc.user_id = t.user_id)
    LEFT JOIN Customer cu ON (cc.user_role = 'customer' AND cc.user_id = cu.user_id)
    WHERE cc.case_id = ?
    ORDER BY cc.created_at ASC
  `;
  db.query(sql, [caseId], (err, results) => {
    if (err) {
      console.error('Error fetching comments:', err);
      return res.json({ success: false, message: 'Failed to fetch comments' });
    }
    res.json({ success: true, data: results });
  });
});

// Post a comment
router.post('/cases/:id/comments', (req, res) => {
  const caseId = req.params.id;
  const { content, user_id, user_role } = req.body;
  if (!content || !user_id || !user_role) {
    return res.json({ success: false, message: 'Missing required fields' });
  }
  db.query(
    'INSERT INTO CaseComment (case_id, user_id, user_role, content) VALUES (?, ?, ?, ?)',
    [caseId, user_id, user_role, content],
    (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.json({ success: false, message: err.message || 'DB error' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;