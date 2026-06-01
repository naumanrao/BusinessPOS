"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Upload, Download, Edit, Trash2, ChevronLeft, ChevronRight,
  ArrowUpDown, FileSpreadsheet, CheckCircle, XCircle, Loader2,
  ShoppingCart, FileDown, Save, X,
} from "lucide-react";
import { toast } from "sonner";

interface Sale {
  id: string;
  customerId: string;
  customer: { name: string; house: string };
  date: string;
  quantity: number;
  ratePerBottle: number;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  runningBalance: number;
}

interface PreviewData {
  validRows: Array<{
    name: string; house: string; date: string; quantity: number;
    amountPaid: number; ratePerBottle?: number; totalAmount?: number; remainingAmount?: number;
  }>;
  errors: Array<{ row: number; reason: string }>;
  totalRows: number;
  validCount: number;
  errorCount: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [houseFilter, setHouseFilter] = useState("");
  const [remainingFilter, setRemainingFilter] = useState("all");

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ date: "", quantity: "", amountPaid: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(), limit: limit.toString(), search,
        sortBy, sortOrder,
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (houseFilter) params.set("house", houseFilter);
      if (remainingFilter !== "all") params.set("remaining", remainingFilter);

      const res = await fetch(`/api/sales?${params}`);
      const data = await res.json();
      setSales(data.sales);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Failed to fetch sales");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder, dateFrom, dateTo, houseFilter, remainingFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const startEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setEditData({
      date: new Date(sale.date).toISOString().split("T")[0],
      quantity: sale.quantity.toString(),
      amountPaid: sale.amountPaid.toString(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ date: "", quantity: "", amountPaid: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/sales/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editData.date,
          quantity: parseInt(editData.quantity),
          amountPaid: parseFloat(editData.amountPaid),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Sale updated");
      cancelEdit();
      fetchSales();
    } catch {
      toast.error("Failed to update sale");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/sales/${deletingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Sale deleted");
      setDeleteOpen(false);
      setDeletingId(null);
      fetchSales();
    } catch {
      toast.error("Failed to delete sale");
    }
  };

  const handleFilePreview = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("action", "preview");
      const res = await fetch("/api/sales/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewData(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to preview file");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileSave = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("action", "save");
      const res = await fetch("/api/sales/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Import complete: ${data.inserted} inserted, ${data.skipped} skipped`);
      setUploadOpen(false);
      setUploadFile(null);
      setPreviewData(null);
      fetchSales();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (houseFilter) params.set("house", houseFilter);
    if (remainingFilter !== "all") params.set("remaining", remainingFilter);
    window.open(`/api/sales/export?${params}`, "_blank");
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "PKR" }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-purple-500" />
            Sales
          </h1>
          <p className="text-muted-foreground mt-1">{total} total records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => window.open("/api/sales/template", "_blank")}
          >
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Dialog open={uploadOpen} onOpenChange={(open) => {
            setUploadOpen(open);
            if (!open) { setUploadFile(null); setPreviewData(null); }
          }}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <span className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Upload Excel
              </span>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  Upload Sales Excel
                </DialogTitle>
                <DialogDescription>
                  Columns: Name, House, Date, Quantity, AmountPaid. Customer must exist first.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="file" accept=".xlsx,.xls"
                  onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setPreviewData(null); }}
                  className="cursor-pointer"
                />
                {uploadFile && !previewData && (
                  <Button onClick={handleFilePreview} disabled={uploadLoading} className="w-full">
                    {uploadLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Preview Data
                  </Button>
                )}
                {previewData && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Badge variant="secondary" className="text-sm">Total: {previewData.totalRows}</Badge>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-sm">
                        <CheckCircle className="w-3 h-3 mr-1" />Valid: {previewData.validCount}
                      </Badge>
                      {previewData.errorCount > 0 && (
                        <Badge variant="destructive" className="text-sm">
                          <XCircle className="w-3 h-3 mr-1" />Errors: {previewData.errorCount}
                        </Badge>
                      )}
                    </div>
                    {previewData.validRows.length > 0 && (
                      <div className="border rounded-lg overflow-auto max-h-48">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>House</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Rate</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Paid</TableHead>
                              <TableHead>Due</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.validRows.slice(0, 10).map((row, i) => (
                              <TableRow key={i}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.house}</TableCell>
                                <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                                <TableCell>{row.quantity}</TableCell>
                                <TableCell>{row.ratePerBottle?.toFixed(2)}</TableCell>
                                <TableCell>{row.totalAmount?.toFixed(2)}</TableCell>
                                <TableCell>{row.amountPaid.toFixed(2)}</TableCell>
                                <TableCell>{row.remainingAmount?.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {previewData.errors.length > 0 && (
                      <div className="border border-red-500/20 rounded-lg p-3 space-y-1">
                        <p className="text-sm font-medium text-red-400">Errors:</p>
                        {previewData.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-300">Row {err.row}: {err.reason}</p>
                        ))}
                      </div>
                    )}
                    <Button onClick={handleFileSave} disabled={uploadLoading || previewData.validCount === 0}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
                      {uploadLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Import {previewData.validCount} Sales Records
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search customer..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
              <Input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
              <Input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">House</Label>
              <Input placeholder="Filter house..." value={houseFilter}
                onChange={(e) => { setHouseFilter(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Balance</Label>
              <Select value={remainingFilter} onValueChange={(v) => { if (v) { setRemainingFilter(v); setPage(1); } }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="positive">Has Due</SelectItem>
                  <SelectItem value="zero">Fully Paid</SelectItem>
                  <SelectItem value="negative">Overpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("customerName")} className="font-semibold -ml-3">
                      Customer <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>House</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("date")} className="font-semibold -ml-3">
                      Date <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("quantity")} className="font-semibold -ml-3">
                      Qty <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("remainingAmount")} className="font-semibold -ml-3">
                      Due <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      No sales records found
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale, index) => (
                    <TableRow key={sale.id} className="group">
                      <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                      <TableCell className="font-medium">{sale.customer.name}</TableCell>
                      <TableCell><Badge variant="secondary">{sale.customer.house}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">PKR {sale.ratePerBottle.toFixed(2)}</TableCell>
                      {editingId === sale.id ? (
                        <>
                          <TableCell>
                            <Input type="date" value={editData.date}
                              onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                              className="h-8 w-36" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={editData.quantity}
                              onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                              className="h-8 w-20" />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(parseInt(editData.quantity || '0') * sale.ratePerBottle)}
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={editData.amountPaid}
                              onChange={(e) => setEditData({ ...editData, amountPaid: e.target.value })}
                              className="h-8 w-24" />
                          </TableCell>
                          <TableCell>
                            <span className={`font-mono ${(parseInt(editData.quantity || '0') * sale.ratePerBottle - parseFloat(editData.amountPaid || '0')) > 0
                              ? 'text-red-400' : 'text-emerald-400'
                              }`}>
                              {formatCurrency(
                                parseInt(editData.quantity || '0') * sale.ratePerBottle - parseFloat(editData.amountPaid || '0')
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {formatCurrency(sale.runningBalance)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400"
                                onClick={saveEdit} disabled={editLoading}>
                                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                          <TableCell>{sale.quantity}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(sale.totalAmount)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(sale.amountPaid)}</TableCell>
                          <TableCell>
                            <span className={`font-mono font-medium ${sale.remainingAmount > 0 ? 'text-red-400' :
                              sale.remainingAmount < 0 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                              {formatCurrency(sale.remainingAmount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-mono font-medium ${sale.runningBalance > 0 ? 'text-red-400' :
                              sale.runningBalance < 0 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                              {formatCurrency(sale.runningBalance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(sale)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300"
                                onClick={() => { setDeletingId(sale.id); setDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <Select value={limit.toString()} onValueChange={(v) => { if (v) { setLimit(parseInt(v)); setPage(1); } }}>
                  <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
            <DialogDescription>Are you sure you want to delete this sale record? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
