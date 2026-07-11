-- DropIndex
DROP INDEX "TimeEntry_projectId_employeeId_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_projectId_employeeId_elementId_date_key" ON "TimeEntry"("projectId", "employeeId", "elementId", "date");
