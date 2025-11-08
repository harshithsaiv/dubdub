/**
 * Main Content Script - Orchestrates subtitle detection and word interaction
 */

(function() {
  'use strict';

  console.log('[DubDub] Extension loaded!');

  let currentLanguage = 'en'; // TODO: Auto-detect from video
  let isEnabled = true;

  // Initialize API client and popover
  const api = new window.DubDubAPI();
  const popover = new window.WordPopover();

  // Detect platform
  const platform = detectPlatform();
  console.log(`[DubDub] Detected platform: ${platform}`);

  /**
   * Detect which streaming platform we're on
   */
  function detectPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('netflix.com')) return 'netflix';
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('disneyplus.com')) return 'disney';
    if (hostname.includes('hulu.com')) return 'hulu';
    if (hostname.includes('primevideo.com') || hostname.includes('amazon.com')) return 'prime';
    
    return 'unknown';
  }

  /**
   * Make words in subtitle clickable
   */
  async function makeSubtitleClickable(subtitleText, subtitleContainer) {
    if (!isEnabled || !subtitleText) return;

    try {
      // Tokenize the subtitle text
      const tokenData = await api.tokenize(subtitleText, currentLanguage);
      
      if (!tokenData || !tokenData.tokens || tokenData.tokens.length === 0) {
        console.warn('[DubDub] No tokens returned');
        return;
      }

      // Clear container and rebuild with clickable words
      subtitleContainer.innerHTML = '';
      
      tokenData.tokens.forEach((token, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'dubdub-clickable-word';
        wordSpan.textContent = token.text;
        wordSpan.dataset.word = token.text;
        wordSpan.dataset.index = index;
        
        // Add click handler
        wordSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          handleWordClick(token.text, subtitleText, wordSpan);
        });
        
        subtitleContainer.appendChild(wordSpan);
        
        // Add space between words (except last word)
        if (index < tokenData.tokens.length - 1) {
          subtitleContainer.appendChild(document.createTextNode(' '));
        }
      });

      console.log(`[DubDub] Made ${tokenData.tokens.length} words clickable`);
    } catch (error) {
      console.error('[DubDub] Failed to make subtitle clickable:', error);
      // Fallback: make each space-separated word clickable
      makeSimpleClickable(subtitleText, subtitleContainer);
    }
  }

  /**
   * Fallback: Simple word splitting (if API fails)
   */
  function makeSimpleClickable(text, container) {
    container.innerHTML = '';
    const words = text.split(/\s+/);
    
    words.forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'dubdub-clickable-word';
      wordSpan.textContent = word;
      wordSpan.dataset.word = word;
      
      wordSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        handleWordClick(word, text, wordSpan);
      });
      
      container.appendChild(wordSpan);
      
      if (index < words.length - 1) {
        container.appendChild(document.createTextNode(' '));
      }
    });

    console.log(`[DubDub] Made ${words.length} words clickable (simple mode)`);
  }

  /**
   * Handle word click event
   */
  function handleWordClick(word, sentence, element) {
    console.log(`[DubDub] Word clicked: "${word}"`);
    
    // Show popover at word position
    popover.show(word, sentence, currentLanguage, element);
    
    // Highlight clicked word
    element.classList.add('dubdub-word-highlighted');
    setTimeout(() => {
      element.classList.remove('dubdub-word-highlighted');
    }, 600);
  }

  /**
   * Handle subtitle changes
   */
  function onSubtitleChange(text, container) {
    console.log(`[DubDub] New subtitle: "${text}"`);
    makeSubtitleClickable(text, container);
  }

  /**
   * Initialize extension
   */
  function init() {
    console.log('[DubDub] Initializing...');
    
    if (platform === 'netflix') {
      // Use Netflix-specific handler with XHR interception
      console.log('[DubDub] Initializing Netflix handler');
      const netflixHandler = new window.NetflixHandler(api, popover);
      netflixHandler.init();
    } else {
      // Use generic subtitle detector for other platforms
      console.log('[DubDub] Initializing generic subtitle detector');
      const detector = new window.SubtitleDetector(platform);
      detector.onSubtitleChange(onSubtitleChange);
      detector.startWatching();
    }
    
    console.log('[DubDub] Ready! Click on any subtitle word to learn.');
  }

  /**
   * Listen for messages from popup/background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_DUBDUB') {
      isEnabled = message.enabled;
      console.log(`[DubDub] Extension ${isEnabled ? 'enabled' : 'disabled'}`);
      sendResponse({ success: true });
    }
    
    if (message.type === 'SET_LANGUAGE') {
      currentLanguage = message.language;
      console.log(`[DubDub] Language set to: ${currentLanguage}`);
      sendResponse({ success: true });
    }
  });

  // Make API and popover available globally for debugging
  window.dubdubAPI = api;
  window.dubdubPopover = popover;

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

