import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import Form from "../../../components/form/Form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import {
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import Label from "../../../components/form/Label";
import {
  Loader2,
  Upload,
  Search,
  Check,
  ArrowLeft,
  AlertCircle,
  Calculator,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import JoditEditor from "jodit-react";

const BATCH_API = "https://www.app.api.dikshantias.com/api/batchs";
const SUBJECTS_API = "https://www.app.api.dikshantias.com/api/subjects";
const PROGRAMS_API = "https://www.app.api.dikshantias.com/api/programs";

interface Subject {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

type BatchStatus = "active" | "inactive";

interface SortableSubjectProps {
  id: number;
  name: string;
}
interface SeparatePurchaseSubject {
  subjectId: number;
  price: number;
  discountPrice: number;
  expiryDays: number;
  position: number;
  status: "active" | "inactive";
  tag?: string;
}
interface EditBatchFormData {
  name: string;
  displayOrder: number;
  position: number;
  programId: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: BatchStatus;
  medium: string;
  offerText: string;
  fee_one_time: string;
  fee_inst: string;
  note: string;
  separatePurchaseSubjectIds: SeparatePurchaseSubject[];

  shortDescription: string;
  longDescription: string;
  quizIds: number[];
  testSeriesIds: number[];
  batchPrice: number;
  batchDiscountPrice: number;
  gst: number;
  offerValidityDays: number;
  category: "online" | "offline" | "recorded" | "";
}

interface Batch {
  id: number;
  name: string;
  imageUrl: string;
  displayOrder: number;
  position: number;
  separatePurchaseSubjectIds: SeparatePurchaseSubject[];

  programId: number;
  subjectId: string;
  subjects: Subject[];
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: BatchStatus;
  medium: string;
  offerText: string;
  fee_one_time: string;
  fee_inst: string;
  note: string;

  shortDescription: string;
  longDescription: string;
  batchPrice: number;
  batchDiscountPrice: number;
  gst: number;
  quizIds: number[];
  testSeriesIds: number[];
  offerValidityDays: number;
  isEmi: boolean;
  emiTotal: number | null;
  emiSchedule: Array<{ month: number; amount: number }> | null;
  category: "online" | "offline" | "recorded"; // 👈 ADD
}

interface Quiz {
  id: number;
  title: string;
}

interface TestSeries {
  id: number;
  title: string;
}
interface Program {
  id: number;
  name: string;
  slug: string;
}


const SortableSubjectItem = ({ id, name }: SortableSubjectProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 p-3 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${isDragging ? "ring-2 ring-indigo-500 shadow-lg" : ""
        }`}
    >
      <div className="text-gray-400">
        ☰
      </div>
      <span className="flex-1 text-sm font-medium">{name}</span>
      <div className="text-xs text-gray-400">drag to reorder</div>
    </div>
  );
};
const EditBatch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);

  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingTestSeries, setLoadingTestSeries] = useState(true);

  const [selectedQuizIds, setSelectedQuizIds] = useState<number[]>([]);
  const [selectedTestSeriesIds, setSelectedTestSeriesIds] = useState<number[]>(
    [],
  );

  const [quizSearch, setQuizSearch] = useState("");
  const [testSeriesSearch, setTestSeriesSearch] = useState("");

  const [quizzesDropdownOpen, setQuizzesDropdownOpen] = useState(false);
  const [testSeriesDropdownOpen, setTestSeriesDropdownOpen] = useState(false);

  const [isEmi, setIsEmi] = useState(false);
  const [emiMonths, setEmiMonths] = useState(3);
  const [emiSchedule, setEmiSchedule] = useState<
    Array<{ month: number; amount: number }>
  >([]);
  const [separatePurchaseSubjects, setSeparatePurchaseSubjects] = useState<SeparatePurchaseSubject[]>([]);

  const [formData, setFormData] = useState<EditBatchFormData>({
    name: "",
    displayOrder: 1,
    programId: "",
    startDate: "",
    endDate: "",
    position: 1,

    registrationStartDate: "",
    registrationEndDate: "",
    status: "active",
    shortDescription: "",
    longDescription: "",
    separatePurchaseSubjectIds: [],
    quizIds: [],
    medium: "",
    offerText: "",
    fee_one_time: "",
    fee_inst: "",
    note: "",
    testSeriesIds: [],
    batchPrice: 0,
    batchDiscountPrice: 0,
    gst: 18,
    offerValidityDays: 0,
    category: "",
  });

  const editor = useRef(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const finalPrice =
    formData.batchDiscountPrice > 0
      ? formData.batchDiscountPrice
      : formData.batchPrice;

  // Auto-calculate EMI schedule
  useEffect(() => {
    if (!isEmi || emiMonths < 1 || finalPrice <= 0) {
      setEmiSchedule([]);
      return;
    }

    const monthlyAmount = Math.round(finalPrice / emiMonths);
    const schedule = Array.from({ length: emiMonths }, (_, i) => ({
      month: i + 1,
      amount:
        i === emiMonths - 1 ? finalPrice - monthlyAmount * i : monthlyAmount,
    }));

    setEmiSchedule(schedule);
  }, [isEmi, emiMonths, finalPrice]);


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setSelectedSubjectIds((items) => {
      const oldIndex = items.indexOf(active.id as number);
      const newIndex = items.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) return items;

      return arrayMove(items, oldIndex, newIndex);
    });
  };


  const totalEmi = emiSchedule.reduce((sum, item) => sum + item.amount, 0);

  const config = useMemo(
    () => ({
      readonly: false, // all options from https://xdsoft.net/jodit/docs/,
      placeholder: "Write Long Discription",
    }),
    [],
  );

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoadingQuizzes(true);
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const params = new URLSearchParams({
          page: "1",
          limit: "100", // adjust or implement pagination/search
          is_admin: "true",
        });

        const res = await axios.get(
          `https://www.app.api.dikshantias.com/api/quiz/quizzes?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // Adjust according to your real response shape
        setQuizzes(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load quizzes:", err);
        // toast.error("Could not load quizzes");
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
  }, []);

  useEffect(() => {
    const fetchTestSeries = async () => {
      try {
        setLoadingTestSeries(true);
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const params = new URLSearchParams({
          page: "1",
          limit: "100",
          // sortBy, sortOrder, search, etc. if needed
        });

        const res = await axios.get(
          `https://www.app.api.dikshantias.com/api/testseriess?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        // console.log(res.data);
        // Adjust path according to your API response
        setTestSeriesList(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load test series:", err);
        // toast.error("Could not load test series");
      } finally {
        setLoadingTestSeries(false);
      }
    };

    fetchTestSeries();
  }, []);
  // Fetch batch data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const [batchRes, subjectsRes] = await Promise.all([
          axios.get<Batch>(`${BATCH_API}/${id}`),
          axios.get<Subject[]>(SUBJECTS_API),
        ]);

        const data = batchRes.data;
        console.log("batchRes", batchRes.data)
        setBatch(data);
        setAllSubjects(subjectsRes.data);
        setImagePreview(data.imageUrl || "");

        /* ================= SUBJECT IDS ================= */
        let currentIds: number[] = [];

        try {
          if (data.subjectId) {
            const parsed =
              typeof data.subjectId === "string"
                ? JSON.parse(data.subjectId)
                : data.subjectId;

            if (Array.isArray(parsed)) {
              currentIds = parsed.map((id: any) => Number(id));
            }
          }
        } catch (err) {
          console.error("Subject parse error:", err);
        }

        setSelectedSubjectIds(currentIds);

        /* ================= FORM DATA ================= */
        setFormData({
          name: data.name || "",
          displayOrder: data.displayOrder || 0,
          programId: data.programId?.toString() || "",

          startDate: data.startDate ? data.startDate.split("T")[0] : "",
          endDate: data.endDate ? data.endDate.split("T")[0] : "",

          registrationStartDate: data.registrationStartDate
            ? data.registrationStartDate.split("T")[0]
            : "",
          registrationEndDate: data.registrationEndDate
            ? data.registrationEndDate.split("T")[0]
            : "",

          medium: data?.medium || "",
          offerText: data?.offerText || "",
          fee_one_time: data?.fee_one_time || "",
          fee_inst: data?.fee_inst || "",
          note: data?.note || "",

          status: data.status || "inactive",
          position: data.position || 1,

          quizIds: Array.isArray(data.quizIds) ? data.quizIds : [],
          testSeriesIds: Array.isArray(data.testSeriesIds) ? data.testSeriesIds : [],

          separatePurchaseSubjectIds: Array.isArray(data.separatePurchaseSubjects)
            ? data.separatePurchaseSubjects.map((item: any) => ({
              subjectId: Number(item.subjectId),
              price: Number(item.price) || 0,
              discountPrice: Number(item.discountPrice) || 0,
              expiryDays: Number(item.expiryDays) || 365,
              position: Number(item.position) || 1,
              status: item.status || "active",
              tag: item.tag || "",
            }))
            : [],

          shortDescription: data.shortDescription || "",
          longDescription: data.longDescription || "",

          batchPrice: data.batchPrice || 0,
          batchDiscountPrice: data.batchDiscountPrice || 0,
          gst: data.gst || 18,
          offerValidityDays: data.offerValidityDays || 0,

          category:
            typeof data.category === "string"
              ? (data.category.toLowerCase() as "" | "online" | "offline" | "recorded")
              : "",
        });

        /* ================= SEPARATE PURCHASE SUBJECTS STATE ================= */
        if (Array.isArray(data.separatePurchaseSubjects) && data.separatePurchaseSubjects.length > 0) {
          const normalized = data.separatePurchaseSubjects.map((item: any) => ({
            subjectId: Number(item.subjectId),
            price: Number(item.price) || 0,
            discountPrice: Number(item.discountPrice) || 0,
            expiryDays: Number(item.expiryDays) || 365,
            position: Number(item.position) || 1,
            status: (item.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
            tag: item.tag || "",
          }));
          setSeparatePurchaseSubjects(normalized);
        } else {
          setSeparatePurchaseSubjects([]);
        }
        /* ================= SEPARATE STATES ================= */
        // setSele(Array.isArray(data.subjects) ? data.subjects : [])
        // setSelectedQuizIds(Array.isArray(data.quizIds) ? data.quizIds : []);
        // setSelectedTestSeriesIds(
        //   Array.isArray(data.testSeriesIds) ? data.testSeriesIds : [],
        // );

        setIsEmi(Boolean(data.isEmi));

        if (
          data.isEmi &&
          Array.isArray(data.emiSchedule) &&
          data.emiSchedule.length > 0
        ) {
          setEmiMonths(data.emiSchedule.length);
        }
      } catch (err: unknown) {
        let errorMsg = "Failed to load batch data";

        if (axios.isAxiosError(err)) {
          errorMsg = err.response?.data?.message || errorMsg;
        }

        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!batch?.quizIds) {
      setSelectedQuizIds([]);
      return;
    }

    try {
      const ids = JSON.parse(batch.quizIds as unknown as string);

      if (Array.isArray(ids)) {
        setSelectedQuizIds(
          ids.map(Number).filter((n) => Number.isInteger(n) && n > 0),
        );
      } else {
        setSelectedQuizIds([]);
      }
    } catch {
      setSelectedQuizIds([]);
    }
  }, [batch]);

  useEffect(() => {
    if (!batch?.testSeriesIds) {
      setSelectedTestSeriesIds([]);
      return;
    }

    try {
      const ids = JSON.parse(batch.testSeriesIds as unknown as string);

      if (Array.isArray(ids)) {
        setSelectedTestSeriesIds(
          ids.map(Number).filter((n) => Number.isInteger(n) && n > 0),
        );
      } else {
        setSelectedTestSeriesIds([]);
      }
    } catch {
      setSelectedTestSeriesIds([]);
    }
  }, [batch]);

  useEffect(() => {
    if (!batch) return;

    const idsFromObjects = Array.isArray(batch.subjects)
      ? batch.subjects.map((s) => Number(s.id)).filter(Boolean)
      : [];

    const idsFromString = (() => {
      if (typeof batch.subjectId !== "string") return [];
      try {
        const val = JSON.parse(batch.subjectId);
        return Array.isArray(val)
          ? val.map(Number).filter((n) => Number.isInteger(n) && n > 0)
          : [];
      } catch {
        return [];
      }
    })();

    // Prefer objects → string fallback
    const finalIds = idsFromObjects.length > 0 ? idsFromObjects : idsFromString;

    setSelectedSubjectIds(finalIds);
  }, [batch]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await axios.get(PROGRAMS_API);
        // console.log("res",res)
        setPrograms(res.data?.data);
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      }
    };

    fetchPrograms();
  }, []);

  useEffect(() => {
    if (allSubjects.length > 0 && selectedSubjectIds.length > 0) {
      setSelectedSubjectIds([...selectedSubjectIds]);
    }
  }, [allSubjects]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (selectedSubjectIds.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Updating batch...");

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("displayOrder", formData.displayOrder.toString());
      data.append("position", formData.position.toString());
      data.append("separatePurchaseSubjectIds", JSON.stringify(separatePurchaseSubjects));
      data.append("programId", formData.programId);
      data.append("category", formData.category);
      data.append("subjectId", JSON.stringify(selectedSubjectIds));
      data.append("startDate", formData.startDate);
      data.append("endDate", formData.endDate);
      data.append("quizIds", JSON.stringify(selectedQuizIds));
      data.append("testSeriesIds", JSON.stringify(selectedTestSeriesIds));
      data.append("registrationStartDate", formData.registrationStartDate);
      data.append("registrationEndDate", formData.registrationEndDate);
      data.append("status", formData.status);
      data.append("shortDescription", formData.shortDescription);
      data.append("longDescription", formData.longDescription);
      data.append("batchPrice", formData.batchPrice.toString());
      if (formData.batchDiscountPrice > 0) {
        data.append(
          "batchDiscountPrice",
          formData.batchDiscountPrice.toString(),
        );
      }
      data.append("gst", formData.gst.toString());
      if (formData.offerValidityDays > 0) {
        data.append("offerValidityDays", formData.offerValidityDays.toString());
      }

      data.append("medium", formData.medium.trim());
      data.append("offerText", formData.offerText.trim());
      data.append("fee_one_time", formData.fee_one_time);
      data.append("fee_inst", formData.fee_inst);
      data.append("note", formData.note);


      data.append("isEmi", isEmi.toString());
      if (isEmi) {
        data.append("emiTotal", totalEmi.toString());
        data.append("emiSchedule", JSON.stringify(emiSchedule));
      }

      if (imageFile) {
        data.append("imageUrl", imageFile);
      }

      await axios.put(`${BATCH_API}/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Batch updated successfully!", { id: loadingToast });
      navigate("/all-courses");
    } catch (err: unknown) {
      let errorMsg = "Failed to update batch";

      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.message || errorMsg;
      }

      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,        // prevents accidental drag on click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading batch data...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Error Loading Batch
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
            <Link
              to="/all-courses"
              className="px-4 py-2 text-sm font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Back to Batches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={`Edit Batch - ${batch?.name}`} description="" />
      <PageBreadcrumb pageTitle={`Edit Batch - ${batch?.name}`} />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Link
          to="/all-courses"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batches
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h1 className="text-xl font-bold mb-6">Edit Batch</h1>

          <Form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Batch Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Display Order</Label>
                  <Input
                    type="number"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        position: parseInt(e.target.value) || 1,
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Program</Label>
                <select
                  value={formData.programId}
                  onChange={(e) =>
                    setFormData({ ...formData, programId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">Select Program</option>
                  {programs &&
                    programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-sm">Batch Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as
                        | ""
                        | "online"
                        | "offline"
                        | "recorded",
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">Select Category</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="recorded">Recorded</option>
                </select>
              </div>
            </div>

            {/* Subjects Multi-Select */}
            <div className="mb-6">
              <Label className="text-sm">
                Subjects{" "}
                <span className="text-xs text-gray-500">
                  ({selectedSubjectIds.length} selected)
                </span>
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSubjectsDropdownOpen(!subjectsDropdownOpen)}
                  className="w-full px-3 py-2 text-sm text-left border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 flex justify-between items-center hover:border-gray-400 dark:hover:border-gray-600 transition"
                >
                  <span className="truncate">
                    {Array.isArray(selectedSubjectIds) &&
                      selectedSubjectIds.length === 0
                      ? "Select subjects..."
                      : Array.isArray(selectedSubjectIds)
                        ? selectedSubjectIds
                          .map(
                            (id) =>
                              allSubjects.find((s) => s.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ")
                        : "Select subjects..."}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${subjectsDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {subjectsDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-99999 max-h-64 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                      <Input
                        placeholder="Search subjects..."
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="py-1">
                      {allSubjects
                        .filter((s) =>
                          s.name
                            .toLowerCase()
                            .includes(subjectSearch.toLowerCase()),
                        )
                        .map((subject) => (
                          <label
                            key={subject.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjectIds.includes(subject.id)}
                              onChange={() => {
                                setSelectedSubjectIds((prev) =>
                                  prev.includes(subject.id)
                                    ? prev.filter((id) => id !== subject.id)
                                    : [...prev, subject.id],
                                );
                              }}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span>{subject.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reorderable Subjects */}
            {/* Reorderable Subjects */}
            {selectedSubjectIds.length > 0 && (
              <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-900">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span>Drag to reorder subjects</span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {selectedSubjectIds.length} selected
                  </span>
                </p>

                <DndContext
                  sensors={sensors}                    // ← Use the sensors defined above
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedSubjectIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedSubjectIds.map((id) => {
                        const subject = allSubjects.find((s) => s.id === id);
                        return subject ? (
                          <SortableSubjectItem
                            key={id}
                            id={id}
                            name={subject.name}
                          />
                        ) : null;
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
            <div className="mb-6">
              <Label className="text-sm">
                Included Quizzes{" "}
                <span className="text-xs text-gray-500">
                  ({selectedQuizIds.length} selected)
                </span>
              </Label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setQuizzesDropdownOpen(!quizzesDropdownOpen)}
                  className="w-full px-3 py-2 text-sm text-left border ... flex justify-between items-center"
                >
                  <span className="truncate">
                    {loadingQuizzes
                      ? "Loading quizzes..."
                      : selectedQuizIds.length === 0
                        ? "Select quizzes (optional)"
                        : selectedQuizIds
                          .map(
                            (id) => quizzes.find((q) => q.id === id)?.title,
                          )
                          .filter(Boolean)
                          .join(", ")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${quizzesDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {quizzesDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white ... max-h-80 overflow-hidden shadow-lg z-50">
                    <div className="p-2 sticky top-0 ...">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search quizzes..."
                          value={quizSearch}
                          onChange={(e) => setQuizSearch(e.target.value)}
                          className="pl-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                      {quizzes
                        .filter((q) =>
                          q.title
                            .toLowerCase()
                            .includes(quizSearch.toLowerCase()),
                        )
                        .map((quiz) => {
                          const isSelected = selectedQuizIds.includes(quiz.id);
                          return (
                            <label
                              key={quiz.id}
                              className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div
                                className="flex-1"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedQuizIds((prev) =>
                                    prev.includes(quiz.id)
                                      ? prev.filter((id) => id !== quiz.id)
                                      : [...prev, quiz.id],
                                  );
                                }}
                              >
                                <div className="font-medium text-sm">
                                  {quiz.title}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-sm">
                Included Test Series{" "}
                <span className="text-xs text-gray-500">
                  ({selectedTestSeriesIds.length} selected)
                </span>
              </Label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setTestSeriesDropdownOpen(!testSeriesDropdownOpen)
                  }
                  className="w-full px-3 py-2 text-sm text-left border ... flex justify-between items-center"
                >
                  <span className="truncate">
                    {loadingTestSeries
                      ? "Loading test series..."
                      : selectedTestSeriesIds.length === 0
                        ? "Select test series (optional)"
                        : selectedTestSeriesIds
                          .map(
                            (id) =>
                              testSeriesList.find((ts) => ts.id === id)
                                ?.title,
                          )
                          .filter(Boolean)
                          .join(", ")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${testSeriesDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {testSeriesDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white ... max-h-80 overflow-hidden shadow-lg z-50">
                    <div className="p-2 sticky top-0 ...">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search Test Series..."
                          value={testSeriesSearch}
                          onChange={(e) => setTestSeriesSearch(e.target.value)}
                          className="pl-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                      {testSeriesList
                        .filter((q) =>
                          q.title
                            .toLowerCase()
                            .includes(testSeriesSearch.toLowerCase()),
                        )
                        .map((quiz) => {
                          const isSelected = selectedTestSeriesIds.includes(
                            quiz.id,
                          );
                          return (
                            <label
                              key={quiz.id}
                              className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div
                                className="flex-1"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedTestSeriesIds((prev) =>
                                    prev.includes(quiz.id)
                                      ? prev.filter((id) => id !== quiz.id)
                                      : [...prev, quiz.id],
                                  );
                                }}
                              >
                                <div className="font-medium text-sm">
                                  {quiz.title}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Registration Start</Label>
                  <Input
                    type="date"
                    value={formData.registrationStartDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationStartDate: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Registration End</Label>
                  <Input
                    type="date"
                    value={formData.registrationEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationEndDate: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">

                {/* Medium */}
                <div>
                  <Label className="text-sm">Medium</Label>
                  <Input
                    value={formData.medium}
                    onChange={(e) =>
                      setFormData({ ...formData, medium: e.target.value })
                    }
                    className="text-sm"
                    placeholder="e.g. Hindi / English"
                  />
                </div>

                {/* Offer Text */}
                <div>
                  <Label className="text-sm">Offer Text</Label>
                  <Input
                    value={formData.offerText}
                    onChange={(e) =>
                      setFormData({ ...formData, offerText: e.target.value })
                    }
                    className="text-sm"
                    placeholder="e.g. Limited time offer"
                  />
                </div>

              </div>

              <div className="grid md:grid-cols-2 gap-4">

                {/* One Time Fee */}
                <div>
                  <Label className="text-sm">One Time Fee (₹)</Label>
                  <Input
                    type="text"
                    value={formData.fee_one_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fee_one_time: e.target.value,
                      })
                    }
                    className="text-sm"

                  />
                </div>

                {/* Installment Fee */}
                <div>
                  <Label className="text-sm">Installment Fee (₹)</Label>
                  <Input
                    type="text"
                    value={formData.fee_inst}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fee_inst: e.target.value,
                      })
                    }
                    className="text-sm"

                  />
                </div>

              </div>

              {/* Note */}
              <div>
                <Label className="text-sm">Note</Label>
                <TextArea
                  value={formData.note}
                  onChange={(value) =>
                    setFormData({ ...formData, note: value })
                  }
                  rows={3}
                  className="text-sm"
                  placeholder="Any additional info..."
                />
              </div>
            </div>
            {/* Status */}
            <div className="mb-6">
              <Label className="text-sm">Status</Label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as BatchStatus,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Descriptions */}
            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-sm">Short Description</Label>

                <JoditEditor
                  ref={editor}
                  value={formData.shortDescription}
                  config={config}
                  tabIndex={99999} // tabIndex of textarea
                  onChange={(value) => {
                    setFormData({ ...formData, shortDescription: value });
                  }}
                />
              </div>
              <div>
                <Label className="text-sm">Long Description</Label>

                <JoditEditor
                  ref={editor}
                  value={formData.longDescription}
                  config={config}
                  tabIndex={99999} // tabIndex of textarea
                  onChange={(value) => {
                    setFormData({ ...formData, longDescription: value });
                  }}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.batchPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batchPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Discount Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.batchDiscountPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batchDiscountPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">GST (%)</Label>
                  <Input
                    type="number"
                    value={formData.gst}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gst: parseFloat(e.target.value) || 18,
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Offer Validity (Days)</Label>
                <Input
                  type="number"
                  value={formData.offerValidityDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      offerValidityDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="text-sm"
                />
              </div>
            </div>

            {/* EMI Section */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg mb-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="isEmi"
                  checked={isEmi}
                  onChange={(e) => setIsEmi(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <Label
                  htmlFor="isEmi"
                  className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Enable EMI Payment
                </Label>
              </div>

              {isEmi && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">EMI Tenure</Label>
                      <select
                        value={emiMonths}
                        onChange={(e) => setEmiMonths(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 12, 18, 24].map((m) => (
                          <option key={m} value={m}>
                            {m} months
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Monthly EMI</Label>
                      <div className="px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold text-indigo-600">
                        ₹
                        {emiSchedule.length > 0
                          ? Math.round(finalPrice / emiMonths).toLocaleString(
                            "en-IN",
                          )
                          : 0}
                      </div>
                    </div>
                  </div>

                  {emiSchedule.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                      <h4 className="text-sm font-semibold mb-3">
                        EMI Schedule
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {emiSchedule.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              Month {item.month}
                            </span>
                            <span className="font-semibold">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="text-indigo-600">
                          ₹{totalEmi.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <Label className="text-sm">Batch Image</Label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative inline-block w-full max-w-md">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-800"
                    />
                    <label
                      htmlFor="image-upload"
                      className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs font-medium transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Change
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload image
                    </span>
                  </label>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 5MB
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-semibold">
                  Separate Purchase Subjects (Individual Selling)
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSubjectIds.length === 0) {
                      toast.error("Please select subjects first from above");
                      return;
                    }
                    // Add all selected subjects as separate purchase by default
                    const newItems = selectedSubjectIds
                      .filter(id => !separatePurchaseSubjects.some(s => s.subjectId === id))
                      .map(id => ({
                        subjectId: id,
                        price: 0,
                        discountPrice: 0,
                        expiryDays: 365,
                        position: separatePurchaseSubjects.length + 1,
                        status: "active" as const,
                        tag: "",
                      }));
                    setSeparatePurchaseSubjects(prev => [...prev, ...newItems]);
                  }}
                  className="flex items-center gap-2 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-200 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Selected Subjects
                </button>
              </div>

              {separatePurchaseSubjects.length > 0 ? (
                <div className="space-y-4">
                  {separatePurchaseSubjects.map((item, index) => {
                    const subject = allSubjects.find(s => s.id === item.subjectId);
                    return (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium">{subject?.name}</p>
                            <p className="text-xs text-gray-500">Subject ID: {item.subjectId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSeparatePurchaseSubjects(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs">Price (₹)</Label>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const updated = [...separatePurchaseSubjects];
                                updated[index].price = parseFloat(e.target.value) || 0;
                                setSeparatePurchaseSubjects(updated);
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Discount Price (₹)</Label>
                            <Input
                              type="number"
                              value={item.discountPrice}
                              onChange={(e) => {
                                const updated = [...separatePurchaseSubjects];
                                updated[index].discountPrice = parseFloat(e.target.value) || 0;
                                setSeparatePurchaseSubjects(updated);
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Expiry Days</Label>
                            <Input
                              type="number"
                              value={item.expiryDays}
                              onChange={(e) => {
                                const updated = [...separatePurchaseSubjects];
                                updated[index].expiryDays = parseInt(e.target.value) || 365;
                                setSeparatePurchaseSubjects(updated);
                              }}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <Label className="text-xs">Position</Label>
                            <Input
                              type="number"
                              value={item.position}
                              onChange={(e) => {
                                const updated = [...separatePurchaseSubjects];
                                updated[index].position = parseInt(e.target.value) || 1;
                                setSeparatePurchaseSubjects(updated);
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Status</Label>
                            <select
                              value={item.status}
                              onChange={(e) => {
                                const updated = [...separatePurchaseSubjects];
                                updated[index].status = e.target.value as "active" | "inactive";
                                setSeparatePurchaseSubjects(updated);
                              }}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Tag (Optional)</Label>
                            <Input
                              value={item.tag || ""}
                              onChange={(e) => {
                                const updated = [...separatePurchaseSubjects];
                                updated[index].tag = e.target.value;
                                setSeparatePurchaseSubjects(updated);
                              }}
                              className="text-sm"
                              placeholder="e.g. Popular, New"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No separate purchase subjects added yet.</p>
              )}
            </div>

            {/* Submit Buttons */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 pb-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end">
  <button
    type="submit"
    disabled={submitting}
    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
  >
    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
    {submitting ? "Updating..." : "Update Batch"}
  </button>

  <Link to="/all-courses">
    <button
      type="button"
      className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
    >
      Cancel
    </button>
  </Link>
</div>
          </Form>
        </div>
      </div>
    </>
  );
};

export default EditBatch;
