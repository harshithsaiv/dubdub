use actix_web::{web, App, HttpResponse, HttpServer, Responder, middleware::Logger};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use std::env;

mod tokenizer;
mod models;

use models::{TokenizeRequest, TokenizeResponse, HealthResponse};


async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "healthy".to_string(),
        service: "dubdub-rust-service".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}


async fn tokenize(req: web::Json<TokenizeRequest>) -> impl Responder {
    log::info!("Tokenize request for language: {}", req.language);
    
    match tokenizer::tokenize_text(&req.text, &req.language) {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Tokenization error: {}", e);
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

#[actix_web::main]
async fn main() -> std::io::Result<()> {

    dotenv::dotenv().ok();
    
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    
    let port = env::var("RUST_SERVICE_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("Invalid port number");
    
    let bind_address = format!("0.0.0.0:{}", port);
    
    log::info!("🚀 Starting DuoTok Enhanced Rust Service on {}", bind_address);
    log::info!("📚 Supported languages: 30+ languages");
    log::info!("⚡ High-performance tokenization ready");
    
    HttpServer::new(|| {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        
        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .route("/api/health", web::get().to(health))
            .route("/api/tokenize", web::post().to(tokenize))
            .route("/api/batch-tokenize", web::post().to(batch_tokenize))
    })
    .bind(&bind_address)?
    .run()
    .await
}
