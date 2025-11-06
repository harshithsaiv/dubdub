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

// #[derive(Debug, Deserialize, Serialize)]
// pub struct WordAlignment {
//     pub word: String,
//     pub start_time: f64,
//     pub end_time: f64,
//     pub confidence: f64,
// }


// #[derive(Debug, Deserialize)]
// pub struct AlignmentRequest {
//     pub text: String,
//     pub audio_url: String,
//     pub language: String,
// }

// #[derive(Debug, Serialize)]
// pub struct AlignmentResponse {
//     pub alignments: Vec<WordAlignment>,
//     pub duration: f64,
// }
