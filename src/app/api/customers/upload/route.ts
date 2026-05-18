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
    const requiredColumns = ["House", "RatePerBottle"];
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
    const parsedRows: Array<{ rowNum: number; name: string; house: string; ratePerBottle: number }> = [];
    const errors: Array<{ row: number; reason: string }> = [];

    rawData.forEach((row, index) => {
      const parsed = customerExcelRowSchema.safeParse(row);
      if (parsed.success) {
        parsedRows.push({
          rowNum: index + 2, // +2 for 1-based + header
          name: String(parsed.data.Name).trim(),
          house: String(parsed.data.House).trim(),
          ratePerBottle: parsed.data.RatePerBottle,
        });
      } else {
        const errorMessages = parsed.error.issues.map((e) => e.message).join(", ");
        errors.push({ row: index + 2, reason: errorMessages });
      }
    });

    // Duplicate check on House column
    const validRows: Array<{ name: string; house: string; ratePerBottle: number }> = [];
    const seenHouses = new Map<string, number>();

    const housesToLookup = parsedRows.map(r => r.house);
    const existingCustomers = await prisma.customer.findMany({
      where: { house: { in: housesToLookup } }
    });
    
    const dbHouseOwnerMap = new Map<string, string>();
    existingCustomers.forEach(c => {
      dbHouseOwnerMap.set(c.house.toLowerCase(), c.name.toLowerCase());
    });

    for (const row of parsedRows) {
      const houseKey = row.house.toLowerCase();
      const nameKey = row.name.toLowerCase();

      // Check file duplicates
      if (seenHouses.has(houseKey)) {
        errors.push({ row: row.rowNum, reason: `Duplicate House '${row.house}' found in the file (also in row ${seenHouses.get(houseKey)})` });
        continue;
      }
      
      // Check DB duplicates
      if (dbHouseOwnerMap.has(houseKey)) {
        const existingName = existingCustomers.find(c => c.house.toLowerCase() === houseKey)?.name;
        if (dbHouseOwnerMap.get(houseKey) === nameKey) {
          errors.push({ row: row.rowNum, reason: `House '${row.house}' with name '${row.name}' is already added` });
        } else {
          errors.push({ row: row.rowNum, reason: `House '${row.house}' already belongs to customer '${existingName}'` });
        }
        continue;
      }

      seenHouses.set(houseKey, row.rowNum);
      validRows.push({
        name: row.name,
        house: row.house,
        ratePerBottle: row.ratePerBottle
      });
    }

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

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const existing = await tx.customer.findUnique({
          where: { name_house: { name: row.name, house: row.house } },
        });

        if (!existing) {
          await tx.customer.create({ data: row });
          inserted++;
        }
      }
    }, {
      maxWait: 10000, // 10 seconds to wait for a connection
      timeout: 60000, // 60 seconds for the transaction to complete
    });

    return NextResponse.json({
      message: "Import completed",
      inserted,
      updated: 0,
      skipped: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Customer upload error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
