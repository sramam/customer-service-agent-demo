# F5 NGINX App Protect — Customer Overview

**Audience:** customers deploying WAF and API security on NGINX

## What NGINX App Protect does

NGINX App Protect brings F5's advanced WAF and bot-defense capabilities directly into the NGINX data plane:

- **WAF module:** signature-based and behavioral detection for OWASP Top 10 threats, running in-line within NGINX processes.
- **Bot defense:** client-side challenges and fingerprinting to distinguish legitimate users from automated traffic.
- **API security:** OpenAPI schema validation to block malformed or unexpected API requests before they reach upstream services.

## Deployment models

- **Kubernetes sidecar:** deploy as a sidecar container alongside application pods for per-service WAF protection.
- **Ingress controller integration:** combine with NGINX Ingress Controller for cluster-wide security policies defined via CRDs.
- **Standalone:** run on bare-metal or VM-based NGINX instances with declarative JSON or YAML policy files.

## Tuning and operations

- Start with a default policy in transparent (monitoring) mode; review violation logs before switching to blocking mode.
- Use the Attack Signatures Update service for automatic rule updates.
- Export security events to SIEM via syslog or the Security Monitoring dashboard.
