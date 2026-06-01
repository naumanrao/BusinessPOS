"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Upload,
  Download,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  house: string;
  ratePerBottle: number;
  createdAt: string;
}

interface PreviewData {
  validRows: Array<{ name: string; house: string; ratePerBottle: number }>;
  errors: Array<{ row: number; reason: string }>;
  totalRows: number;
  validCount: number;
  errorCount: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", house: "", ratePerBottle: "" });
  const [formLoading, setFormLoading] = useState(false);

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          house: formData.house,
          ratePerBottle: parseFloat(formData.ratePerBottle),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingCustomer ? "Customer updated" : "Customer created");
      setFormOpen(false);
      setEditingCustomer(null);
      setFormData({ name: "", house: "", ratePerBottle: "" });
      fetchCustomers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/customers/${deletingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Customer deleted");
      setDeleteOpen(false);
      setDeletingId(null);
      fetchCustomers();
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  const handleFilePreview = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("action", "preview");
      const res = await fetch("/api/customers/upload", { method: "POST", body: fd });
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
      const res = await fetch("/api/customers/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        `Import complete: ${data.inserted} inserted, ${data.updated} updated, ${data.skipped} skipped`
      );
      setUploadOpen(false);
      setUploadFile(null);
      setPreviewData(null);
      fetchCustomers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import file");
    } finally {
      setUploadLoading(false);
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      house: customer.house,
      ratePerBottle: customer.ratePerBottle.toString(),
    });
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            Customers
          </h1>
          <p className="text-muted-foreground mt-1">{total} total customers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/customers/template", "_blank")}
          >
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Dialog
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) {
                setUploadFile(null);
                setPreviewData(null);
              }
            }}
          >
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <span className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Upload Excel
              </span>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  Upload Customer Excel
                </DialogTitle>
                <DialogDescription>
                  Upload an Excel file with columns: Name, House, RatePerBottle
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      setUploadFile(e.target.files?.[0] || null);
                      setPreviewData(null);
                    }}
                    className="cursor-pointer"
                  />
                </div>
                {uploadFile && !previewData && (
                  <Button onClick={handleFilePreview} disabled={uploadLoading} className="w-full">
                    {uploadLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Preview Data
                  </Button>
                )}
                {previewData && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Badge variant="secondary" className="text-sm">
                        Total: {previewData.totalRows}
                      </Badge>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Valid: {previewData.validCount}
                      </Badge>
                      {previewData.errorCount > 0 && (
                        <Badge variant="destructive" className="text-sm">
                          <XCircle className="w-3 h-3 mr-1" />
                          Errors: {previewData.errorCount}
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
                              <TableHead>Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.validRows.slice(0, 10).map((row, i) => (
                              <TableRow key={i}>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.house}</TableCell>
                                <TableCell>{row.ratePerBottle}</TableCell>
                              </TableRow>
                            ))}
                            {previewData.validRows.length > 10 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                  ... and {previewData.validRows.length - 10} more rows
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {previewData.errors.length > 0 && (
                      <div className="border border-red-500/20 rounded-lg p-3 space-y-1">
                        <p className="text-sm font-medium text-red-400">Errors:</p>
                        {previewData.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-300">
                            Row {err.row}: {err.reason}
                          </p>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={handleFileSave}
                      disabled={uploadLoading || previewData.validCount === 0}
                      className="w-full bg-gradient-to-r from-emerald-600 to-blue-600"
                    >
                      {uploadLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Import {previewData.validCount} Customers
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) {
                setEditingCustomer(null);
                setFormData({ name: "", house: "", ratePerBottle: "" });
              }
            }}
          >
            <DialogTrigger render={<Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600" />}>
              <span className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer
                    ? "Update customer information"
                    : "Add a new customer to your database"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOrEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cust-name">Name</Label>
                  <Input
                    id="cust-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-house">House</Label>
                  <Input
                    id="cust-house"
                    value={formData.house}
                    onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                    required
                    placeholder="House name or number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-rate">Rate Per Bottle</Label>
                  <Input
                    id="cust-rate"
                    type="number"
                    step="0.01"
                    value={formData.ratePerBottle}
                    onChange={(e) =>
                      setFormData({ ...formData, ratePerBottle: e.target.value })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingCustomer ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or house..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={limit.toString()} onValueChange={(v) => { if (v) { setLimit(parseInt(v)); setPage(1); } }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("name")} className="font-semibold -ml-3">
                      Name <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("house")} className="font-semibold -ml-3">
                      House <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("ratePerBottle")} className="font-semibold -ml-3">
                      Rate/Bottle <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("createdAt")} className="font-semibold -ml-3">
                      Created <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer, index) => (
                    <TableRow key={customer.id} className="group">
                      <TableCell className="text-muted-foreground">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{customer.house}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        PKR {customer.ratePerBottle.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                            onClick={() => {
                              setDeletingId(customer.id);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This will also delete all
              their sales records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
