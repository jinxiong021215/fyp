const mysql = require('mysql');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'cJXnWM32154!',
  database: 'fyp',
  waitForConnections: true,
  connectionLimit: 10,
});
module.exports = db;