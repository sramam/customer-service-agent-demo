# F5 SSL Orchestrator — Customer Overview

**Audience:** customers deploying SSL/TLS inspection and traffic steering

## What SSL Orchestrator does

SSL Orchestrator centralizes SSL/TLS decryption and re-encryption, allowing security tools in your stack to inspect encrypted traffic without each tool managing its own certificates:

- **Dynamic service chaining:** steer decrypted traffic through security devices (IDS/IPS, DLP, sandbox) based on policy, then re-encrypt before forwarding.
- **Policy-based bypass:** exempt sensitive categories (healthcare, banking) from decryption using URL categorization and custom rules.
- **Certificate management:** centralized certificate store with automatic renewal alerts and OCSP stapling.

## Deployment patterns

- Inline (layer 3) or as a proxy, depending on network topology.
- Integrates with BIG-IP LTM virtual servers for combined load-balancing and inspection.
- Supports both inbound (server-side) and outbound (client-side) inspection flows.

## Operational notes

Ensure bypass lists are reviewed quarterly. Monitor decryption throughput — hardware-accelerated models handle higher TPS than VE editions.
