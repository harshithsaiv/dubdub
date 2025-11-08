/**
 * Background Service Worker
 * Handles background tasks like caching and prefetching
 */

console.log('[DubDub] Background service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DubDub] Extension installed!');
    
    // Set default settings
    chrome.storage.local.set({
      enabled: true,
      language: 'en'
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DubDub] Background received message:', message);
  
  if (message.type === 'CACHE_TTS') {
    // Cache TTS audio for prefetching
    cacheTTS(message.data).then(sendResponse);
    return true; // Async response
  }
  
  if (message.type === 'GET_CACHED_TTS') {
    // Retrieve cached TTS
    getCachedTTS(message.key).then(sendResponse);
    return true;
  }
});

/**
 * Cache TTS audio
 */
async function cacheTTS(data) {
  try {
    const cache = await chrome.storage.local.get('ttsCache') || { ttsCache: {} };
    const ttsCache = cache.ttsCache || {};
    
    const key = `${data.language}_${data.speed}_${data.text}`;
    ttsCache[key] = {
      audio: data.audio_base64,
      timestamp: Date.now()
    };
    
    // Limit cache size (keep last 100 items)
    const entries = Object.entries(ttsCache);
    if (entries.length > 100) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const limited = Object.fromEntries(sorted.slice(0, 100));
      await chrome.storage.local.set({ ttsCache: limited });
    } else {
      await chrome.storage.local.set({ ttsCache });
    }
    
    return { success: true };
  } catch (error) {
    console.error('[DubDub] Cache error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get cached TTS
 */
async function getCachedTTS(key) {
  try {
    const cache = await chrome.storage.local.get('ttsCache');
    const ttsCache = cache.ttsCache || {};
    
    if (ttsCache[key]) {
      return { 
        success: true, 
        data: ttsCache[key].audio 
      };
    }
    
    return { success: false, error: 'Not found' };
  } catch (error) {
    console.error('[DubDub] Cache retrieval error:', error);
    return { success: false, error: error.message };
  }
}
