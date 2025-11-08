/**
 * Subtitle Detector - Finds and monitors subtitle elements on video platforms
 */

class SubtitleDetector {
  constructor() {
    this.platform = this.detectPlatform();
    this.subtitleContainer = null;
    this.observer = null;
    this.onSubtitleChange = null;
  }

  /**
   * Detect which streaming platform we're on
   */
  detectPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('netflix.com')) return 'netflix';
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('disneyplus.com')) return 'disney';
    if (hostname.includes('hulu.com')) return 'hulu';
    if (hostname.includes('primevideo.com')) return 'prime';
    
    return 'unknown';
  }

  /**
   * Get platform-specific subtitle selectors
   */
  getSubtitleSelectors() {
    const selectors = {
      netflix: {
        container: '.player-timedtext-text-container',
        text: '.player-timedtext-text-container span'
      },
      youtube: {
        container: '.ytp-caption-window-container',
        text: '.ytp-caption-segment'
      },
      disney: {
        container: '.dss-subtitle-renderer-cue',
        text: '.dss-subtitle-renderer-cue span'
      },
      hulu: {
        container: '.caption-text-box',
        text: '.caption-text-box span'
      },
      prime: {
        container: '.atvwebplayersdk-captions-text',
        text: '.atvwebplayersdk-captions-text span'
      },
      unknown: {
        container: '[class*="subtitle"], [class*="caption"]',
        text: '[class*="subtitle"] span, [class*="caption"] span'
      }
    };

    return selectors[this.platform] || selectors.unknown;
  }

  /**
   * Start monitoring for subtitles
   */
  start(onSubtitleChangeCallback) {
    this.onSubtitleChange = onSubtitleChangeCallback;
    console.log(`[DubDub] Starting subtitle detection for ${this.platform}`);

    // Initial search
    this.findSubtitleContainer();

    // Watch for subtitle container to appear
    this.observer = new MutationObserver(() => {
      if (!this.subtitleContainer || !document.contains(this.subtitleContainer)) {
        this.findSubtitleContainer();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Find the subtitle container element
   */
  findSubtitleContainer() {
    const selectors = this.getSubtitleSelectors();
    const container = document.querySelector(selectors.container);

    if (container && container !== this.subtitleContainer) {
      console.log('[DubDub] Found subtitle container:', container);
      this.subtitleContainer = container;
      this.watchSubtitleChanges();
    }
  }

  /**
   * Watch for subtitle text changes
   */
  watchSubtitleChanges() {
    if (!this.subtitleContainer) return;

    const subtitleObserver = new MutationObserver(() => {
      const text = this.getCurrentSubtitleText();
      if (text && this.onSubtitleChange) {
        this.onSubtitleChange(text, this.subtitleContainer);
      }
    });

    subtitleObserver.observe(this.subtitleContainer, {
      childList: true,
      characterData: true,
      subtree: true
    });

    console.log('[DubDub] Watching subtitle changes');
  }

  /**
   * Get current subtitle text
   */
  getCurrentSubtitleText() {
    if (!this.subtitleContainer) return '';
    return this.subtitleContainer.textContent.trim();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    console.log('[DubDub] Stopped subtitle detection');
  }
}

// Expose class and create global instance
window.SubtitleDetector = SubtitleDetector;
window.dubdubSubtitles = new SubtitleDetector();
