require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const customerAuth = require('./routes/customerAuth');
const companyAuth = require('./routes/intraAuth');
const itemRoute = require('./routes/itemRoute');
const caseRoute = require('./routes/caseRoute');
const reportRoute = require('./routes/reportRoute');

app.use(customerAuth);
app.use(companyAuth);
app.use(itemRoute);
app.use(caseRoute);
app.use(reportRoute);

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});


