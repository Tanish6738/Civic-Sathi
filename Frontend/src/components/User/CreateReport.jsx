import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ImagePlus,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Camera,
  Tags,
  Users2,
  Send,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { categorizeReport, createReport } from "../../services/report.services";
import { getCategories } from "../../services/category.services";
import OfficerContacts from "./OfficerContacts";
import { useToast } from "../../contexts/ToastContext";

// Simple client validation helpers
const MIN_DESC = 20;

const steps = [
  "intro",
  "details",
  "photos",
  "categorize",
  "officers",
  "confirm",
];

const CreateReport = () => {
  const { isLoaded, user } = useUser();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]); // array of { url, name }
  const [photoInput, setPhotoInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { category, department, officers, suggestions? }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [chosenCategoryId, setChosenCategoryId] = useState("");
  const [overrideConfirmed, setOverrideConfirmed] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Debug: log initial mount
  useEffect(() => {
    console.log("[CreateReport] Mounted component");
    return () => console.log("[CreateReport] Unmounted component");
  }, []);

  // Derived helper to know if there's anything to reset
  const hasDraft = !!(
    title ||
    description ||
    photos.length ||
    aiResult ||
    chosenCategoryId ||
    stepIdx > 0
  );

  // Load draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("report-draft");
      if (raw) {
        const d = JSON.parse(raw);
        console.log("[CreateReport] Loaded draft from localStorage", d);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (Array.isArray(d.photos)) setPhotos(d.photos);
        if (
          typeof d.stepIdx === "number" &&
          d.stepIdx >= 0 &&
          d.stepIdx < steps.length
        )
          setStepIdx(d.stepIdx);
        if (d.chosenCategoryId) setChosenCategoryId(d.chosenCategoryId);
      }
    } catch (_) {}
  }, []);

  // Persist draft (simple debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          "report-draft",
          JSON.stringify({
            title,
            description,
            photos,
            stepIdx,
            chosenCategoryId,
          })
        );
      } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [title, description, photos, stepIdx, chosenCategoryId]);

  // Log step changes
  useEffect(() => {
    console.log("[CreateReport] Step changed ->", stepIdx, steps[stepIdx]);
  }, [stepIdx]);

  // Reset draft helper
  function resetDraft(confirmNeeded = true) {
    if (confirmNeeded && !window.confirm("Discard this draft and start over?"))
      return;
    setResetting(true);
    setTitle("");
    setDescription("");
    setPhotos([]);
    setPhotoInput("");
    setAiResult(null);
    setChosenCategoryId("");
    setOverrideConfirmed(true);
    setError("");
    setStepIdx(0);
    try {
      localStorage.removeItem("report-draft");
    } catch (_) {}
    setTimeout(() => setResetting(false), 250);
    notify("Draft reset", "info");
  }

  if (!isLoaded) return <div className="text-sm text-soft">Loading...</div>;
  if (!user) return <div className="text-sm text-soft">Please sign in.</div>;

  function next() {
    if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
  }
  function prev() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  async function handleIntroChoice(go) {
    if (go) next();
    else navigate("/");
  }

  function validateDetails() {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    if (description.trim().length < MIN_DESC) {
      setError(`Description must be at least ${MIN_DESC} characters`);
      return false;
    }
    setError("");
    return true;
  }

  async function runCategorize() {
    if (!validateDetails()) return;
    setAiLoading(true);
    setAiResult(null);
    setError("");
    console.log("[CreateReport] Running AI categorization", {
      descriptionLength: description.trim().length,
    });
    try {
      const res = await categorizeReport(description.trim()); // expects backend may now include suggestions + all officers
      setAiResult(res);
      console.log("[CreateReport] AI result received", res);
      if (res?.suggestions) {
        console.log("[CreateReport] Suggestions received", res.suggestions);
      }
      if (res?.category?.id) {
        setChosenCategoryId(res.category.id);
        setOverrideConfirmed(true);
      }
      next(); // move to officers step automatically
    } catch (e) {
      console.log("[CreateReport] AI categorization error", e);
      const msg = e?.response?.data?.message || "AI categorization failed";
      setError(msg);
      notify(msg, "error");
    } finally {
      setAiLoading(false);
    }
  }

  async function submit() {
    if (!aiResult?.category?.id) {
      setError("AI classification missing. Please re-run.");
      return;
    }
    if (!chosenCategoryId) {
      setError("Please select a category.");
      return;
    }
    if (chosenCategoryId !== aiResult.category.id && !overrideConfirmed) {
      setError("Please confirm category override.");
      return;
    }
    setSubmitting(true);
    setError("");
    console.log("[CreateReport] Submitting report", {
      titleLength: title.trim().length,
      descriptionLength: description.trim().length,
      photosCount: photos.length,
      chosenCategoryId,
      aiCategoryId: aiResult.category.id,
      override: chosenCategoryId !== aiResult.category.id,
    });
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: chosenCategoryId,
        reporterId: user.publicMetadata?.mongoId || user.id,
        photosBefore: photos.map((p) => ({ url: p.url })),
      };
      console.log("[CreateReport] Payload prepared (sanitized)", {
        ...payload,
        description: undefined,
      });
      await createReport(payload);
      notify("Report created", "success");
      try {
        localStorage.removeItem("report-draft");
      } catch (_) {}
      navigate("/user/reports");
    } catch (e) {
      console.log("[CreateReport] Submission error", e);
      const msg = e?.response?.data?.message || "Failed to create report";
      setError(msg);
      notify(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch categories when entering officers step
  useEffect(() => {
    if (step === "officers" && categories.length === 0) {
      let cancelled = false;
      (async () => {
        setCategoriesLoading(true);
        try {
          const res = await getCategories({ limit: 500 });
          if (!cancelled) setCategories(res.items || res || []);
        } catch (_) {
        } finally {
          if (!cancelled) setCategoriesLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [step, categories.length]);

  // Drag & drop image handling (data URLs for preview only)
  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 10);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((p) => [...p, { url: ev.target.result, name: f.name }]);
      };
      reader.readAsDataURL(f);
    });
  }, []);
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e) => {
    if (e.target === e.currentTarget) setDragActive(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Create Report
          </h1>
          <p className="text-sm text-soft/80">
            Describe the issue and let the system route it to the right people.
          </p>
        </div>
        {hasDraft && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => resetDraft(true)}
            disabled={resetting}
            className="h-9 px-3 rounded-md border border-default text-[11px] font-medium bg-surface text-soft hover:text-primary hover:shadow-sm transition disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "Reset Draft"}
          </motion.button>
        )}
      </div>
      <Progress
        stepIdx={stepIdx}
        goTo={(idx) => {
          if (idx <= stepIdx) {
            setStepIdx(idx);
          }
        }}
      />
      {hasDraft && (
        <div className="text-[11px] text-soft/70 -mt-6">
          Need to start over?{" "}
          <button
            onClick={() => resetDraft(true)}
            className="underline hover:text-primary"
          >
            Reset draft
          </button>
        </div>
      )}

      {/* Step Panels */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="relative"
        >
          {step === "intro" && (
            <div className="space-y-5 p-6 rounded-xl bg-surface border border-default shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles size={24} className="text-primary" /> Quick Start
              </div>
              <p className="text-sm text-soft/80 leading-relaxed">
                You'll go through a few small steps: details, optional photos,
                AI categorization, and final confirmation.
              </p>
              <div className="flex gap-3 pt-2">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleIntroChoice(true)}
                  className="btn"
                >
                  Begin
                </motion.button>
                <button
                  onClick={() => handleIntroChoice(false)}
                  className="btn-outline text-sm px-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {step === "details" && (
            <div className="space-y-6 p-7 rounded-xl bg-surface border border-default shadow-sm">
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1.5 text-primary/90">
                    Title <span className="text-error">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg border-2 border-default/70 focus:border-primary/60 focus:outline-none transition-all bg-surface shadow-sm"
                      placeholder="Short summary"
                      aria-required="true"
                      aria-invalid={!title.trim()}
                    />
                    <motion.span
                      initial={false}
                      animate={{
                        opacity: title.length > 0 ? 1 : 0,
                        scale: title.length > 0 ? 1 : 0.8,
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                    >
                      {title.length > 0 && <FileText size={24} />}
                    </motion.span>
                  </div>
                  <AnimatePresence>
                    {!title.trim() && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] mt-1.5 text-error/80 flex items-center gap-1"
                      >
                        <AlertCircle size={11} /> A title helps reviewers triage
                        quickly.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-primary/90">
                      Description <span className="text-error">*</span>
                    </label>
                    <motion.span
                      animate={{
                        color:
                          description.length < MIN_DESC
                            ? "rgb(var(--ds-warning))"
                            : "rgb(var(--ds-success))",
                      }}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/60"
                    >
                      {description.length} chars
                    </motion.span>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={6}
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, 1000))
                      }
                      className="w-full px-4 py-3 rounded-lg border-2 border-default/70 focus:border-primary/60 focus:outline-none resize-none transition-all bg-surface shadow-sm"
                      placeholder="Describe the issue, impact, urgency... (min 20 chars)"
                      aria-required="true"
                      aria-invalid={description.trim().length < MIN_DESC}
                    />
                    <motion.div
                      className="absolute bottom-2 right-2 h-1 bg-primary/20 rounded-full overflow-hidden"
                      initial={{ width: "30%" }}
                      animate={{ width: "120px" }}
                    >
                      <motion.div
                        className="h-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width: `${Math.min(100, (description.length / MIN_DESC) * 100)}%`,
                          backgroundColor:
                            description.length < MIN_DESC
                              ? "rgb(var(--ds-warning))"
                              : "rgb(var(--ds-success))",
                        }}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {description.trim().length < MIN_DESC && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] text-warning flex items-center gap-1"
                      >
                        <AlertCircle size={11} /> Need{" "}
                        {MIN_DESC - description.trim().length} more characters
                        for context.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-error flex items-center gap-2 p-2 rounded-md bg-error/10 border border-error/20"
                  >
                    <AlertCircle size={24} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex flex-wrap gap-3 pt-3">
                <motion.button
                  whileHover={{
                    y: -2,
                    boxShadow: "0 4px 12px rgba(var(--ds-primary), 0.25)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  disabled={
                    !title.trim() || description.trim().length < MIN_DESC
                  }
                  onClick={() => {
                    if (validateDetails()) next();
                  }}
                  className="btn inline-flex items-center gap-2 h-12 px-5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Continue <ArrowRight size={24} />
                </motion.button>
                <button
                  onClick={prev}
                  disabled={stepIdx === 0}
                  className="btn-outline flex items-center gap-2 disabled:opacity-40 px-2 rounded"
                >
                  <ArrowLeft size={24} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => resetDraft(true)}
                  className="ml-auto text-xs text-soft hover:text-primary focus:text-primary transition-colors"
                >
                  Reset form
                </button>
              </div>
            </div>
          )}
          {step === "photos" && (
            <div className="space-y-6 p-7 rounded-xl bg-surface border border-default shadow-sm">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2 text-primary/90 mb-2">
                    <ImagePlus size={24} className="text-primary" />
                    Photo URLs{" "}
                    <span className="text-soft/60 text-xs font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={photoInput}
                        onChange={(e) => setPhotoInput(e.target.value)}
                        placeholder="https://..."
                        className="w-full h-12 pl-4 pr-12 rounded-lg border-2 border-default/70 focus:border-primary/60 focus:outline-none transition-all bg-surface shadow-sm"
                      />
                      {photoInput && (
                        <button
                          type="button"
                          onClick={() => setPhotoInput("")}
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-soft/50 hover:text-error/80 transition-colors"
                          title="Clear"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      whileHover={{ y: -1 }}
                      type="button"
                      onClick={() => {
                        if (photoInput.trim()) {
                          setPhotos((p) => [...p, { url: photoInput.trim() }]);
                          setPhotoInput("");
                        }
                      }}
                      disabled={!photoInput.trim()}
                      className="btn h-12 px-5 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add
                    </motion.button>
                  </div>
                </div>

                <motion.div
                  whileHover={{ y: dragActive ? 0 : -2 }}
                  animate={{ y: dragActive ? -3 : 0 }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={`relative mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive ? "border-primary bg-primary/5 shadow-lg" : "border-default bg-muted/30"}`}
                >
                  <motion.div
                    animate={{
                      opacity: dragActive ? 1 : 0.7,
                      scale: dragActive ? 1.03 : 1,
                    }}
                    className="space-y-2"
                  >
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-sm text-soft/90">
                      Drag & drop images here
                    </p>
                    <p className="text-xs text-soft/70">or</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files && handleFiles(e.target.files)
                      }
                      className="hidden"
                      id="fileInputHidden"
                    />
                    <label
                      htmlFor="fileInputHidden"
                      className="cursor-pointer inline-flex items-center gap-1 px-4 py-2 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <UploadCloud size={14} /> Browse Files
                    </label>
                  </motion.div>
                </motion.div>
                <AnimatePresence>
                  {photos.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-primary/80 flex items-center gap-2">
                          <Camera size={15} /> Uploaded Photos ({photos.length})
                        </h4>
                        {photos.length > 1 && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove all ${photos.length} photos?`
                                )
                              ) {
                                setPhotos([]);
                              }
                            }}
                            className="text-[10px] text-error/80 hover:text-error px-2 py-0.5 rounded-full bg-error/5 hover:bg-error/10 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {photos.slice(0, 12).map((p, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{
                              y: -3,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                            className="relative group rounded-lg overflow-hidden bg-muted border border-default/70 aspect-square"
                          >
                            <img
                              src={p.url}
                              alt={p.name || "preview"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPhotos((arr) =>
                                    arr.filter((_, idx) => idx !== i)
                                  )
                                }
                                className="text-[10px] px-2 py-1 text-white bg-error/80 rounded-md hover:bg-error transition-colors w-full"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="absolute top-1 right-1">
                              <motion.button
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                className="h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                                onClick={() =>
                                  setPhotos((arr) =>
                                    arr.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <X size={12} />
                              </motion.button>
                            </div>
                            {p.name && (
                              <div className="absolute top-1 left-1 max-w-[80%] truncate">
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  className="text-[9px] px-1.5 py-0.5 rounded-sm bg-black/50 text-white truncate"
                                  title={p.name}
                                >
                                  {p.name}
                                </motion.div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      <ul className="text-xs text-soft space-y-1 max-h-32 overflow-y-auto border border-default rounded-lg p-3 bg-surface/80">
                        <AnimatePresence initial={false}>
                          {photos.map((p, i) => (
                            <motion.li
                              key={p.url + i}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 6 }}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate flex-1 text-[11px]">
                                {p.name || p.url}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPhotos((arr) =>
                                    arr.filter((_, idx) => idx !== i)
                                  )
                                }
                                className="text-[10px] px-2 py-0.5 rounded-full bg-error/10 text-error hover:bg-error/20 transition-colors"
                              >
                                remove
                              </button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <motion.button
                  whileHover={{
                    y: -2,
                    boxShadow: "0 4px 12px rgba(var(--ds-primary), 0.25)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={next}
                  className="btn inline-flex items-center gap-2 h-12 px-5 rounded-lg shadow-sm"
                >
                  Continue <ArrowRight size={24} />
                </motion.button>
                <button
                  onClick={prev}
                  className="btn-outline flex items-center gap-2 px-2  rounded"
                >
                  <ArrowLeft size={24} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => resetDraft(true)}
                  className="ml-auto text-xs text-soft hover:text-primary focus:text-primary transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          {step === "categorize" && (
            <div className="space-y-6 p-7 rounded-xl bg-surface border border-default shadow-sm">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-1">
                      AI Classification
                    </h3>
                    <p className="text-sm text-soft/80 leading-relaxed">
                      Our AI will analyze your description to suggest the most
                      appropriate category and department for your report.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <motion.button
                    disabled={aiLoading}
                    whileHover={
                      !aiLoading
                        ? {
                            y: -2,
                            boxShadow:
                              "0 4px 12px rgba(var(--ds-primary), 0.25)",
                          }
                        : {}
                    }
                    whileTap={{ scale: 0.95 }}
                    onClick={runCategorize}
                    className="btn inline-flex items-center gap-2 h-12 px-5 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCcw size={24} className="animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        Start AI Analysis <Sparkles size={24} />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence>
                {aiLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="bg-muted/40 border border-default p-4 rounded-lg flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                      >
                        <RefreshCcw size={24} className="text-primary" />
                      </motion.div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">
                        Analyzing your description
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: "0%" }}
                          animate={{
                            width: ["0%", "30%", "60%", "90%"],
                          }}
                          transition={{
                            times: [0, 0.3, 0.6, 0.9],
                            duration: 2.5,
                            repeat: Infinity,
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-error flex items-center gap-2 p-3 rounded-md bg-error/10 border border-error/20"
                  >
                    <AlertCircle size={24} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={prev}
                  className="btn-outline flex items-center gap-2 px-4 h-12 rounded"
                >
                  <ArrowLeft size={24} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => resetDraft(true)}
                  className="ml-auto text-xs text-soft hover:text-primary focus:text-primary transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          {step === "officers" && aiResult && (
            <div className="space-y-6 p-7 rounded-xl bg-surface border border-default shadow-sm">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success/5 border border-success/20 p-4 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 text-success flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div>
                      <h3 className="text-sm font-semibold text-success mb-2">
                        AI Classification Complete
                      </h3>

                      <div className="space-y-2 bg-white/50 dark:bg-black/5 rounded-md p-3 border border-default/60">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-soft">Category:</div>
                          <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                            {aiResult.category?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-soft">Department:</div>
                          <span className="font-medium bg-muted/80 px-2 py-0.5 rounded-full text-xs">
                            {aiResult.department?.name || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              {aiResult.suggestions && aiResult.suggestions.length > 1 && (
                <div className="space-y-3 mt-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary/90">
                    <Tags size={14} className="text-primary" />
                    Other Suggested Categories
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiResult.suggestions.map((s) => (
                      <motion.div
                        key={s.id || s.name}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setChosenCategoryId(s.id || "");
                          setOverrideConfirmed(true);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border-2 transition-all ${
                          chosenCategoryId === (s.id || "")
                            ? "bg-primary/10 border-primary/30"
                            : "bg-surface hover:bg-muted/30 border-default/60"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            chosenCategoryId === (s.id || "")
                              ? "border-primary"
                              : "border-default"
                          }`}
                        >
                          {chosenCategoryId === (s.id || "") && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="h-2 w-2 rounded-full bg-primary"
                            />
                          )}
                        </div>
                        <span
                          className={`flex-1 truncate text-xs ${
                            chosenCategoryId === (s.id || "")
                              ? "font-medium text-primary"
                              : ""
                          }`}
                        >
                          {s.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="text-[11px] text-soft/70 flex items-center gap-1.5">
                    <Info size={12} />
                    Select a category above if you'd like to override the
                    primary suggestion.
                  </div>
                </div>
              )}
              <div className="space-y-3 border border-default/60 rounded-lg p-3 bg-surface/40">
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className="text-primary" />
                  <label className="text-xs font-medium text-primary/90">
                    Manual Override (Optional)
                  </label>
                </div>

                <div className="relative">
                  <div className="relative flex items-center">
                    <select
                      value={chosenCategoryId}
                      onChange={(e) => {
                        setChosenCategoryId(e.target.value);
                        setOverrideConfirmed(
                          e.target.value === (aiResult.category?.id || "")
                        );
                      }}
                      className="w-full h-11 rounded-lg text-xs pl-4 pr-10 py-2 bg-surface border-2 border-default/60 focus:border-primary/40 focus:outline-none appearance-none transition-colors"
                    >
                      <option value="">-- Select Another Category --</option>
                      {categories.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-soft">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  {categoriesLoading && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-soft/70">
                      <div className="h-3 w-3 rounded-full border-2 border-t-transparent border-primary/40 animate-spin"></div>
                      <span className="text-[10px]">Loading...</span>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {chosenCategoryId &&
                    chosenCategoryId !== (aiResult.category?.id || "") &&
                    !overrideConfirmed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 text-warning rounded-md px-3 py-2 bg-warning/10 border border-warning/30">
                          <AlertCircle size={14} />
                          <span className="text-xs flex-1">
                            Category changed. Please confirm this override.
                          </span>
                          <motion.button
                            type="button"
                            onClick={() => setOverrideConfirmed(true)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="px-3 h-8 rounded-lg bg-warning/90 hover:bg-warning text-white text-xs font-medium shadow-sm transition-colors"
                          >
                            Confirm
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                  {chosenCategoryId &&
                    chosenCategoryId !== (aiResult.category?.id || "") &&
                    overrideConfirmed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-1.5 text-success text-xs"
                      >
                        <CheckCircle2 size={14} />
                        <span>Manual override confirmed</span>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg">
                      <Users2 size={24} className="text-white" />
                    </div>
                    <h4 className="text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
                      Officer Contacts
                    </h4>
                  </div>
                  <motion.span 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-[11px] font-bold bg-gradient-to-r from-purple-600 to-blue-500 px-3 py-1 rounded-full text-white shadow-lg"
                  >
                    {aiResult.officers && aiResult.officers.length > 0 
                      ? `${aiResult.officers.length} ${aiResult.officers.length === 1 ? 'officer' : 'officers'}`
                      : 'No officers'}
                  </motion.span>
                </div>

                <motion.div 
                  whileHover={{ boxShadow: "0 12px 30px rgba(88, 0, 232, 0.3)" }}
                  className="border-2 border-purple-500 rounded-xl overflow-hidden bg-white dark:bg-surface shadow-xl"
                >
                  <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 h-2"></div>
                  <AnimatePresence initial={false}>
                    {aiResult.officers && aiResult.officers.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full"
                      >
                        <div className="bg-gradient-to-r from-purple-100/80 to-transparent dark:from-purple-900/10 dark:to-transparent p-6 rounded-xl">
                          <h3 className="text-base font-bold text-purple-700 dark:text-purple-400 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-gradient-to-b from-purple-600 to-purple-400 rounded-full inline-block"></span>
                            Officer Contacts
                          </h3>
                          <OfficerContacts officers={aiResult.officers} />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-8 flex flex-col items-center justify-center gap-4 text-center"
                      >
                        <motion.div 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-xl"
                        >
                          <Users2 size={32} />
                        </motion.div>
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            No officers have been assigned to this category yet.
                          </p>
                          <p className="text-xs bg-gradient-to-r from-purple-600/90 to-blue-600/90 text-white px-5 py-3 rounded-lg shadow-md">
                            Your report will be directed to department management for review.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <motion.button
                  whileHover={{
                    y: -2,
                    boxShadow: "0 4px 12px rgba(var(--ds-primary), 0.25)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={next}
                  className="btn inline-flex items-center gap-2 h-11 px-5 rounded-lg shadow-sm"
                >
                  Continue to Review <ArrowRight size={24} />
                </motion.button>
                <button
                  onClick={() => {
                    setStepIdx(steps.indexOf("categorize"));
                  }}
                  className="btn-outline inline-flex items-center gap-1.5 px-4 rounded"
                >
                  <RefreshCcw size={14} /> Re-classify
                </button>
                <button
                  type="button"
                  onClick={() => resetDraft(true)}
                  className="ml-auto text-xs text-soft hover:text-primary focus:text-primary transition-colors flex items-center gap-1"
                >
                  Reset <X size={14} />
                </button>
              </div>
            </div>
          )}
          {step === "confirm" && aiResult && (
            <div className="space-y-6 p-6 rounded-xl bg-surface border border-default shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <div className="p-2 rounded-md bg-gradient-to-br from-green-500 to-teal-600 shadow-lg">
                    <CheckCircle2 size={18} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-green-500 to-teal-500 text-transparent bg-clip-text">
                    Review & Submit
                  </span>
                </h3>
                <motion.div 
                  className="text-xs px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold flex items-center gap-2 shadow-lg"
                  whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(0, 200, 83, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="h-3 w-3 rounded-full bg-white animate-pulse shadow-inner"></span>
                  FINAL REVIEW
                </motion.div>
              </div>
              
              <div className="divide-y divide-indigo-100 dark:divide-indigo-800/30">
                <div className="pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-transparent bg-clip-text flex items-center gap-1.5">
                      <div className="p-1 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
                        <FileText size={12} className="text-white" />
                      </div>
                      Report Details
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: "0 2px 8px rgba(var(--ds-primary), 0.2)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStepIdx(steps.indexOf("details"))}
                      className="text-[10px] text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/30 transition-colors shadow-sm"
                    >
                      Edit
                    </motion.button>
                  </div>
                  <div className="bg-gradient-to-br from-white to-indigo-50/60 dark:from-surface/90 dark:to-indigo-950/10 rounded-lg p-4 border border-indigo-200/70 dark:border-indigo-800/40 space-y-3 shadow-md">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-1 font-medium">Title</div>
                      <div className="text-sm font-medium bg-white dark:bg-surface/80 px-3 py-2 rounded-md border border-indigo-100 dark:border-indigo-800/30 shadow-inner">{title}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-indigo-500 dark:text-indigo-400 mb-1 font-medium">Description</div>
                      <div className="text-xs whitespace-pre-wrap break-words text-soft/90 bg-white dark:bg-surface/80 p-3 rounded-md border border-indigo-100 dark:border-indigo-800/30 max-h-32 overflow-y-auto shadow-inner">
                        {description}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="py-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold bg-gradient-to-r from-pink-600 to-red-600 text-transparent bg-clip-text flex items-center gap-2">
                      <div className="p-2 rounded-md bg-gradient-to-br from-pink-600 to-red-600 shadow-lg">
                        <Camera size={16} className="text-white" />
                      </div>
                      Photos
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(255, 23, 68, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStepIdx(steps.indexOf("photos"))}
                      className="text-xs font-bold text-white px-4 py-1 rounded-md bg-gradient-to-r from-pink-600 to-red-600 shadow-md"
                    >
                      EDIT
                    </motion.button>
                  </div>
                  {photos.length > 0 ? (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {photos.slice(0, 4).map((p, i) => (
                          <motion.div
                            key={i}
                            className="relative aspect-square rounded-xl overflow-hidden border-3 border-red-500 shadow-xl"
                            whileHover={{ y: -5, rotate: i % 2 === 0 ? 2 : -2, boxShadow: "0 12px 25px rgba(255, 23, 68, 0.25)" }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            <img
                              src={p.url}
                              alt={p.name || "preview"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-12"></div>
                            {photos.length > 4 && i === 3 && (
                              <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                +{photos.length - 4} more
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                      <div className="text-xs mt-4 text-white inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-red-600 px-4 py-2 rounded-lg border-2 border-red-400 dark:border-red-800 shadow-lg">
                        <Camera size={14} /> 
                        <span className="font-bold">{photos.length} {photos.length === 1 ? 'photo' : 'photos'} attached</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-red-500/90 to-pink-500/90 p-5 rounded-xl text-center border-2 border-red-400 dark:border-red-700 shadow-lg">
                      <div className="text-sm text-white flex flex-col items-center justify-center gap-3">
                        <Camera size={24} className="text-white" />
                        <span className="font-bold">No photos attached</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="py-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-transparent bg-clip-text flex items-center gap-2">
                      <div className="p-2 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                        <Tags size={16} className="text-white" />
                      </div>
                      Category & Department
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(255, 171, 0, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStepIdx(steps.indexOf("officers"))}
                      className="text-xs font-bold text-white px-4 py-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-600 shadow-md"
                    >
                      EDIT
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div 
                      whileHover={{ y: -4, boxShadow: "0 12px 25px rgba(63, 81, 181, 0.2)" }}
                      className="bg-blue-600 p-5 rounded-xl border-3 border-blue-400 dark:border-blue-700 space-y-2 shadow-xl"
                    >
                      <div className="text-xs uppercase tracking-wider text-blue-100 font-bold flex items-center gap-2">
                        <Sparkles size={14} className="text-white" /> 
                        AI SUGGESTED CATEGORY
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                        </div>
                        <div className="text-base font-bold text-white">
                          {aiResult.category?.name || "Unknown"}
                        </div>
                      </div>
                      <div className="text-xs mt-2 text-blue-100 bg-blue-700/60 px-3 py-1.5 rounded-lg font-medium inline-block">
                        AI recommended
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ y: -4, boxShadow: "0 12px 25px rgba(0, 200, 83, 0.2)" }}
                      className="bg-green-600 p-5 rounded-xl border-3 border-green-400 dark:border-green-700 space-y-2 shadow-xl"
                    >
                      <div className="text-xs uppercase tracking-wider text-green-100 font-bold">
                        FINAL CATEGORY
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-green-600"></div>
                        </div>
                        <div className="text-base font-bold text-white">
                          {categories.find((c) => (c._id || c.id) === chosenCategoryId)?.name || aiResult.category?.name}
                        </div>
                      </div>
                      {chosenCategoryId && chosenCategoryId !== (aiResult.category?.id || "") && (
                        <div className="text-xs mt-2 text-white bg-orange-500 px-3 py-1.5 rounded-lg font-bold shadow-md inline-flex items-center gap-2">
                          <AlertCircle size={12} />
                          MANUALLY OVERRIDDEN
                        </div>
                      )}
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ y: -4, boxShadow: "0 12px 25px rgba(255, 171, 0, 0.2)" }}
                      className="sm:col-span-2 bg-gradient-to-r from-amber-500 to-orange-500 p-5 rounded-xl border-3 border-amber-400 dark:border-amber-700 space-y-2 shadow-xl"
                    >
                      <div className="text-xs uppercase tracking-wider text-amber-100 font-bold flex justify-between items-center">
                        <span>DEPARTMENT</span>
                        <div className="px-3 py-1 bg-white/20 rounded-full text-white">
                          Official Assignment
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                          <Users2 size={16} className="text-amber-600" />
                        </div>
                        <div className="text-lg font-bold text-white">
                          {aiResult.department?.name || "Not specified"}
                        </div>
                      </div>
                      <div className="text-sm mt-3 text-amber-100 bg-amber-600/50 px-4 py-2 rounded-lg font-medium border border-amber-400/30">
                        Department responsible for reviewing and processing your report
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-error flex items-center gap-2 p-3 rounded-md bg-error/10 border border-error/20"
                  >
                    <AlertCircle size={24} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap gap-3 pt-4 mt-2">
                <motion.button
                  disabled={submitting}
                  whileHover={!submitting ? { y: -3, boxShadow: "0 8px 25px rgba(var(--ds-primary), 0.3)" } : {}}
                  whileTap={{ scale: 0.97 }}
                  onClick={submit}
                  className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white inline-flex items-center justify-center gap-3 h-14 px-8 rounded-xl shadow-lg disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto font-medium"
                >
                  {submitting ? (
                    <div className="flex items-center gap-3">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="text-white/90"
                      >
                        <RefreshCcw size={18} />
                      </motion.div>
                      <span className="text-white/90">Processing submission...</span>
                    </div>
                  ) : (
                    <>
                      <span>Submit Report</span>
                      <Send size={18} className="relative z-10" />
                      <motion.div 
                        className="absolute inset-0 bg-white opacity-0"
                        whileHover={{ opacity: 0.1 }}
                        transition={{ duration: 0.2 }}
                      />
                    </>
                  )}
                </motion.button>
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.button
                    disabled={submitting}
                    whileHover={!submitting ? { y: -2, boxShadow: "0 4px 12px rgba(var(--ds-primary), 0.15)" } : {}}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStepIdx(steps.indexOf("officers"))}
                    className="bg-white dark:bg-surface border-2 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 px-5 h-12 rounded-xl disabled:opacity-50 shadow-sm transition-colors"
                  >
                    <ArrowLeft size={24}/> Back
                  </motion.button>
                  <motion.button
                    disabled={submitting}
                    whileHover={!submitting ? { y: -2, boxShadow: "0 4px 12px rgba(var(--ds-error), 0.15)" } : {}}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/user/reports")}
                    className="bg-white dark:bg-surface border-2 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 px-5 h-12 rounded-xl disabled:opacity-50 shadow-sm transition-colors"
                  >
                    <X size={24}/> Cancel
                  </motion.button>
                </div>
                <motion.button
                  type="button"
                  onClick={() => resetDraft(true)}
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.05 } : {}}
                  whileTap={{ scale: 0.95 }}
                  className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Reset Draft <X size={14}/>
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>  
  );
};

const stepMeta = {
  intro: { icon: Sparkles, label: "Intro" },
  details: { icon: FileText, label: "Details" },
  photos: { icon: Camera, label: "Photos" },
  categorize: { icon: Tags, label: "AI" },
  officers: { icon: Users2, label: "Officers" },
  confirm: { icon: CheckCircle2, label: "Review" },
};

const Progress = ({ stepIdx, goTo }) => {
  const pct = (stepIdx / (steps.length - 1)) * 100;
  return (
    <div className="space-y-4 w-full">
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: pct + "%" }}
          transition={{ type: "spring", stiffness: 140, damping: 25 }}
        />
      </div>
      <ol className="flex justify-between text-[10px] font-medium">
        {steps.map((s, i) => {
          const meta = stepMeta[s];
          const Icon = meta.icon;
          const active = i === stepIdx;
          const complete = i < stepIdx;
          return (
            <li key={s} className="flex-1 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (i <= stepIdx) goTo?.(i);
                }}
                className="group flex flex-col items-center gap-1 focus:outline-none"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`relative h-8 w-8 rounded-full flex items-center justify-center text-[11px] transition-colors border ${active ? "bg-primary text-white border-primary shadow-elevate" : complete ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-soft/70 border-default"}`}
                >
                  <Icon size={24} />
                  {active && (
                    <motion.span
                      layoutId="step-ring"
                      className="absolute -inset-1 rounded-full ring-2 ring-primary/40"
                    />
                  )}
                </span>
                <span
                  className={`uppercase tracking-wide ${active ? "text-primary" : complete ? "text-primary/70" : "text-soft/50"}`}
                >
                  {meta.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default CreateReport;
