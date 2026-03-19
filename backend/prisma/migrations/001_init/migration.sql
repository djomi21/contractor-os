-- ContractorOS Pro — Initial Migration
-- Generated from Prisma schema

-- ── Company ──────────────────────────────────────────
CREATE TABLE "Company" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "website" TEXT,
    "license" TEXT,
    "ein" TEXT,
    "logo" TEXT,
    "defaultTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "laborBurdenDefault" DOUBLE PRECISION NOT NULL DEFAULT 28.3,
    "invoiceFooter" TEXT,
    "estimateFooter" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "emailFromName" TEXT,
    "emailReplyTo" TEXT,
    "emailSignature" TEXT,
    "emailSubjectEstimate" TEXT,
    "emailSubjectInvoice" TEXT,
    "emailBodyEstimate" TEXT,
    "emailBodyInvoice" TEXT,
    "notifyEstimateSent" BOOLEAN NOT NULL DEFAULT true,
    "notifyEstimateApproved" BOOLEAN NOT NULL DEFAULT true,
    "notifyEstimateDeclined" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvoiceSent" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvoicePaid" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvoiceOverdue" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentReminder" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "overdueFollowupDays" INTEGER NOT NULL DEFAULT 7,
    "themeAccent" TEXT DEFAULT '#3b82f6',
    "themeName" TEXT DEFAULT 'Ocean Blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ── Users ────────────────────────────────────────────
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Field Tech',
    "status" TEXT NOT NULL DEFAULT 'active',
    "avatar" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_email_idx" ON "User"("email");

-- ── Customers ────────────────────────────────────────
CREATE TABLE "Customer" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "propertyType" TEXT,
    "leadSource" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT '{}',
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- ── Estimates ────────────────────────────────────────
CREATE TABLE "Estimate" (
    "id" TEXT PRIMARY KEY,
    "number" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "custId" INTEGER REFERENCES "Customer"("id") ON DELETE SET NULL,
    "projId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "date" TEXT NOT NULL,
    "expiry" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Estimate_companyId_idx" ON "Estimate"("companyId");
CREATE INDEX "Estimate_custId_idx" ON "Estimate"("custId");

-- ── Projects ─────────────────────────────────────────
CREATE TABLE "Project" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "custId" INTEGER REFERENCES "Customer"("id") ON DELETE SET NULL,
    "estId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "contractValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetLabor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetMaterials" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualLabor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualMaterials" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "start" TEXT,
    "end" TEXT,
    "phase" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");
CREATE INDEX "Project_custId_idx" ON "Project"("custId");

-- ── Invoices ─────────────────────────────────────────
CREATE TABLE "Invoice" (
    "id" TEXT PRIMARY KEY,
    "number" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "custId" INTEGER REFERENCES "Customer"("id") ON DELETE SET NULL,
    "projId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
    "estId" TEXT REFERENCES "Estimate"("id") ON DELETE SET NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "paidDate" TEXT,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "notes" TEXT,
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX "Invoice_custId_idx" ON "Invoice"("custId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- ── Materials ────────────────────────────────────────
CREATE TABLE "Material" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "category" TEXT,
    "supplier" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorderAt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Material_companyId_idx" ON "Material"("companyId");

-- ── Subcontractors ───────────────────────────────────
CREATE TABLE "Subcontractor" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "role" TEXT,
    "hourlyWage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billableRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Subcontractor_companyId_idx" ON "Subcontractor"("companyId");

-- ── Time Entries ─────────────────────────────────────
CREATE TABLE "TimeEntry" (
    "id" SERIAL PRIMARY KEY,
    "subId" INTEGER NOT NULL REFERENCES "Subcontractor"("id") ON DELETE CASCADE,
    "projId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
    "date" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "desc" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TimeEntry_subId_idx" ON "TimeEntry"("subId");
CREATE INDEX "TimeEntry_projId_idx" ON "TimeEntry"("projId");

-- ── Labor Roles ──────────────────────────────────────
CREATE TABLE "LaborRole" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payrollPct" DOUBLE PRECISION NOT NULL DEFAULT 15.3,
    "benefitsPct" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LaborRole_companyId_idx" ON "LaborRole"("companyId");

-- ── Change Orders ────────────────────────────────────
CREATE TABLE "ChangeOrder" (
    "id" TEXT PRIMARY KEY,
    "number" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "projId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
    "custId" INTEGER REFERENCES "Customer"("id") ON DELETE SET NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "approvedDate" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ChangeOrder_projId_idx" ON "ChangeOrder"("projId");

-- ── Expenses ─────────────────────────────────────────
CREATE TABLE "Expense" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL DEFAULT 1,
    "projId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receipt" BOOLEAN NOT NULL DEFAULT false,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Expense_projId_idx" ON "Expense"("projId");

-- ── Email Log ────────────────────────────────────────
CREATE TABLE "EmailLog" (
    "id" SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL,
    "docId" TEXT,
    "toEmail" TEXT NOT NULL,
    "ccEmail" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" INTEGER
);
