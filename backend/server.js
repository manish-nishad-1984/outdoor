require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/outdoor-orders', require('./routes/outdoorOrders'));
app.use('/api/sales',          require('./routes/sales'));
app.use('/api/receipts',       require('./routes/receipts'));
app.use('/api/accounts',       require('./routes/accounts'));
app.use('/api/employees',      require('./routes/employees'));
app.use('/api/reports',        require('./routes/reports'));

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
