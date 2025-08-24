import React, { useEffect, useState, useMemo, useRef } from "react";

/*
 ProgressiveForm Component (3-step progressive form)
 ---------------------------------
 Props:
	- data: Array of category objects [{ id, label, subcategories: [{ label, href }] }]
	- initialCategoryId?: string
	- initialSubcategory?: string (label match)
	- onSubmit: function(selectionObject)
	- onCancel: function()

 Selection object shape on submit:
	{
		categoryId,
		categoryLabel,
		subcategoryLabel,
		href,
		phone,
		location: {
			source: 'geolocation' | 'manual',
			coords?: { lat: number, lng: number },
			manualAddress?: string
		}
	}
*/

export default function ProgressiveForm({
  data = [],
  initialCategoryId = "",
  initialSubcategory = "",
  onSubmit = () => {},
  onCancel = () => {},
}) {
  // Core state
  const [step, setStep] = useState(1); // 1 = categories, 2 = subcategories, 3 = details
  const [categoryId, setCategoryId] = useState(initialCategoryId || "");
  const [subcategoryLabel, setSubcategoryLabel] = useState(
    initialSubcategory || ""
  );
  const [phone, setPhone] = useState("");
  const [useGeo, setUseGeo] = useState(false);
  const [geoCoords, setGeoCoords] = useState(null); // { lat, lng }
  const [geoStatus, setGeoStatus] = useState("idle"); // idle|pending|success|error
  const [geoError, setGeoError] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  // UX enhancement state
  const [justValidated, setJustValidated] = useState(false); // phone validity pulse
  const [lastStep, setLastStep] = useState(1); // track previous step for directional animations
  const actionBarRef = useRef(null);

  const direction =
    step > lastStep ? "forward" : step < lastStep ? "back" : "none";
  useEffect(() => {
    setLastStep(step);
  }, [step]);

  // Derived / memoized
  const phoneValid = useMemo(
    () => /^\+?[0-9]{10,15}$/.test(phone.trim()),
    [phone]
  );
  const hasLocation = useMemo(
    () => (useGeo ? !!geoCoords : manualAddress.trim().length > 3),
    [useGeo, geoCoords, manualAddress]
  );

  const selectedCategory = useMemo(
    () => data.find((c) => c.id === categoryId) || null,
    [data, categoryId]
  );
  const subcategories = useMemo(
    () => selectedCategory?.subcategories || [],
    [selectedCategory]
  );

  // Ensure subcategory remains valid when category changes
  useEffect(() => {
    setSubcategoryLabel((prev) => {
      if (!selectedCategory) return "";
      return subcategories.some((s) => s.label === prev) ? prev : "";
    });
  }, [categoryId, selectedCategory, subcategories]);

  // Handle initial props
  useEffect(() => {
    if (initialCategoryId && data.some((c) => c.id === initialCategoryId)) {
      setCategoryId(initialCategoryId);
      if (
        initialSubcategory &&
        data
          .find((c) => c.id === initialCategoryId)
          ?.subcategories.some((s) => s.label === initialSubcategory)
      ) {
        setSubcategoryLabel(initialSubcategory);
        setStep(2);
      }
    }
  }, [initialCategoryId, initialSubcategory, data]);

  const canGoNext = !!categoryId;
  const canGoSubNext = !!subcategoryLabel;
  const canSubmit = phoneValid && hasLocation;

  const progressPercent = useMemo(() => (step / 3) * 100, [step]);

  // Pulse feedback when phone becomes valid
  useEffect(() => {
    if (phoneValid) {
      setJustValidated(true);
      const t = setTimeout(() => setJustValidated(false), 900);
      return () => clearTimeout(t);
    }
  }, [phoneValid]);

  function handleNext(e) {
    e.preventDefault();
    if (canGoNext) setStep(2);
  }

  function handleSubNext(e) {
    e.preventDefault();
    if (canGoSubNext) setStep(3);
  }

  function handleBack(e) {
    e.preventDefault();
    setStep(step === 3 ? 2 : 1);
  }

  function handleCancel(e) {
    e.preventDefault();
    onCancel();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCategory || !canSubmit) return;
    setShowModal(true);
  }

  function confirmSubmit() {
    if (!selectedCategory) return;
    const picked = subcategories.find((s) => s.label === subcategoryLabel);
    onSubmit({
      categoryId: selectedCategory.id,
      categoryLabel: selectedCategory.label,
      subcategoryLabel,
      href: picked?.href || null,
      phone: phone.trim(),
      location: useGeo
        ? {
            source: "geolocation",
            coords: geoCoords,
          }
        : {
            source: "manual",
            manualAddress: manualAddress.trim(),
          },
    });
    setShowModal(false);
  }

  function triggerGeolocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not supported");
      setGeoStatus("error");
      return;
    }
    setGeoStatus("pending");
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        });
        setGeoStatus("success");
      },
      (err) => {
        setGeoError(err.message || "Unable to retrieve location");
        setGeoStatus("error");
      }
    );
  }

  // Keyboard Enter progression
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      if (step === 1 && canGoNext) return handleNext(e);
      if (step === 2 && canGoSubNext) return handleSubNext(e);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
  className="space-y-10 pb-32 md:pb-0"
      aria-labelledby="progressive-form-heading"
    >
      {/* Inline scoped styles for animations & minor effects */}
      <style>{`
@keyframes fadeSlideInFwd {0%{opacity:0;transform:translateY(14px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes fadeSlideInBack {0%{opacity:0;transform:translateY(-10px) scale(.97)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes scalePop {0%{transform:scale(.9);opacity:.4}60%{transform:scale(1.05);opacity:1}100%{transform:scale(1)} }
@keyframes ripple {0%{width:0;height:0;opacity:.65}100%{width:520px;height:520px;opacity:0}}
.step-panel[data-dir='forward']{animation:fadeSlideInFwd .5s cubic-bezier(.16,.84,.44,1) both}
.step-panel[data-dir='back']{animation:fadeSlideInBack .45s cubic-bezier(.16,.84,.44,1) both}
.validate-pop{animation:scalePop .6s cubic-bezier(.16,.84,.44,1)}
.ripple-btn{position:relative;overflow:hidden}
.ripple-btn span.ripple{position:absolute;border-radius:9999px;background:radial-gradient(circle at center,rgba(var(--ds-primary),.5),rgba(var(--ds-primary),0));animation:ripple .8s ease-out;transform:translate(-50%,-50%);pointer-events:none}
				`}</style>
      {/* Header & Progress */}
      <div className="space-y-5">
  <div className="flex items-start justify-between flex-wrap gap-5">
          <div>
            <h2
              id="progressive-form-heading"
              className="text-2xl font-semibold tracking-tight text-gradient-primary"
            >
              {step === 1
                ? "Select a Category"
                : step === 2
                  ? "Choose a Subcategory"
                  : "Add Your Details"}
            </h2>
            <p className="mt-1 text-[11px] sm:text-xs font-medium text-soft uppercase tracking-wide">
              Step {step} of 3
            </p>
          </div>
          {selectedCategory && (
            <div className="text-[11px] sm:text-xs font-medium text-soft bg-[rgb(var(--ds-surface))]/75 dark:bg-[rgb(var(--ds-surface))]/60 backdrop-blur-md px-4 py-2 rounded-xl border border-[rgb(var(--ds-border))] flex flex-col gap-0.5 min-w-[200px] shadow-sm">
              <span className="truncate">
                <span className="text-[rgb(var(--ds-text))]">Category:</span>{" "}
                {selectedCategory.label}{" "}
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="ml-1 text-[10px] font-semibold text-[rgb(var(--ds-primary))] hover:underline"
                  >
                    Change
                  </button>
                )}
              </span>
              {subcategoryLabel && (
                <span className="truncate">
                  <span className="text-[rgb(var(--ds-text))]">Sub:</span>{" "}
                  {subcategoryLabel}{" "}
                  {step > 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="ml-1 text-[10px] font-semibold text-[rgb(var(--ds-primary))] hover:underline"
                    >
                      Change
                    </button>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Progress Bar */}
        <div
          className="h-2 rounded-full bg-[rgba(var(--ds-muted),0.55)] overflow-hidden ring-1 ring-[rgba(var(--ds-border),0.5)] shadow-inner"
          aria-hidden="true"
        >
          <div
            className="h-full w-full origin-left scale-x-0 animate-[grow_.6s_ease-out_forwards]"
            style={{ clipPath: "inset(0 100% 0 0)" }}
          />
          <div
            className="h-full -mt-2 bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] transition-[width] duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <style>{`@keyframes grow{to{clip-path:inset(0 0 0 0)}}`}</style>
        {/* Desktop step nav */}
        <nav
          aria-label="Progress"
          className="hidden md:flex items-center justify-between text-[12px] font-semibold text-soft"
        >
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 transition-colors focus:outline-none ${step >= 1 ? "text-[rgb(var(--ds-primary))]" : "hover:text-[rgb(var(--ds-primary))]"}`}
            aria-current={step === 1}
          >
            Category{" "}
            {step > 1 && (
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--ds-primary))]" />
            )}
          </button>
          <span className="h-px flex-1 mx-4 bg-gradient-to-r from-transparent via-[rgba(var(--ds-border),0.9)] to-transparent" />
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => canGoNext && setStep(2)}
            className={`flex items-center gap-2 transition-colors disabled:opacity-40 focus:outline-none ${step >= 2 ? "text-[rgb(var(--ds-primary))]" : "hover:text-[rgb(var(--ds-primary))]"}`}
            aria-current={step === 2}
          >
            Subcategory{" "}
            {step > 2 && (
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--ds-primary))]" />
            )}
          </button>
          <span className="h-px flex-1 mx-4 bg-gradient-to-r from-transparent via-[rgba(var(--ds-border),0.9)] to-transparent" />
          <button
            type="button"
            disabled={!canGoSubNext}
            onClick={() => canGoSubNext && setStep(3)}
            className={`flex items-center gap-2 transition-colors disabled:opacity-40 focus:outline-none ${step >= 3 ? "text-[rgb(var(--ds-primary))]" : "hover:text-[rgb(var(--ds-primary))]"}`}
            aria-current={step === 3}
          >
            Details
          </button>
        </nav>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <fieldset
          aria-describedby="category-help"
          className="space-y-6 step-panel"
          data-dir={direction}
        >
          <legend className="sr-only">Categories</legend>
          <p id="category-help" className="text-sm text-soft">
            Pick a category to begin. You can refine it in the next step.
          </p>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((cat) => {
              const checked = categoryId === cat.id;
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={[
                      "group w-full text-left rounded-2xl border relative overflow-hidden p-5 flex flex-col gap-3 ripple-btn",
                      "transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(var(--ds-ring),0.45)]",
                      checked
                        ? "border-[rgb(var(--ds-primary))] bg-gradient-to-br from-[rgba(var(--ds-primary),0.12)] via-[rgba(var(--ds-secondary),0.12)] to-[rgba(var(--ds-primary),0.20)] shadow-[0_0_0_1px_rgba(var(--ds-primary),0.3)]"
                        : "border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 hover:border-[rgba(var(--ds-primary),0.55)]",
                    ].join(" ")}
                    aria-pressed={checked}
                    onPointerDown={(e) => {
                      const btn = e.currentTarget;
                      const r = document.createElement("span");
                      r.className = "ripple";
                      r.style.left =
                        e.clientX - btn.getBoundingClientRect().left + "px";
                      r.style.top =
                        e.clientY - btn.getBoundingClientRect().top + "px";
                      btn.appendChild(r);
                      setTimeout(() => r.remove(), 700);
                    }}
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={[
                          "h-7 w-7 flex items-center justify-center rounded-xl border text-[12px] font-semibold tracking-wide backdrop-blur-sm",
              checked
                ? "bg-[rgb(var(--ds-primary))] text-white border-[rgb(var(--ds-primary))] shadow-sm"
                : "border-[rgb(var(--ds-border))] text-soft group-hover:border-[rgb(var(--ds-primary))] group-hover:text-[rgb(var(--ds-primary))]",
                        ].join(" ")}
                      >
                        {cat.label[0]}
                      </span>
                      <span className="font-semibold text-[rgb(var(--ds-text))] leading-snug pr-2 flex-1 text-sm">
                        {cat.label}
                      </span>
                    </span>
                    <span className="text-[10px] tracking-wide uppercase text-soft font-semibold">
                      {cat.subcategories.length} option
                      {cat.subcategories.length !== 1 && "s"}
                    </span>
                    {checked && (
                      <span className="absolute inset-0 pointer-events-none border-2 border-[rgba(var(--ds-primary),0.4)] rounded-2xl animate-[pulse_3s_ease-in-out_infinite]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* Step 2 */}
      {step === 2 && selectedCategory && (
        <fieldset
          aria-describedby="subcategory-help"
          className="space-y-6 step-panel"
          data-dir={direction}
        >
          <legend className="sr-only">Subcategories</legend>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <p className="text-sm font-semibold text-[rgb(var(--ds-text))]">
              {selectedCategory.label}
            </p>
            <p id="subcategory-help" className="text-xs sm:text-sm text-soft">
              Select the most relevant option.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {subcategories.map((sub) => {
              const checked = subcategoryLabel === sub.label;
              return (
                <li key={sub.label}>
                  <button
                    type="button"
                    onClick={() => setSubcategoryLabel(sub.label)}
                    className={[
                      "group w-full rounded-2xl border px-5 py-4 text-sm font-semibold flex items-start gap-3 text-left ripple-btn",
                      "transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(var(--ds-ring),0.45)]",
                      checked
                        ? "border-[rgb(var(--ds-primary))] bg-gradient-to-br from-[rgba(var(--ds-primary),0.12)] via-[rgba(var(--ds-secondary),0.12)] to-[rgba(var(--ds-primary),0.24)] text-[rgb(var(--ds-primary))] shadow-sm"
                        : "border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 hover:border-[rgba(var(--ds-primary),0.55)] hover:bg-[rgba(var(--ds-muted),0.38)]",
                    ].join(" ")}
                    aria-pressed={checked}
                    onPointerDown={(e) => {
                      const btn = e.currentTarget;
                      const r = document.createElement("span");
                      r.className = "ripple";
                      r.style.left =
                        e.clientX - btn.getBoundingClientRect().left + "px";
                      r.style.top =
                        e.clientY - btn.getBoundingClientRect().top + "px";
                      btn.appendChild(r);
                      setTimeout(() => r.remove(), 800);
                    }}
                  >
                    <span
                      className={[
                        "mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center text-[11px] font-bold tracking-wide",
                        checked
                          ? "border-[rgb(var(--ds-primary))] bg-[rgb(var(--ds-primary))] text-white shadow"
                          : "border-[rgb(var(--ds-border))] text-soft group-hover:border-[rgb(var(--ds-primary))] group-hover:text-[rgb(var(--ds-primary))]",
                      ].join(" ")}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="flex-1 text-[rgb(var(--ds-text))] leading-snug">
                      {sub.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {subcategories.length === 0 && (
            <p className="text-sm text-[rgb(var(--ds-error))] bg-[rgba(var(--ds-error),0.08)] border border-[rgba(var(--ds-error),0.35)] rounded-md px-4 py-3">
              No subcategories available.
            </p>
          )}
        </fieldset>
      )}

      {/* Step 3 */}
      {step === 3 && selectedCategory && (
        <fieldset
          aria-describedby="details-help"
          className="space-y-10 step-panel"
          data-dir={direction}
        >
          <legend className="sr-only">User Details</legend>
          <p id="details-help" className="text-sm text-soft">
            Provide contact & location. We respect your privacy.
          </p>
          <div className="grid gap-10 sm:grid-cols-2">
            <div className="space-y-5 sm:col-span-2">
              <label
                htmlFor="phone"
                className="flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-[rgb(var(--ds-text))]">
                  Mobile Number{" "}
                  <span className="text-[rgb(var(--ds-error))]">*</span>
                </span>
                {phone && (
                  <span
                    className={`text-[11px] font-semibold ${phoneValid ? "text-[rgb(var(--ds-success))]" : "text-[rgb(var(--ds-error))]"} ${justValidated && phoneValid ? "validate-pop" : ""}`}
                  >
                    {phoneValid ? "Valid" : "Invalid"}
                  </span>
                )}
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="e.g. +919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={[
                  "w-full rounded-xl border px-4 py-3 text-sm font-medium tracking-wide bg-[rgb(var(--ds-surface))] backdrop-blur shadow-sm",
                  "placeholder:text-soft focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.4)] focus:border-[rgb(var(--ds-primary))] transition",
                  phone && !phoneValid
                    ? "border-[rgb(var(--ds-error))]"
                    : "border-[rgb(var(--ds-border))]",
                ].join(" ")}
              />
              {phone && !phoneValid && (
                <p className="text-xs font-medium text-[rgb(var(--ds-error))]">
                  10-15 digits, may start with +
                </p>
              )}
            </div>
            <div className="space-y-5 sm:col-span-2">
              <p className="text-sm font-semibold text-[rgb(var(--ds-text))] flex items-center gap-2">
                Location <span className="text-[rgb(var(--ds-error))]">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseGeo(true);
                    triggerGeolocation();
                  }}
                  className={[
                    "inline-flex items-center rounded-full border px-5 py-2 text-[11px] font-bold tracking-wide transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(var(--ds-ring),0.45)]",
                    useGeo
                      ? "bg-gradient-to-r from-[rgb(var(--ds-primary))] to-[rgb(var(--ds-secondary))] text-white border-[rgb(var(--ds-primary))] shadow-sm"
                      : "bg-[rgb(var(--ds-surface))] text-[rgb(var(--ds-text))] border-[rgb(var(--ds-border))] hover:border-[rgb(var(--ds-primary))]",
                  ].join(" ")}
                >
                  Use Current Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseGeo(false);
                    setGeoStatus("idle");
                  }}
                  className={[
                    "inline-flex items-center rounded-full border px-5 py-2 text-[11px] font-bold tracking-wide transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(var(--ds-ring),0.45)]",
                    !useGeo
                      ? "bg-gradient-to-r from-[rgb(var(--ds-primary))] to-[rgb(var(--ds-secondary))] text-white border-[rgb(var(--ds-primary))] shadow-sm"
                      : "bg-[rgb(var(--ds-surface))] text-[rgb(var(--ds-text))] border-[rgb(var(--ds-border))] hover:border-[rgb(var(--ds-primary))]",
                  ].join(" ")}
                >
                  Enter Manually
                </button>
              </div>
              {useGeo ? (
                <div
                  className="text-sm rounded-xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-muted),0.5)] dark:bg-[rgba(var(--ds-muted),0.35)] px-5 py-4 space-y-1 shadow-inner"
                  aria-live="polite"
                >
                  {geoStatus === "idle" && (
                    <p className="text-soft">
                      Tap the button to fetch coordinates.
                    </p>
                  )}
                  {geoStatus === "pending" && (
                    <p className="text-[rgb(var(--ds-primary))] animate-pulse font-medium">
                      Fetching location...
                    </p>
                  )}
                  {geoStatus === "error" && (
                    <p className="text-[rgb(var(--ds-error))] font-medium">
                      {geoError}
                    </p>
                  )}
                  {geoStatus === "success" && geoCoords && (
                    <p className="text-[rgb(var(--ds-success))] font-semibold">
                      Lat: {geoCoords.lat} · Lng: {geoCoords.lng}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    placeholder="Flat / Street / Landmark / City"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.45)] focus:border-[rgb(var(--ds-primary))]"
                  />
                  <div className="flex items-center justify-between">
                    {!manualAddress && (
                      <p className="text-[11px] text-soft">
                        Provide enough detail for accurate service.
                      </p>
                    )}
                    {manualAddress && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-soft">
                        {manualAddress.length} chars
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </fieldset>
      )}

      {/* Actions (mobile sticky) */}
      <div
        ref={actionBarRef}
  className="flex flex-wrap items-center gap-3 pt-2 md:static fixed inset-x-0 bottom-0 md:bottom-auto bg-[rgb(var(--ds-surface))]/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-t-0 z-30 px-4 py-4 md:px-0 md:py-0 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] md:shadow-none"
      >
        {(step === 2 || step === 3) && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 px-6 py-3 text-sm font-semibold text-[rgb(var(--ds-text))] shadow-sm hover:bg-[rgba(var(--ds-muted),0.55)] active:scale-[.97] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.45)]"
          >
            Back
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`inline-flex items-center rounded-xl px-7 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.5)] transition active:scale-[.97] ${canGoNext ? "bg-gradient-to-r from-[rgb(var(--ds-primary))] to-[rgb(var(--ds-secondary))] text-white hover:brightness-110" : "bg-[rgba(var(--ds-muted),0.55)] text-soft cursor-not-allowed"}`}
          >
            Continue
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={handleSubNext}
            disabled={!canGoSubNext}
            className={`inline-flex items-center rounded-xl px-7 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.5)] transition active:scale-[.97] ${canGoSubNext ? "bg-gradient-to-r from-[rgb(var(--ds-primary))] to-[rgb(var(--ds-secondary))] text-white hover:brightness-110" : "bg-[rgba(var(--ds-muted),0.55)] text-soft cursor-not-allowed"}`}
          >
            Continue
          </button>
        )}
        {step === 3 && (
          <button
            type="submit"
            disabled={!canSubmit}
            className={`inline-flex items-center rounded-xl px-7 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.55)] transition active:scale-[.97] ${canSubmit ? "bg-gradient-to-r from-[rgb(var(--ds-success))] to-[rgb(var(--ds-teal))] text-white hover:brightness-110" : "bg-[rgba(var(--ds-muted),0.55)] text-soft cursor-not-allowed"}`}
          >
            Review
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
          className="ml-auto inline-flex items-center rounded-xl border border-[rgba(var(--ds-error),0.4)] bg-[rgba(var(--ds-error),0.10)] px-6 py-3 text-sm font-semibold text-[rgb(var(--ds-error))] hover:bg-[rgba(var(--ds-error),0.18)] active:scale-[.97] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-error),0.5)]"
        >
          Cancel
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-[rgba(var(--ds-primary),0.55)] backdrop-blur-sm opacity-0 animate-[fadeIn_.35s_ease_forwards]"
            aria-hidden="true"
            onClick={() => setShowModal(false)}
          />
          <style>{`@keyframes fadeIn{to{opacity:1}}@keyframes popIn{0%{opacity:0;transform:translateY(46px) scale(.94)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[rgb(var(--ds-surface))]/95 shadow-elevate ring-1 ring-[rgb(var(--ds-border))] animate-[popIn_.5s_cubic-bezier(.16,.84,.44,1)_both] backdrop-blur-xl"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))]" />
            <div className="p-7 space-y-7 max-h-[85vh] overflow-y-auto">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold tracking-tight text-[rgb(var(--ds-text))]">
                  Review & Confirm
                </h3>
                <p className="text-[11px] text-soft font-medium">
                  Make sure the details are correct before continuing.
                </p>
              </div>
              <dl className="grid gap-4 text-sm">
                <div className="flex items-start gap-4">
                  <dt className="w-28 text-soft">Category</dt>
                  <dd className="flex-1 font-semibold text-[rgb(var(--ds-text))]">
                    {selectedCategory?.label}
                  </dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-28 text-soft">Subcategory</dt>
                  <dd className="flex-1 text-[rgb(var(--ds-text))]">
                    {subcategoryLabel}
                  </dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-28 text-soft">Phone</dt>
                  <dd className="flex-1 text-[rgb(var(--ds-text))]">
                    {phone.trim()}
                  </dd>
                </div>
                <div className="flex items-start gap-4">
                  <dt className="w-28 text-soft">Location</dt>
                  <dd className="flex-1 text-[rgb(var(--ds-text))]">
                    {useGeo ? "Current Location" : "Manual Entry"}
                  </dd>
                </div>
                {useGeo && geoCoords && (
                  <div className="flex items-start gap-4">
                    <dt className="w-28 text-soft">Coordinates</dt>
                    <dd className="flex-1 text-[rgb(var(--ds-text))]">
                      {geoCoords.lat}, {geoCoords.lng}
                    </dd>
                  </div>
                )}
                {!useGeo && manualAddress && (
                  <div className="flex items-start gap-4">
                    <dt className="w-28 text-soft">Address</dt>
                    <dd className="flex-1 text-[rgb(var(--ds-text))] whitespace-pre-line">
                      {manualAddress.trim()}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="inline-flex justify-center items-center rounded-xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 px-6 py-3 text-sm font-semibold text-[rgb(var(--ds-text))] shadow-sm hover:bg-[rgba(var(--ds-muted),0.55)] active:scale-[.97] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.5)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={confirmSubmit}
                  className="inline-flex justify-center items-center rounded-xl bg-gradient-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] px-6 py-3 text-sm font-semibold text-white shadow hover:brightness-110 active:scale-[.97] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--ds-ring),0.6)]"
                >
                  Confirm & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// Optional helper export for the data shape example (remove if not needed in this file)
export const exampleCategoryData = [
  {
    id: "citizen-services",
    label: "Citizen Services",
    subcategories: [
      { label: "Citizen Charter Timeline", href: "https://example.com" },
      { label: "Grievances", href: "https://example.com" },
      { label: "Birth Certificate", href: "https://example.com" },
      { label: "Death Certificate", href: "https://example.com" },
      { label: "Marriage Certificate", href: "https://example.com" },
      { label: "CRM Services", href: "https://example.com" },
    ],
  },
  {
    id: "payments-taxes",
    label: "Payments & Taxes",
    subcategories: [
      { label: "Property Tax", href: "https://example.com" },
      { label: "Water Charges", href: "https://example.com" },
      { label: "Bill Tracking", href: "https://example.com" },
      { label: "Others", href: "https://example.com" },
    ],
  },
  {
    id: "licenses-approvals",
    label: "Licenses & Approvals",
    subcategories: [
      { label: "Restaurant Licenses", href: "https://example.com" },
      { label: "Tree Cutting Approvals", href: "https://example.com" },
    ],
  },
];

/* Example usage (remove in production):
import ProgressiveForm, { exampleCategoryData } from './Froms';
<ProgressiveForm data={exampleCategoryData} onSubmit={console.log} onCancel={() => console.log('Cancelled')} />
*/
