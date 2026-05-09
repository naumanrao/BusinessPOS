import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saleUpdateSchema } from "@/lib/validators";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = saleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get existing sale to recalculate
    const existingSale = await prisma.sale.findUnique({ where: { id } });
    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const quantity = parsed.data.quantity ?? existingSale.quantity;
    const amountPaid = parsed.data.amountPaid ?? existingSale.amountPaid;
    const ratePerBottle = existingSale.ratePerBottle;
    const totalAmount = quantity * ratePerBottle;
    const remainingAmount = totalAmount - amountPaid;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        quantity,
        totalAmount,
        amountPaid,
        remainingAmount,
      },
      include: { customer: { select: { name: true, house: true } } },
    });

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Update sale error:", error);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.sale.delete({ where: { id } });
    return NextResponse.json({ message: "Sale deleted" });
  } catch (error) {
    console.error("Delete sale error:", error);
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
  }
}
