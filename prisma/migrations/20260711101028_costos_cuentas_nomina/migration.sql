-- DropIndex
DROP INDEX "BudgetItem_projectId_category_idx";

-- DropIndex
DROP INDEX "Cost_projectId_category_idx";

-- AlterTable
ALTER TABLE "BudgetItem" DROP COLUMN "category",
ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "Cost" DROP COLUMN "category",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ALTER COLUMN "projectId" DROP NOT NULL;

-- DropEnum
DROP TYPE "CostCategory";

-- CreateTable
CREATE TABLE "CostAccount" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isProject" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CostAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostAccount_clienteId_level_active_idx" ON "CostAccount"("clienteId", "level", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CostAccount_clienteId_code_key" ON "CostAccount"("clienteId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_clienteId_year_month_type_key" ON "PayrollPeriod"("clienteId", "year", "month", "type");

-- CreateIndex
CREATE INDEX "BudgetItem_projectId_accountId_idx" ON "BudgetItem"("projectId", "accountId");

-- CreateIndex
CREATE INDEX "Cost_accountId_date_idx" ON "Cost"("accountId", "date");

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CostAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAccount" ADD CONSTRAINT "CostAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CostAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CostAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

