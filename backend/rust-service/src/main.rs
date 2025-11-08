use actix_web::{web, App, HttpResponse, HttpServer, Responder, middleware::Logger};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use aligner::{align_smart};
use std::env;
use actix_web::dev::Service;
mod tokenizer;
mod models;
mod aligner;

use models::{TokenizeRequest, TokenizeResponse, HealthResponse,AlignmentRequest};


async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "healthy".to_string(),
        service: "dubdub-rust-service".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}


async fn tokenize(req: web::Json<TokenizeRequest>) -> impl Responder {
    log::info!("📝 Tokenize request for language: {}", req.language);
    log::info!("📖 Subtitle text: \"{}\"", req.text);
    
    match tokenizer::tokenize_text(&req.text, &req.language) {
        Ok(response) => {
            log::info!("✅ Tokenized into {} tokens", response.tokens.len());
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            log::error!("❌ Tokenization error: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Tokenization failed: {}", e)
            }))
        }
    }
}


async fn batch_tokenize(req: web::Json<Vec<TokenizeRequest>>) -> impl Responder {
    log::info!("Batch tokenize request for {} items", req.len());
    
    let responses: Vec<TokenizeResponse> = req.iter()
        .filter_map(|item| tokenizer::tokenize_text(&item.text, &item.language).ok())
        .collect();
    
    HttpResponse::Ok().json(responses)
}

async fn align_words(req: web::Json<AlignmentRequest>) -> impl Responder {
    log::info!("Alignment request: '{}' ({} to {})", 
        req.text, req.subtitle_start, req.subtitle_end);
    
    match aligner::align_smart(&req) {
        Ok(response) => {
            log::info!("Aligned {} words using {:?}", 
                response.timings.len(), response.method);
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            log::error!("Alignment error: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Alignment failed: {}", e)
            }))
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {

    dotenv::dotenv().ok();
    
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    
    let port = env::var("RUST_SERVICE_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("Invalid port number");
    
    let bind_address = format!("0.0.0.0:{}", port);
    
    log::info!(" Starting DuoTok Enhanced Rust Service on {}", bind_address);
    log::info!(" Supported languages: 30+ languages");
    log::info!(" High-performance tokenization ready");
    
    HttpServer::new(|| {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .expose_any_header()
            .max_age(3600);
        
        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            // Add middleware to set Private Network Access header
            .wrap_fn(|req, srv| {
                let fut = srv.call(req);
                async {
                    let mut res = fut.await?;
                    res.headers_mut().insert(
                        actix_web::http::header::HeaderName::from_static("access-control-allow-private-network"),
                        actix_web::http::header::HeaderValue::from_static("true")
                    );
                    Ok(res)
                }
            })
            .route("/api/health", web::get().to(health))
            .route("/api/tokenize", web::post().to(tokenize))
            .route("/api/batch-tokenize", web::post().to(batch_tokenize))
            .route("/api/align", web::post().to(align_words))  // Changed from /api/align-words
    })
    .bind(&bind_address)?
    .run()
    .await
}
