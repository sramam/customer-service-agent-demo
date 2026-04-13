# F5 Access Policy Manager (APM) — Customer Overview

**Audience:** customers deploying identity-aware access and zero-trust policies

## What APM does

Access Policy Manager provides secure, identity-aware access to applications and networks:

- **VPN and remote access:** full-tunnel SSL VPN and per-app VPN for remote workers, with endpoint inspection checks (OS version, antivirus status).
- **Single sign-on (SSO):** federate access across SAML, OAuth/OIDC, and Kerberos applications from a single login.
- **Multi-factor authentication (MFA):** integrate with third-party MFA providers (RADIUS, FIDO2) as a step in access policies.

## Features

- **Per-app access:** grant least-privilege access to specific URLs or apps instead of full network VPN where appropriate.
- **Endpoint posture:** integrate checks for disk encryption, domain membership, or EDR status before access.
- **Webtops and portals:** consolidated launch pages for published applications.
- **API protection** patterns when combined with other BIG-IP modules for layered controls.

## Access policy visual editor

Policies are built using a visual flow editor ("VPE") that chains steps like authentication, endpoint checks, resource assignment, and branching logic.

## Common scenarios

- Replace legacy VPN concentrators with BIG-IP APM for consolidated remote access.
- Add SSO to on-prem web applications without modifying application code.
- Enforce zero-trust posture checks before granting network-layer access.

## Support options

- **APM** is supported as part of **BIG-IP** entitlements; **TAC** handles access-policy troubleshooting, **IdP** integration issues (within scope), and known defects.
- **Severity** and **response targets** follow your **support tier**; **24x7** is common for VPN-down scenarios on premium programs.
- **Identity provider** configuration (Azure AD, Okta, etc.) often involves joint troubleshooting — have **SAML metadata** and **timestamps** ready when opening cases.

## Licensing

- APM is licensed **per concurrent access session** or **per named user** depending on SKU (verify your order). Perpetual and subscription models exist. Size for **peak concurrent** users plus growth.

## Operations

- Review **session logs** and **access reports** regularly for anomaly detection.
- Plan **MFA** fallback procedures (break-glass accounts) per your security policy.
