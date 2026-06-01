"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, User, ShoppingCart, DollarSign, AlertTriangle, TrendingUp,
} from "lucide-react";

interface Sale {
  id: string;
  date: string;
  quantity: number;
  ratePerBottle: number;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  runningBalance: number;
}

interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    house: string;
    ratePerBottle: number;
    createdAt: string;
    sales: Sale[];
  };
  totals: {
    totalSales: number;
    totalQuantity: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}/detail`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "PKR" }).format(val);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const { customer, totals } = data;

  const summaryCards = [
    { title: "Total Sales", value: totals.totalSales, icon: ShoppingCart, gradient: "from-purple-500 to-pink-500" },
    { title: "Total Revenue", value: formatCurrency(totals.totalAmount), icon: TrendingUp, gradient: "from-emerald-500 to-teal-500" },
    { title: "Total Paid", value: formatCurrency(totals.totalPaid), icon: DollarSign, gradient: "from-blue-500 to-cyan-500" },
    { title: "Outstanding", value: formatCurrency(totals.totalRemaining), icon: AlertTriangle, gradient: "from-red-500 to-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{customer.house}</Badge>
                <span className="text-sm text-muted-foreground">
                  Rate: ${customer.ratePerBottle.toFixed(2)} / bottle
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales History */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No sales records
                    </TableCell>
                  </TableRow>
                ) : (
                  customer.sales.map((sale, i) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell className="font-mono">PKR {sale.ratePerBottle.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(sale.amountPaid)}</TableCell>
                      <TableCell>
                        <span className={`font-mono font-medium ${sale.runningBalance > 0 ? 'text-red-400' :
                          sale.runningBalance < 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                          {formatCurrency(sale.runningBalance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
