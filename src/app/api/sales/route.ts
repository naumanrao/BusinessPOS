import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saleSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
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

    const orderBy: any =
      sortBy === "customerName"
        ? { customer: { name: sortOrder } }
        : sortBy === "house"
        ? { customer: { house: sortOrder } }
        : { [sortBy]: sortOrder };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { customer: { select: { name: true, house: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = saleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customerId, date, quantity, amountPaid } = parsed.data;

    // Get customer rate
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const ratePerBottle = customer.ratePerBottle;
    const totalAmount = quantity * ratePerBottle;
    const remainingAmount = totalAmount - amountPaid;

    const sale = await prisma.sale.create({
      data: {
        customerId,
        date: new Date(date),
        quantity,
        ratePerBottle,
        totalAmount,
        amountPaid,
        remainingAmount,
      },
      include: { customer: { select: { name: true, house: true } } },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
