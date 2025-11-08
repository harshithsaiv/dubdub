use serde::{Deserialize, Serialize};


#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TokenizeRequest {
    pub text: String,
    pub language: String,
}


#[derive(Debug, Deserialize, Serialize)]
pub struct TokenizeResponse {
    pub text: String,
    pub language: String,
    pub tokens: Vec<String>,
    pub positions: Vec<TokenPosition>,
}


#[derive(Debug, Deserialize, Serialize)]
pub struct TokenPosition {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub version: String,
}

/// Timing information for a single word
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct WordTiming {
    pub word: String,
    pub start: f64,
    pub end: f64,
    pub confidence: f64,
    pub char_start: usize,
    pub char_end: usize,
}

#[derive(Debug, Deserialize,Serialize)]
pub struct AlignmentRequest {
    pub text: String,
    pub language: String,
    pub subtitle_start: f64,  
    pub subtitle_end: f64,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
}

/// Response containing aligned word timings
#[derive(Debug, Serialize)]
pub struct AlignmentResponse {
    pub text: String,
    pub language: String,
    pub duration: f64,
    pub timings: Vec<WordTiming>,  // Changed from WordAlignment
    pub method: AlignmentMethod,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AlignmentMethod {
    Linear,          
    Weighted,        
    ForcedAligner,   
}
