# F5 BIG-IQ Centralized Management — Customer Overview

**Audience:** customers managing multiple BIG-IP devices

## What BIG-IQ does

BIG-IQ provides a single pane of glass for managing fleets of BIG-IP devices, including:

- **License management:** pool-based licensing across BIG-IP instances, with automatic reclaim of unused entitlements.
- **Configuration management:** deploy, audit, and roll back LTM, ASM, and AFM configurations across device groups.
- **Analytics and visibility:** aggregated dashboards for traffic, security events, and certificate expiry across all managed devices.

## Deployment considerations

- BIG-IQ is deployed as a VM or hardware appliance in a management VLAN.
- Discovery of BIG-IP devices uses management IP and credentials stored in an encrypted vault.
- High-availability pairs can be configured for BIG-IQ itself (active/standby).

## Typical use cases

- Enterprises with 10+ BIG-IP instances needing consistent policy enforcement.
- Compliance scenarios requiring audit trails of configuration changes.
- Teams consolidating visibility without logging into each device individually.
