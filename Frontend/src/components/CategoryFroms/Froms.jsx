import React, { useEffect, useState, useMemo } from 'react';

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

	return (
		<form onSubmit={handleSubmit} className="space-y-8" aria-labelledby="progressive-form-heading">
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
						<div className="text-xs sm:text-sm text-slate-600 bg-slate-50/80 backdrop-blur px-3 py-2 rounded-md border border-slate-200/70 flex flex-col gap-0.5 min-w-[160px]">
							<span className="truncate"><span className="font-medium">Category:</span> {selectedCategory.label}</span>
							{subcategoryLabel && <span className="truncate"><span className="font-medium">Sub:</span> {subcategoryLabel}</span>}
						</div>
					)}
				</div>
				<div className="h-2 rounded-full bg-slate-200 overflow-hidden">
					<div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
				</div>
				<nav aria-label="Progress" className="hidden md:flex items-center justify-between text-[13px] font-medium text-slate-500">
					<span className={step >= 1 ? 'text-blue-600' : ''}>Category</span>
						<span className="h-px flex-1 mx-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
					<span className={step >= 2 ? 'text-blue-600' : ''}>Subcategory</span>
						<span className="h-px flex-1 mx-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
					<span className={step >= 3 ? 'text-blue-600' : ''}>Details</span>
				</nav>
			</div>

			{/* Step 1 */}
			{step === 1 && (
				<fieldset aria-describedby="category-help" className="space-y-5">
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
											'group w-full text-left rounded-xl border relative overflow-hidden p-4 flex flex-col gap-2',
											'transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
											checked ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50' : 'border-slate-200 bg-white hover:border-blue-400'
										].join(' ')}
										aria-pressed={checked}
									>
										<span className="flex items-start gap-2">
											<span className={[
												'h-5 w-5 flex items-center justify-center rounded-full border text-[11px] font-medium',
												checked ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-500 group-hover:border-blue-400'
											].join(' ')}>{cat.label[0]}</span>
											<span className="font-medium text-slate-800 leading-snug pr-2">{cat.label}</span>
										</span>
										<span className="text-[11px] tracking-wide uppercase text-slate-500 font-medium">{cat.subcategories.length} option{cat.subcategories.length !== 1 && 's'}</span>
										{checked && (
											<span className="absolute inset-0 pointer-events-none border-2 border-blue-500/60 rounded-xl animate-[pulse_2.5s_ease-in-out_infinite]" />
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
				<fieldset aria-describedby="subcategory-help" className="space-y-5">
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
											'group w-full rounded-lg border px-4 py-3 text-sm font-medium flex items-start gap-2',
											'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
											checked ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50'
										].join(' ')}
										aria-pressed={checked}
									>
										<span className={[
											'mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-semibold',
											checked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-400 group-hover:border-indigo-400'
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
				<fieldset aria-describedby="details-help" className="space-y-8">
					<legend className="sr-only">User Details</legend>
					<p id="details-help" className="text-sm text-slate-600">Provide contact & location. We respect your privacy.</p>
					<div className="grid gap-8 sm:grid-cols-2">
						<div className="space-y-4 sm:col-span-2">
							<label htmlFor="phone" className="flex items-center justify-between">
								<span className="text-sm font-medium text-slate-700">Mobile Number <span className="text-rose-500">*</span></span>
								{phone && (
									<span className={`text-xs font-medium ${phoneValid ? 'text-emerald-600' : 'text-rose-600'}`}>{phoneValid ? 'Valid' : 'Invalid'}</span>
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
								<div className="text-sm rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 space-y-1">
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
									{!manualAddress && <p className="text-xs text-slate-500">Provide enough detail for accurate service.</p>}
								</div>
							)}
						</div>
					</div>
				</fieldset>
			)}

			{/* Actions */}
			<div className="flex flex-wrap items-center gap-3 pt-2">
				{(step === 2 || step === 3) && (
					<button
						type="button"
						onClick={handleBack}
						className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>Back</button>
				)}
				{step === 1 && (
					<button
						type="button"
						onClick={handleNext}
						disabled={!canGoNext}
						className={`inline-flex items-center rounded-lg px-6 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${canGoNext ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
					>Continue</button>
				)}
				{step === 2 && (
					<button
						type="button"
						onClick={handleSubNext}
						disabled={!canGoSubNext}
						className={`inline-flex items-center rounded-lg px-6 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${canGoSubNext ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
					>Continue</button>
				)}
				{step === 3 && (
					<button
						type="submit"
						disabled={!canSubmit}
						className={`inline-flex items-center rounded-lg px-6 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${canSubmit ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
					>Review</button>
				)}
				<button
					type="button"
					onClick={handleCancel}
					className="ml-auto inline-flex items-center rounded-lg border border-transparent bg-rose-50 px-5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
				>Cancel</button>
			</div>

			{/* Confirmation Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" onClick={() => setShowModal(false)} />
					<div role="dialog" aria-modal="true" className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
						<div className="p-6 space-y-6">
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
							<div className="flex gap-3 pt-2">
								<button type="button" onClick={() => setShowModal(false)} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Edit</button>
								<button type="button" onClick={confirmSubmit} className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Confirm & Continue</button>
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
