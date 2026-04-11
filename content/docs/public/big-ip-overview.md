# F5 BIG-IP Platform — Customer Overview

**Audience:** customers and partners (public-facing summary)

## What BIG-IP is

BIG-IP is an application delivery and security platform. Common roles include:

- **Local Traffic Manager (LTM):** load balancing, traffic steering, and health monitoring for applications.
- **Advanced Firewall Manager (AFM):** network-layer protections and policy enforcement.
- **Application Security Manager (ASM):** web application firewall (WAF) capabilities for HTTP/S traffic.

## Typical deployment patterns

- **Active/standby pairs** for high availability; configuration sync keeps both devices aligned.
- **SNAT pools** when servers must see a consistent source address from the BIG-IP.
- **iRules** for request/response customization at the edge (use with care and review).

## Support expectations

Enterprise plans include guided upgrades and designated support tiers. Standard plans follow published SLAs for severity levels.
