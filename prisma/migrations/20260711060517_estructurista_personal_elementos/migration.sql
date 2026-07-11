-- AlterTable
ALTER TABLE "Cost" ADD COLUMN     "elementId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "crewId" TEXT,
ADD COLUMN     "isLeader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "elementId" TEXT;

-- CreateTable
CREATE TABLE "Crew" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementStage" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPct" DECIMAL(5,2) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ElementStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Element" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "budgetItemId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "length" DECIMAL(10,3),
    "width" DECIMAL(10,3),
    "height" DECIMAL(10,3),
    "weight" DECIMAL(12,3) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "progressPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementProgress" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "qtyDone" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElementProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Crew_leaderId_key" ON "Crew"("leaderId");

-- CreateIndex
CREATE INDEX "Crew_clienteId_active_idx" ON "Crew"("clienteId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_employeeId_key" ON "ProjectAssignment"("projectId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ElementStage_clienteId_code_key" ON "ElementStage"("clienteId", "code");

-- CreateIndex
CREATE INDEX "Element_projectId_budgetItemId_idx" ON "Element"("projectId", "budgetItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Element_projectId_code_key" ON "Element"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ElementProgress_elementId_stageId_key" ON "ElementProgress"("elementId", "stageId");

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crew" ADD CONSTRAINT "Crew_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Element" ADD CONSTRAINT "Element_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Element" ADD CONSTRAINT "Element_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementProgress" ADD CONSTRAINT "ElementProgress_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementProgress" ADD CONSTRAINT "ElementProgress_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ElementStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
