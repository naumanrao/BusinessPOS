import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const house = searchParams.get("house") || "";
    const remainingFilter = searchParams.get("remaining") || "all";

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const where: any = {};

    if (search) {
      where.customer = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { house: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    if (house) {
      where.customer = {
        ...where.customer,
        house: { contains: house, mode: "insensitive" },
      };
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    if (remainingFilter === "positive") {
      where.remainingAmount = { gt: 0 };
    } else if (remainingFilter === "negative") {
      where.remainingAmount = { lt: 0 };
    } else if (remainingFilter === "zero") {
      where.remainingAmount = 0;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { customer: { select: { name: true, house: true } } },
      orderBy: { date: "desc" },
    });

    // Fetch historical sales for the customers in the exported list to compute running balance chronologically
    const customerIds = Array.from(new Set(sales.map((s) => s.customerId)));
    const allSalesForCustomers = await prisma.sale.findMany({
      where: { customerId: { in: customerIds } },
      orderBy: [
        { date: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });

    const runningBalancesMap = new Map<string, number>();
    const customerBalances = new Map<string, number>();

    for (const sale of allSalesForCustomers) {
      const currentBalance = (customerBalances.get(sale.customerId) || 0) + sale.remainingAmount;
      customerBalances.set(sale.customerId, currentBalance);
      runningBalancesMap.set(sale.id, currentBalance);
    }

    const exportData = sales.map((sale) => ({
      "Sale ID": sale.id,
      "Customer Name": sale.customer.name,
      House: sale.customer.house,
      "Rate Per Bottle": sale.ratePerBottle,
      Date: new Date(sale.date).toLocaleDateString(),
      Quantity: sale.quantity,
      "Total Amount": sale.totalAmount,
      "Amount Paid": sale.amountPaid,
      "Remaining Amount": sale.remainingAmount,
      "Running Balance": runningBalancesMap.get(sale.id) || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=sales-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Sales export error:", error);
    return NextResponse.json({ error: "Failed to export sales" }, { status: 500 });
  }
}
