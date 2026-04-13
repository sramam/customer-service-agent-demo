# F5 NGINX One — Customer Overview

**Audience:** customers evaluating or operating NGINX-based ingress and API gateways

## Product positioning

NGINX One bundles enterprise features for NGINX as an ingress controller, API gateway, and lightweight reverse proxy in Kubernetes and VM environments. It is aimed at teams that want **consistent policy**, **enterprise support**, and **lifecycle management** across clusters and clouds.

## Features

- **Declarative configuration** via Kubernetes CRDs or config files, depending on deployment mode.
- **Ingress and API gateway:** routing, canary releases, header manipulation, and upstream health checks.
- **Observability hooks** for metrics (Prometheus-compatible), access logs, and tracing integration with common stacks.
- **Rate limiting and JWT validation** patterns for API protection at the edge.
- **mTLS and TLS termination** options for service-to-service and north-south traffic.
- **Web Application Firewall (WAF)** capabilities when bundled with **NGINX App Protect** policies (see NGINX App Protect documentation).

## Support options

- **Subscription support** includes access to **software updates**, **security advisories**, and **technical support** via portal and phone per your severity and tier.
- **Tiers** may differ in **response-time objectives**, **24x7 availability** for critical cases, and **designated contacts** on enterprise agreements.
- **Kubernetes-focused assistance:** guidance on CRD patterns, upgrades, and integration with cloud load balancers is available through support; complex cluster design may use **professional services** (optional).

## Editions and licensing

- Licensing is typically **subscription-based** (annual or multi-year) and may be measured by **instances**, **cores**, or **cluster** entitlements — confirm against your quote.
- **Trials** may be available for proof-of-concept; contact your account team.

## Operational notes

- Rolling updates are supported; validate changes in staging before production promotion.
- Health checks should align with upstream application readiness endpoints.
- Keep **NGINX build** and **controller** versions within supported matrices published in release notes.

## Related products

- **NGINX App Protect** adds WAF, bot defense, and API schema validation in the same data plane — often combined with NGINX One for a single edge stack.
