import React, { useEffect, useState, useMemo, useRef } from 'react';

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
	initialCategoryId = '',
	initialSubcategory = '',
	onSubmit = () => {},
	onCancel = () => {}
}) {
	// Core state
	const [step, setStep] = useState(1); // 1 = categories, 2 = subcategories, 3 = details
	const [categoryId, setCategoryId] = useState(initialCategoryId || '');
	const [subcategoryLabel, setSubcategoryLabel] = useState(initialSubcategory || '');
	const [phone, setPhone] = useState('');
	const [useGeo, setUseGeo] = useState(false);
	const [geoCoords, setGeoCoords] = useState(null); // { lat, lng }
	const [geoStatus, setGeoStatus] = useState('idle'); // idle|pending|success|error
	const [geoError, setGeoError] = useState('');
	const [manualAddress, setManualAddress] = useState('');
	const [showModal, setShowModal] = useState(false);
	// UX enhancement state
	const [justValidated, setJustValidated] = useState(false); // phone validity pulse
	const [lastStep, setLastStep] = useState(1); // track previous step for directional animations
	const actionBarRef = useRef(null);

	const direction = step > lastStep ? 'forward' : step < lastStep ? 'back' : 'none';
	useEffect(() => { setLastStep(step); }, [step]);

	// Derived / memoized
	const phoneValid = useMemo(() => /^\+?[0-9]{10,15}$/.test(phone.trim()), [phone]);
	const hasLocation = useMemo(() => useGeo ? !!geoCoords : manualAddress.trim().length > 3, [useGeo, geoCoords, manualAddress]);

	const selectedCategory = useMemo(() => data.find(c => c.id === categoryId) || null, [data, categoryId]);
	const subcategories = useMemo(() => selectedCategory?.subcategories || [], [selectedCategory]);

	// Ensure subcategory remains valid when category changes
	useEffect(() => {
		setSubcategoryLabel(prev => {
			if (!selectedCategory) return '';
			return subcategories.some(s => s.label === prev) ? prev : '';
		});
	}, [categoryId, selectedCategory, subcategories]);

	// Handle initial props
	useEffect(() => {
		if (initialCategoryId && data.some(c => c.id === initialCategoryId)) {
			setCategoryId(initialCategoryId);
			if (initialSubcategory && data.find(c => c.id === initialCategoryId)?.subcategories.some(s => s.label === initialSubcategory)) {
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
		const picked = subcategories.find(s => s.label === subcategoryLabel);
		onSubmit({
			categoryId: selectedCategory.id,
			categoryLabel: selectedCategory.label,
			subcategoryLabel,
			href: picked?.href || null,
			phone: phone.trim(),
			location: useGeo ? {
				source: 'geolocation',
				coords: geoCoords
			} : {
				source: 'manual',
				manualAddress: manualAddress.trim()
			}
		});
		setShowModal(false);
	}

	function triggerGeolocation() {
		if (!('geolocation' in navigator)) {
			setGeoError('Geolocation not supported');
			setGeoStatus('error');
			return;
		}
		setGeoStatus('pending');
		setGeoError('');
		navigator.geolocation.getCurrentPosition(
			pos => {
				setGeoCoords({ lat: parseFloat(pos.coords.latitude.toFixed(6)), lng: parseFloat(pos.coords.longitude.toFixed(6)) });
				setGeoStatus('success');
			},
			err => {
				setGeoError(err.message || 'Unable to retrieve location');
				setGeoStatus('error');
			}
		);
	}

	// Keyboard Enter progression
	function handleKeyDown(e) {
		if (e.key === 'Enter') {
			if (step === 1 && canGoNext) return handleNext(e);
			if (step === 2 && canGoSubNext) return handleSubNext(e);
		}
	}

	return (
		<form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8 pb-28 md:pb-0" aria-labelledby="progressive-form-heading">
			{/* Inline scoped styles for animations & ripple */}
			<style>{`
			@keyframes fadeSlideInFwd {0%{opacity:0;transform:translateY(12px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
			@keyframes fadeSlideInBack {0%{opacity:0;transform:translateY(-8px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
			@keyframes scalePop {0%{transform:scale(.92);opacity:.4}60%{transform:scale(1.04);opacity:1}100%{transform:scale(1)} }
			.step-panel[data-dir='forward']{animation:fadeSlideInFwd .45s cubic-bezier(.16,.84,.44,1) both}
			.step-panel[data-dir='back']{animation:fadeSlideInBack .4s cubic-bezier(.16,.84,.44,1) both}
			.validate-pop{animation:scalePop .7s cubic-bezier(.16,.84,.44,1)}
			.ripple-btn{position:relative;overflow:hidden}
			.ripple-btn span.ripple{position:absolute;border-radius:9999px;pointer-events:none;background:radial-gradient(circle at center,rgba(255,255,255,.6),rgba(255,255,255,0));animation:ripple .7s ease-out;transform:translate(-50%,-50%);}
			@keyframes ripple{0%{width:0;height:0;opacity:.7}100%{width:480px;height:480px;opacity:0}}
			`}</style>
			{/* Header & Progress */}
			<div className="space-y-4">
				<div className="flex items-start justify-between flex-wrap gap-4">
					<div>
						<h2 id="progressive-form-heading" className="text-xl font-semibold tracking-tight text-slate-800">
							{step === 1 ? 'Select a Category' : step === 2 ? 'Choose a Subcategory' : 'Add Your Details'}
						</h2>
						<p className="text-xs sm:text-sm text-slate-500 mt-1">Step {step} of 3</p>
					</div>
					{selectedCategory && (
						<div className="text-xs sm:text-sm text-slate-600 bg-gradient-to-br from-slate-50 to-slate-100/60 backdrop-blur px-3 py-2 rounded-md border border-slate-200/70 flex flex-col gap-0.5 min-w-[170px] shadow-sm">
							<span className="truncate"><span className="font-medium">Category:</span> {selectedCategory.label} {step > 1 && <button type="button" onClick={()=>setStep(1)} className="ml-1 text-[10px] text-blue-600 underline">Change</button>}</span>
							{subcategoryLabel && <span className="truncate"><span className="font-medium">Sub:</span> {subcategoryLabel} {step > 2 && <button type="button" onClick={()=>setStep(2)} className="ml-1 text-[10px] text-indigo-600 underline">Change</button>}</span>}
						</div>
					)}
				</div>
				<div className="h-2 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
					<div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
				</div>
				<nav aria-label="Progress" className="hidden md:flex items-center justify-between text-[13px] font-medium text-slate-500">
					<button type="button" onClick={()=>setStep(1)} className={"transition-colors hover:text-blue-600 " + (step>=1? 'text-blue-600':'')} aria-current={step===1}>Category</button>
						<span className="h-px flex-1 mx-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
					<button type="button" disabled={!canGoNext} onClick={()=> canGoNext && setStep(2)} className={"transition-colors hover:text-blue-600 disabled:opacity-40 " + (step>=2? 'text-blue-600':'')} aria-current={step===2}>Subcategory</button>
						<span className="h-px flex-1 mx-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
					<button type="button" disabled={!canGoSubNext} onClick={()=> canGoSubNext && setStep(3)} className={"transition-colors hover:text-blue-600 disabled:opacity-40 " + (step>=3? 'text-blue-600':'')} aria-current={step===3}>Details</button>
				</nav>
			</div>

			{/* Step 1 */}
			{step === 1 && (
				<fieldset aria-describedby="category-help" className="space-y-5 step-panel" data-dir={direction}>
					<legend className="sr-only">Categories</legend>
					<p id="category-help" className="text-sm text-slate-600">Pick a category to begin. You can refine it in the next step.</p>
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{data.map(cat => {
							const checked = categoryId === cat.id;
							return (
								<li key={cat.id}>
									<button
										type="button"
										onClick={() => setCategoryId(cat.id)}
										className={[
											'group w-full text-left rounded-2xl border relative overflow-hidden p-4 flex flex-col gap-2 ripple-btn',
											'transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
											checked ? 'border-blue-600 bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100' : 'border-slate-200 bg-white hover:border-blue-400/80'
										].join(' ')}
										aria-pressed={checked}
									>
										<span className="flex items-start gap-2">
											<span className={[
												'h-5 w-5 flex items-center justify-center rounded-full border text-[11px] font-medium',
												checked ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-slate-300 text-slate-500 group-hover:border-blue-400'
											].join(' ')}>{cat.label[0]}</span>
											<span className="font-medium text-slate-800 leading-snug pr-2 flex-1">{cat.label}</span>
										</span>
										<span className="text-[11px] tracking-wide uppercase text-slate-500 font-medium">{cat.subcategories.length} option{cat.subcategories.length !== 1 && 's'}</span>
										{checked && (
											<span className="absolute inset-0 pointer-events-none border-2 border-blue-500/50 rounded-2xl animate-[pulse_3s_ease-in-out_infinite]" />
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
				<fieldset aria-describedby="subcategory-help" className="space-y-5 step-panel" data-dir={direction}>
					<legend className="sr-only">Subcategories</legend>
					<div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
						<p className="text-sm font-medium text-slate-700">{selectedCategory.label}</p>
						<p id="subcategory-help" className="text-xs sm:text-sm text-slate-500">Select the most relevant option.</p>
					</div>
					<ul className="grid gap-3 sm:grid-cols-2">
						{subcategories.map(sub => {
							const checked = subcategoryLabel === sub.label;
							return (
								<li key={sub.label}>
									<button
										type="button"
										onClick={() => setSubcategoryLabel(sub.label)}
										className={[
											'group w-full rounded-xl border px-4 py-3 text-sm font-medium flex items-start gap-2 text-left ripple-btn',
											'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
											checked ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-400/70 hover:bg-slate-50'
										].join(' ')}
										aria-pressed={checked}
									>
										<span className={[
											'mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-semibold',
											checked ? 'border-indigo-600 bg-indigo-600 text-white shadow' : 'border-slate-300 text-slate-400 group-hover:border-indigo-400'
										].join(' ')}>{checked ? '✓' : ''}</span>
										<span className="flex-1 text-slate-800 leading-snug">{sub.label}</span>
									</button>
								</li>
							);
						})}
					</ul>
					{subcategories.length === 0 && (
						<p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">No subcategories available.</p>
					)}
				</fieldset>
			)}

			{/* Step 3 */}
			{step === 3 && selectedCategory && (
				<fieldset aria-describedby="details-help" className="space-y-8 step-panel" data-dir={direction}>
					<legend className="sr-only">User Details</legend>
					<p id="details-help" className="text-sm text-slate-600">Provide contact & location. We respect your privacy.</p>
					<div className="grid gap-8 sm:grid-cols-2">
						<div className="space-y-4 sm:col-span-2">
							<label htmlFor="phone" className="flex items-center justify-between">
								<span className="text-sm font-medium text-slate-700">Mobile Number <span className="text-rose-500">*</span></span>
								{phone && (
									<span className={`text-xs font-medium ${phoneValid ? 'text-emerald-600' : 'text-rose-600'} ${justValidated && phoneValid ? 'validate-pop' : ''}`}>{phoneValid ? 'Valid' : 'Invalid'}</span>
								)}
							</label>
							<input
								id="phone"
								type="tel"
								placeholder="e.g. +919876543210"
								value={phone}
								onChange={e => setPhone(e.target.value)}
								className={[
									'w-full rounded-lg border px-3 py-2.5 text-sm font-medium tracking-wide bg-white/70 backdrop-blur',
									'placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition',
									phone && !phoneValid ? 'border-rose-400' : 'border-slate-300'
								].join(' ')}
							/>
							{phone && !phoneValid && <p className="text-xs text-rose-600">10-15 digits, may start with +</p>}
						</div>
						<div className="space-y-4 sm:col-span-2">
							<p className="text-sm font-medium text-slate-700 flex items-center gap-2">Location <span className="text-rose-500">*</span></p>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => { setUseGeo(true); triggerGeolocation(); }}
									className={[
										'inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition',
										useGeo ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
									].join(' ')}
								>Use Current Location</button>
								<button
									type="button"
									onClick={() => { setUseGeo(false); setGeoStatus('idle'); }}
									className={[
										'inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition',
										!useGeo ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
									].join(' ')}
								>Enter Manually</button>
							</div>
							{useGeo ? (
								<div className="text-sm rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 space-y-1" aria-live="polite">
									{geoStatus === 'idle' && <p className="text-slate-500">Tap the button to fetch coordinates.</p>}
									{geoStatus === 'pending' && <p className="text-blue-600 animate-pulse">Fetching location...</p>}
									{geoStatus === 'error' && <p className="text-rose-600">{geoError}</p>}
									{geoStatus === 'success' && geoCoords && (
										<p className="text-emerald-600 font-medium">Lat: {geoCoords.lat} · Lng: {geoCoords.lng}</p>
									)}
								</div>
							) : (
								<div className="space-y-3">
									<textarea
										rows={4}
										placeholder="Flat / Street / Landmark / City"
										value={manualAddress}
										onChange={e => setManualAddress(e.target.value)}
										className="w-full rounded-lg border border-slate-300 bg-white/70 backdrop-blur px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
									/>
									<div className="flex items-center justify-between">
										{!manualAddress && <p className="text-xs text-slate-500">Provide enough detail for accurate service.</p>}
										{manualAddress && <p className="text-[10px] uppercase tracking-wider text-slate-400">{manualAddress.length} chars</p>}
									</div>
								</div>
							)}
						</div>
					</div>
				</fieldset>
			)}

			{/* Actions */}
			<div ref={actionBarRef} className="flex flex-wrap items-center gap-3 pt-2 md:static fixed inset-x-0 bottom-0 md:bottom-auto bg-white/90 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 z-30 px-4 py-3 md:px-0 md:py-0">
				{(step === 2 || step === 3) && (
					<button
						type="button"
						onClick={handleBack}
						className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[.97] focus:outline-none focus:ring-2 focus:ring-blue-500"
					>Back</button>
				)}
				{step === 1 && (
					<button
						type="button"
						onClick={handleNext}
						disabled={!canGoNext}
						className={`inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition active:scale-[.97] ${canGoNext ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
					>Continue</button>
				)}
				{step === 2 && (
					<button
						type="button"
						onClick={handleSubNext}
						disabled={!canGoSubNext}
						className={`inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition active:scale-[.97] ${canGoSubNext ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
					>Continue</button>
				)}
				{step === 3 && (
					<button
						type="submit"
						disabled={!canSubmit}
						className={`inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition active:scale-[.97] ${canSubmit ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
					>Review</button>
				)}
				<button
					type="button"
					onClick={handleCancel}
					className="ml-auto inline-flex items-center rounded-lg border border-transparent bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 active:scale-[.97] focus:outline-none focus:ring-2 focus:ring-rose-500"
				>Cancel</button>
			</div>

			{/* Confirmation Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 animate-[fadeIn_.35s_ease_forwards]" aria-hidden="true" onClick={() => setShowModal(false)} />
					<style>{`@keyframes fadeIn{to{opacity:1}}@keyframes popIn{0%{opacity:0;transform:translateY(40px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
					<div role="dialog" aria-modal="true" className="relative w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 animate-[popIn_.5s_cubic-bezier(.16,.84,.44,1)_both]">
						<div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
							<div className="space-y-1">
								<h3 className="text-lg font-semibold tracking-tight text-slate-800">Review & Confirm</h3>
								<p className="text-xs text-slate-500">Make sure the details are correct before continuing.</p>
							</div>
							<dl className="grid gap-3 text-sm">
								<div className="flex items-start gap-3">
									<dt className="w-28 text-slate-500">Category</dt><dd className="flex-1 font-medium text-slate-800">{selectedCategory?.label}</dd>
								</div>
								<div className="flex items-start gap-3">
									<dt className="w-28 text-slate-500">Subcategory</dt><dd className="flex-1 text-slate-800">{subcategoryLabel}</dd>
								</div>
								<div className="flex items-start gap-3">
									<dt className="w-28 text-slate-500">Phone</dt><dd className="flex-1 text-slate-800">{phone.trim()}</dd>
								</div>
								<div className="flex items-start gap-3">
									<dt className="w-28 text-slate-500">Location</dt><dd className="flex-1 text-slate-800">{useGeo ? 'Current Location' : 'Manual Entry'}</dd>
								</div>
								{useGeo && geoCoords && (
									<div className="flex items-start gap-3">
										<dt className="w-28 text-slate-500">Coordinates</dt><dd className="flex-1 text-slate-800">{geoCoords.lat}, {geoCoords.lng}</dd>
									</div>
								)}
								{!useGeo && manualAddress && (
									<div className="flex items-start gap-3">
										<dt className="w-28 text-slate-500">Address</dt><dd className="flex-1 text-slate-800 whitespace-pre-line">{manualAddress.trim()}</dd>
									</div>
								)}
							</dl>
							<div className="flex flex-col sm:flex-row gap-3 pt-2">
								<button type="button" onClick={() => setShowModal(false)} className="inline-flex justify-center items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[.97] focus:outline-none focus:ring-2 focus:ring-indigo-500">Edit</button>
								<button type="button" onClick={confirmSubmit} className="inline-flex justify-center items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[.97] focus:outline-none focus:ring-2 focus:ring-indigo-500">Confirm & Continue</button>
							</div>
						</div>
						<div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
					</div>
				</div>
			)}
		</form>
	);
}

// Optional helper export for the data shape example (remove if not needed in this file)
export const exampleCategoryData = [
	{
		id: 'citizen-services',
		label: 'Citizen Services',
		subcategories: [
			{ label: 'Citizen Charter Timeline', href: 'https://example.com' },
			{ label: 'Grievances', href: 'https://example.com' },
			{ label: 'Birth Certificate', href: 'https://example.com' },
			{ label: 'Death Certificate', href: 'https://example.com' },
			{ label: 'Marriage Certificate', href: 'https://example.com' },
			{ label: 'CRM Services', href: 'https://example.com' }
		]
	},
	{
		id: 'payments-taxes',
		label: 'Payments & Taxes',
		subcategories: [
			{ label: 'Property Tax', href: 'https://example.com' },
			{ label: 'Water Charges', href: 'https://example.com' },
			{ label: 'Bill Tracking', href: 'https://example.com' },
			{ label: 'Others', href: 'https://example.com' }
		]
	},
	{
		id: 'licenses-approvals',
		label: 'Licenses & Approvals',
		subcategories: [
			{ label: 'Restaurant Licenses', href: 'https://example.com' },
			{ label: 'Tree Cutting Approvals', href: 'https://example.com' }
		]
	}
];

/* Example usage (remove in production):
import ProgressiveForm, { exampleCategoryData } from './Froms';
<ProgressiveForm data={exampleCategoryData} onSubmit={console.log} onCancel={() => console.log('Cancelled')} />
*/
