import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";
import { customerExcelRowSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string; // "preview" or "save"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Validate columns
    const requiredColumns = ["Name", "House", "RatePerBottle"];
    if (rawData.length > 0) {
      const firstRow = rawData[0] as Record<string, unknown>;
      const missingColumns = requiredColumns.filter((col) => !(col in firstRow));
      if (missingColumns.length > 0) {
        return NextResponse.json(
          { error: `Missing columns: ${missingColumns.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate rows
    const validRows: Array<{ name: string; house: string; ratePerBottle: number }> = [];
    const errors: Array<{ row: number; reason: string }> = [];

    rawData.forEach((row, index) => {
      const parsed = customerExcelRowSchema.safeParse(row);
      if (parsed.success) {
        validRows.push({
          name: String(parsed.data.Name).trim(),
          house: String(parsed.data.House).trim(),
          ratePerBottle: parsed.data.RatePerBottle,
        });
      } else {
        const errorMessages = parsed.error.issues.map((e) => e.message).join(", ");
        errors.push({ row: index + 2, reason: errorMessages }); // +2 for 1-based + header
      }
    });

    if (action === "preview") {
      return NextResponse.json({
        validRows,
        errors,
        totalRows: rawData.length,
        validCount: validRows.length,
        errorCount: errors.length,
      });
    }

    // Save - use transaction for bulk upsert
    let inserted = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const existing = await tx.customer.findUnique({
          where: { name_house: { name: row.name, house: row.house } },
        });

        if (existing) {
          await tx.customer.update({
            where: { id: existing.id },
            data: { ratePerBottle: row.ratePerBottle },
          });
          updated++;
        } else {
          await tx.customer.create({ data: row });
          inserted++;
        }
      }
    });

    return NextResponse.json({
      message: "Import completed",
      inserted,
      updated,
      skipped: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Customer upload error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
