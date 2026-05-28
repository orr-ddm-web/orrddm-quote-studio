require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (logos, etc.) — stored on persistent volume /data/uploads
const DATA_DIR = process.env.DATA_DIR || '/data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// API Routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/ai', require('./routes/ai'));

// Serve built frontend in production
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({ status: 'OrrDDM Quote Studio API running', version: '1.0.0' }));
}

app.listen(PORT, () => {
  console.log(`OrrDDM Quote Studio API listening on port ${PORT}`);
});

module.exports = app;
