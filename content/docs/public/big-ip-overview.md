# F5 BIG-IP Platform — Customer Overview

**Audience:** customers and partners (public-facing summary)

## What BIG-IP is

BIG-IP is an application delivery and security platform. Common roles include:

- **Local Traffic Manager (LTM):** load balancing, traffic steering, health monitoring, connection pooling, and SSL offload for applications.
- **Advanced Firewall Manager (AFM):** network-layer protections, DDoS mitigation options, and policy enforcement at the edge.
- **Application Security Manager (ASM):** web application firewall (WAF) capabilities for HTTP/S traffic, including OWASP-oriented protections and policy tuning.

## Feature highlights

- **High availability:** active/standby or active/active clusters; configuration sync and failover for stateful sessions where supported.
- **Programmability:** **iRules** and **iRules LX** for request/response customization (review and test in non-production first).
- **SSL/TLS:** offload, re-encryption, and certificate lifecycle features integrated with virtual servers and profiles.
- **Health monitoring:** flexible monitors (HTTP, HTTPS, TCP, custom) to drive pool membership and traffic decisions.
- **SNAT pools:** when servers must see a consistent source address from the BIG-IP.

## Typical deployment patterns

- **Active/standby pairs** for high availability; configuration sync keeps both devices aligned.
- **SNAT pools** when servers must see a consistent source address from the BIG-IP.
- **iRules** for request/response customization at the edge (use with care and review).
- **Virtual editions (VE)** on supported hypervisors and cloud marketplaces for elastic scale; hardware appliances for highest throughput and dedicated crypto.

## Support options

- **Support tiers** (e.g. Standard, Premium, Premium Plus — names vary by contract) define response targets by **severity** (critical down to low) and may include **designated technical contacts** or **named support engineers** on higher tiers.
- **Channels:** web portal and phone for production-impacting issues; knowledge base and downloads for software, hotfixes, and documentation.
- **Software support:** eligible releases receive maintenance fixes per your entitlement; **end-of-software-development** dates are published per major version — plan upgrades before support windows close.
- **Professional services** (optional): implementation, health checks, and migration assistance are available separately from base support.

## Licensing and editions

- Modules (LTM, ASM, AFM, etc.) are licensed per **throughput**, **instance**, or **bundle** depending on product SKU; your order form lists effective entitlements.
- **Better** or **Best** bundles combine multiple modules for common enterprise patterns.

## Other notes

- **Compliance:** many customers use BIG-IP in PCI-DSS, HIPAA, and FedRAMP-style environments; your security team should map controls to your deployment.
- **Upgrades:** follow release notes and validation in staging; major jumps may require a stepped upgrade path.
