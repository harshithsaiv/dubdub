use crate::models::{TokenizeResponse, TokenPosition};
use regex::Regex;
use unicode_segmentation::UnicodeSegmentation;

/// Tokenize text based on language
pub fn tokenize_text(text: &str, language: &str) -> Result<TokenizeResponse, String> {
    let language_lower = language.to_lowercase();
    
    let (tokens, positions) = match language_lower.as_str() {
        lang if is_cjk_language(lang) => tokenize_cjk(text),
        _ => tokenize_standard(text),
    };
    
    Ok(TokenizeResponse {
        text: text.to_string(),
        language: language.to_string(),
        tokens,
        positions,
    })
}

/// Check if language uses CJK characters (Chinese, Japanese, Korean)
fn is_cjk_language(lang: &str) -> bool {
    matches!(
        lang,
        "chinese" | "zh" | "zh-hans" | "zh-hant" | 
        "japanese" | "ja" | 
        "korean" | "ko"
    )
}


fn tokenize_cjk(text: &str) -> (Vec<String>, Vec<TokenPosition>) {
    let mut tokens = Vec::new();
    let mut positions = Vec::new();
    let mut current_pos = 0;
    
    for grapheme in text.graphemes(true) {
        let grapheme_str = grapheme.to_string();
        let grapheme_len = grapheme_str.len();
        

        if grapheme.trim().is_empty() {
            current_pos += grapheme_len;
            continue;
        }
        
        tokens.push(grapheme_str);
        positions.push(TokenPosition {
            start: current_pos,
            end: current_pos + grapheme_len,
        });
        
        current_pos += grapheme_len;
    }
    
    (tokens, positions)
}


fn tokenize_standard(text: &str) -> (Vec<String>, Vec<TokenPosition>) {
    let mut tokens = Vec::new();
    let mut positions = Vec::new();
    

    let word_pattern = Regex::new(r"[\p{L}\p{M}]+(?:['\-][\p{L}\p{M}]+)*").unwrap(); //NOte this handles apostrophes and hyphens need to check for other variations if possible
    
    for mat in word_pattern.find_iter(text) {
        let word = mat.as_str().to_string();
        tokens.push(word);
        positions.push(TokenPosition {
            start: mat.start(),
            end: mat.end(),
        });
    }
    
    (tokens, positions)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_tokenize_english() {
        let result = tokenize_text("Hello, world! How are you?", "en").unwrap();
        assert_eq!(result.tokens, vec!["Hello", "world", "How", "are", "you"]);
        assert_eq!(result.positions.len(), 5);
    }
    
    #[test]
    fn test_tokenize_contractions() {
        let result = tokenize_text("I don't know what you're doing.", "en").unwrap();
        assert_eq!(result.tokens, vec!["I", "don't", "know", "what", "you're", "doing"]);
    }
    
    #[test]
    fn test_tokenize_french() {
        let result = tokenize_text("C'est très bien!", "fr").unwrap();
        assert_eq!(result.tokens, vec!["C'est", "très", "bien"]);
    }
    
    #[test]
    fn test_tokenize_spanish_accents() {
        let result = tokenize_text("¿Cómo estás?", "es").unwrap();
        assert_eq!(result.tokens, vec!["Cómo", "estás"]);
    }
    
    #[test]
    fn test_tokenize_chinese() {
        let result = tokenize_text("我爱学习中文", "zh").unwrap();
        assert_eq!(result.tokens, vec!["我", "爱", "学", "习", "中", "文"]);
    }
    
    #[test]
    fn test_tokenize_japanese() {
        let result = tokenize_text("こんにちは", "ja").unwrap();
        assert_eq!(result.tokens.len(), 5); // Each hiragana character
    }
    
    #[test]
    fn test_positions_accuracy() {
        let text = "Hello world";
        let result = tokenize_text(text, "en").unwrap();
        
        // Verify positions match actual words
        for (i, token) in result.tokens.iter().enumerate() {
            let pos = &result.positions[i];
            let extracted = &text[pos.start..pos.end];
            assert_eq!(token, extracted);
        }
    }
}
