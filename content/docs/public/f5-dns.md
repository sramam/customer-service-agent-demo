# F5 DNS (formerly GTM) — Customer Overview

**Audience:** customers using global traffic management and intelligent DNS resolution

## What F5 DNS does

F5 DNS (Global Traffic Manager) provides intelligent DNS resolution to distribute traffic across data centers, cloud regions, and hybrid environments:

- **Wide-IP resolution:** returns optimal virtual-server addresses based on health, geography, or load.
- **GSLB (Global Server Load Balancing):** active monitoring of data-center health with automatic failover if a site becomes unreachable.
- **DNSSEC support:** sign zones to protect against DNS spoofing and cache poisoning.

## Features

- **Topology records:** route users to the nearest healthy data center based on subnet-to-location mappings.
- **Persistence:** keep returning users directed to the same site for session continuity.
- **Health monitors:** TCP, HTTP, HTTPS, and custom monitor types for backend pool awareness.
- **Load balancing methods:** round robin, ratio, global availability, and others depending on deployment goals.
- **Delegation and zones:** integrate with existing DNS infrastructure as authoritative or delegated components.

## Integration with BIG-IP LTM

F5 DNS and LTM work together: DNS handles inter-site steering while LTM handles per-site load balancing. **iQuery** synchronizes virtual-server health between them for accurate GSLB decisions.

## Support options

- **BIG-IP support** entitlements that include the **DNS** module receive **software updates**, **technical support**, and **documentation** for supported releases.
- **Severity-based** response applies; **24x7** phone may be included for production-down scenarios on higher tiers.
- **Design assistance** for large GSLB designs may be available through **professional services** (optional).

## Licensing

- Licensed as part of **BIG-IP** bundles or as a **standalone GTM/DNS** SKU depending on deployment; **virtual editions** and **appliances** follow the same entitlement model as other BIG-IP modules.

## Operational best practices

- Maintain **accurate topology** and **monitor** definitions — GSLB decisions depend on them.
- Plan **DNS TTLs** and **failover testing** with application owners before major changes.
