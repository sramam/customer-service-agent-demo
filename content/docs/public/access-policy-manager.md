# F5 Access Policy Manager (APM) — Customer Overview

**Audience:** customers deploying identity-aware access and zero-trust policies

## What APM does

Access Policy Manager provides secure, identity-aware access to applications and networks:

- **VPN and remote access:** full-tunnel SSL VPN and per-app VPN for remote workers, with endpoint inspection checks (OS version, antivirus status).
- **Single sign-on (SSO):** federate access across SAML, OAuth/OIDC, and Kerberos applications from a single login.
- **Multi-factor authentication (MFA):** integrate with third-party MFA providers (RADIUS, FIDO2) as a step in access policies.

## Access policy visual editor

Policies are built using a visual flow editor ("VPE") that chains steps like authentication, endpoint checks, resource assignment, and branching logic.

## Common scenarios

- Replace legacy VPN concentrators with BIG-IP APM for consolidated remote access.
- Add SSO to on-prem web applications without modifying application code.
- Enforce zero-trust posture checks before granting network-layer access.

## Licensing

APM is licensed per-access-session. Perpetual and subscription models are available. Session counts should be sized based on peak concurrent user estimates.
