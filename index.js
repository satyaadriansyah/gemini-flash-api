import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express()
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// Destination Uploads
const upload = multer({ dest: 'uploads/'});                                      

// Route 
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Generate Text

app.post('/generate-text', async (req, res) => {
  const prompt = req.body.prompt;
  if(!prompt) {
    return res.status(400).json( { 'error' : 'Prompt is required.' });
  }

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    res.json({ ouput: text });
  } catch (error) {
    res.status(500).json( { error: error.message });
  }
  
});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  const prompt = req.body.prompt;
  const image = imageToGenerativePart(req.file.path);
  if(!prompt) {
    return res.status(400).json( { 'error' : 'Prompt is required.' });
  }
  if(!image) {
    return res.status(400).json( { 'error' : 'Image is required.' });
  }

  try {
    const result = await model.generateContent([prompt, image]);
    const response = result.response;
    const text = response.text();
    res.json({ ouput: text });
  } catch (error) {
    res.status(500).json( { error: error.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  const filePath = req.file.path;
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const mimeType = req.file.mimetype;
  try {
    const documentPart = {
        inlineData: {
        data: base64,
        mimeType: mimeType,
      }
    };
    const result = await model.generateContent([documentPart]);
    const response = result.response;
    const text = response.text();
    res.json({ ouput: text });
  } catch (error) {
    res.status(500).json( { error: error.message });
  } finally {
    fs.unlinkSync(filePath);
  }
});

// image To Generative Part ---
function imageToGenerativePart(imagePath) {
  const fileExtension = path.extname(imagePath).toLowerCase(); // Ambil ekstensi dan ubah ke huruf kecil
  let mimeType;
  switch (fileExtension) {
    case '.jpeg':
    case '.jpg':
      mimeType = 'image/jpeg';
      break;
    case '.png':
      mimeType = 'image/png';
      break;
    case '.gif':
      mimeType = 'image/gif';
      break;
    case '.webp':
      mimeType = 'image/webp';
      break;
    default:
      console.warn(`Unsupported file type: ${fileExtension}. Defaulting to image/jpeg.`);
      mimeType = 'image/jpeg'; // Fallback atau Anda bisa melempar error
  }
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
      mimeType: mimeType,
    },
  };
}

app.listen(port, () => {
  console.log(`Gemini API Server is running on http://localhost:${port}`)
});
