use std::net::{IpAddr, ToSocketAddrs};
use thiserror::Error;
use url::Url;

#[derive(Error, Debug)]
pub enum SsrfError {
    #[error("Invalid URL scheme: only HTTP and HTTPS are permitted")]
    InvalidScheme,
    #[error("Invalid host string")]
    InvalidHost,
    #[error("DNS resolution failed for host: {0}")]
    DnsResolutionFailed(String),
    #[error("SSRF Protection: Access to private/loopback/cloud IP address {0} is forbidden")]
    ForbiddenIpAddress(IpAddr),
}

/// Validates target URL against SSRF rules before making HTTP request
pub fn validate_url_ip(url_str: &str) -> Result<Url, SsrfError> {
    let url = Url::parse(url_str).map_err(|_| SsrfError::InvalidHost)?;

    // 1. Check scheme
    match url.scheme() {
        "http" | "https" => {}
        _ => return Err(SsrfError::InvalidScheme),
    }

    // 2. Resolve DNS IP Addresses
    let host = url.host_str().ok_or(SsrfError::InvalidHost)?;
    let port = url.port_or_known_default().unwrap_or(80);
    let socket_str = format!("{}:{}", host, port);

    let addrs = socket_str
        .to_socket_addrs()
        .map_err(|_| SsrfError::DnsResolutionFailed(host.to_string()))?;

    // 3. Verify every resolved IP against private / loopback / cloud metadata ranges
    for addr in addrs {
        let ip = addr.ip();
        if is_private_or_restricted_ip(ip) {
            return Err(SsrfError::ForbiddenIpAddress(ip));
        }
    }

    Ok(url)
}

fn is_private_or_restricted_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            ipv4.is_loopback()                           // 127.0.0.0/8
                || ipv4.is_private()                     // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
                || ipv4.is_link_local()                  // 169.254.0.0/16 (Includes AWS Metadata 169.254.169.254)
                || ipv4.is_broadcast()                   // 255.255.255.255
                || ipv4.is_documentation()               // 192.0.2.0/24, etc.
                || ipv4.is_unspecified()                 // 0.0.0.0
        }
        IpAddr::V6(ipv6) => {
            ipv6.is_loopback()                           // ::1
                || ipv6.is_unspecified()                 // ::
        }
    }
}
