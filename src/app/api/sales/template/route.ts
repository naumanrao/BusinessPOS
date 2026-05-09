import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    { Name: "John Doe", House: "House A", Date: "2024-01-15", Quantity: 10, AmountPaid: 400 },
    { Name: "Jane Smith", House: "House B", Date: "2024-01-16", Quantity: 5, AmountPaid: 200 },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=sales-template.xlsx",
    },
  });
}
