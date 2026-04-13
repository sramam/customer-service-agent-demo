# F5 BIG-IQ Centralized Management — Customer Overview

**Audience:** customers managing multiple BIG-IP devices

## What BIG-IQ does

BIG-IQ provides a single pane of glass for managing fleets of BIG-IP devices, including:

- **License management:** pool-based licensing across BIG-IP instances, with automatic reclaim of unused entitlements.
- **Configuration management:** deploy, audit, and roll back LTM, ASM, and AFM configurations across device groups.
- **Analytics and visibility:** aggregated dashboards for traffic, security events, and certificate expiry across all managed devices.

## Features

- **Device inventory:** discovery, grouping, and tagging of BIG-IP instances across data centers.
- **Role-based access control** for operators vs. auditors vs. administrators.
- **Backup and restore** workflows for managed configurations.
- **Reporting** for compliance snapshots and change history (scope depends on module and version).

## Deployment considerations

- BIG-IQ is deployed as a VM or hardware appliance in a management VLAN.
- Discovery of BIG-IP devices uses management IP and credentials stored in an encrypted vault.
- High-availability pairs can be configured for BIG-IQ itself (active/standby).

## Support options

- **BIG-IQ** is supported under **F5 support** agreements that include the product; **software compatibility matrices** list supported BIG-IP versions per BIG-IQ release.
- **Technical support** assists with upgrade planning, discovery issues, and defects; **RMA** applies to hardware appliances.
- **Enterprise** programs may include **joint sessions** with BIG-IP support for complex fleet issues.

## Typical use cases

- Enterprises with 10+ BIG-IP instances needing consistent policy enforcement.
- Compliance scenarios requiring audit trails of configuration changes.
- Teams consolidating visibility without logging into each device individually.

## Licensing

- BIG-IQ is licensed separately from individual BIG-IPs; **Centralized Management**, **Data Collection**, and **ADC** licensing components may apply — confirm against your quote.
