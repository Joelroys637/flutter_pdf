import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB connection
const mongoURI = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoURI);
let gfsBucket;

conn.once('open', () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('✅ Connected to MongoDB Atlas');
});

// ✅ Storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: 'uploads',
  }),
});

const upload = multer({ storage }).single('file');

// ✅ Upload route
app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ file: req.file, message: 'File uploaded successfully' });
  });
});

// ✅ List all files
app.get('/files', async (req, res) => {
  try {
    const files = await conn.db.collection('uploads.files').find().toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: 'No files found' });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Download file
app.get('/file/:filename', async (req, res) => {
  try {
    const file = await conn.db.collection('uploads.files').findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const downloadStream = gfsBucket.openDownloadStreamByName(req.params.filename);
    res.set('Content-Type', file.contentType);
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
