/**
 * Word Popover - Creates and manages the floating popover for word details
 */

class WordPopover {
  constructor() {
    this.popover = null;
    this.audioElement = null;
    this.currentWord = null;
    this.isVisible = false;
  }

  /**
   * Create the popover DOM structure
   */
  createPopover() {
    if (this.popover) return this.popover;

    const popover = document.createElement('div');
    popover.id = 'dubdub-popover';
    popover.className = 'dubdub-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');
    popover.setAttribute('aria-labelledby', 'dubdub-word-title');
    popover.innerHTML = `
      <div class="dubdub-popover-header">
        <span id="dubdub-word-title" class="dubdub-word" aria-live="polite"></span>
        <button class="dubdub-close" aria-label="Close" title="Close (Esc)">✕</button>
      </div>
      <div class="dubdub-popover-body">
        <div class="dubdub-audio-controls">
          <button class="dubdub-play-normal" aria-label="Play normal speed" title="Play at normal speed">
            <span aria-hidden="true">▶</span> Normal
          </button>
          <button class="dubdub-play-slow" aria-label="Play slow speed" title="Play at slow speed">
            <span aria-hidden="true">▶</span> Slow
          </button>
        </div>
        <div class="dubdub-lemma">
          <strong>Base form</strong>
          <span class="dubdub-lemma-text" aria-live="polite">—</span>
        </div>
        <div class="dubdub-definition">
          <strong>Definition</strong>
          <span class="dubdub-definition-text" aria-live="polite">—</span>
        </div>
      </div>
    `;

    // Add event listeners
    popover.querySelector('.dubdub-close').addEventListener('click', () => this.hide());
    popover.querySelector('.dubdub-play-normal').addEventListener('click', () => this.playAudio('normal'));
    popover.querySelector('.dubdub-play-slow').addEventListener('click', () => this.playAudio('slow'));

    // Close on outside click
    const outsideClickHandler = (e) => {
      if (this.isVisible && !popover.contains(e.target) && !e.target.classList.contains('word')) {
        this.hide();
      }
    };
    document.addEventListener('click', outsideClickHandler);

    // Close on ESC key
    const escKeyHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener('keydown', escKeyHandler);

    document.body.appendChild(popover);
    this.popover = popover;
    this.outsideClickHandler = outsideClickHandler;
    this.escKeyHandler = escKeyHandler;
    
    return popover;
  }

  /**
   * Show popover for a word
   */
  async show(word, sentence, position, language = 'en') {
    this.createPopover();
    this.currentWord = { word, sentence, language };

    // Update word display
    this.popover.querySelector('.dubdub-word').textContent = word;

    // Reset to loading state
    this.popover.querySelector('.dubdub-lemma-text').textContent = '—';
    this.popover.querySelector('.dubdub-definition-text').textContent = '—';

    // Position popover
    this.position(position);

    // Show popover
    this.popover.classList.add('visible');
    this.isVisible = true;

    // Focus the close button for accessibility
    this.popover.querySelector('.dubdub-close').focus();

    // Load word data
    await this.loadWordData(word, sentence, language);
  }

  /**
   * Load word data from APIs
   */
  async loadWordData(word, sentence, language) {
    const loadingEl = this.popover.querySelector('.dubdub-loading');
    const lemmaEl = this.popover.querySelector('.dubdub-lemma-text');
    const defEl = this.popover.querySelector('.dubdub-definition-text');

    try {
      // Show loading state
      lemmaEl.textContent = 'Loading...';
      defEl.textContent = 'Loading...';

      // Fetch lemma and definition in parallel
      const [lemmaData, defData] = await Promise.all([
        window.dubdubAPI.getLemma(word, sentence, language),
        window.dubdubAPI.getDefinition(word, sentence, language)
      ]);

      // Update UI
      lemmaEl.textContent = lemmaData.lemma || word;
      defEl.textContent = defData.definition || 'No definition available';

      console.log('[DubDub] Word data loaded:', { lemmaData, defData });
    } catch (error) {
      console.error('[DubDub] Failed to load word data:', error);
      lemmaEl.textContent = word;
      defEl.textContent = 'Failed to load definition';
    }
  }

  /**
   * Play audio for the current word
   */
  async playAudio(speed = 'normal') {
    if (!this.currentWord) return;

    const { word, language } = this.currentWord;
    
    // Get button elements for feedback
    const normalBtn = this.popover.querySelector('.dubdub-play-normal');
    const slowBtn = this.popover.querySelector('.dubdub-play-slow');
    const activeBtn = speed === 'normal' ? normalBtn : slowBtn;
    const originalText = activeBtn.innerHTML;
    
    try {
      // Show loading state
      activeBtn.innerHTML = '<span aria-hidden="true">⏳</span> Loading...';
      activeBtn.disabled = true;
      
      console.log(`[DubDub] Playing TTS: "${word}" (${language}, ${speed})`);
      
      const ttsData = await window.dubdubAPI.getTTS(word, language, speed);
      
      // Create audio element from base64
      if (!this.audioElement) {
        this.audioElement = new Audio();
      }
      
      // Convert base64 to audio URL
      const audioBlob = this.base64ToBlob(ttsData.audio_base64, 'audio/mpeg');
      const audioURL = URL.createObjectURL(audioBlob);
      
      // Show playing state
      activeBtn.innerHTML = '<span aria-hidden="true">▶</span> Playing...';
      
      this.audioElement.src = audioURL;
      await this.audioElement.play();
      
      console.log('[DubDub] Audio playing');
      
      // Clean up URL after playing
      this.audioElement.onended = () => {
        URL.revokeObjectURL(audioURL);
        activeBtn.innerHTML = originalText;
        activeBtn.disabled = false;
      };
    } catch (error) {
      console.error('[DubDub] Failed to play audio:', error);
      
      // Show error state briefly
      activeBtn.innerHTML = '<span aria-hidden="true">⚠</span> TTS Unavailable';
      activeBtn.style.color = '#ef4444';
      
      setTimeout(() => {
        activeBtn.innerHTML = originalText;
        activeBtn.disabled = false;
        activeBtn.style.color = '';
      }, 2000);
    }
  }

  /**
   * Convert base64 to Blob
   */
  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Position popover near the clicked element
   */
  position(clickedElement) {
    if (!clickedElement) {
      // Fallback to center of screen
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      this.popover.style.left = `${(viewportWidth - 340) / 2}px`;
      this.popover.style.top = `${viewportHeight / 4}px`;
      return;
    }

    const rect = clickedElement.getBoundingClientRect();
    const popoverRect = this.popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const spacing = 12; // Gap between element and popover

    // Try positioning below the element first
    let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
    let top = rect.bottom + spacing;

    // Adjust horizontal position if off-screen
    if (left < spacing) {
      left = spacing;
    } else if (left + popoverRect.width > viewportWidth - spacing) {
      left = viewportWidth - popoverRect.width - spacing;
    }

    // If popover would go off bottom of screen, position above instead
    if (top + popoverRect.height > viewportHeight - spacing) {
      top = rect.top - popoverRect.height - spacing;
      
      // If still off-screen, position in viewport center
      if (top < spacing) {
        top = (viewportHeight - popoverRect.height) / 2;
      }
    }

    this.popover.style.left = `${Math.max(spacing, left)}px`;
    this.popover.style.top = `${Math.max(spacing, top)}px`;
  }

  /**
   * Hide popover
   */
  hide() {
    if (this.popover) {
      this.popover.classList.remove('visible');
      this.isVisible = false;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Destroy popover
   */
  destroy() {
    this.hide();
    
    // Clean up event listeners
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }
    if (this.escKeyHandler) {
      document.removeEventListener('keydown', this.escKeyHandler);
    }
    
    if (this.popover) {
      this.popover.remove();
      this.popover = null;
    }
  }
}

// Expose class and create global instance
window.WordPopover = WordPopover;
window.dubdubPopover = new WordPopover();
