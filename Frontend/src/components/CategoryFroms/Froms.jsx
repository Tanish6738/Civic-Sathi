import React, { useEffect, useState } from 'react';

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

	// Validation helpers
	const phoneValid = /^\+?[0-9]{10,15}$/.test(phone.trim());
	const hasLocation = useGeo ? !!geoCoords : manualAddress.trim().length > 3;

	// Derive selected category object
	const selectedCategory = data.find(c => c.id === categoryId) || null;
	const subcategories = selectedCategory?.subcategories || [];

	// If category changes, clear subcategory
	useEffect(() => {
		setSubcategoryLabel(prev => {
			if (!selectedCategory) return '';
			// Keep if still present
			if (prev && subcategories.some(s => s.label === prev)) return prev;
			return '';
		});
	}, [categoryId]);

	// If initial props given and valid, auto-advance
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
	const canGoSubNext = !!subcategoryLabel; // move from step2 -> step3
	const canSubmit = phoneValid && hasLocation;

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
		setStep(1);
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
		<form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="progressive-form-heading">
			<h2 id="progressive-form-heading" className="text-xl font-semibold text-gray-800">
				{step === 1 ? 'Select a Category' : step === 2 ? 'Select a Subcategory' : 'Enter Details'}
			</h2>

			{/* Step indicators */}
			<ol className="flex items-center gap-2 text-sm" aria-label="Steps">
				<li className={`flex items-center gap-1 ${step === 1 ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
					<span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${step >= 1 ? 'bg-blue-600 text-white border-blue-600' : ''}`}>1</span>
					Category
				</li>
				<li className="text-gray-400">→</li>
				<li className={`flex items-center gap-1 ${step === 2 ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
					<span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${step >= 2 ? (step === 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600/80 text-white border-blue-600') : ''}`}>2</span>
					Subcategory
				</li>
				<li className="text-gray-400">→</li>
				<li className={`flex items-center gap-1 ${step === 3 ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
					<span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${step === 3 ? 'bg-blue-600 text-white border-blue-600' : ''}`}>3</span>
					Details
				</li>
			</ol>

			{step === 1 && (
				<fieldset className="space-y-4" aria-describedby="category-help">
					<legend className="sr-only">Categories</legend>
					<p id="category-help" className="text-sm text-gray-600">Choose one category to continue.</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{data.map(cat => {
							const checked = categoryId === cat.id;
							return (
								<label
									key={cat.id}
									htmlFor={`cat-${cat.id}`}
									className={`relative cursor-pointer rounded-lg border p-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transition text-sm font-medium flex flex-col gap-1 min-h-[90px] ${checked ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`}
								>
									<span className="flex items-start gap-2">
										<input
											id={`cat-${cat.id}`}
											type="radio"
											name="category"
											value={cat.id}
											checked={checked}
											onChange={() => setCategoryId(cat.id)}
											className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500" />
										<span className="text-gray-800">{cat.label}</span>
									</span>
									<span className="text-xs text-gray-500">{cat.subcategories.length} option{cat.subcategories.length !== 1 && 's'}</span>
								</label>
							);
						})}
					</div>
				</fieldset>
			)}

			{step === 2 && selectedCategory && (
				<fieldset className="space-y-4" aria-describedby="subcategory-help">
					<legend className="sr-only">Subcategories</legend>
					<p className="text-sm text-gray-700"><strong>Category:</strong> {selectedCategory.label}</p>
					<p id="subcategory-help" className="text-sm text-gray-600">Pick a subcategory to submit.</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{subcategories.map(sub => {
							const checked = subcategoryLabel === sub.label;
							return (
								<label
									key={sub.label}
									htmlFor={`sub-${sub.label}`}
									className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer text-sm transition ${checked ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`}
								>
									<input
										id={`sub-${sub.label}`}
										type="radio"
										name="subcategory"
										value={sub.label}
										checked={checked}
										onChange={() => setSubcategoryLabel(sub.label)}
										className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500" />
									<span className="flex-1 text-gray-800">{sub.label}</span>
								</label>
							);
						})}
					</div>
					{subcategories.length === 0 && (
						<p className="text-sm text-red-600">No subcategories available.</p>
					)}
				</fieldset>
			)}

					{step === 3 && selectedCategory && (
						<fieldset className="space-y-6" aria-describedby="details-help">
							<legend className="sr-only">User Details</legend>
							<p id="details-help" className="text-sm text-gray-600">Provide contact and location information.</p>
							<div className="space-y-1">
								<label htmlFor="phone" className="text-sm font-medium text-gray-700">Mobile Number <span className="text-red-500">*</span></label>
								<input
									id="phone"
									type="tel"
									placeholder="e.g. +919876543210"
									value={phone}
									onChange={e => setPhone(e.target.value)}
									className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${phone && !phoneValid ? 'border-red-400' : 'border-gray-300'}`}
								/>
								{phone && !phoneValid && <p className="text-xs text-red-600">Enter a valid phone number (10-15 digits, optional +).</p>}
							</div>
							<div className="space-y-3">
								<p className="text-sm font-medium text-gray-700">Location <span className="text-red-500">*</span></p>
								<div className="flex flex-wrap gap-2">
									<button type="button" onClick={() => { setUseGeo(true); triggerGeolocation(); }} className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition ${useGeo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Use Current Location</button>
									<button type="button" onClick={() => { setUseGeo(false); setGeoStatus('idle'); }} className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition ${!useGeo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Enter Manually</button>
								</div>
								{useGeo ? (
									<div className="text-sm">
										{geoStatus === 'idle' && <p className="text-gray-500">Click to fetch your current coordinates.</p>}
										{geoStatus === 'pending' && <p className="text-blue-600 animate-pulse">Fetching location...</p>}
										{geoStatus === 'error' && <p className="text-red-600">{geoError}</p>}
										{geoStatus === 'success' && geoCoords && (
											<p className="text-green-700">Latitude: {geoCoords.lat}, Longitude: {geoCoords.lng}</p>
										)}
									</div>
								) : (
									<div className="space-y-1">
										<textarea
											rows={3}
											placeholder="Enter your address or landmark"
											value={manualAddress}
											onChange={e => setManualAddress(e.target.value)}
											className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										{!manualAddress && <p className="text-xs text-gray-500">Provide sufficient details.</p>}
									</div>
								)}
							</div>
						</fieldset>
					)}

			{/* Action buttons */}
			<div className="flex flex-wrap gap-3 pt-2">
				{(step === 2 || step === 3) && (
					<button
						type="button"
						onClick={handleBack}
						className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Back
					</button>
				)}
				{step === 1 && (
					<button
						type="button"
						onClick={handleNext}
						disabled={!canGoNext}
						className={`inline-flex items-center rounded-md px-5 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${canGoNext ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
					>
						Next
					</button>
				)}
				{step === 2 && (
					<button
						type="button"
						onClick={handleSubNext}
						disabled={!canGoSubNext}
						className={`inline-flex items-center rounded-md px-5 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${canGoSubNext ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
					>
						Next
					</button>
				)}
				{step === 3 && (
					<button
						type="submit"
						disabled={!canSubmit}
						className={`inline-flex items-center rounded-md px-5 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${canSubmit ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
					>
						Submit
					</button>
				)}
				<button
					type="button"
					onClick={handleCancel}
					className="ml-auto inline-flex items-center rounded-md border border-transparent bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
				>
					Cancel
				</button>
			</div>

			{/* Confirmation Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" aria-hidden="true" onClick={() => setShowModal(false)} />
					<div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl bg-white shadow-lg border border-gray-200 p-6 space-y-5">
						<div className="space-y-1">
							<h3 className="text-lg font-semibold tracking-tight text-gray-800">Confirm Your Details</h3>
							<p className="text-xs text-gray-500">Review before making a call with Nigam AI.</p>
						</div>
						<ul className="text-sm space-y-2">
							<li><span className="font-medium text-gray-600">Category:</span> {selectedCategory?.label}</li>
							<li><span className="font-medium text-gray-600">Subcategory:</span> {subcategoryLabel}</li>
							<li><span className="font-medium text-gray-600">Phone:</span> {phone.trim()}</li>
							<li><span className="font-medium text-gray-600">Location Source:</span> {useGeo ? 'Current Location' : 'Manual Entry'}</li>
							{useGeo && geoCoords && (
								<li><span className="font-medium text-gray-600">Coordinates:</span> {geoCoords.lat}, {geoCoords.lng}</li>
							)}
							{!useGeo && manualAddress && (
								<li><span className="font-medium text-gray-600">Address:</span> {manualAddress.trim()}</li>
							)}
						</ul>
						<div className="flex gap-3 pt-2">
							<button type="button" onClick={() => setShowModal(false)} className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Edit</button>
							<button type="button" onClick={confirmSubmit} className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Call with Nigam AI</button>
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
