use axum::{
    routing::{get, post},
    Json, Router,
};
use serde_json::json;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file if available
    let _ = dotenvy::dotenv();

    // Initialize Tracing Subscriber
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ocr_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting OCR Platform Data Plane API Server...");

    // Build Axum Router
    let app = Router::new()
        .route("/health", get(health_check_handler))
        .nest("/internal/v1", internal_routes())
        .nest("/v1/ocr", public_ocr_routes())
        .nest("/admin/v1", admin_routes());

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid u16 number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("OCR API listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check_handler() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "ocr-api",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

fn internal_routes() -> Router {
    Router::new().route("/status", get(|| async { Json(json!({"channel": "internal"})) }))
}

fn public_ocr_routes() -> Router {
    Router::new().route("/:user_id", post(|| async { Json(json!({"channel": "public_ocr"})) }))
}

fn admin_routes() -> Router {
    Router::new().route("/status", get(|| async { Json(json!({"channel": "admin"})) }))
}
