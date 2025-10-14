import cors from 'cors';
import express from 'express';
import grid from 'gridfs-stream';
import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Atlas connection
const mongoURI = 'mongodb+srv://joelroys637_db_user:leo123@cluster0.vvecegs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const conn = mongoose.createConnection(mongoURI);

let gfs;
conn.once('open', () => {
  gfs = grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
  console.log('✅ Connected to MongoDB Atlas');
});

// ✅ Storage setup
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: 'uploads',
  }),
});
const upload = multer({ storage }).single('file'); // 👈 Must match Flutter field name!

// ✅ Upload route
app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ error: err.message });
    }
    res.json({ file: req.file, message: 'File uploaded successfully' });
  });
});

// ✅ Fetch all files
app.get('/files', async (req, res) => {
  try {
    const files = await gfs.files.find().toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'No files found' });
    }
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Download single file
app.get('/file/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    const readstream = gfs.createReadStream(file.filename);
    res.set('Content-Type', file.contentType);
    readstream.pipe(res);
  });
});

// ✅ Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
