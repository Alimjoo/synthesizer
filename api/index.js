import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fetch from 'node-fetch'; // Add node-fetch for streaming binary responses
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { pipeline } from 'stream';
import { promisify } from 'util';

// Load environment variables from .env file
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Get Hugging Face token from environment variables
const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.error('Hugging Face token (HF_TOKEN) is not set in .env file');
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '../public')));


const API_URL = 'https://piyazon-ug-tts-api.hf.space/synthesize';
const API_URL_VV = 'https://piyazon-uyghur-vibevoice.hf.space/synthesize';

// New POST endpoint to proxy the TTS synthesis
app.post('/tts', async (req, res) => {
    const { text, model } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Missing required field: text' });
    }

    const form = new FormData();
    form.append('text', text);
    form.append('model', model);
    form.append('hf_token', HF_TOKEN);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        // Set headers for audio response
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', 'attachment; filename=speech.wav');

        // Stream the response directly to the client
        const streamPipeline = promisify(pipeline);
        await streamPipeline(response.body, res);
    } catch (error) {
        console.error('TTS synthesis error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.post('/tts_vv', async (req, res) => {
    const { text, model, cfgScale } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Missing required field: text' });
    }

    const form = new FormData();
    form.append('text', text);
    form.append('checkpoint_path_name', model);
    form.append('cfg_scale', cfgScale);
    form.append('hf_token', HF_TOKEN);

    // ---------- 2. Timeout controller ----------
    const TIMEOUT_MS = 5 * 60 * 1000;                 // 5 minutes (adjust as needed)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(API_URL_VV, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        // Set headers for audio response
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', 'attachment; filename=speech.wav');

        // Stream the response directly to the client
        const streamPipeline = promisify(pipeline);
        await streamPipeline(response.body, res);
    } catch (error) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn('TTS request timed out after', TIMEOUT_MS / 1000, 'seconds');
            return res.status(504).json({ error: 'Synthesis timed out – try a shorter text or a faster model' });
        }
        console.error('TTS synthesis error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});



// Optional: Example GET route for testing or serving a form
app.get('/tts-test', (req, res) => {
    res.send(`
        <form action="/tts" method="POST">
            <label>Text: <input type="text" name="text" value="ھەممە ئادەم ئەركىن بولۇپ تۇغۇلىدۇ، ھەمدە ئىززەت-ھۆرمەت ۋە ھوقۇقتا باب باراۋەر بولىدۇ." /></label><br/>
            <label>Model: <input type="text" name="model" value="piyazon/TTS-Radio-Girl-Ug" /></label><br/>
            <button type="submit">Synthesize</button>
        </form>
    `);
});






// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});