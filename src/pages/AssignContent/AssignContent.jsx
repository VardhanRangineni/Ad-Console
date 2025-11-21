import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { Button, Form, Alert, Table } from 'react-bootstrap';
import { storeList } from '../../data/storeList';

import { getAllContent, getDB } from '../../services/indexeddb';
// Playlists store helpers using shared ad-console-db

const PLAYLIST_STORE = 'playlists';

// Update playlist in DB by id
export async function updatePlaylistInDB(id, updates) {
	const db = await getDB();
	if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return;
	const playlist = await db.get(PLAYLIST_STORE, id);
	if (!playlist) return;
	const updated = { ...playlist, ...updates };
	await db.put(PLAYLIST_STORE, updated);
}

async function savePlaylistToDB(playlist) {
	const db = await getDB();
	if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return;
	// Return the new id so callers can reference it (e.g. to mark original playlist as disabled)
	return await db.add(PLAYLIST_STORE, playlist);
}

export async function getAllPlaylistsFromDB() {
	const db = await getDB();
	if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return [];
	return await db.getAll(PLAYLIST_STORE);
}

function AssignContent() {
	// Playlist type: 'regular' or 'trigger'
	const [playlistType, setPlaylistType] = useState('regular');
	// Trigger interval in minutes (default 5)
	const [triggerInterval, setTriggerInterval] = useState(5);
	// Trigger time window (start/stop) in 12-hour format components
	const [triggerStartHour, setTriggerStartHour] = useState('08');
	const [triggerStartMinute, setTriggerStartMinute] = useState('00');
	const [triggerStartAmPm, setTriggerStartAmPm] = useState('AM');
	const [triggerStopHour, setTriggerStopHour] = useState('06');
	const [triggerStopMinute, setTriggerStopMinute] = useState('00');
	const [triggerStopAmPm, setTriggerStopAmPm] = useState('PM');
	const [timeValidationError, setTimeValidationError] = useState('');
	// Trigger subtype for trigger playlists. '' means no subtype selected yet (show dropdown).
	// Options: 'time' (time-based triggers), future: 'sensor', 'event', etc.
	const [triggerSubType, setTriggerSubType] = useState('');

	// helper: convert 12-hour to minutes since midnight
	const convert12ToMinutes = (hourStr, minuteStr, ampmStr) => {
		const h = Number(hourStr) % 12; // convert 12 to 0
		const m = Number(minuteStr || 0);
		const ampm = (ampmStr || 'AM').toUpperCase();
		const hh = h + (ampm === 'PM' ? 12 : 0);
		return hh * 60 + m;
	};

	const computeTriggerTimeValidity = () => {
		if (!playlistType || playlistType !== 'trigger') return true; // only relevant for trigger type
		// Only validate time window for time-based triggers
		if (triggerSubType !== 'time') return { valid: true, message: '' };
		// both must be set
		if (!triggerStartHour || !triggerStartMinute || !triggerStartAmPm || !triggerStopHour || !triggerStopMinute || !triggerStopAmPm) {
			return { valid: false, message: 'Start and Stop times are required.' };
		}
		const startMinutes = convert12ToMinutes(triggerStartHour, triggerStartMinute, triggerStartAmPm);
		const stopMinutes = convert12ToMinutes(triggerStopHour, triggerStopMinute, triggerStopAmPm);
		// stop must be later than start and not cross midnight
		if (!(startMinutes < stopMinutes) || stopMinutes > 23 * 60 + 59) {
			return { valid: false, message: 'Start time must be earlier than Stop, and Stop cannot cross midnight.' };
		}
		return { valid: true, message: '' };
	};

	// validate on change of start/stop inputs
	useEffect(() => {
		if (playlistType === 'trigger' && triggerSubType === 'time') {
			const v = computeTriggerTimeValidity();
			setTimeValidationError(v.message);
		} else {
			setTimeValidationError('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [triggerStartHour, triggerStartMinute, triggerStartAmPm, triggerStopHour, triggerStopMinute, triggerStopAmPm, playlistType, triggerSubType]);
	// ...existing code...
	const location = useLocation();
	const navigate = useNavigate();
	const action = location && location.state ? location.state.action : null;
	const isReadOnly = action === 'view';
	// Helper to format region/territory string for display and storage
	// Helper to format region/store code as per required nomenclature
	function getRegionNomenclature({ territoryType, selectedCountry, selectedState, selectedCity, filteredStoreIds, storeIdInput }) {
		// Helper to get state/city/store codes
		const getStateCode = (state) => {
			// Try to find a store with this state and get its code (assume code is first 2 after IN)
			const found = storeList.find(s => s.state === state);
			if (found && found.id && found.id.length >= 4) return found.id.substring(2, 4);
			// fallback: first 2 letters of state
			return (state || '').substring(0, 2).toUpperCase();
		};
		const getCityCode = (city, state) => {
			// Try to find a store with this city/state and get its code (assume code is next 3 after IN + state)
			const found = storeList.find(s => s.city === city && (!state || s.state === state));
			if (found && found.id && found.id.length >= 7) return found.id.substring(4, 7);
			// fallback: first 3 letters of city
			return (city || '').substring(0, 3).toUpperCase();
		};
		// Country only
		if (territoryType === 'country') {
			return 'IN';
		}
		// State(s)
		if (territoryType === 'state') {
			if (Array.isArray(selectedState) && selectedState.length > 0) {
				return selectedState.map(st => `IN${getStateCode(st)}`).join(',');
			}
			return selectedState ? `IN${getStateCode(selectedState)}` : '';
		}
		// City/cities
		if (territoryType === 'city') {
			if (Array.isArray(selectedState) && selectedState.length > 0 && Array.isArray(selectedCity) && selectedCity.length > 0) {
				// Cross product of states and cities
				return selectedState.map(st => selectedCity.map(city => `IN${getStateCode(st)}${getCityCode(city, st)}`)).flat().join(',');
			}
			return '';
		}
		// Store(s)
		if (territoryType === 'store') {
			// Combine both filteredStoreIds and storeIdInput, remove duplicates
			let allStores = [];
			if (Array.isArray(filteredStoreIds) && filteredStoreIds.length > 0) {
				allStores = allStores.concat(filteredStoreIds);
			}
			if (Array.isArray(storeIdInput) && storeIdInput.length > 0) {
				allStores = allStores.concat(storeIdInput);
			}
			// Remove duplicates
			allStores = Array.from(new Set(allStores));
			if (allStores.length > 0) {
				// For store level, always show the full store ID (not just prefix)
				return allStores.join(',');
			}
			// fallback: state/city
			if (Array.isArray(selectedState) && selectedState.length > 0 && Array.isArray(selectedCity) && selectedCity.length > 0) {
				return selectedState.map(st => selectedCity.map(city => `IN${getStateCode(st)}${getCityCode(city, st)}`)).flat().join(',');
			}
			return '';
		}
		return '';
	}
					// Track which video indices are open in the preview modal
				const [previewContent, setPreviewContent] = useState(null);
				const [showPreview, setShowPreview] = useState(false);
			// Load playlists from IndexedDB on mount
			React.useEffect(() => {
				async function loadPlaylists() {
		// Removed unused variable 'all'
		// Removed setAddedRows, setInactiveRows, setApprovedRows, setRejectedRows (no longer used)
				}
				loadPlaylists();
			}, []);
		const [contentList, setContentList] = useState([]);
		const [editingPlaylistId, setEditingPlaylistId] = useState(null);
		const [wasApproved, setWasApproved] = useState(false);
	// All hooks and state at the top
	const [playlistName, setPlaylistName] = useState('');
	const [territoryType, setTerritoryType] = useState('country');
	const [selectedCountry, setSelectedCountry] = useState('India');
	const countryOptions = useMemo(() => [{ value: 'India', label: 'India' }], []);
	const [selectedState, setSelectedState] = useState([]); // array of state values
	const [selectedCity, setSelectedCity] = useState([]); // array of city values
	const [filteredStoreIds, setFilteredStoreIds] = useState([]);
	const [storeIdInput, setStoreIdInput] = useState([]);
		const [storeIdInputText, setStoreIdInputText] = useState('');
		const [invalidStoreIds, setInvalidStoreIds] = useState([]);
		const [showStoreIdsAddAlert, setShowStoreIdsAddAlert] = useState(false);
		const [addedStoreIdsCount, setAddedStoreIdsCount] = useState(0);

	// Removed unused addedRows, inactiveRows, approvedRows, rejectedRows
	const [showAddAlert, setShowAddAlert] = useState(false);
	const [selectedContent, setSelectedContent] = useState(null);
	const todayStr = new Date().toISOString().split("T")[0];
	const [startDate, setStartDate] = useState(todayStr);
	const [endDate, setEndDate] = useState("");
	const [addedContent, setAddedContent] = useState([]);
	const [currentDuration, setCurrentDuration] = useState("");

	// Pre-fill form if redirected from Manage Playlists (edit/clone)
	useEffect(() => {
			if (location.state && location.state.playlist) {
			const row = location.state.playlist;
			// setActiveTab('create'); // removed unused activeTab
			setPlaylistName(location.state.action === 'clone' ? '' : row.playlistName || '');
			setTerritoryType(row.territoryType || 'country');
			setSelectedCountry(row.selectedCountry || 'India');
			setSelectedState(row.selectedState || []);
			setSelectedCity(row.selectedCity || []);
			setFilteredStoreIds(row.filteredStoreIds ? row.filteredStoreIds.map(normalizeStoreId) : []);
			setStoreIdInput(row.storeIdInput ? row.storeIdInput.map(normalizeStoreId) : []);
			setAddedContent(row.selectedContent ? row.selectedContent.map(id => ({ id, title: id, type: 'unknown', duration: 5 })) : []);
			setStartDate(row.startDate || todayStr);
			setEndDate(row.endDate || '');
			// prefill type and triggerInterval. If cloning, do not set editingPlaylistId
			setPlaylistType(row.type || 'regular');
			setTriggerInterval(row.triggerInterval || 5);
			// If editing an existing trigger playlist, prefill subtype if set; default to 'time' for existing trigger data
			if (row.type === 'trigger') {
				if (row.triggerSubType) setTriggerSubType(row.triggerSubType);
				else if (row.triggerStartAt || row.triggerStopAt || row.triggerInterval) setTriggerSubType('time');
				else setTriggerSubType('');
			}
			// Prefill trigger start/stop values if present
			if (row.triggerStartAt) {
				// Expect stored format e.g. '08:00 AM'
				const m = row.triggerStartAt.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
				if (m) {
					setTriggerStartHour(m[1].padStart(2, '0'));
					setTriggerStartMinute(m[2]);
					setTriggerStartAmPm(m[3].toUpperCase());
				}
			}
			if (row.triggerStopAt) {
				const m2 = row.triggerStopAt.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
				if (m2) {
					setTriggerStopHour(m2[1].padStart(2, '0'));
					setTriggerStopMinute(m2[2]);
					setTriggerStopAmPm(m2[3].toUpperCase());
				}
			}
			// Set editingPlaylistId only when action is 'edit'. For 'view' set null to prevent saving.
			if (location.state.action === 'edit') {
				setEditingPlaylistId(row.id || null);
			} else {
				setEditingPlaylistId(null);
			}
			// Optionally set editingPlaylistId, setWasApproved, etc. if needed
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.state]);
	// Load content from IndexedDB on mount
	React.useEffect(() => {
		async function loadContent() {
			const all = await getAllContent();
			setContentList(all.filter(c => c.active !== false));
		}
		loadContent();
	}, []);

	const stateOptions = useMemo(() => {
		const states = Array.from(new Set(storeList.map(s => s.state)));
		return states.sort().map(state => ({ value: state, label: state }));
	}, []);

	// Simple validation: store ID must start with 'IN' and be alpha-numeric and at least length 6
	function validateStoreId(id) {
		if (!id) return false;
		const s = String(id).trim();
		if (!/^IN[A-Za-z0-9]+$/i.test(s)) return false;
		if (s.length < 6) return false;
		return true;
	}

	const cityOptions = useMemo(() => {
		if (!selectedState || selectedState.length === 0) return [];
		// Only include cities from the selected states
		const filtered = storeList.filter(s => selectedState.includes(s.state));
		const cityAreaPairs = filtered.map(s => ({ city: s.city, area: s.area, state: s.state }));
		// Remove duplicates by city+state
		const unique = [];
		const seen = new Set();
		for (const pair of cityAreaPairs) {
			const key = pair.city + '|' + pair.state;
			if (!seen.has(key)) {
				unique.push(pair);
				seen.add(key);
			}
		}
		return unique.sort((a, b) => a.city.localeCompare(b.city)).map(opt => ({ value: opt.city, label: opt.city + (opt.area ? ` (${opt.area})` : '') }));
	}, [selectedState]);


	// For dropdown: filter by selected states and cities (multi-select)
	const storeOptions = useMemo(() => {
		let filtered = storeList;
		if (selectedState && selectedState.length > 0) {
			filtered = filtered.filter(s => selectedState.includes(s.state));
		}
		if (selectedCity && selectedCity.length > 0) {
			filtered = filtered.filter(s => selectedCity.includes(s.city));
		}
		return filtered.map(s => ({ id: s.id, name: s.name }));
	}, [selectedState, selectedCity]);

	// For text input: all stores in the country
	const allStoreOptions = useMemo(() => storeList.map(s => ({ id: s.id, name: s.name })), []);

	// Async load options for filtered stores
	const loadFilteredStoreOptions = (inputValue, callback) => {
		let filtered = storeOptions;
		if (inputValue) {
			const lower = inputValue.toLowerCase();
			filtered = filtered.filter(s =>
				s.name.toLowerCase().includes(lower) ||
				s.id.toLowerCase().includes(lower)
			);
		}
		callback(filtered.slice(0, 100).map(store => ({ value: store.id, label: `${store.name} (${store.id})` })));
	};

	// (removed unused loadAllStoreOptions — not needed after text input change)

	const handleTerritoryChange = (e) => {
		const value = e.target.value;
		setTerritoryType(value);
		// Reset selections when changing territory
		setSelectedState([]);
		setSelectedCity([]);
		setFilteredStoreIds([]);
		setStoreIdInput([]);
	};

	return (
		<div className="assign-content-page">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h2 className="mb-0">
					<i className="bi bi-list-task me-2"></i>
					Playlist Assignment
				</h2>
			</div>
				<div className="p-3">
					
					<Form>
							<Form.Group className="mb-3">
								<Form.Label style={{ fontWeight: 'bold' }}>Playlist Name</Form.Label>
								<Form.Control
									type="text"
									value={playlistName}
									onChange={e => setPlaylistName(e.target.value)}
									placeholder="Enter playlist name"
									disabled={isReadOnly}
								/>
							</Form.Group>

							<Form.Group className="mb-3">
								<Form.Label style={{ fontWeight: 'bold' }}>Territory</Form.Label>
								<div>
										<Form.Check
										type="radio"
										inline
										id="territory-country"
										label={<label htmlFor="territory-country" style={{ cursor: 'pointer', marginBottom: 0 }}>Country</label>}
										value="country"
										checked={territoryType === 'country'}
										onChange={handleTerritoryChange}
										name="territoryType"
										disabled={isReadOnly}
									/>
									<Form.Check
										type="radio"
										inline
										id="territory-state"
										label={<label htmlFor="territory-state" style={{ cursor: 'pointer', marginBottom: 0 }}>State</label>}
										value="state"
										checked={territoryType === 'state'}
										onChange={handleTerritoryChange}
										name="territoryType"
										disabled={isReadOnly}
									/>
									<Form.Check
										type="radio"
										inline
										id="territory-city"
										label={<label htmlFor="territory-city" style={{ cursor: 'pointer', marginBottom: 0 }}>City</label>}
										value="city"
										checked={territoryType === 'city'}
										onChange={handleTerritoryChange}
										name="territoryType"
										disabled={isReadOnly}
									/>
									<Form.Check
										type="radio"
										inline
										id="territory-store"
										label={<label htmlFor="territory-store" style={{ cursor: 'pointer', marginBottom: 0 }}>Store</label>}
										value="store"
										checked={territoryType === 'store'}
										onChange={handleTerritoryChange}
										name="territoryType"
										disabled={isReadOnly}
									/>
								</div>
								<div className="mt-2" style={{ maxWidth: 300 }}>
									<Form.Label style={{ fontWeight: 'bold' }}>Select Country</Form.Label>
									<Select
										options={countryOptions}
										value={countryOptions.find(opt => opt.value === selectedCountry) || countryOptions[0]}
										onChange={selected => setSelectedCountry(selected ? selected.value : 'India')}
										isClearable={false}
										isDisabled={isReadOnly}
										classNamePrefix="react-select"
										styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
										placeholder="Select country..."
									/>
								</div>
							</Form.Group>

							{/* COUNTRY: No dropdowns or store ID input */}
							{territoryType === 'state' && (
								<Form.Group className="mb-3">
									<Form.Label style={{ fontWeight: 'bold' }}>Select State(s)</Form.Label>
									<Select
										options={stateOptions}
										value={stateOptions.filter(opt => selectedState.includes(opt.value))}
										onChange={selected => {
											setSelectedState(selected ? selected.map(opt => opt.value) : []);
											setSelectedCity([]);
											setFilteredStoreIds([]);
											setStoreIdInput([]);
										}}
										isMulti
										placeholder="Select state(s)..."
										isClearable
										classNamePrefix="react-select"
												styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
									/>
								</Form.Group>
							)}

							{territoryType === 'city' && (
								<>
									<Form.Group className="mb-3">
										<Form.Label style={{ fontWeight: 'bold' }}>Select State(s)</Form.Label>
										<Select
											options={stateOptions}
											value={stateOptions.filter(opt => selectedState.includes(opt.value))}
											onChange={selected => {
												setSelectedState(selected ? selected.map(opt => opt.value) : []);
												setSelectedCity([]);
												setFilteredStoreIds([]);
												setStoreIdInput([]);
											}}
												isMulti
											placeholder="Select state(s)..."
											isClearable
											classNamePrefix="react-select"
											styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
										/>
									</Form.Group>
									{selectedState.length > 0 && (
										<Form.Group className="mb-3">
											<Form.Label style={{ fontWeight: 'bold' }}>Select City/Cities</Form.Label>
											<Select
												options={cityOptions}
												value={cityOptions.filter(opt => selectedCity.includes(opt.value))}
												onChange={selected => {
													setSelectedCity(selected ? selected.map(opt => opt.value) : []);
													setFilteredStoreIds([]);
												}}
												isMulti
												placeholder="Select city/cities..."
												isClearable
												classNamePrefix="react-select"
												styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
												isDisabled={isReadOnly}
											/>
										</Form.Group>
									)}
								</>
							)}

							{territoryType === 'store' && (
								<>
									{/* Show store selection directly for 'store' territory: no state/city selectors */}
									<Form.Group className="mb-3" style={{ position: 'relative' }}>
										<Form.Label style={{ fontWeight: 'bold' }}>Select Stores</Form.Label>
										<AsyncSelect
											isMulti
											cacheOptions
											defaultOptions={storeOptions.slice(0, 100).map(store => ({ value: store.id, label: `${store.name} (${store.id})` }))}
											loadOptions={loadFilteredStoreOptions}
											value={storeOptions.filter(opt => filteredStoreIds.map(normalizeStoreId).includes(normalizeStoreId(opt.id))).map(store => ({ value: store.id, label: `${store.name} (${store.id})` }))}
											onChange={selected => {
												const ids = selected ? selected.map(opt => normalizeStoreId(opt.value)) : [];
												// Only update the filtered store ids; do not populate the storeIdInput tags
												setFilteredStoreIds(ids);
											}}
											placeholder="Select stores..."
											classNamePrefix="react-select"
											menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
											styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}
											isDisabled={isReadOnly}
										/>
									</Form.Group>

										<div className="d-flex justify-content-center my-2" style={{ width: '100%' }}>
											<div
												role="separator"
												aria-label="or"
												className="rounded-circle d-flex align-items-center justify-content-center bg-danger text-white"
												style={{ width: 40, height: 40, fontWeight: 700 }}
											>
												OR
											</div>
										</div>

										<Form.Group className="mb-3" style={{ position: 'relative' }}>
										<Form.Label style={{ fontWeight: 'bold' }}>Store IDs by Comma Seperated</Form.Label>
										<Form.Control
											type="text"
											value={storeIdInputText}
											onChange={(e) => setStoreIdInputText(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													const toAdd = (storeIdInputText || '').split(',').map(s => s.trim()).filter(Boolean);
													if (toAdd.length === 0) return;
													const normalizedToAdd = toAdd.map(normalizeStoreId);
													const patternValid = normalizedToAdd.filter(id => validateStoreId(id));
													const invalidPattern = normalizedToAdd.filter(id => !validateStoreId(id));
													// IDs present in the dataset
													const allStoreIdsSet = new Set(allStoreOptions.map(s => normalizeStoreId(s.id)));
													const present = patternValid.filter(id => allStoreIdsSet.has(id));
													const notPresent = patternValid.filter(id => !allStoreIdsSet.has(id));
													const invalidAll = [...invalidPattern, ...notPresent];
													setInvalidStoreIds(invalidAll);
													if (invalidAll && invalidAll.length > 0) {
														setTimeout(() => setInvalidStoreIds([]), 4000);
													}
													if (present.length === 0) {
														setStoreIdInputText('');
														return;
													}
													// Add only present IDs to filteredStoreIds, and show alert only for newly added ones
													const existingSet = new Set(filteredStoreIds || []);
													const toAddPresent = present.filter(id => !existingSet.has(id));
													if (toAddPresent.length > 0) {
														setFilteredStoreIds(prev => Array.from(new Set([...(prev || []), ...toAddPresent])));
														setAddedStoreIdsCount(toAddPresent.length);
														setShowStoreIdsAddAlert(true);
														setTimeout(() => setShowStoreIdsAddAlert(false), 1500);
													}
													setStoreIdInputText('');
												}
											}}
											placeholder="e.g. INWBQA00001, INWBQA00002"
											disabled={isReadOnly}
										/>
										<Form.Text className="text-muted">Tip: Type comma-separated store IDs and press <kbd>Enter</kbd> to add valid IDs to the filtered selection.</Form.Text>
										{showStoreIdsAddAlert && (
											<Alert variant="success" className="mt-2 py-1">Added {addedStoreIdsCount} store ID(s)</Alert>
										)}
										{invalidStoreIds.length > 0 && (
											<Alert variant="danger" className="mt-2 py-1">Invalid store ID(s): {invalidStoreIds.join(', ')}</Alert>
										)}
									</Form.Group>
								</>
							)}


						{/* Start/End Date Pickers */}
						<div className="row mb-3">
							<div className="col-md-6">
								<Form.Group>
									<Form.Label style={{ fontWeight: 'bold' }}>Start Date</Form.Label>
									<Form.Control
										type="date"
										value={startDate}
										onChange={e => {
											setStartDate(e.target.value);
											// If endDate is before new startDate, reset endDate
											if (endDate && e.target.value && endDate < e.target.value) setEndDate("");
										}}
										style={{ cursor: 'pointer' }}
										onClick={e => e.target.showPicker && e.target.showPicker()}
									/>
								</Form.Group>
							</div>
							<div className="col-md-6">
								<Form.Group>
									<Form.Label style={{ fontWeight: 'bold' }}>End Date</Form.Label>
									<Form.Control
										type="date"
										value={endDate}
										onChange={e => setEndDate(e.target.value)}
										min={startDate || new Date().toISOString().split('T')[0]}
										max={startDate ? new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1) - 1).toISOString().split('T')[0] : ''}
										disabled={!startDate || isReadOnly}
										style={{ cursor: 'pointer' }}
										onClick={e => e.target.showPicker && e.target.showPicker()}
									/>
								</Form.Group>
							</div>
						</div>

						<div className="d-flex flex-column align-items-start mb-3 mt-1" style={{ minWidth: 220, width: '100%', maxWidth: 320 }}>
							<Form.Label style={{ fontWeight: 'bold', marginBottom: 6 }}>Playlist Type</Form.Label>
							<div className="d-flex align-items-center" style={{ gap: 16 }}>
							<Form.Check
								type="radio"
								id="playlist-type-regular"
								name="playlistType"
								label={<label htmlFor="playlist-type-regular" style={{ cursor: 'pointer', marginBottom: 0 }}>Regular</label>}
								style={{ marginRight: 12 }}
								checked={playlistType === 'regular'}
								onChange={() => { setPlaylistType('regular'); setTriggerSubType(''); }}
								disabled={isReadOnly}
							/>
							<Form.Check
								type="radio"
								id="playlist-type-trigger"
								name="playlistType"
								label={<label htmlFor="playlist-type-trigger" style={{ cursor: 'pointer', marginBottom: 0 }}>Trigger-based</label>}
								checked={playlistType === 'trigger'}
								onChange={() => { setPlaylistType('trigger'); setTriggerSubType(''); }}
								disabled={isReadOnly}
							/>
						</div>
						{playlistType === 'trigger' && (
							<>
								<div className="mt-2 w-100" style={{ minWidth: 220 }}>
									<Form.Label style={{ fontWeight: 'bold', marginBottom: 6 }}>Trigger Type</Form.Label>
									<Form.Select
										id="trigger-subtype"
										value={triggerSubType}
										onChange={e => setTriggerSubType(e.target.value)}
										disabled={isReadOnly}
										aria-label="Trigger subtype"
										style={{ maxWidth: 320 }}
									>
										<option value="">Select trigger type...</option>
										<option value="time">Time-based trigger</option>
									</Form.Select>
								</div>
								{/* Only show time-based trigger controls when selected */}
								{triggerSubType === 'time' && (
									<div className="mt-2 w-100" style={{ minWidth: 220 }}>
										<div className="row mb-2 align-items-center">
											<div className="col-3">
												<Form.Label style={{ fontWeight: 'bold', marginBottom: 0 }}>Trigger Interval</Form.Label>
											</div>
											<div className="col-9 col-md-auto">
												<Form.Control
													type="number"
													min={5}
													step={5}
													value={triggerInterval}
													onChange={e => {
														let val = parseInt(e.target.value, 10);
														if (isNaN(val) || val < 5) val = 5;
														// Always round to nearest lower multiple of 5
														val = Math.floor(val / 5) * 5;
														setTriggerInterval(val);
													}}
													style={{ width: 100 }}
													disabled={isReadOnly}
												/>
											</div>
											<div className="col-auto">
												<span>minutes</span>
											</div>
										</div>
										<div className="row mb-2 align-items-center">
											<div className="col-3">
												<Form.Label style={{ fontWeight: 'bold', marginBottom: 0 }}>Start At</Form.Label>
											</div>
											<div className="col-9 col-md-auto">
												<div className="d-flex" style={{ gap: 6 }}>
													<Form.Select id="trigger-start-hour" aria-label="Trigger start hour" value={triggerStartHour} onChange={e => setTriggerStartHour(e.target.value)} disabled={isReadOnly} style={{ width: 68 }}>
														{Array.from({ length: 12 }).map((_, i) => {
															const v = String(i + 1).padStart(2, '0');
															return <option key={v} value={v}>{v}</option>;
														})}
													</Form.Select>
													<Form.Select id="trigger-start-minute" aria-label="Trigger start minute" value={triggerStartMinute} onChange={e => setTriggerStartMinute(e.target.value)} disabled={isReadOnly} style={{ width: 74 }}>
														{Array.from({ length: 12 }).map((_, i) => {
															const m = String(i * 5).padStart(2, '0');
															return <option key={m} value={m}>{m}</option>;
														})}
													</Form.Select>
													<Form.Select id="trigger-start-ampm" aria-label="Trigger start AM/PM" value={triggerStartAmPm} onChange={e => setTriggerStartAmPm(e.target.value)} disabled={isReadOnly} style={{ width: 74 }}>
														<option value="AM">AM</option>
														<option value="PM">PM</option>
													</Form.Select>
												</div>
											</div>
											<div className="col" />
										</div>
										<div className="row mb-2 align-items-center">
											<div className="col-3">
												<Form.Label style={{ fontWeight: 'bold', marginBottom: 0 }}>Stop At</Form.Label>
											</div>
											<div className="col-9 col-md-auto">
												<div className="d-flex" style={{ gap: 6 }}>
													<Form.Select id="trigger-stop-hour" aria-label="Trigger stop hour" value={triggerStopHour} onChange={e => setTriggerStopHour(e.target.value)} disabled={isReadOnly} style={{ width: 68 }}>
														{Array.from({ length: 12 }).map((_, i) => {
															const v = String(i + 1).padStart(2, '0');
															return <option key={v} value={v}>{v}</option>;
														})}
													</Form.Select>
													<Form.Select id="trigger-stop-minute" aria-label="Trigger stop minute" value={triggerStopMinute} onChange={e => setTriggerStopMinute(e.target.value)} disabled={isReadOnly} style={{ width: 74 }}>
														{Array.from({ length: 12 }).map((_, i) => {
															const m = String(i * 5).padStart(2, '0');
															return <option key={m} value={m}>{m}</option>;
														})}
													</Form.Select>
													<Form.Select id="trigger-stop-ampm" aria-label="Trigger stop AM/PM" value={triggerStopAmPm} onChange={e => setTriggerStopAmPm(e.target.value)} disabled={isReadOnly} style={{ width: 74 }}>
														<option value="AM">AM</option>
														<option value="PM">PM</option>
													</Form.Select>
												</div>
											</div>
											<div className="col" />
										</div>
										{timeValidationError && (
											<div className="row mt-1">
												<div className="col-3" />
												<div className="col-9 text-danger">
													{timeValidationError}
												</div>
											</div>
										)}
									</div>
								)}
							</>
						)}
					</div>

						{/* Select Content (single) and duration - always directly below date pickers */}
						<div className="row mb-3 align-items-end">
							<div className="col-md-7">
								<Form.Group className="mb-0 w-100">
									<Form.Label style={{ fontWeight: 'bold' }}>Select Content</Form.Label>
									<Select
										isMulti={false}
										options={contentList.map(content => ({ value: String(content.id), label: content.title }))}
										value={selectedContent ? contentList.filter(content => String(content.id) === String(selectedContent)).map(content => ({ value: String(content.id), label: content.title }))[0] : null}
										onChange={selected => {
											setSelectedContent(selected ? selected.value : null);
											// Set default duration for video or image
											if (selected) {
												const c = contentList.find(x => String(x.id) === String(selected.value));
												// For video, try to get duration from slides if available
												if (c && c.type === 'video') {
													// Always use top-level duration for video
													if (c.duration) setCurrentDuration(Math.round(c.duration));
													else setCurrentDuration(5);
												} else {
													setCurrentDuration(5);
												}
											} else {
												setCurrentDuration("");
											}
										}}
										placeholder="Select content..."
										classNamePrefix="react-select"
										styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
										noOptionsMessage={() => 'No content available'}
										isDisabled={!!addedContent.find(item => item.id === selectedContent)}
									/>
								</Form.Group>
							</div>
							<div className="col-md-3">
								<Form.Group className="mb-0">
									<Form.Label style={{ fontWeight: 'bold' }}>Duration (seconds)</Form.Label>
									<Form.Control
										type="number"
										min={1}
										max={(() => {
											if (!selectedContent) return 3600;
											const c = contentList.find(c => String(c.id) === String(selectedContent));
											if (c && c.type === 'video') {
												return c.duration ? Math.round(c.duration) : 3600;
											}
											return 3600;
										})()}
										value={currentDuration}
										onChange={e => {
											let val = e.target.value;
											// Allow empty string for controlled input
											if (val === "") {
												setCurrentDuration("");
												return;
											}
											val = parseInt(val, 10);
											if (isNaN(val) || val < 1) val = 1;
											let max = 3600;
											if (selectedContent) {
												const c = contentList.find(c => String(c.id) === String(selectedContent));
												if (c && c.type === 'video' && c.duration) {
													max = Math.round(c.duration);
												}
											}
											// Clamp immediately
											if (val > max) val = max;
											setCurrentDuration(val);
										}}
										disabled={!selectedContent || isReadOnly}
									/>
								</Form.Group>
							</div>
							<div className="col-md-2">
								<Button
									className="w-100"
									style={{ marginTop: 30 }}
									variant="primary"
									disabled={(() => {
										if (!selectedContent || !currentDuration) return true;
										const c = contentList.find(x => String(x.id) === String(selectedContent));
										if (c && c.type === 'video' && c.duration && Number(currentDuration) > Math.round(c.duration)) {
											return true;
										}
										return false;
									})() || isReadOnly}
									onClick={() => {
										const c = contentList.find(x => String(x.id) === String(selectedContent));
										if (!c) return;
										if (c.type === 'video' && c.duration && Number(currentDuration) > Math.round(c.duration)) {
											alert(`Duration for this video cannot exceed its length (${Math.round(c.duration)} seconds).`);
											setCurrentDuration(Math.round(c.duration));
											return;
										}
										setAddedContent(prev => [...prev, { id: c.id, title: c.title, type: c.type, duration: currentDuration }]);
										setSelectedContent(null);
										setCurrentDuration("");
									}}
								>
									Add
								</Button>
							</div>
						</div>
						{/* Table of added content/durations */}
						{addedContent.length > 0 && (
							<div className="mb-3">
								<Table bordered size="sm">
									<thead>
										<tr>
											<th>Content Name</th>
											<th>Type</th>
											<th>Duration (s)</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										{addedContent.map((item, idx) => (
											<tr key={item.id}>
												<td>
													<Button variant="link" style={{padding:0}} onClick={() => {
														const content = contentList.find(c => String(c.id) === String(item.id));
														setPreviewContent(content);
														setShowPreview(true);
													}}>{item.title}</Button>
												</td>
												<td>{item.type}</td>
												<td>{item.duration}</td>
												<td>
													<Button size="sm" variant="outline-danger" onClick={() => setAddedContent(addedContent.filter((_, i) => i !== idx))} disabled={isReadOnly}>Remove</Button>
												</td>
											</tr>
										))}
												{/* Preview Modal */}
												{showPreview && previewContent && (
													<div className="modal fade show" style={{display:'block', background:'rgba(0,0,0,0.5)'}} tabIndex="-1">
														<div className="modal-dialog" style={{maxWidth: 'none', width: 'fit-content', minWidth: 320, height: 'auto', margin: 'auto', display: 'block'}}>
															<div className="modal-content" style={{height: 'auto', minHeight: 'unset', padding: 0, margin: 0}}>
																<div className="modal-header" style={{paddingBottom: 0, borderBottom: 'none'}}>
																	<h5 className="modal-title">Preview: {previewContent.title}</h5>
																	<button type="button" className="btn-close" onClick={() => setShowPreview(false)}></button>
																</div>
																<div className="modal-body text-center p-2" style={{maxHeight: 'none', overflowY: 'visible', padding: 0, margin: 0}}>
																	{Array.isArray(previewContent.slides) && previewContent.slides.length > 0 ? (
																		<div className="d-flex flex-wrap gap-3 justify-content-center mb-3" style={{rowGap: 24}}>
																			{previewContent.slides.map((media, idx) => {
																				const videoSrc = media.data || media.fileUrl || media.thumbnail || (media.name ? `/assets/videos/${media.name}` : undefined);
																				const imgSrc = media.data || media.fileUrl || media.thumbnail || (media.name ? `/assets/images/${media.name}` : undefined);
																				return (
																					<div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, background: '#fff', minWidth: 220, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
																						{media.type === 'video' ? (
																							videoSrc ? (
																								<video src={videoSrc} controls preload="metadata" style={{ maxWidth: 180, maxHeight: 180 }} />
																							) : (
																								<div className="text-danger">No valid video source found.</div>
																							)
																						) : (
																							imgSrc ? (
																								<img src={imgSrc} alt={`slide-${idx}`} style={{ maxWidth: 180, maxHeight: 180 }} />
																							) : (
																								<div className="text-danger">No valid image source found.</div>
																							)
																						)}
																						<div className="text-center mt-2">{media.type === 'video' ? `Video ${idx + 1}` : `Image ${idx + 1}`}</div>
																					</div>
																				);
																			})}
																				</div>
																			) : (
																				<>
																					{previewContent.type === 'image' ? (
																						previewContent.data ? (
																							<img src={previewContent.data} alt={previewContent.title} style={{maxWidth:'100%', maxHeight:'60vh'}} />
																						) : (previewContent.fileUrl || previewContent.thumbnail) ? (
																							<img src={previewContent.fileUrl || previewContent.thumbnail} alt={previewContent.title} style={{maxWidth:'100%', maxHeight:'60vh'}} />
																						) : previewContent.name ? (
																							<img src={`/assets/images/${previewContent.name}`} alt={previewContent.title} style={{maxWidth:'100%', maxHeight:'60vh'}} />
																						) : (
																							<div className="text-danger">No fileUrl, thumbnail, name, or data found for this image.</div>
																						)
																					) : null}
																					{previewContent.type === 'video' ? (
																						(() => {
																							const videoSrc = previewContent.data || previewContent.fileUrl || previewContent.thumbnail || (previewContent.name ? `/assets/videos/${previewContent.name}` : undefined);
																							return videoSrc ? (
																								<video src={videoSrc} controls preload="metadata" style={{maxWidth:'100%', maxHeight:'60vh'}} />
																							) : (
																								<div className="text-danger">No fileUrl, thumbnail, name, or data found for this video.</div>
																							);
																						})()
																					) : null}
																					{(!['image','video'].includes(previewContent.type)) && (
																						<div>Preview not available for this content type.</div>
																					)}
																				</>
																			)}
																</div>
															</div>
														</div>
													</div>
												)}
									</tbody>
								</Table>
							</div>
						)}
							<div className="d-flex gap-2 align-items-center justify-content-between">
								{!isReadOnly ? (
									<Button
										variant={editingPlaylistId ? "success" : "primary"}
										type="button"
										onClick={async () => {
										// Validate endDate is not before today
										const nowDate = new Date().toISOString().split('T')[0];
										if (endDate && endDate < nowDate) {
											alert('End date cannot be before today.');
											return;
										}
										// Restrict endDate to max 1 year from startDate
										const maxEnd = new Date(startDate);
										maxEnd.setFullYear(maxEnd.getFullYear() + 1);
										if (endDate && new Date(endDate) > maxEnd) {
											alert('End date cannot be more than 1 year from start date.');
											return;
										}
										// If date range is 1st to 4th, only allow editing before the 4th
										let is1to4 = false;
										if (startDate && endDate) {
											const startDay = Number(startDate.split('-')[2]);
											const endDay = Number(endDate.split('-')[2]);
											is1to4 = (startDay === 1 && endDay === 4);
										}
										const today = new Date().toISOString().split('T')[0];
										if (is1to4 && today > endDate) {
											alert('Cannot create/edit playlist for 1st-4th after the 4th.');
											return;
										}

										// Ensure if trigger type is selected, interval is at least 5 and is multiple of 5
										if (playlistType === 'trigger') {
											if (!triggerSubType) {
												alert('Please select a trigger type.');
												return;
											}
										}
										if (playlistType === 'trigger' && triggerSubType === 'time') {
											let ti = Number(triggerInterval);
											if (isNaN(ti) || ti < 5) {
												alert('Trigger interval must be at least 5 minutes.');
												return;
											}
											// round to nearest multiple of 5
											ti = Math.floor(ti / 5) * 5;
											setTriggerInterval(ti);
											const tcheck = computeTriggerTimeValidity();
											if (!tcheck.valid) {
												alert(tcheck.message);
												return;
											}
										}

										// Build common playlist object data
										const type = playlistType === 'trigger' ? 'trigger' : 'regular';
										const triggerOptions = playlistType === 'trigger' ? (triggerSubType === 'time' ? { triggerInterval, triggerStartAt: `${parseInt(triggerStartHour,10)}:${triggerStartMinute} ${triggerStartAmPm}`, triggerStopAt: `${parseInt(triggerStopHour,10)}:${triggerStopMinute} ${triggerStopAmPm}`, triggerSubType } : { triggerSubType }) : {};

										if (editingPlaylistId) {
											const updatedPlaylist = {
												id: editingPlaylistId,
												playlistName,
												territoryType,
												selectedCountry,
												selectedState: selectedState || null,
												selectedCity: selectedCity || null,
												filteredStoreIds: filteredStoreIds.length ? [...filteredStoreIds] : null,
												storeIdInput: storeIdInput.length ? [...storeIdInput] : null,
												selectedContent: addedContent.length ? addedContent.map(item => item.id) : null,
												startDate,
												endDate,
												inactive: false,
												status: wasApproved ? 'pending' : 'pending',
												regionNomenclature: getRegionNomenclature({
													territoryType,
													selectedCountry,
													selectedState,
													selectedCity,
													filteredStoreIds,
													storeIdInput
												}),
												createdAt: Date.now(),
												type,
												...triggerOptions
											};
											// If this playlist was previously approved, we don't want to replace the approved entry.
											// Instead, create a new draft that references the original (draftOf) and mark the original as disabled/pending.
											const db = await getDB();
											const original = await db.get(PLAYLIST_STORE, editingPlaylistId);
											if (original && original.status === 'approved') {
												// Create draft as a new record with reference to the original
												const draft = { ...updatedPlaylist };
												delete draft.id; // ensure add creates a new id
												draft.status = 'pending';
												draft.draftOf = editingPlaylistId;
												const newDraftId = await savePlaylistToDB(draft);
												// Mark original as disabled/has pending draft
												await updatePlaylistInDB(editingPlaylistId, { disabledWhileEditing: true, pendingDraftId: newDraftId });
											} else {
												// If original wasn't approved (e.g. it was a pending draft), just update it
												await updatePlaylistInDB(editingPlaylistId, updatedPlaylist);
											}
										} else {
											const newPlaylist = {
												playlistName,
												territoryType,
												selectedCountry,
												selectedState: selectedState || null,
												selectedCity: selectedCity || null,
												filteredStoreIds: filteredStoreIds.length ? [...filteredStoreIds] : null,
												storeIdInput: storeIdInput.length ? [...storeIdInput] : null,
												selectedContent: addedContent.length ? addedContent.map(item => item.id) : null,
												startDate,
												endDate,
												inactive: false,
												status: 'pending',
												regionNomenclature: getRegionNomenclature({
													territoryType,
													selectedCountry,
													selectedState,
													selectedCity,
													filteredStoreIds,
													storeIdInput
												}),
												createdAt: Date.now(),
												type,
												...triggerOptions
											};
											await savePlaylistToDB(newPlaylist);
										}

										// Show success and reset
										setShowAddAlert(true);
										setEditingPlaylistId(null);
										setWasApproved(false);
										// Clear fields after save
										setPlaylistName("");
										setTerritoryType("country");
										setSelectedState([]);
										setSelectedCity([]);
										setFilteredStoreIds([]);
										setStoreIdInput([]);
										setSelectedContent(null);
										setStartDate(todayStr);
										setEndDate("");
										setAddedContent([]);
										setPlaylistType('regular');
										setTriggerInterval(5);
										setTimeout(() => setShowAddAlert(false), 1000);
									}}
									disabled={!playlistName.trim() || !addedContent.length || !startDate || !endDate || (playlistType === 'trigger' && !triggerSubType) || (playlistType === 'trigger' && triggerSubType === 'time' && (!triggerInterval || Number(triggerInterval) < 5 || !computeTriggerTimeValidity().valid))}
								>
									{editingPlaylistId ? 'Save Changes' : 'Create Playlist'}
								</Button>
							) : (
								(location && location.state && location.state.playlist && (location.state.playlist.status === undefined || location.state.playlist.status === 'pending')) ? (
									<div className="d-flex" style={{ gap: 8 }}>
										<Button size="sm" variant="success" onClick={async () => {
											const row = location.state.playlist;
											const now = new Date().toISOString();
											await updatePlaylistInDB(row.id, { status: 'approved', approvedAt: now });
											if (row.draftOf) {
												await updatePlaylistInDB(row.draftOf, { disabledWhileEditing: false, pendingDraftId: null, inactive: true, replacedBy: row.id });
											}
											navigate('/manage-playlists');
										}}>Approve</Button>
										<Button size="sm" variant="danger" onClick={async () => {
											const row = location.state.playlist;
											const now = new Date().toISOString();
											await updatePlaylistInDB(row.id, { status: 'rejected', rejectedAt: now });
											if (row.draftOf) {
												await updatePlaylistInDB(row.draftOf, { disabledWhileEditing: false, pendingDraftId: null });
											}
											navigate('/manage-playlists');
										}}>Reject</Button>
										<Button variant="secondary" onClick={() => navigate('/manage-playlists')}>Back</Button>
									</div>
								) : (
									<Button variant="secondary" onClick={() => {
										// Go back to Manage Playlists
										navigate('/manage-playlists');
									}}>Back</Button>
								)
							)}
								
							</div>
						</Form>
						{showAddAlert && (
							<Alert variant="success" className="mt-3">Playlist added!</Alert>
						)}
					</div>
		</div>
	);
}

function normalizeStoreId(id) {
	if (!id) return '';
	return String(id).trim().toUpperCase();
}

export default AssignContent;
