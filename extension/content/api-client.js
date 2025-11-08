/**
 * API Client - Handles communication with Rust and Python backend services
 */

class DubDubAPI {
  constructor() {
    this.rustServiceURL = 'http://localhost:8080';
    this.pythonServiceURL = 'http://localhost:8000';
    this.cache = new Map();
  }

  /**
   * Tokenize text using Rust service
   */
  async tokenize(text, language = 'en') {
    const cacheKey = `tokenize_${language}_${text}`;
    
    if (this.cache.has(cacheKey)) {
      console.log('[DubDub] Cache hit for tokenization');
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.rustServiceURL}/api/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      });

      if (!response.ok) {
        throw new Error(`Tokenization failed: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[DubDub] Tokenization error:', error);
      throw error;
    }
  }

  /**
   * Generate TTS audio using Python service
   */
  async getTTS(text, language = 'en', speed = 'normal') {
    const cacheKey = `tts_${language}_${speed}_${text}`;
    
    if (this.cache.has(cacheKey)) {
      console.log('[DubDub] Cache hit for TTS');
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.pythonServiceURL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, speed })
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[DubDub] TTS error:', error);
      throw error;
    }
  }

  /**
   * Get word lemma (base form) - currently mock
   */
  async getLemma(word, sentence, language = 'en') {
    const cacheKey = `lemma_${language}_${word}_${sentence}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.pythonServiceURL}/api/lemmatize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, sentence, language })
      });

      if (!response.ok) {
        throw new Error(`Lemmatization failed: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[DubDub] Lemmatization error:', error);
      throw error;
    }
  }

  /**
   * Get context-aware definition - currently mock
   */
  async getDefinition(word, sentence, language = 'en') {
    const cacheKey = `def_${language}_${word}_${sentence}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.pythonServiceURL}/api/definition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, sentence, language })
      });

      if (!response.ok) {
        throw new Error(`Definition lookup failed: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[DubDub] Definition error:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[DubDub] Cache cleared');
  }
}

// Expose class and create global instance
window.DubDubAPI = DubDubAPI;
window.dubdubAPI = new DubDubAPI();
