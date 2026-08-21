import ipaddress
import logging
from typing import List, Optional

logger = logging.getLogger("callcraft.engine.ip_utils")


def validate_ip_or_cidr(ip_str: str) -> bool:
    """Validates if string is a valid IPv4/IPv6 address or CIDR network representation."""
    ip_str = ip_str.strip()
    if not ip_str:
        return False
    try:
        if "/" in ip_str:
            ipaddress.ip_network(ip_str, strict=False)
        else:
            ipaddress.ip_address(ip_str)
        return True
    except ValueError:
        return False


def is_ip_allowed(client_ip_str: str, allowed_ips: Optional[List[str]]) -> bool:
    """
    Checks whether a client IP address is allowed based on a whitelist.
    
    - If allowed_ips is empty or None, all IPs are permitted (returns True).
    - Supports exact IP matching (e.g., '192.168.1.50', '127.0.0.1', '::1')
    - Supports CIDR network matching (e.g., '10.0.0.0/24', '172.16.0.0/12')
    """
    if not allowed_ips:
        return True

    # Filter out empty or whitespace entries
    valid_whitelist = [item.strip() for item in allowed_ips if item and item.strip()]
    if not valid_whitelist:
        return True

    client_ip_str = client_ip_str.strip()
    try:
        client_ip = ipaddress.ip_address(client_ip_str)
    except ValueError:
        logger.warning(f"Invalid client IP format received: '{client_ip_str}'")
        return False

    for item in valid_whitelist:
        try:
            if "/" in item:
                network = ipaddress.ip_network(item, strict=False)
                if client_ip in network:
                    return True
            else:
                allowed_ip = ipaddress.ip_address(item)
                if client_ip == allowed_ip:
                    return True
        except ValueError:
            logger.warning(f"Invalid whitelist IP item in database: '{item}'")
            continue

    return False
