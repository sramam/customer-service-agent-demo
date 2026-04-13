-- Demo-only: one active browser session per preview customer email (POC confusion guard).
CREATE TABLE "DemoCustomerClaim" (
    "customerEmail" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoCustomerClaim_pkey" PRIMARY KEY ("customerEmail")
);
