-- AlterTable
ALTER TABLE "Element" ADD COLUMN     "elementTypeId" TEXT;

-- CreateTable
CREATE TABLE "ElementType" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "description" TEXT,
    "material" TEXT,
    "section" TEXT,
    "lengthM" DECIMAL(10,3),
    "widthMm" DECIMAL(10,2),
    "heightMm" DECIMAL(10,2),
    "thicknessMm" DECIMAL(10,2),
    "diameterMm" DECIMAL(10,2),
    "weightUnit" TEXT NOT NULL DEFAULT 'KG_M',
    "weightValue" DECIMAL(12,3) NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'KG',
    "estimatedPrice" DECIMAL(14,2) NOT NULL,
    "paintAreaM2" DECIMAL(10,4),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ElementType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElementType_clienteId_family_active_idx" ON "ElementType"("clienteId", "family", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ElementType_clienteId_code_key" ON "ElementType"("clienteId", "code");

-- AddForeignKey
ALTER TABLE "Element" ADD CONSTRAINT "Element_elementTypeId_fkey" FOREIGN KEY ("elementTypeId") REFERENCES "ElementType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
