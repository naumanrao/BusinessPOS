import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build date filter for sales
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.date = {};
      if (dateFrom) dateFilter.date.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.date.lte = endDate;
      }
    }

    // Get totals (customers are always lifetime, sales respect date filter)
    const [totalCustomers, totalSales, salesAggregates] = await Promise.all([
      prisma.customer.count(),
      prisma.sale.count({ where: dateFilter }),
      prisma.sale.aggregate({
        where: dateFilter,
        _sum: {
          totalAmount: true,
          amountPaid: true,
          remainingAmount: true,
          quantity: true,
        },
      }),
    ]);

    const totalRevenue = salesAggregates._sum.totalAmount || 0;
    const totalPaid = salesAggregates._sum.amountPaid || 0;
    const totalRemaining = salesAggregates._sum.remainingAmount || 0;
    const totalBottles = salesAggregates._sum.quantity || 0;

    // Get monthly sales data
    // If date filter is provided, use it; otherwise default to last 12 months
    let monthlyStartDate: Date;
    if (dateFrom) {
      monthlyStartDate = new Date(dateFrom);
    } else {
      monthlyStartDate = new Date();
      monthlyStartDate.setMonth(monthlyStartDate.getMonth() - 11);
      monthlyStartDate.setDate(1);
      monthlyStartDate.setHours(0, 0, 0, 0);
    }

    let monthlyEndDate: Date | null = null;
    if (dateTo) {
      monthlyEndDate = new Date(dateTo);
      monthlyEndDate.setHours(23, 59, 59, 999);
    }

    const monthlySales = monthlyEndDate
      ? await prisma.$queryRaw<
          Array<{ month: string; total_sales: number; total_paid: number; total_remaining: number; count: number }>
        >`
          SELECT 
            TO_CHAR(date, 'YYYY-MM') as month,
            COALESCE(SUM("totalAmount"), 0)::float as total_sales,
            COALESCE(SUM("amountPaid"), 0)::float as total_paid,
            COALESCE(SUM("remainingAmount"), 0)::float as total_remaining,
            COUNT(*)::int as count
          FROM "Sale"
          WHERE date >= ${monthlyStartDate} AND date <= ${monthlyEndDate}
          GROUP BY TO_CHAR(date, 'YYYY-MM')
          ORDER BY month ASC
        `
      : await prisma.$queryRaw<
          Array<{ month: string; total_sales: number; total_paid: number; total_remaining: number; count: number }>
        >`
          SELECT 
            TO_CHAR(date, 'YYYY-MM') as month,
            COALESCE(SUM("totalAmount"), 0)::float as total_sales,
            COALESCE(SUM("amountPaid"), 0)::float as total_paid,
            COALESCE(SUM("remainingAmount"), 0)::float as total_remaining,
            COUNT(*)::int as count
          FROM "Sale"
          WHERE date >= ${monthlyStartDate}
          GROUP BY TO_CHAR(date, 'YYYY-MM')
          ORDER BY month ASC
        `;

    return NextResponse.json({
      totalCustomers,
      totalSales,
      totalBottles,
      totalRevenue,
      totalPaid,
      totalRemaining,
      monthlySales,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
