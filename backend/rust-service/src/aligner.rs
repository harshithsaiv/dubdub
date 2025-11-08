use crate::models::{AlignmentRequest, AlignmentResponse, WordTiming, AlignmentMethod};
use crate::tokenizer::tokenize_text;

/// Align words using weighted distribution
/// 
/// # How it works:
/// 1. Tokenize the text into words
/// 2. Calculate each word's character count
/// 3. Distribute time proportionally to length
/// 
/// Example:
/// Text: "Hi wonderful" (2 seconds total)
/// - "Hi" = 2 chars → 2/11 = 18% → 0.36 seconds
/// - "wonderful" = 9 chars → 9/11 = 82% → 1.64 seconds
pub fn align_weighted(req: &AlignmentRequest) -> Result<AlignmentResponse, String> {
    // Step 1: Tokenize to get words and their positions
    let tokenized = tokenize_text(&req.text, &req.language)?;
    
    if tokenized.tokens.is_empty() {
        return Err("No words found to align".to_string());
    }
    
    // Step 2: Calculate total duration
    let total_duration = req.subtitle_end - req.subtitle_start;
    
    if total_duration <= 0.0 {
        return Err("Invalid subtitle timing: end must be after start".to_string());
    }
    
    // Step 3: Count total characters (for weight calculation)
    let total_chars: usize = tokenized.tokens.iter()
        .map(|word| word.chars().count())
        .sum();
    
    if total_chars == 0 {
        return Err("No characters found".to_string());
    }
    
    // Step 4: Assign timing to each word
    let mut timings = Vec::new();
    let mut current_time = req.subtitle_start;
    
    for (i, word) in tokenized.tokens.iter().enumerate() {
        let word_chars = word.chars().count();
        
        // Calculate this word's proportion of total time
        let weight = word_chars as f64 / total_chars as f64;
        let word_duration = total_duration * weight;
        
        let timing = WordTiming {
            word: word.clone(),
            start: current_time,
            end: current_time + word_duration,
            confidence: 0.75, // Weighted method is decent but not perfect
            char_start: tokenized.positions[i].start,
            char_end: tokenized.positions[i].end,
        };
        
        timings.push(timing);
        current_time += word_duration;
    }
    
    Ok(AlignmentResponse {
        text: req.text.clone(),
        language: req.language.clone(),
        duration: total_duration,
        timings,
        method: AlignmentMethod::Weighted,
    })
}

/// Align words using simple linear distribution
/// 
/// Each word gets exactly equal time.
/// Fast but less accurate than weighted.
pub fn align_linear(req: &AlignmentRequest) -> Result<AlignmentResponse, String> {
    let tokenized = tokenize_text(&req.text, &req.language)?;
    
    if tokenized.tokens.is_empty() {
        return Err("No words found to align".to_string());
    }
    
    let total_duration = req.subtitle_end - req.subtitle_start;
    let time_per_word = total_duration / tokenized.tokens.len() as f64;
    
    let mut timings = Vec::new();
    let mut current_time = req.subtitle_start;
    
    for (i, word) in tokenized.tokens.iter().enumerate() {
        timings.push(WordTiming {
            word: word.clone(),
            start: current_time,
            end: current_time + time_per_word,
            confidence: 0.5, // Linear is just a guess
            char_start: tokenized.positions[i].start,
            char_end: tokenized.positions[i].end,
        });
        
        current_time += time_per_word;
    }
    
    Ok(AlignmentResponse {
        text: req.text.clone(),
        language: req.language.clone(),
        duration: total_duration,
        timings,
        method: AlignmentMethod::Linear,
    })
}

// Smart selector: choose best method based on request
pub fn align_smart(req: &AlignmentRequest) -> Result<AlignmentResponse, String> {
    // If audio URL is provided, we'll use forced alignment (future)
    if req.audio_url.is_some() {
        // TODO: Implement forced alignment
        return Err("Forced alignment not yet implemented".to_string());
    }
    
    // Otherwise, use weighted (best available)
    align_weighted(req)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_weighted_alignment_basic() {
        let req = AlignmentRequest {
            text: "Hello world".to_string(),
            language: "en".to_string(),
            subtitle_start: 0.0,
            subtitle_end: 2.0,
            audio_url: None,
        };
        
        let result = align_weighted(&req).unwrap();
        
        assert_eq!(result.timings.len(), 2);
        assert_eq!(result.duration, 2.0);
        
        // Both words have 5 letters, should get equal time
        let hello_duration = result.timings[0].end - result.timings[0].start;
        let world_duration = result.timings[1].end - result.timings[1].start;
        
        assert!((hello_duration - 1.0).abs() < 0.01);
        assert!((world_duration - 1.0).abs() < 0.01);
    }
    
    #[test]
    fn test_weighted_alignment_unequal() {
        let req = AlignmentRequest {
            text: "I programming".to_string(),
            language: "en".to_string(),
            subtitle_start: 0.0,
            subtitle_end: 3.0,
            audio_url: None,
        };
        
        let result = align_weighted(&req).unwrap();
        
        // "I" = 1 char, "programming" = 11 chars
        // "I" should get 1/12 = 8.3% of time
        // "programming" should get 11/12 = 91.7% of time
        
        let i_duration = result.timings[0].end - result.timings[0].start;
        let prog_duration = result.timings[1].end - result.timings[1].start;
        
        assert!(prog_duration > i_duration * 5.0);
    }
    
    #[test]
    fn test_linear_alignment() {
        let req = AlignmentRequest {
            text: "a programming language".to_string(),
            language: "en".to_string(),
            subtitle_start: 0.0,
            subtitle_end: 3.0,
            audio_url: None,
        };
        
        let result = align_linear(&req).unwrap();
        
        // 3 words in 3 seconds = 1 second each
        for timing in &result.timings {
            let duration = timing.end - timing.start;
            assert!((duration - 1.0).abs() < 0.01);
        }
    }
    
    #[test]
    fn test_confidence_scores() {
        let req = AlignmentRequest {
            text: "Hello world".to_string(),
            language: "en".to_string(),
            subtitle_start: 0.0,
            subtitle_end: 2.0,
            audio_url: None,
        };
        
        let weighted = align_weighted(&req).unwrap();
        let linear = align_linear(&req).unwrap();
        
        // Weighted should have higher confidence
        assert!(weighted.timings[0].confidence > linear.timings[0].confidence);
    }
}