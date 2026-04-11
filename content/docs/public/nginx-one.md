# F5 NGINX One — Customer Overview

**Audience:** customers evaluating or operating NGINX-based ingress and API gateways

## Product positioning

NGINX One bundles enterprise features for NGINX as an ingress controller, API gateway, and lightweight reverse proxy in Kubernetes and VM environments.

## Key capabilities

- **Declarative configuration** via Kubernetes CRDs or config files, depending on deployment mode.
- **Observability hooks** for metrics and tracing integration with common stacks.
- **Rate limiting and JWT validation** patterns for API protection at the edge.

## Operational notes

Rolling updates are supported; validate changes in staging before production promotion. Health checks should align with upstream application readiness endpoints.
