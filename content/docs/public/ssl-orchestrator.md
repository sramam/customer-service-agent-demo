# F5 SSL Orchestrator — Customer Overview

**Audience:** customers deploying SSL/TLS inspection and traffic steering

## What SSL Orchestrator does

SSL Orchestrator centralizes SSL/TLS decryption and re-encryption, allowing security tools in your stack to inspect encrypted traffic without each tool managing its own certificates:

- **Dynamic service chaining:** steer decrypted traffic through security devices (IDS/IPS, DLP, sandbox) based on policy, then re-encrypt before forwarding.
- **Policy-based bypass:** exempt sensitive categories (healthcare, banking) from decryption using URL categorization and custom rules.
- **Certificate management:** centralized certificate store with automatic renewal alerts and OCSP stapling.

## Features

- **Inbound and outbound inspection** flows for different compliance and threat models.
- **Service chains** that can be updated without re-architecting the network for every new tool.
- **Visibility:** logging and statistics for decryption decisions and bypass events (subject to privacy policy).
- **Hardware acceleration** on supported BIG-IP platforms for high connection rates.

## Deployment patterns

- Inline (layer 3) or as a proxy, depending on network topology.
- Integrates with BIG-IP LTM virtual servers for combined load-balancing and inspection.
- Supports both inbound (server-side) and outbound (client-side) inspection flows.

## Support options

- Covered under **BIG-IP** support when SSL Orchestrator is licensed on the platform; **software updates** and **TAC** assistance follow your **support tier**.
- **Critical issues** (decryption outages, chain misconfiguration) are handled under standard **severity** guidelines; include **packet captures** and **policy exports** when opening cases (per support guidance).
- **Design reviews** for regulated environments are often delivered via **professional services**.

## Licensing

- Licensed as an **add-on module** to BIG-IP; throughput and platform form factor (hardware vs. VE) affect SKU selection.

## Operational notes

- Ensure bypass lists are reviewed quarterly. Monitor decryption throughput — hardware-accelerated models handle higher TPS than VE editions.
- Coordinate **PKI and legal** review for inspection policies in regulated industries.
