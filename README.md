# YouTube to MP3 Backend Server

यह एक Node.js + Express backend server है जो YouTube videos को MP3 में convert करता है। यह `yt-dlp` और `ffmpeg` का उपयोग करता है।

## Requirements

- Node.js (v14+)
- npm
- ffmpeg
- yt-dlp
- Python 3.6+

## Installation

```bash
# Install Node.js dependencies
npm install

# Install system dependencies (Ubuntu/Debian)
sudo apt-get install ffmpeg python3-pip
sudo pip3 install yt-dlp
```

## Running the Server

```bash
# Development
node server.js

# Or with npm script (after adding to package.json)
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### 1. Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. Get Video Information
```
POST /api/video-info
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=..."
}
```

Response:
```json
{
  "success": true,
  "title": "Video Title",
  "duration": 180,
  "thumbnail": "https://...",
  "videoId": "dQw4w9WgXcQ"
}
```

### 3. Convert Video to MP3
```
POST /api/convert
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=...",
  "title": "Custom Title (optional)"
}
```

Response:
```json
{
  "success": true,
  "downloadUrl": "/uploads/uuid.mp3",
  "filename": "Custom Title.mp3",
  "fileSize": 5242880,
  "conversionId": "uuid"
}
```

### 4. Download File
```
GET /api/download/conversionId?filename=CustomName.mp3
```

### 5. Cleanup File
```
POST /api/cleanup
Content-Type: application/json

{
  "conversionId": "uuid"
}
```

## Directory Structure

```
yt-mp3-backend/
├── server.js           # Main server file
├── package.json        # Node.js dependencies
├── .env               # Environment variables
├── .gitignore         # Git ignore file
├── uploads/           # Converted MP3 files (created on first run)
├── temp/              # Temporary files (created on first run)
└── README.md          # This file
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Features

✅ YouTube URL validation
✅ Video information retrieval
✅ High-quality MP3 conversion
✅ Automatic cleanup of temporary files
✅ CORS support
✅ Error handling
✅ File download with custom names

## Deployment

### Using PM2 (Recommended for Production)

```bash
npm install -g pm2
pm2 start server.js --name "yt-mp3-backend"
pm2 save
pm2 startup
```

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip
RUN pip3 install yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t yt-mp3-backend .
docker run -p 3000:3000 yt-mp3-backend
```

## Frontend Integration

Update your frontend JavaScript to call these endpoints:

```javascript
// Get video info
const infoResponse = await fetch('http://localhost:3000/api/video-info', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: youtubeUrl })
});

// Convert video
const convertResponse = await fetch('http://localhost:3000/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: youtubeUrl, title: videoTitle })
});

const data = await convertResponse.json();
// Download file
window.location.href = `http://localhost:3000${data.downloadUrl}`;
```

## Troubleshooting

### yt-dlp not found
```bash
sudo pip3 install --upgrade yt-dlp
```

### ffmpeg not found
```bash
sudo apt-get install ffmpeg
```

### Port already in use
Change PORT in .env file or use:
```bash
PORT=8000 node server.js
```

### Permission denied errors
```bash
chmod +x server.js
```

## License

ISC

## Support

For issues or questions, please check the logs and ensure all dependencies are installed correctly.
