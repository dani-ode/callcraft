use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ocr_worker=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting OCR Platform Background Outbox Worker...");

    loop {
        // Worker polling outbox queue loop placeholder
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
        tracing::debug!("OCR Worker heartbeating...");
    }
}
