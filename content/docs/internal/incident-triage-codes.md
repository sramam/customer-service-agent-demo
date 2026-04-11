# INTERNAL ONLY — Severity and routing codes

**Classification:** Engineering — **not for external distribution**

## Severity mapping (internal)

| Code | Meaning | Example |
|------|---------|---------|
| SEV1 | Customer production down | All VIPs unreachable |
| SEV2 | Major degradation | Elevated error rate > 10% |
| SEV3 | Limited impact | Single pool member flapping |

## Routing

Escalations to platform engineering use channel `#bigip-oncall` (example). **Do not share internal Slack channel names with customers.**

## Data handling

PII and contract values in this sheet are synthetic for training. Real sheets live in the secure drive — **never attach internal spreadsheets to customer threads.**
