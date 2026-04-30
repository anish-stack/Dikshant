export type ToastType = "success" | "error";

export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

export interface ToastAPI {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

export type BadgeColor = "gray" | "green" | "blue" | "yellow" | "red" | "purple" | "indigo";

export interface Series {
  id: string;
  title: string;
  slug: string;
  type: "prelims" | "mains";
  description?: string;
  total_tests: number;
  price: number;
  discount_price?: number | null;
  is_free: boolean;
  is_active: boolean;
  thumbnail_url?: string;
}

export interface Test {
  id: string;
  series_id: string;
  title: string;
  test_number: number;
  type: "prelims" | "mains";
  status: "draft" | "scheduled" | "live" | "closed" | "result_published";
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes: number;
  total_marks: number;
  negative_marking: number;
  is_free: boolean;
  instructions?: string;
}

export interface Question {
  id: string;
  test_id: string;
  question_text: string;
  subject?: string;
  topic?: string;
  difficulty: "easy" | "medium" | "hard";
  correct_option: number;
  marks: number;
  explanation?: string;
  source?: string;
  video_url?: string;
  article_url?: string;
  order_index: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  max_uses: number;
  used_count?: number;
  valid_from?: string;
  valid_until?: string;
  min_amount?: number;
  is_active: boolean;
}

export interface Purchase {
  id: string;
  user_id: string;
  user?: { name: string; email: string };
  purchase_type: "series" | "test";
  amount_paid: number;
  discount_applied?: number;
  payment_id?: string;
  payment_status: "success" | "pending" | "failed" | "refunded";
  createdAt?: string;
}

// ─── FORM TYPES ──────────────────────────────────────────────────────────────
export interface SeriesForm {
  title: string; slug: string; type: "prelims" | "mains"; description: string;
  total_tests: string; price: string; discount_price: string;
  is_free: boolean; is_active: boolean; thumbnail_url: string;
}

export interface TestForm {
  series_id: string;
  model_answer_pdf_url: string, title: string; test_number: string; type: "prelims" | "mains";
  status: "draft" | "scheduled" | "live" | "closed" | "result_published";
  scheduled_start: string; scheduled_end: string; duration_minutes: string;
  total_marks: string; negative_marking: string; is_free: boolean; instructions: string;
}

export interface QuestionForm {
  test_id: string; question_text: string; subject: string; topic: string;
  difficulty: "easy" | "medium" | "hard"; correct_option: string; marks: string;
  explanation: string; source: string; video_url: string; article_url: string; order_index: string;
}

export interface CouponForm {
  code: string; discount_type: "flat" | "percent"; discount_value: string;
  max_uses: string; valid_from: string; valid_until: string;
  min_amount: string; is_active: boolean;
}