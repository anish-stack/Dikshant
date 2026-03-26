
import "react-datepicker/dist/react-datepicker.css";
import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import axios from "axios";
import { format } from "date-fns";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Percent,
  Zap,
  CheckCircle2,
  XCircle,
  BadgePercent,
  Ticket,
  FlaskConical,
  X,
  IndianRupee,
  Calendar,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

const API_BASE = "https://www.app.api.dikshantias.com//api/coupons";
const token = localStorage.getItem("accessToken");

interface Coupon {
  id: number;
  code: string;
  discount: number;
  discountType: "flat" | "percentage";
  minPurchase?: number;
  maxDiscount?: number;
  validTill: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── helpers ─────────────────────────────────────────── */

const ax = () => ({ headers: { Authorization: `Bearer ${token}` } });

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* ─── Coupon Card ─────────────────────────────────────── */

const CouponCard: React.FC<{
  coupon: Coupon;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ coupon, onEdit, onDelete }) => {
  const expired = new Date(coupon.validTill) < new Date();

  return (
    <div
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl
        ${coupon.isActive && !expired
          ? "bg-white border-gray-200 hover:border-violet-300 shadow-sm"
          : "bg-gray-50 border-gray-200 opacity-60"
        }`}
    >
      {/* top accent bar */}
      <div
        className={`h-1 w-full ${
          coupon.discountType === "percentage"
            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500"
            : "bg-gradient-to-r from-emerald-500 to-teal-400"
        }`}
      />

      <div className="p-5">
        {/* Code + status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                coupon.discountType === "percentage"
                  ? "bg-violet-100 text-violet-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {coupon.discountType === "percentage" ? <Percent size={14} /> : <IndianRupee size={14} />}
            </div>
            <span className="font-mono font-bold text-lg tracking-widest text-gray-900">
              {coupon.code}
            </span>
          </div>
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              coupon.isActive && !expired
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {coupon.isActive && !expired ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
            {expired ? "Expired" : coupon.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Discount value */}
        <div className="mb-4">
          <p className="text-4xl font-black text-gray-900 leading-none">
            {coupon.discount}
            <span
              className={`text-xl ml-1 ${
                coupon.discountType === "percentage" ? "text-violet-500" : "text-emerald-500"
              }`}
            >
              {coupon.discountType === "percentage" ? "% OFF" : "₹ OFF"}
            </span>
          </p>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {coupon.minPurchase ? (
            <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Min. Purchase</p>
              <p className="text-sm font-semibold text-gray-700">{fmtINR(coupon.minPurchase)}</p>
            </div>
          ) : null}
          {coupon.maxDiscount ? (
            <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Max Discount</p>
              <p className="text-sm font-semibold text-gray-700">{fmtINR(coupon.maxDiscount)}</p>
            </div>
          ) : null}
          <div className="bg-gray-50 rounded-lg px-3 py-2 col-span-2 border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Valid Till</p>
            <p className={`text-sm font-semibold ${expired ? "text-red-500" : "text-gray-700"}`}>
              {format(new Date(coupon.validTill), "dd MMM yyyy")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50 transition"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal ───────────────────────────────────────────── */

const Modal: React.FC<{
  isEdit: boolean;
  form: any;
  formErrors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onDateChange: (date: Date | null) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({ isEdit, form, formErrors, onChange, onDateChange, onSubmit, onClose }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
            <Ticket size={18} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {isEdit ? "Edit Coupon" : "Create New Coupon"}
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Code */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Coupon Code *
          </label>
          <input
            name="code"
            value={form.code}
            onChange={onChange}
            placeholder="SUMMER25"
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 font-mono tracking-widest focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition text-sm"
          />
          {formErrors.code && <p className="mt-1.5 text-xs text-red-500">{formErrors.code}</p>}
        </div>

        {/* Discount Type + Value */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Discount Type *
            </label>
            <select
              name="discountType"
              value={form.discountType}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition text-sm"
            >
              <option value="percentage">Percentage %</option>
              <option value="flat">Flat ₹</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Value *
            </label>
            <input
              name="discount"
              type="number"
              value={form.discount}
              onChange={onChange}
              placeholder={form.discountType === "percentage" ? "25" : "150"}
              min="0"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition text-sm"
            />
            {formErrors.discount && <p className="mt-1.5 text-xs text-red-500">{formErrors.discount}</p>}
          </div>
        </div>

        {/* Min Purchase + Max Discount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Min. Purchase (₹)
            </label>
            <input
              name="minPurchase"
              type="number"
              value={form.minPurchase}
              onChange={onChange}
              placeholder="500"
              min="0"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Max Discount (₹)
            </label>
            <input
              name="maxDiscount"
              type="number"
              value={form.maxDiscount}
              onChange={onChange}
              placeholder="300"
              min="0"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition text-sm"
            />
          </div>
        </div>

        {/* Valid Till — react-datepicker */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Valid Till *
          </label>
          <div className="relative coupon-datepicker">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={16} />
            <DatePicker
              selected={form.validTill ? new Date(form.validTill) : null}
              onChange={onDateChange}
              minDate={new Date()}
              dateFormat="dd MMM yyyy"
              placeholderText="Pick an expiry date"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition text-sm cursor-pointer"
              popperPlacement="top-start"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>
          {formErrors.validTill && <p className="mt-1.5 text-xs text-red-500">{formErrors.validTill}</p>}
        </div>

        {/* Active toggle */}
        <div
          onClick={() =>
            onChange({ target: { name: "isActive", value: !form.isActive, type: "checkbox" } } as any)
          }
          className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
            form.isActive ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {form.isActive ? <ShieldCheck size={16} className="text-emerald-600" /> : <ShieldOff size={16} className="text-gray-400" />}
            <span className={`text-sm font-medium ${form.isActive ? "text-emerald-700" : "text-gray-500"}`}>
              {form.isActive ? "Coupon is Active" : "Coupon is Inactive"}
            </span>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${form.isActive ? "bg-emerald-500" : "bg-gray-300"}`}>
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                form.isActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition shadow-lg shadow-violet-200"
        >
          {isEdit ? "Update Coupon" : "Create Coupon"}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main Component ──────────────────────────────────── */

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [testCode, setTestCode] = useState("");
  const [testAmount, setTestAmount] = useState<number | "">("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const [form, setForm] = useState({
    code: "",
    discount: "",
    discountType: "percentage" as "flat" | "percentage",
    minPurchase: "",
    maxDiscount: "",
    validTill: "" as string,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE, ax());
      setCoupons(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
    setFormErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleDateChange = (date: Date | null) => {
    setForm((p) => ({ ...p, validTill: date ? format(date, "yyyy-MM-dd") : "" }));
    setFormErrors((p) => ({ ...p, validTill: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Coupon code is required";
    if (!form.discount) e.discount = "Discount value is required";
    if (form.discountType === "percentage" && Number(form.discount) > 100)
      e.discount = "Percentage cannot exceed 100%";
    if (!form.validTill) e.validTill = "Validity date is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    ...form,
    code: form.code.toUpperCase(),
    discount: Number(form.discount),
    minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
    maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
    validTill: new Date(form.validTill).toISOString(),
  });

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      await axios.post(API_BASE, buildPayload(), ax());
      setIsCreateOpen(false);
      resetForm();
      fetchCoupons();
    } catch (e: any) { setError(e.response?.data?.message || "Failed to create coupon"); }
  };

  const handleUpdate = async () => {
    if (!editingCoupon || !validate()) return;
    try {
      await axios.put(`${API_BASE}/${editingCoupon.id}`, buildPayload(), ax());
      setIsEditOpen(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (e: any) { setError(e.response?.data?.message || "Failed to update coupon"); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`, ax());
      fetchCoupons();
    } catch (e: any) { setError(e.response?.data?.message || "Failed to delete coupon"); }
  };

  const openEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setForm({
      code: c.code,
      discount: c.discount.toString(),
      discountType: c.discountType,
      minPurchase: c.minPurchase?.toString() || "",
      maxDiscount: c.maxDiscount?.toString() || "",
      validTill: format(new Date(c.validTill), "yyyy-MM-dd"),
      isActive: c.isActive,
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setForm({ code: "", discount: "", discountType: "percentage", minPurchase: "", maxDiscount: "", validTill: "", isActive: true });
    setFormErrors({});
  };

  const testApply = async () => {
    if (!testCode.trim() || !testAmount) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await axios.post(`${API_BASE}/apply`, { code: testCode.trim().toUpperCase(), amount: Number(testAmount) }, ax());
      setTestResult(res.data);
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data?.message || "Failed to apply coupon" });
    } finally {
      setTestLoading(false);
    }
  };

  const active = coupons.filter((c) => c.isActive && new Date(c.validTill) >= new Date()).length;
  const expired = coupons.filter((c) => new Date(c.validTill) < new Date()).length;

  return (
    <>
      {/* Global dark datepicker override */}
      <style>{`
        .coupon-datepicker .react-datepicker-popper { z-index: 9999; }
        .coupon-datepicker .react-datepicker { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; font-family: inherit; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; }
        .coupon-datepicker .react-datepicker__header { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding-top: 12px; }
        .coupon-datepicker .react-datepicker__current-month,
        .coupon-datepicker .react-datepicker__day-name,
        .coupon-datepicker .react-datepicker-year-header { color: #111827; font-weight: 600; }
        .coupon-datepicker .react-datepicker__day { color: #374151; border-radius: 8px; transition: all 0.15s; }
        .coupon-datepicker .react-datepicker__day:hover { background: #ede9fe; color: #7c3aed; }
        .coupon-datepicker .react-datepicker__day--selected { background: linear-gradient(135deg, #7c3aed, #a855f7) !important; color: white !important; font-weight: 700; }
        .coupon-datepicker .react-datepicker__day--today { color: #7c3aed; font-weight: 700; }
        .coupon-datepicker .react-datepicker__day--disabled { color: #d1d5db; }
        .coupon-datepicker .react-datepicker__navigation-icon::before { border-color: #9ca3af; }
        .coupon-datepicker .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before { border-color: #7c3aed; }
        .coupon-datepicker .react-datepicker__month-select,
        .coupon-datepicker .react-datepicker__year-select { background: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 6px; padding: 2px 6px; font-size: 13px; }
        .coupon-datepicker .react-datepicker__month-select:focus,
        .coupon-datepicker .react-datepicker__year-select:focus { outline: none; border-color: #7c3aed; }
        .coupon-datepicker .react-datepicker__day--keyboard-selected { background: #ede9fe; color: #7c3aed; }
      `}</style>

      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ── Header ─────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
                  <BadgePercent size={22} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Coupon Management</h1>
              </div>
              <p className="text-gray-500 ml-[52px]">Create and manage discount coupons for your platform</p>
            </div>
            <button
              onClick={() => { resetForm(); setIsCreateOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-900/40 transition"
            >
              <Plus size={18} /> New Coupon
            </button>
          </div>

          {/* ── Stats Strip ────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Coupons", value: coupons.length, icon: <Ticket size={18} />, color: "text-violet-600 bg-violet-100" },
              { label: "Active", value: active, icon: <ShieldCheck size={18} />, color: "text-emerald-600 bg-emerald-100" },
              { label: "Expired", value: expired, icon: <ShieldOff size={18} />, color: "text-red-500 bg-red-100" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Test Coupon ────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                <FlaskConical size={16} />
              </div>
              <h2 className="font-bold text-gray-900">Test Coupon Application</h2>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Coupon Code</label>
                <input
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER25"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 font-mono tracking-widest focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Cart Amount (₹)</label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="1000"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={testApply}
                  disabled={testLoading || !testCode.trim() || !testAmount}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-bold text-sm transition flex items-center gap-2"
                >
                  {testLoading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                  Apply
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}>
                {testResult.success
                  ? <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  : <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                }
                {testResult.success ? (
                  <div className="text-sm">
                    <p className="font-bold text-emerald-600 mb-2">Coupon applied!</p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Discount</p>
                        <p className="text-gray-900 font-bold text-lg">₹{testResult.discountAmount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Final Amount</p>
                        <p className="text-emerald-600 font-bold text-lg">₹{testResult.finalAmount?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600 text-sm font-medium">{testResult.message}</p>
                )}
              </div>
            )}
          </div>

          {/* ── Coupon Grid ────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 className="animate-spin mb-4" size={36} />
              <p className="text-sm">Loading coupons...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500 text-sm">{error}</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Ticket size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold">No coupons yet</p>
              <p className="text-sm mt-1">Create your first coupon to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
              {coupons.map((c) => (
                <CouponCard
                  key={c.id}
                  coupon={c}
                  onEdit={() => openEdit(c)}
                  onDelete={() => handleDelete(c.id)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal ──────────────────────────────────── */}
      {(isCreateOpen || isEditOpen) && (
        <Modal
          isEdit={isEditOpen}
          form={form}
          formErrors={formErrors}
          onChange={handleInputChange}
          onDateChange={handleDateChange}
          onSubmit={isEditOpen ? handleUpdate : handleCreate}
          onClose={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}
        />
      )}
    </>
  );
};

export default Coupons;