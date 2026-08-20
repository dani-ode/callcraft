import ipaddress
import socket
from typing import Union
from urllib.parse import urlparse


class SsrfError(Exception):
    pass


def validate_url_ip(url_str: str) -> str:
    """Validates target URL against SSRF rules before making HTTP request."""
    try:
        parsed = urlparse(url_str)
    except Exception:
        raise SsrfError("Invalid host string")

    if parsed.scheme not in ("http", "https"):
        raise SsrfError("Invalid URL scheme: only HTTP and HTTPS are permitted")

    host = parsed.hostname
    if not host:
        raise SsrfError("Invalid host string")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    try:
        addr_info = socket.getaddrinfo(host, port)
    except socket.gaierror:
        raise SsrfError(f"DNS resolution failed for host: {host}")

    for family, socktype, proto, canonname, sockaddr in addr_info:
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue

        if is_private_or_restricted_ip(ip):
            raise SsrfError(f"SSRF Protection: Access to private/loopback/cloud IP address {ip} is forbidden")

    return url_str


def is_private_or_restricted_ip(ip: Union[ipaddress.IPv4Address, ipaddress.IPv6Address]) -> bool:
    if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_unspecified:
        return True
    if isinstance(ip, ipaddress.IPv4Address):
        if ip.is_multicast:
            return True
    return False
