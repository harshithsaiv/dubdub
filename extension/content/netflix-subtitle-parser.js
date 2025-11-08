// Netflix subtitle parser - parses Netflix's XML subtitle format
class NetflixSubtitleParser {
  /**
   * Parse Netflix subtitle XML data
   * @param {string} xmlText - Raw XML text from Netflix API
   * @returns {Array} Array of subtitle objects with startTime, endTime, text
   */
  static parseXML(xmlText) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      const subtitles = Array.from(xmlDoc.getElementsByTagName("p")).map(
        (subtitleNode) => {
          // Netflix uses "begin" and "end" attributes with timestamps
          const startTimeStr = subtitleNode.getAttribute("begin")?.replace("t", "") || "0";
          const endTimeStr = subtitleNode.getAttribute("end")?.replace("t", "") || "0";
          
          // Extract text content from the subtitle node
          const text = this.extractTextFromNode(subtitleNode);

          return {
            startTime: this.formatTimeTrack(startTimeStr),
            endTime: this.formatTimeTrack(endTimeStr),
            text: text.trim(),
          };
        }
      );

      console.log(`[DubDub Netflix] Parsed ${subtitles.length} subtitle entries`);
      return subtitles;
    } catch (error) {
      console.error("[DubDub Netflix] Error parsing subtitle XML:", error);
      return [];
    }
  }

  /**
   * Extract text content from subtitle node
   * @param {Element} node - XML subtitle node
   * @returns {string} Extracted text
   */
  static extractTextFromNode(node) {
    let text = "";
    const childNodes = node.childNodes;

    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      text += `${child.textContent.trim()} `;
    }

    return text.trim();
  }

  /**
   * Format Netflix timestamp to seconds
   * @param {string} time - Netflix timestamp format
   * @returns {number} Time in seconds
   */
  static formatTimeTrack(time) {
    const divider = 1000 * 1000 * 10; // Netflix uses 10MHz clock
    
    // Check if already in HH:MM:SS.mmm format
    if (this.isFormatTimeStamp(time)) {
      // Convert raw timestamp to HH:MM:SS format first
      const numericTime = time.replace(/[^\d]/g, "");
      const timeInSeconds = parseInt(numericTime) / divider;
      const hhmmss = this.convertTimeToHHMMSS(timeInSeconds);
      return this.parseTime(hhmmss);
    }
    
    // Already in HH:MM:SS format
    return this.parseTime(time);
  }

  /**
   * Check if time is in timestamp format (not HH:MM:SS format)
   * @param {string} time - Time string
   * @returns {boolean} True if NOT in HH:MM:SS.mmm format
   */
  static isFormatTimeStamp(time) {
    const regex_hh_mm_ss_ttt = /\d{2}:\d{2}:\d{2}\.\d{3}/;
    return !regex_hh_mm_ss_ttt.test(time);
  }

  /**
   * Convert seconds to HH:MM:SS.mmm format
   * @param {number} secs - Time in seconds
   * @returns {string} HH:MM:SS.mmm formatted string
   */
  static convertTimeToHHMMSS(secs) {
    const sec_num = parseFloat(secs);
    const hours = Math.floor(sec_num / 3600) % 24;
    const minutes = Math.floor(sec_num / 60) % 60;
    const seconds = sec_num % 60;

    return [hours, minutes, parseFloat(seconds).toFixed(3)]
      .map((v) => (v < 10 ? "0" + v : v))
      .join(":");
  }

  /**
   * Parse HH:MM:SS.mmm format to seconds
   * @param {string} timeString - Time in HH:MM:SS.mmm format
   * @returns {number} Time in seconds
   */
  static parseTime(timeString) {
    const timeParts = timeString.split(":");
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    const secondsParts = timeParts[2]?.split(".") || ["0", "0"];
    const seconds = parseInt(secondsParts[0]) || 0;
    const milliseconds = parseInt(secondsParts[1]) || 0;

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Find subtitle for current video time
   * @param {number} currentTime - Current video time in seconds
   * @param {Array} subtitles - Array of subtitle objects
   * @returns {Object|null} Matching subtitle or null
   */
  static getCurrentSubtitle(currentTime, subtitles) {
    if (!subtitles || subtitles.length === 0) {
      return null;
    }

    return subtitles.find((subtitle) => {
      return currentTime >= subtitle.startTime && currentTime < subtitle.endTime;
    });
  }
}

// Make available to other scripts
window.NetflixSubtitleParser = NetflixSubtitleParser;
