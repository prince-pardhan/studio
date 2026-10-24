/**
 * BeatFlow Studio - Full-Stack Express Server
 * Serves Vite middleware in development, static build in production,
 * and provides the server-side AI Music Assistant API endpoint using @google/genai.
 */
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize GoogleGenAI server client if API key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side AI Music Assistant route
app.post('/api/ai/suggest', async (req: Request, res: Response) => {
  try {
    const { prompt, type, genre, key, bpm } = req.body;

    if (!aiClient) {
      // Return signal to client to use rich built-in algorithmic generator
      return res.json({
        fallback: true,
        message: 'Using built-in algorithmic music engine',
      });
    }

    const systemInstruction = `You are an expert music producer and music theorist in a DAW (FL Studio style).
The user wants music creation assistance for genre: "${genre || 'Any'}", Key: "${key || 'C minor'}", BPM: ${bpm || 128}.
Requested generation type: "${type || 'all'}".
You MUST respond with valid JSON adhering to this schema:
{
  "title": string (creative pattern name),
  "description": string (brief musical rationale),
  "chords": [ { "name": string, "notes": string[] (e.g. ["C3", "Eb3", "G3", "Bb3"]), "step": number, "duration": number } ],
  "melody": [ { "pitch": string (e.g. "C4"), "midi": number, "step": number, "duration": number, "velocity": number } ],
  "bassline": [ { "pitch": string, "midi": number, "step": number, "duration": number, "velocity": number } ],
  "drumPattern": {
    "kick": number[] (16 values, 0 or 1),
    "snare": number[],
    "clap": number[],
    "hihat": number[],
    "openhat": number[],
    "perc": number[]
  },
  "theoryTip": string
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt || `Generate a high quality ${genre || 'electronic'} pattern in ${key || 'C minor'} at ${bpm || 128} BPM.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('AI assistant error:', err);
    return res.json({
      fallback: true,
      error: err.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!aiClient,
    timestamp: Date.now(),
  });
});

async function startServer() {
  if (!isProd) {
    // In development, mount Vite's connect instance as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`BeatFlow Studio server running on port ${port} (prod: ${isProd})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
