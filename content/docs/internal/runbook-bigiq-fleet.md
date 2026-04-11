# INTERNAL ONLY — BIG-IQ fleet management operations

**Classification:** Engineering / Support operations — **not customer-shippable**

## Discovery failures

1. **Device unreachable:** verify management IP is routable from BIG-IQ. Common cause: firewall rules blocking port 443 between management VLANs.
2. **Credential mismatch:** BIG-IQ stores device credentials in its encrypted vault. If a BIG-IP admin password was rotated, re-discover the device in BIG-IQ.
3. **Version incompatibility:** BIG-IQ 8.x supports BIG-IP 14.1+. Older BIG-IP versions may show partial discovery — check the compatibility matrix in the internal wiki.

## License pool operations

- Granting/revoking licenses is done through the BIG-IQ License Manager module.
- If a customer's license pool is exhausted, they need a new activation key — route to `#licensing-ops` for key generation.
- **Never share license pool UUIDs, activation keys, or internal licensing portal URLs with customers.**

## Config deployment rollback

If a pushed configuration causes issues on managed devices:
1. Open the deployment task in BIG-IQ.
2. Use "Snapshot Comparison" to identify the diff.
3. Deploy the previous snapshot to affected devices.
4. Document in ServiceNow under the customer's asset record.

## Customer-safe phrasing

Refer to "centralized management platform" rather than internal build numbers or staging environment details. Never share BIG-IQ admin console screenshots that show other customers' device names.
