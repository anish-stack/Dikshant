import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Eye, Truck, User, MapPin, X, Package,
  CheckCircle, Clock, Send, Box, ChevronRight,
  RefreshCw, AlertCircle
} from "lucide-react";
import { API_URL } from "../../constant/constant";

// ─── Types ────────────────────────────────────────────────
interface Purchase {
  id: number;
  orderId: string;
  purchasePrice: number;
  purchaseDate: string;
  paymentStatus: string;
  accessType: string;
  deliveryStatus: string;
  courierName?: string;
  trackingNumber?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  studentName?: string;
  contactNumber?: string;
  address?: string;
  pincode?: string;
  user?: { name: string; email: string };
  material?: { id: number; title: string; category?: { name: string } };
}

interface DeliveryEvent {
  id: number;
  purchaseId: number;
  status: string;
  remarks: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────
const STATUS_STEPS = ["confirmed", "processing", "dispatched", "shipped", "delivered"];

const STATUS_META: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  confirmed: { color: "#6366f1", bg: "#eef2ff", icon: <CheckCircle size={15} />, label: "Confirmed" },
  processing: { color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={15} />, label: "Processing" },
  dispatched: { color: "#3b82f6", bg: "#eff6ff", icon: <Box size={15} />, label: "Dispatched" },
  shipped: { color: "#8b5cf6", bg: "#f5f3ff", icon: <Send size={15} />, label: "Shipped" },
  delivered: { color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle size={15} />, label: "Delivered" },
};

// ─── Helpers ──────────────────────────────────────────────
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const statusMeta = (s: string) =>
  STATUS_META[s?.toLowerCase()] ?? { color: "#6b7280", bg: "#f9fafb", icon: <AlertCircle size={15} />, label: s || "Unknown" };

// ─── Update Status Modal ───────────────────────────────────
const UpdateStatusModal: React.FC<{
  purchase: Purchase;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ purchase, onClose, onUpdated }) => {
  const [status, setStatus] = useState(purchase.deliveryStatus || "");
  const [remarks, setRemarks] = useState("");
  const [courierName, setCourierName] = useState(purchase.courierName || "");
  const [trackingNumber, setTracking] = useState(purchase.trackingNumber || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!status) return toast.error("Please select a status");
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/study-materials/update-delivery-status/${purchase?.id}`, {
        purchaseId: purchase.id,
        status,
        remarks,
        courierName,
        trackingNumber,
      });
      toast.success("Delivery status updated!");
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to update delivery status");
    } finally {
      setSubmitting(false);
    }
  };

  const meta = statusMeta(status);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, boxShadow: "0 32px 80px rgba(0,0,0,0.22)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Update Delivery</p>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{purchase.material?.title}</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Order: {purchase.orderId}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Status Picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 10 }}>
              Delivery Status
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUS_STEPS.map((s) => {
                const m = statusMeta(s);
                const active = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: active ? `2px solid ${m.color}` : "2px solid #e2e8f0",
                      background: active ? m.bg : "#f8fafc",
                      color: active ? m.color : "#64748b",
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.18s",
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Package dispatched via BlueDart..."
              rows={3}
              style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "12px 14px", fontSize: 14, color: "#1e293b", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#f8fafc" }}
            />
          </div>

          {/* Courier + Tracking */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>Courier Name</label>
              <input
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="BlueDart, DTDC..."
                style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "11px 14px", fontSize: 14, color: "#1e293b", outline: "none", boxSizing: "border-box", background: "#f8fafc", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>Tracking No.</label>
              <input
                value={trackingNumber}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="BD1234567890"
                style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "11px 14px", fontSize: 14, color: "#1e293b", outline: "none", boxSizing: "border-box", background: "#f8fafc", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !status}
              style={{
                flex: 2, padding: "13px 0", borderRadius: 14, border: "none",
                background: submitting ? "#94a3b8" : "linear-gradient(135deg, #0f172a, #1e40af)",
                color: "#fff", fontWeight: 700, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {submitting ? <><RefreshCw size={16} className="animate-spin" /> Updating…</> : <><Truck size={16} /> Update Status</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Delivery Timeline Modal ───────────────────────────────
const DeliveryTimelineModal: React.FC<{ purchase: Purchase; onClose: () => void }> = ({ purchase, onClose }) => {
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/study-materials/delivery-status/${purchase.id}`)
      .then((r) => setEvents(r.data.data || []))
      .catch(() => toast.error("Failed to load timeline"))
      .finally(() => setLoading(false));
  }, [purchase.id]);

  const lastStatus = events[events.length - 1]?.status || "";
  const currentIdx = STATUS_STEPS.indexOf(lastStatus.toLowerCase());

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Delivery Timeline</p>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{purchase.material?.title}</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Order: {purchase.orderId}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}>
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: "20px 28px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {STATUS_STEPS.map((step, i) => {
              const m = statusMeta(step);
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <React.Fragment key={step}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? m.color : "#e2e8f0",
                      color: done ? "#fff" : "#94a3b8",
                      fontSize: 13, fontWeight: 700,
                      boxShadow: active ? `0 0 0 4px ${m.bg}` : "none",
                      transition: "all 0.3s",
                    }}>
                      {done ? m.icon : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: done ? m.color : "#94a3b8", fontWeight: 600, marginTop: 4, textAlign: "center", whiteSpace: "nowrap" }}>{m.label}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 3, background: i < currentIdx ? "#0f172a" : "#e2e8f0", marginBottom: 16, transition: "background 0.3s" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Events */}
        <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ color: "#64748b", fontSize: 14 }}>Loading timeline…</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No delivery events yet.</div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, background: "#e2e8f0", zIndex: 0 }} />
              {[...events].reverse().map((ev, i) => {
                const m = statusMeta(ev.status);
                return (
                  <div key={ev.id} style={{ display: "flex", gap: 16, marginBottom: i < events.length - 1 ? 24 : 0, position: "relative", zIndex: 1 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.bg, border: `2px solid ${m.color}`, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {m.icon}
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 14, padding: "12px 16px", flex: 1, border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: m.color, fontSize: 13, textTransform: "capitalize" }}>{m.label}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmt(ev.createdAt)}</span>
                      </div>
                      {ev.remarks && <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>{ev.remarks}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: "100%", padding: "12px 0", borderRadius: 14, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Modal ──────────────────────────────────────────
const DetailModal: React.FC<{
  purchase: Purchase;
  onClose: () => void;
  onOpenTimeline: () => void;
  onOpenUpdate: () => void;
}> = ({ purchase, onClose, onOpenTimeline, onOpenUpdate }) => {
  const meta = statusMeta(purchase.deliveryStatus);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 680, maxHeight: "92vh", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "28px 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Purchase Details</p>
              <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{purchase.material?.title}</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 0" }}>Order ID: <span style={{ color: "#94a3b8", fontWeight: 600 }}>{purchase.orderId}</span></p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: 10, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px" }}>
              <p style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Price Paid</p>
              <p style={{ color: "#10b981", fontSize: 18, fontWeight: 800, margin: 0 }}>₹{purchase.purchasePrice}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px" }}>
              <p style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Payment</p>
              <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, textTransform: "capitalize" }}>{purchase.paymentStatus}</p>
            </div>
            {purchase.deliveryStatus && (
              <div style={{ background: meta.bg, borderRadius: 12, padding: "10px 16px" }}>
                <p style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Status</p>
                <p style={{ color: meta.color, fontSize: 15, fontWeight: 700, margin: 0, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 4 }}>
                  {meta.icon} {meta.label}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* User Details */}
          <section>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <User size={14} /> User Details
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Name", value: purchase.user?.name },
                { label: "Email", value: purchase.user?.email },
                { label: "Student Name", value: purchase.studentName },
                { label: "Contact", value: purchase.contactNumber },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                  <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, margin: "0 0 4px" }}>{label}</p>
                  <p style={{ color: "#0f172a", fontSize: 14, fontWeight: 600, margin: 0 }}>{value || "—"}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Delivery Address */}
          {(purchase.address || purchase.pincode) && (
            <section>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} /> Delivery Address
              </h4>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                {purchase.address && <p style={{ color: "#1e293b", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>{purchase.address}</p>}
                {purchase.pincode && <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>PIN: {purchase.pincode}</span>}
              </div>
            </section>
          )}

          {/* Courier Info */}
          {(purchase.courierName || purchase.trackingNumber) && (
            <section>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <Truck size={14} /> Courier Info
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {purchase.courierName && (
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                    <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, margin: "0 0 4px" }}>Courier</p>
                    <p style={{ color: "#0f172a", fontSize: 14, fontWeight: 600, margin: 0 }}>{purchase.courierName}</p>
                  </div>
                )}
                {purchase.trackingNumber && (
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                    <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, margin: "0 0 4px" }}>Tracking Number</p>
                    <p style={{ color: "#0f172a", fontSize: 14, fontWeight: 600, margin: 0, fontFamily: "monospace" }}>{purchase.trackingNumber}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Dates */}
          <section>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 12px" }}>Dates</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Purchased", value: fmt(purchase.purchaseDate) },
                { label: "Dispatched", value: fmt(purchase.dispatchedAt) },
                { label: "Delivered", value: fmt(purchase.deliveredAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                  <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, margin: "0 0 4px" }}>{label}</p>
                  <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 600, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding: "18px 32px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            onClick={() => window.open(`/study-materials/${purchase.material?.id}`, "_blank")}
            style={{ padding: "11px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <Eye size={16} /> View Material
          </button>
          <button
            onClick={onOpenTimeline}
            style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: "#eff6ff", color: "#3b82f6", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <Truck size={16} /> Track Delivery
          </button>
          <button
            onClick={onOpenUpdate}
            style={{ padding: "11px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #0f172a, #1e40af)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <RefreshCw size={15} /> Update Status
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────
const AllStudyMaterialPurchaseHistory: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelected] = useState<Purchase | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);

  const fetchPurchases = async () => {
    try {
      const res = await axios.get(`${API_URL}/study-materials/purchases`);
      setPurchases(res.data.data || []);
    } catch {
      toast.error("Failed to load purchase history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPurchases(); }, []);

  const openDetail = (p: Purchase) => { setSelected(p); setShowDetail(true); };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
        <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: 16, color: "#64748b", fontSize: 15 }}>Loading purchase history…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .row-hover:hover { background: #f8fafc !important; }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .action-btn { transition: all 0.15s; }
      `}</style>

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 6px" }}>Admin Panel</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 }}>Purchase History</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>All study material orders and delivery statuses</p>
        </div>
        <div style={{ background: "#f1f5f9", borderRadius: 12, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={16} style={{ color: "#64748b" }} />
          <span style={{ fontSize: 14, color: "#475569", fontWeight: 600 }}>{purchases.length} Orders</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["User", "Material", "Price", "Purchase Date", "Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "14px 20px", textAlign: h === "Actions" ? "center" : "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>
                  No purchase records found.
                </td>
              </tr>
            ) : purchases.map((p, i) => {
              const meta = statusMeta(p.deliveryStatus);
              return (
                <tr
                  key={p.id}
                  className="row-hover"
                  onClick={() => openDetail(p)}
                  style={{ borderBottom: i < purchases.length - 1 ? "1px solid #f1f5f9" : "none", cursor: "pointer", transition: "background 0.15s" }}
                >
                  {/* User */}
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <User size={16} style={{ color: "#6366f1" }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{p.user?.name || "Unknown"}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{p.user?.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Material */}
                  <td style={{ padding: "16px 20px" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1e293b", maxWidth: 200 }}>{p.material?.title}</p>
                    {p.material?.category && <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{p.material.category.name}</p>}
                  </td>

                  {/* Price */}
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#10b981" }}>₹{p.purchasePrice}</span>
                  </td>

                  {/* Date */}
                  <td style={{ padding: "16px 20px", color: "#64748b", fontSize: 13 }}>{fmt(p.purchaseDate)}</td>

                  {/* Status */}
                  <td style={{ padding: "16px 20px" }}>
                    {p.deliveryStatus ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: meta.bg, color: meta.color }}>
                        {meta.icon} {meta.label}
                      </span>
                    ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="action-btn"
                        onClick={() => openDetail(p)}
                        style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Eye size={14} /> Details
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => { setSelected(p); setShowUpdateStatus(true); }}
                        style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#eff6ff", color: "#3b82f6", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <RefreshCw size={14} /> Update
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showDetail && selectedPurchase && (
        <DetailModal
          purchase={selectedPurchase}
          onClose={() => setShowDetail(false)}
          onOpenTimeline={() => { setShowDetail(false); setShowTimeline(true); }}
          onOpenUpdate={() => { setShowDetail(false); setShowUpdateStatus(true); }}
        />
      )}
      {showTimeline && selectedPurchase && (
        <DeliveryTimelineModal
          purchase={selectedPurchase}
          onClose={() => setShowTimeline(false)}
        />
      )}
      {showUpdateStatus && selectedPurchase && (
        <UpdateStatusModal
          purchase={selectedPurchase}
          onClose={() => setShowUpdateStatus(false)}
          onUpdated={fetchPurchases}
        />
      )}
    </div>
  );
};

export default AllStudyMaterialPurchaseHistory;