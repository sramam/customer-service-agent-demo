# INTERNAL ONLY — SSL Orchestrator deployment and troubleshooting

**Classification:** Engineering / Support operations — **not customer-shippable**

## Common issues

1. **Decryption failures:** usually caused by expired interception certs. Check cert store in `tmsh list sys file ssl-cert`. Renew via internal PKI portal (do **not** share PKI portal URL with customers).
2. **Service chain bypass:** if a security device in the chain is down, the default action depends on policy — "fail open" or "fail closed." Check `/var/log/ltm` for service-chain health messages.
3. **Performance degradation:** VE editions are limited to ~5 Gbps decrypted throughput. If customer reports slowness, verify they're not exceeding the platform limit before escalating to hardware sizing discussions.

## Internal escalation

- SSL Orchestrator L3 issues go to `#sslo-engineering` Slack channel.
- Certificate policy questions route to the InfoSec team via `CERT-POLICY` ServiceNow queue.

## Customer-safe phrasing

When discussing SSL inspection with customers, refer to "encrypted traffic visibility" rather than internal terms like "MITM proxy" or "interception certificate." Use approved KB articles for setup guidance.
