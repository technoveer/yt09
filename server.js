const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Utility function to validate YouTube URL
function isValidYouTubeURL(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie|music\.youtube)\.(com|be)\//;
    return youtubeRegex.test(url);
}

// Utility function to sanitize filename
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Streaming server is running' });
});

// Get video info
app.post('/api/video-info', (req, res) => {
    const { url } = req.body;
    if (!url || !isValidYouTubeURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-warnings',
        url
    ]);

    let output = '';
    let errorOutput = '';

    ytdlp.stdout.on('data', (data) => {
        output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error('yt-dlp error:', errorOutput);
            return res.status(500).json({ error: 'Failed to fetch video info', details: errorOutput });
        }
        try {
            const info = JSON.parse(output);
            res.json({
                success: true,
                title: info.title || 'YouTube Audio',
                duration: info.duration || 0,
                thumbnail: info.thumbnail || '',
                videoId: info.id || ''
            });
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse video info' });
        }
    });
});

// STREAMING CONVERSION ENDPOINT
app.get('/api/stream', (req, res) => {
    const { url, title } = req.query;

    if (!url || !isValidYouTubeURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const safeTitle = sanitizeFilename(title || 'audio');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytmp3-'));
    const outputTemplate = path.join(tempDir, `${safeTitle}.%(ext)s`);

    console.log(`[Download] Starting conversion for: ${url}`);

    const ytdlp = spawn('yt-dlp', [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--no-playlist',
        '--no-check-certificates',
        '--extractor-args', 'youtube:player_client=android,web',
        '--js-runtimes', 'node',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        '-o', outputTemplate,
        url
    ]);

    let errorOutput = '';

    ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[yt-dlp] ${data}`);
    });

    ytdlp.on('close', () => {
        try {
            const files = fs.readdirSync(tempDir);
            const mp3File = files.find(f => f.endsWith('.mp3'));

            if (!mp3File) {
                return res.status(500).json({
                    error: 'Audio conversion failed',
                    details: errorOutput
                });
            }

            const finalPath = path.join(tempDir, mp3File);
            const stats = fs.statSync(finalPath);

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
            res.setHeader('Content-Length', stats.size);

            const stream = fs.createReadStream(finalPath);
            stream.pipe(res);

            stream.on('close', () => {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (e) {}
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                error: 'Audio conversion failed',
                details: errorOutput || err.message
            });
        }
    });

    ytdlp.on('error', (err) => {
        console.error(err);
        return res.status(500).json({
            error: 'yt-dlp process failed',
            details: err.message
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Streaming Backend running on port ${PORT}`);
});
