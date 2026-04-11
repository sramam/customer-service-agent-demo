# F5 DNS (formerly GTM) — Customer Overview

**Audience:** customers using global traffic management and intelligent DNS resolution

## What F5 DNS does

F5 DNS (Global Traffic Manager) provides intelligent DNS resolution to distribute traffic across data centers, cloud regions, and hybrid environments:

- **Wide-IP resolution:** returns optimal virtual-server addresses based on health, geography, or load.
- **GSLB (Global Server Load Balancing):** active monitoring of data-center health with automatic failover if a site becomes unreachable.
- **DNSSEC support:** sign zones to protect against DNS spoofing and cache poisoning.

## Key features

- **Topology records:** route users to the nearest healthy data center based on subnet-to-location mappings.
- **Persistence:** keep returning users directed to the same site for session continuity.
- **Health monitors:** TCP, HTTP, HTTPS, and custom monitor types for backend pool awareness.

## Integration with BIG-IP LTM

F5 DNS and LTM work together: DNS handles inter-site steering while LTM handles per-site load balancing. iQuery protocol synchronizes virtual-server health between them.
