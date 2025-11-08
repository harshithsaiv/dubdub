// Netflix-specific subtitle handler using XHR interception
class NetflixHandler {
  constructor(dubdubAPI, popover) {
    this.api = dubdubAPI;
    this.popover = popover;
    this.subtitles = [];
    this.currentSubtitleText = "";
    this.updateInterval = null;
    this.subtitleContainer = null;
    this.language = "en"; // Default language

    console.log("[DubDub Netflix] Handler initialized");
  }

  /**
   * Initialize Netflix subtitle handling
   */
  init() {
    // Inject the XHR interceptor script into page context
    this.injectInterceptor();

    // Listen for subtitle data from injected script
    document.addEventListener("DUBDUB_NETFLIX_SUBTITLE", (e) => {
      this.handleSubtitleData(e.detail.data, e.detail.url);
    });

    // Wait for Netflix player to load, then set up subtitle display
    this.waitForPlayer();

    console.log("[DubDub Netflix] Initialized successfully");
  }

  /**
   * Extract language code from Netflix subtitle URL or XML
   * Netflix URLs contain language codes like: ?lang=es-ES or in XML attributes
   */
  detectLanguageFromURL(url) {
    // Try to extract from URL query params (e.g., ?lang=es-ES)
    const langMatch = url.match(/[?&]lang=([a-z]{2})/i);
    if (langMatch) {
      const lang = langMatch[1].toLowerCase();
      console.log(`[DubDub Netflix] Detected language from URL: ${lang}`);
      return lang;
    }
    return null;
  }

  /**
   * Detect language from XML timedtext attributes
   */
  detectLanguageFromXML(xmlData) {
    try {
      // Parse XML to look for language attributes
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");
      
      // Netflix uses <timedtext> root with lang attribute
      const timedtext = xmlDoc.querySelector("timedtext, tt");
      if (timedtext) {
        const lang = timedtext.getAttribute("lang") || 
                     timedtext.getAttribute("xml:lang");
        if (lang) {
          // Extract just the language code (es from es-ES)
          const langCode = lang.split('-')[0].toLowerCase();
          console.log(`[DubDub Netflix] Detected language from XML: ${langCode}`);
          return langCode;
        }
      }
    } catch (e) {
      console.warn("[DubDub Netflix] Could not parse XML for language:", e);
    }
    return null;
  }

  /**
   * Detect language from text content (fallback)
   */
  detectLanguageFromText(text) {
    // Spanish indicators
    if (/[¿¡ñáéíóúü]/i.test(text)) {
      console.log("[DubDub Netflix] Detected Spanish from text patterns");
      return "es";
    }
    
    // French indicators
    if (/[àâæçèéêëîïôùûüÿœ]/i.test(text)) {
      console.log("[DubDub Netflix] Detected French from text patterns");
      return "fr";
    }
    
    // German indicators
    if (/[äöüß]/i.test(text)) {
      console.log("[DubDub Netflix] Detected German from text patterns");
      return "de";
    }
    
    // Portuguese indicators
    if (/[ãõç]/i.test(text)) {
      console.log("[DubDub Netflix] Detected Portuguese from text patterns");
      return "pt";
    }
    
    // Italian indicators
    if (/[àèéìòù]/i.test(text)) {
      console.log("[DubDub Netflix] Detected Italian from text patterns");
      return "it";
    }
    
    // Chinese/Japanese/Korean characters
    if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text)) {
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
        console.log("[DubDub Netflix] Detected Japanese from text");
        return "ja";
      }
      if (/[\uac00-\ud7af]/.test(text)) {
        console.log("[DubDub Netflix] Detected Korean from text");
        return "ko";
      }
      console.log("[DubDub Netflix] Detected Chinese from text");
      return "zh";
    }
    
    // Arabic indicators
    if (/[\u0600-\u06ff]/.test(text)) {
      console.log("[DubDub Netflix] Detected Arabic from text");
      return "ar";
    }
    
    // Hindi/Devanagari
    if (/[\u0900-\u097f]/.test(text)) {
      console.log("[DubDub Netflix] Detected Hindi from text");
      return "hi";
    }
    
    return null;
  }

  /**
   * Inject XHR interceptor into page context
   */
  injectInterceptor() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("content/netflix-injector.js");
    script.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
    console.log("[DubDub Netflix] Injector script loaded");
  }

  /**
   * Wait for Netflix player to load
   */
  waitForPlayer() {
    const checkPlayer = () => {
      const video = document.querySelector("video");
      const watchVideo = document.querySelector(".watch-video");

      if (video && watchVideo) {
        console.log("[DubDub Netflix] Player found, setting up subtitle container");
        this.setupSubtitleContainer();
        this.startSubtitleSync();
      } else {
        // Still loading, check again in 100ms
        setTimeout(checkPlayer, 100);
      }
    };

    checkPlayer();
  }

  /**
   * Create custom subtitle container overlay
   */
  setupSubtitleContainer() {
    // Hide Netflix's default subtitles
    const style = document.createElement("style");
    style.textContent = `
      .player-timedtext {
        display: none !important;
      }
      
      .dubdub-netflix-container {
        position: absolute;
        bottom: 80px;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        z-index: 10;
      }
      
      .dubdub-netflix-subtitle {
        font-size: 32px;
        font-weight: 600;
        font-family: Netflix Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;
        color: #ffffff;
        text-shadow: 
          0px 0px 4px rgba(0, 0, 0, 0.8),
          0px 2px 6px rgba(0, 0, 0, 0.6);
        text-align: center;
        background-color: transparent;
        pointer-events: auto;
        line-height: 1.4;
        max-width: 90%;
        padding: 0 20px;
      }
      
      .dubdub-netflix-subtitle .word {
        position: relative;
        display: inline-block;
        padding: 4px 6px;
        margin: 0 2px;
        cursor: pointer;
        transition: all 0.12s ease;
        border-radius: 3px;
      }
      
      .dubdub-netflix-subtitle .word:hover {
        background-color: rgba(0, 0, 0, 0.5);
        color: #ffffff;
        transform: translateY(-1px);
      }
      
      .dubdub-netflix-subtitle .word:focus {
        outline: 2px solid rgba(255, 255, 255, 0.8);
        outline-offset: 2px;
      }
      
      @media (max-width: 768px) {
        .dubdub-netflix-subtitle {
          font-size: 24px;
        }
      }
    `;
    document.head.appendChild(style);

    // Create subtitle container
    const container = document.createElement("div");
    container.className = "dubdub-netflix-container";
    container.innerHTML = '<div class="dubdub-netflix-subtitle"></div>';

    const watchVideo = document.querySelector(".watch-video");
    if (watchVideo) {
      watchVideo.insertAdjacentElement("afterbegin", container);
      this.subtitleContainer = container.querySelector(".dubdub-netflix-subtitle");
      console.log("[DubDub Netflix] Subtitle container created");
    }
  }

  /**
   * Handle subtitle data from intercepted XHR
   */
  handleSubtitleData(xmlData, url) {
    console.log("[DubDub Netflix] Received subtitle data, parsing...");
    
    // Try multiple methods to detect language
    let detectedLang = this.detectLanguageFromURL(url) || 
                       this.detectLanguageFromXML(xmlData);
    
    if (detectedLang) {
      this.language = detectedLang;
      console.log(`[DubDub Netflix] Language set to: ${this.language}`);
    }
    
    this.subtitles = window.NetflixSubtitleParser.parseXML(xmlData);
    console.log(`[DubDub Netflix] Loaded ${this.subtitles.length} subtitles`);
    
    // Fallback: detect from first few subtitles if still unknown
    if (this.language === "en" && this.subtitles.length > 0) {
      const sampleText = this.subtitles.slice(0, 5).map(s => s.text).join(' ');
      const textLang = this.detectLanguageFromText(sampleText);
      if (textLang) {
        this.language = textLang;
        console.log(`[DubDub Netflix] Language detected from text: ${this.language}`);
      }
    }
  }

  /**
   * Start syncing subtitles with video playback
   */
  startSubtitleSync() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateSubtitle();
    }, 100); // Update every 100ms

    console.log("[DubDub Netflix] Subtitle sync started");
  }

  /**
   * Update displayed subtitle based on current video time
   */
  updateSubtitle() {
    const video = document.querySelector("video");
    if (!video || !this.subtitleContainer || this.subtitles.length === 0) {
      return;
    }

    const currentTime = video.currentTime;
    const currentSubtitle = window.NetflixSubtitleParser.getCurrentSubtitle(
      currentTime,
      this.subtitles
    );

    if (!currentSubtitle) {
      // No subtitle at this time, clear display
      if (this.currentSubtitleText !== "") {
        this.subtitleContainer.innerHTML = "";
        this.currentSubtitleText = "";
      }
      return;
    }

    // Subtitle hasn't changed, don't re-render
    if (currentSubtitle.text === this.currentSubtitleText) {
      return;
    }

    // Update subtitle
    this.currentSubtitleText = currentSubtitle.text;
    this.renderSubtitle(currentSubtitle.text);
  }

  /**
   * Render subtitle as clickable words
   */
  async renderSubtitle(text) {
    if (!this.subtitleContainer) return;

    try {
      // Tokenize the subtitle text using detected language
      console.log(`[DubDub Netflix] Tokenizing: "${text}" (${this.language})`);
      const response = await this.api.tokenize(text, this.language);
      
      console.log('[DubDub Netflix] API response:', response);
      
      // Handle different response formats
      let tokens = [];
      
      if (Array.isArray(response)) {
        tokens = response;
      } else if (response && Array.isArray(response.tokens)) {
        tokens = response.tokens;
      } else if (response && typeof response === 'object') {
        tokens = [response];
      }
      
      console.log(`[DubDub Netflix] Parsed ${tokens.length} tokens:`, tokens);
      
      if (!tokens || tokens.length === 0) {
        console.warn("[DubDub Netflix] No tokens returned, showing plain text");
        this.subtitleContainer.textContent = text;
        return;
      }
      
      // Clear container
      this.subtitleContainer.innerHTML = "";

      // Create clickable word spans
      tokens.forEach((token, index) => {
        const wordSpan = document.createElement("span");
        wordSpan.className = "word";
        // Handle both {text: "word"} and direct string formats
        wordSpan.textContent = typeof token === 'string' ? token : (token.text || token.token || '');
        wordSpan.dataset.index = index;
        wordSpan.setAttribute('role', 'button');
        wordSpan.setAttribute('tabindex', '0');
        wordSpan.setAttribute('aria-label', `Click to learn about ${wordSpan.textContent}`);

        // Add click handler
        wordSpan.addEventListener("click", (e) => {
          e.stopPropagation();
          const word = wordSpan.textContent;
          this.handleWordClick(word, text, e.target);
        });

        // Add keyboard support (Enter/Space)
        wordSpan.addEventListener("keydown", (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            const word = wordSpan.textContent;
            this.handleWordClick(word, text, e.target);
          }
        });

        this.subtitleContainer.appendChild(wordSpan);

        // Add space after word (except last word)
        if (index < tokens.length - 1) {
          this.subtitleContainer.appendChild(document.createTextNode(" "));
        }
      });
      
      console.log('[DubDub Netflix] Subtitle rendered successfully');
    } catch (error) {
      console.error("[DubDub Netflix] Error rendering subtitle:", error);
      // Fallback: just display text without clickable words
      this.subtitleContainer.textContent = text;
    }
  }

  /**
   * Handle word click
   */
  async handleWordClick(word, sentence, element) {
    console.log(`[DubDub Netflix] Word clicked: "${word}" (language: ${this.language})`);

    // Pause video while showing definition
    const video = document.querySelector("video");
    if (video) {
      video.pause();
    }

    // Show popover at word position (word, sentence, position, language)
    this.popover.show(word, sentence, element, this.language);

    // Resume video when popover closes
    // (popover handles this via close button)
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.subtitleContainer) {
      this.subtitleContainer.remove();
    }
    console.log("[DubDub Netflix] Handler destroyed");
  }
}

// Make available globally
window.NetflixHandler = NetflixHandler;