import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: [
            { date: "asc" },
            { createdAt: "asc" },
            { id: "asc" }
          ],
        },
      },
    });

    if (!customer) {
      // customer not found
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Compute running balance chronologically in memory (sales are already fetched oldest-first)
    let runningBalance = 0;
    const salesWithBalance = customer.sales.map((sale) => {
      runningBalance += sale.remainingAmount;
      return {
        ...sale,
        runningBalance,
      };
    });

    // Re-sort the sales to descending (newest-first) as the UI expects them in reverse chronological order
    const salesWithBalanceDesc = [...salesWithBalance].reverse();

    // Calculate aggregates
    const totals = await prisma.sale.aggregate({
      where: { customerId: id },
      _sum: {
        totalAmount: true,
        amountPaid: true,
        remainingAmount: true,
        quantity: true,
      },
      _count: true,
    });

    return NextResponse.json({
      customer: {
        ...customer,
        sales: salesWithBalanceDesc,
      },
      totals: {
        totalSales: totals._count,
        totalQuantity: totals._sum.quantity || 0,
        totalAmount: totals._sum.totalAmount || 0,
        totalPaid: totals._sum.amountPaid || 0,
        totalRemaining: totals._sum.remainingAmount || 0,
      },
    });
  } catch (error) {
    console.error("Customer detail error:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}
