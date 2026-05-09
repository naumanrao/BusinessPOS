import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    { Name: "John Doe", House: "House A", RatePerBottle: 50 },
    { Name: "Jane Smith", House: "House B", RatePerBottle: 45 },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=customer-template.xlsx",
    },
  });
}
