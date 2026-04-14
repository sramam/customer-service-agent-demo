import type { CustomerAgentResponse, EmployeeAgentResponse } from "./types";

/** Valid wire-format fallbacks when schema validation exhausts retries (persisted + streamed). */

const CUSTOMER_FALLBACK: CustomerAgentResponse = {
  text: "Sorry — I hit a formatting issue on my side. Please send your last message again.",
  sources: [],
  suggestedQuestions: ["Retry"],
};

const EMPLOYEE_FALLBACK: EmployeeAgentResponse = {
  internalNotes: "No new internal findings this turn.",
  draftCustomerResponse:
    "Sorry — I hit a formatting issue on my side. Please try **Suggest draft** again.",
  sources: [],
};

export const CUSTOMER_SCHEMA_FALLBACK_ASSISTANT_TEXT = JSON.stringify(CUSTOMER_FALLBACK);

export const EMPLOYEE_SCHEMA_FALLBACK_ASSISTANT_TEXT = JSON.stringify(EMPLOYEE_FALLBACK);
