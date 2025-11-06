-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "ocr_status" TEXT NOT NULL DEFAULT 'pending',
    "merchant_name" TEXT,
    "total_amount" DECIMAL,
    "currency" TEXT,
    "date" DATETIME,
    "items" TEXT,
    "raw_text" TEXT,
    "confidence" DECIMAL,
    "expense_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "receipts_expense_id_key" ON "receipts"("expense_id");

-- CreateIndex
CREATE INDEX "receipts_user_id_idx" ON "receipts"("user_id");

-- CreateIndex
CREATE INDEX "receipts_ocr_status_idx" ON "receipts"("ocr_status");
