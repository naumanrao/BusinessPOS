import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";
import { salesExcelRowSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const action = formData.get("action") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Validate columns
    const requiredColumns = ["Name", "House", "Date", "Quantity", "AmountPaid"];
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

    // Process rows
    const validRows: Array<{
      name: string;
      house: string;
      date: Date;
      quantity: number;
      amountPaid: number;
      ratePerBottle?: number;
      totalAmount?: number;
      remainingAmount?: number;
      customerId?: string;
    }> = [];
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const parsed = salesExcelRowSchema.safeParse(row);

      if (!parsed.success) {
        const errorMessages = parsed.error.issues.map((e) => e.message).join(", ");
        errors.push({ row: i + 2, reason: errorMessages });
        continue;
      }

      const name = String(parsed.data.Name).trim();
      const house = String(parsed.data.House).trim();

      // Find matching customer
      const customer = await prisma.customer.findUnique({
        where: { name_house: { name, house } },
      });

      if (!customer) {
        errors.push({ row: i + 2, reason: `Customer not found: ${name} / ${house}` });
        continue;
      }

      const ratePerBottle = customer.ratePerBottle;
      const totalAmount = parsed.data.Quantity * ratePerBottle;
      const remainingAmount = totalAmount - parsed.data.AmountPaid;

      validRows.push({
        name,
        house,
        date: new Date(parsed.data.Date),
        quantity: parsed.data.Quantity,
        amountPaid: parsed.data.AmountPaid,
        ratePerBottle,
        totalAmount,
        remainingAmount,
        customerId: customer.id,
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

    // Save using transaction
    let inserted = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        await tx.sale.create({
          data: {
            customerId: row.customerId!,
            date: row.date,
            quantity: row.quantity,
            ratePerBottle: row.ratePerBottle!,
            totalAmount: row.totalAmount!,
            amountPaid: row.amountPaid,
            remainingAmount: row.remainingAmount!,
          },
        });
        inserted++;
      }
    }, {
      maxWait: 10000,
      timeout: 60000,
    });

    return NextResponse.json({
      message: "Import completed",
      inserted,
      skipped: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Sales upload error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
