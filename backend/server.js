require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/outdoor-orders',  require('./routes/outdoorOrders'));
app.use('/api/studio-orders',   require('./routes/studioOrders'));
app.use('/api/sales',           require('./routes/sales'));
app.use('/api/receipts',        require('./routes/receipts'));
app.use('/api/accounts',        require('./routes/accounts'));
app.use('/api/accounts-master', require('./routes/accountsMaster'));
app.use('/api/items',           require('./routes/items'));
app.use('/api/employees',       require('./routes/employees'));
app.use('/api/reports',         require('./routes/reports'));
app.use('/api/quotations',      require('./routes/quotations'));
app.use('/api/purchases',       require('./routes/purchases'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/design-jobs',     require('./routes/designJobs'));
app.use('/api/exposing',        require('./routes/exposing'));
app.use('/api/hire-orders',     require('./routes/hireOrders'));
app.use('/api/attendance',      require('./routes/attendance'));
app.use('/api/bookings',        require('./routes/bookings'));
app.use('/api/payroll',         require('./routes/payroll'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve built React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
