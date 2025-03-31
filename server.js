/**
 * Express server for Captain's Log application
 */

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.STORAGE_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for audio uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${req.params.id || Date.now()}.webm`);
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Routes for the API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Audio file upload endpoint
app.post('/api/recordings/:id/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    return res.json({
      success: true,
      filePath: req.file.path,
      fileName: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Serve audio files
app.get('/api/recordings/:id', (req, res) => {
  const filePath = path.join(uploadsDir, `${req.params.id}.webm`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  
  res.sendFile(filePath);
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Captain's Log server running on port ${PORT}`);
});