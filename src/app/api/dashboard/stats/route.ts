import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get totals
    const [totalCustomers, totalSales, salesAggregates] = await Promise.all([
      prisma.customer.count(),
      prisma.sale.count(),
      prisma.sale.aggregate({
        _sum: {
          totalAmount: true,
          amountPaid: true,
          remainingAmount: true,
        },
      }),
    ]);

    const totalRevenue = salesAggregates._sum.totalAmount || 0;
    const totalPaid = salesAggregates._sum.amountPaid || 0;
    const totalRemaining = salesAggregates._sum.remainingAmount || 0;

    // Get monthly sales data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await prisma.$queryRaw<
      Array<{ month: string; total_sales: number; total_paid: number; total_remaining: number; count: number }>
    >`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COALESCE(SUM("totalAmount"), 0)::float as total_sales,
        COALESCE(SUM("amountPaid"), 0)::float as total_paid,
        COALESCE(SUM("remainingAmount"), 0)::float as total_remaining,
        COUNT(*)::int as count
      FROM "Sale"
      WHERE date >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return NextResponse.json({
      totalCustomers,
      totalSales,
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
