# DubDub Browser Extension

AI-powered language learning while watching videos on Netflix, YouTube, Disney+, Hulu, and Prime Video.

## Features

- 🎯 **Click any subtitle word** to get instant definitions and translations
- 🔊 **Text-to-Speech** with normal and slow speeds (11 languages supported)
- 🧠 **Word tokenization** for accurate word boundaries
- 💾 **Smart caching** to minimize API calls
- 🌍 **Multi-language support**: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Arabic, Hindi

## Installation

### 1. Start Backend Services

**Rust Service (Port 8080):**
```bash
cd backend/rust-service
cargo run
```

**Python ML Service (Port 8000):**
```bash
cd backend/python-ml
python main.py
```

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension` folder
5. The DubDub icon should appear in your extensions bar

### 3. Start Learning!

1. Go to Netflix, YouTube, or any supported streaming platform
2. Turn on subtitles
3. Click on any word in the subtitles
4. A popover will appear with:
   - Word pronunciation (with audio playback)
   - Base form (lemma)
   - Definition
   - Normal and slow speed audio

## Supported Platforms

- ✅ Netflix
- ✅ YouTube
- ✅ Disney+
- ✅ Hulu
- ✅ Amazon Prime Video

## Supported Languages

- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇮🇹 Italian (it)
- 🇧🇷 Portuguese (pt)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇨🇳 Chinese (zh)
- 🇸🇦 Arabic (ar)
- 🇮🇳 Hindi (hi)

## Architecture

```
┌─────────────────┐
│  Video Platform │
│  (Netflix, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Content Scripts │  ← Detects subtitles, makes words clickable
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Tokenization  │  │      TTS       │  │  Definitions   │
│  (Rust:8080)   │  │ (Python:8000)  │  │ (Python:8000)  │
└────────────────┘  └────────────────┘  └────────────────┘
```

## Keyboard Shortcuts

- Click word → Show popover
- Click outside → Close popover
- ESC → Close popover (TODO)

## Settings

Click the DubDub extension icon to access:
- **Enable/Disable** extension
- **Select learning language**
- **Check backend services status**
- **Test TTS**
- **Clear cache**

## Troubleshooting

### "Services offline" in popup

Make sure both backend services are running:
```bash
# Terminal 1: Rust service
cd backend/rust-service && cargo run

# Terminal 2: Python service
cd backend/python-ml && python main.py
```

### Words not clickable

1. Make sure subtitles are enabled on the video platform
2. Check browser console for errors (F12)
3. Try refreshing the page
4. Verify Rust service is running on port 8080

### Audio not playing

1. Check Python service is running on port 8000
2. Test TTS in popup settings
3. Check browser allows audio playback

## Development

### File Structure
```
extension/
├── manifest.json           # Extension configuration
├── background/
│   └── service-worker.js  # Background tasks, caching
├── content/
│   ├── main.js            # Main orchestrator
│   ├── subtitle-detector.js  # Platform-specific subtitle detection
│   ├── word-popover.js    # Popover UI and interactions
│   ├── api-client.js      # Backend API communication
│   └── popover.css        # Popover styling
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic
└── assets/
    └── icons/             # Extension icons
```

### Adding New Platforms

1. Add domain to `manifest.json` `content_scripts.matches`
2. Add selector to `subtitle-detector.js` `getSubtitleSelectors()`
3. Test and adjust as needed

## Privacy

- All processing happens locally or through your own backend services
- No data is sent to third parties
- Cache is stored locally in browser storage
- No tracking or analytics

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- Rust (Actix-web) for fast tokenization
- Python (FastAPI) for ML features
- edge-tts for neural text-to-speech
- Chrome Extension Manifest V3

---

Made with ❤️ for language learners
