/**
 * Popup Script - Controls extension settings
 */

const RUST_SERVICE = 'http://localhost:8080';
const PYTHON_SERVICE = 'http://localhost:8000';

// DOM elements
const enableToggle = document.getElementById('enable-toggle');
const languageSelect = document.getElementById('language-select');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const rustStatus = document.getElementById('rust-status');
const pythonStatus = document.getElementById('python-status');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const testTtsBtn = document.getElementById('test-tts-btn');

/**
 * Check service health
 */
async function checkService(url, name) {
  try {
    const response = await fetch(`${url}/api/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) 
    });
    
    if (response.ok) {
      console.log(`[DubDub] ${name} is online`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[DubDub] ${name} is offline:`, error);
    return false;
  }
}

/**
 * Update services status
 */
async function updateServicesStatus() {
  const [rustOnline, pythonOnline] = await Promise.all([
    checkService(RUST_SERVICE, 'Rust'),
    checkService(PYTHON_SERVICE, 'Python')
  ]);

  // Update Rust status
  if (rustOnline) {
    rustStatus.textContent = 'Online';
    rustStatus.className = 'status-badge online';
  } else {
    rustStatus.textContent = 'Offline';
    rustStatus.className = 'status-badge offline';
  }

  // Update Python status
  if (pythonOnline) {
    pythonStatus.textContent = 'Online';
    pythonStatus.className = 'status-badge online';
  } else {
    pythonStatus.textContent = 'Offline';
    pythonStatus.className = 'status-badge offline';
  }

  // Update overall status
  if (rustOnline && pythonOnline) {
    statusDot.className = 'status-dot active';
    statusText.textContent = 'All systems operational';
  } else if (!rustOnline && !pythonOnline) {
    statusDot.className = 'status-dot inactive';
    statusText.textContent = 'Services offline - Please start backends';
  } else {
    statusDot.className = 'status-dot inactive';
    statusText.textContent = 'Some services offline';
  }
}

/**
 * Load saved settings
 */
async function loadSettings() {
  const settings = await chrome.storage.local.get(['enabled', 'language']);
  
  enableToggle.checked = settings.enabled !== false; // Default to true
  languageSelect.value = settings.language || 'en';
}

/**
 * Save settings
 */
async function saveSettings() {
  const settings = {
    enabled: enableToggle.checked,
    language: languageSelect.value
  };
  
  await chrome.storage.local.set(settings);
  console.log('[DubDub] Settings saved:', settings);
}

/**
 * Send message to content script
 */
async function sendToContentScript(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      console.error('[DubDub] Failed to send message to content script:', error);
    }
  }
}

/**
 * Test TTS
 */
async function testTTS() {
  testTtsBtn.disabled = true;
  testTtsBtn.textContent = '⏳ Testing...';
  
  try {
    const language = languageSelect.value;
    const testPhrases = {
      en: 'Hello, world!',
      es: '¡Hola, mundo!',
      fr: 'Bonjour, le monde!',
      de: 'Hallo, Welt!',
      it: 'Ciao, mondo!',
      pt: 'Olá, mundo!',
      ja: 'こんにちは、世界!',
      ko: '안녕하세요, 세계!',
      zh: '你好，世界!',
      ar: 'مرحبا بالعالم!',
      hi: 'नमस्ते दुनिया!'
    };
    
    const text = testPhrases[language] || 'Hello, world!';
    
    const response = await fetch(`${PYTHON_SERVICE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speed: 'normal' })
    });
    
    if (!response.ok) {
      throw new Error('TTS request failed');
    }
    
    const data = await response.json();
    
    // Convert base64 to audio and play
    const audioBlob = base64ToBlob(data.audio_base64, 'audio/mpeg');
    const audioURL = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioURL);
    
    await audio.play();
    
    testTtsBtn.textContent = '✅ Success!';
    setTimeout(() => {
      testTtsBtn.textContent = '🔊 Test TTS';
      testTtsBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('[DubDub] TTS test failed:', error);
    testTtsBtn.textContent = '❌ Failed';
    setTimeout(() => {
      testTtsBtn.textContent = '🔊 Test TTS';
      testTtsBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Convert base64 to Blob
 */
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Clear cache
 */
async function clearCache() {
  clearCacheBtn.disabled = true;
  clearCacheBtn.textContent = '⏳ Clearing...';
  
  await chrome.storage.local.remove(['cache']);
  
  clearCacheBtn.textContent = '✅ Cleared!';
  setTimeout(() => {
    clearCacheBtn.textContent = '🗑️ Clear Cache';
    clearCacheBtn.disabled = false;
  }, 1500);
}

// Event Listeners
enableToggle.addEventListener('change', async () => {
  await saveSettings();
  await sendToContentScript({ 
    type: 'TOGGLE_DUBDUB', 
    enabled: enableToggle.checked 
  });
});

languageSelect.addEventListener('change', async () => {
  await saveSettings();
  await sendToContentScript({ 
    type: 'SET_LANGUAGE', 
    language: languageSelect.value 
  });
});

clearCacheBtn.addEventListener('click', clearCache);
testTtsBtn.addEventListener('click', testTTS);

// Initialize
(async function init() {
  await loadSettings();
  await updateServicesStatus();
  
  // Refresh service status every 5 seconds
  setInterval(updateServicesStatus, 5000);
})();
