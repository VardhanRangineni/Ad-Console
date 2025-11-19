import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { Tabs, Tab, Button, Form, Alert, Table } from 'react-bootstrap';
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
	await db.add(PLAYLIST_STORE, playlist);
}

export async function getAllPlaylistsFromDB() {
	const db = await getDB();
	if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return [];
	return await db.getAll(PLAYLIST_STORE);
}

function AssignContent() {
	const location = useLocation();
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
		const getStoreCode = (storeId) => {
			// Use as is
			return storeId;
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
	// State for search bars
	const [searchList, setSearchList] = useState("");
	const [searchApproved, setSearchApproved] = useState("");
	const [searchRejected, setSearchRejected] = useState("");
	const [searchInactive, setSearchInactive] = useState("");
	// State for disable confirmation modal
	const [showDisableModal, setShowDisableModal] = useState(false);
	const [disableTargetId, setDisableTargetId] = useState(null);
					// Track which video indices are open in the preview modal
				const [previewContent, setPreviewContent] = useState(null);
				const [showPreview, setShowPreview] = useState(false);
			// Load playlists from IndexedDB on mount
			React.useEffect(() => {
				async function loadPlaylists() {
					const all = await getAllPlaylistsFromDB();
					setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
					setInactiveRows(all.filter(r => r.inactive));
					setApprovedRows(all.filter(r => r.status === 'approved'));
					setRejectedRows(all.filter(r => r.status === 'rejected'));
				}
				loadPlaylists();
			}, []);
		const [contentList, setContentList] = useState([]);
		const [editingPlaylistId, setEditingPlaylistId] = useState(null);
		const [wasApproved, setWasApproved] = useState(false);
	// All hooks and state at the top
	const [activeTab, setActiveTab] = useState('list');
	const [playlistName, setPlaylistName] = useState('');
	const [territoryType, setTerritoryType] = useState('country');
	const [selectedCountry, setSelectedCountry] = useState('India');
	const countryOptions = useMemo(() => [{ value: 'India', label: 'India' }], []);
	const [selectedState, setSelectedState] = useState([]); // array of state values
	const [selectedCity, setSelectedCity] = useState([]); // array of city values
	const [filteredStoreIds, setFilteredStoreIds] = useState([]);
	const [storeIdInput, setStoreIdInput] = useState([]);

	const [addedRows, setAddedRows] = useState([]);
	const [inactiveRows, setInactiveRows] = useState([]);
	const [approvedRows, setApprovedRows] = useState([]);
	const [rejectedRows, setRejectedRows] = useState([]);
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
			setActiveTab('create');
			setPlaylistName(location.state.action === 'clone' ? '' : row.playlistName || '');
			setTerritoryType(row.territoryType || 'country');
			setSelectedCountry(row.selectedCountry || 'India');
			setSelectedState(row.selectedState || '');
			setSelectedCity(row.selectedCity || '');
			setFilteredStoreIds(row.filteredStoreIds ? [...row.filteredStoreIds] : []);
			setStoreIdInput(row.storeIdInput ? [...row.storeIdInput] : []);
			setAddedContent(row.selectedContent ? row.selectedContent.map(id => ({ id, title: id, type: 'unknown', duration: 5 })) : []);
			setStartDate(row.startDate || todayStr);
			setEndDate(row.endDate || '');
			// Optionally set editingPlaylistId, setWasApproved, etc. if needed
		}
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

	// Async load options for all stores (store IDs)
	const loadAllStoreOptions = (inputValue, callback) => {
		let filtered = allStoreOptions;
		if (inputValue) {
			const lower = inputValue.toLowerCase();
			filtered = filtered.filter(s =>
				s.name.toLowerCase().includes(lower) ||
				s.id.toLowerCase().includes(lower)
			);
		}
		callback(filtered.slice(0, 100).map(store => ({ value: store.id, label: `${store.name} (${store.id})` })));
	};

	const handleTerritoryChange = (e) => {
		const value = e.target.value;
		setTerritoryType(value);
		// Reset selections when changing territory
		setSelectedState('');
		setSelectedCity('');
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
									/>
									<Form.Check
										type="radio"
										inline
										id="territory-state"
										label={<label htmlFor="territory-state" style={{ cursor: 'pointer', marginBottom: 0 }}>State</label>}
										value="state"
										checked={territoryType === 'state'}
										onChange={handleTerritoryChange}
									/>
									<Form.Check
										type="radio"
										inline
										id="territory-city"
										label={<label htmlFor="territory-city" style={{ cursor: 'pointer', marginBottom: 0 }}>City</label>}
										value="city"
										checked={territoryType === 'city'}
										onChange={handleTerritoryChange}
									/>
									<Form.Check
										type="radio"
										inline
										id="territory-store"
										label={<label htmlFor="territory-store" style={{ cursor: 'pointer', marginBottom: 0 }}>Store</label>}
										value="store"
										checked={territoryType === 'store'}
										onChange={handleTerritoryChange}
									/>
								</div>
								<div className="mt-2" style={{ maxWidth: 300 }}>
									<Form.Label style={{ fontWeight: 'bold' }}>Select Country</Form.Label>
									<Select
										options={countryOptions}
										value={countryOptions.find(opt => opt.value === selectedCountry) || countryOptions[0]}
										onChange={selected => setSelectedCountry(selected ? selected.value : 'India')}
										isClearable={false}
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
											/>
										</Form.Group>
									)}
								</>
							)}

							{territoryType === 'store' && (
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
											/>
										</Form.Group>
									)}
									{selectedState.length > 0 && selectedCity.length > 0 && (
										<>
											<Form.Group className="mb-3" style={{ position: 'relative' }}>
												<Form.Label style={{ fontWeight: 'bold' }}>Select Stores (filtered)</Form.Label>
												<AsyncSelect
													isMulti
													cacheOptions
													defaultOptions={storeOptions.slice(0, 100).map(store => ({ value: store.id, label: `${store.name} (${store.id})` }))}
													loadOptions={loadFilteredStoreOptions}
													value={storeOptions.filter(opt => filteredStoreIds.includes(opt.id)).map(store => ({ value: store.id, label: `${store.name} (${store.id})` }))}
													onChange={selected => {
														const ids = selected ? selected.map(opt => opt.value) : [];
														setFilteredStoreIds(ids);
													}}
													placeholder="Select stores..."
													classNamePrefix="react-select"
													menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
													styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}
												/>
											</Form.Group>
											<Form.Group className="mb-3" style={{ position: 'relative' }}>
												<Form.Label style={{ fontWeight: 'bold' }}>Store IDs (comma separated)</Form.Label>
												<AsyncSelect
													isMulti
													cacheOptions
													defaultOptions={allStoreOptions.slice(0, 100).map(store => ({ value: store.id, label: `${store.name} (${store.id})` }))}
													loadOptions={loadAllStoreOptions}
													value={storeIdInput.map(id => {
														const store = allStoreOptions.find(s => s.id === id);
														return store ? { value: store.id, label: `${store.name} (${store.id})` } : { value: id, label: id };
													})}
													onChange={selected => {
														const ids = selected ? selected.map(opt => opt.value) : [];
														setStoreIdInput(ids);
													}}
													placeholder="Search or enter store IDs..."
													classNamePrefix="react-select"
													menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
													styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}
												/>
												<Form.Text className="text-muted">e.g. INWBQA00001, INWBQA00002</Form.Text>
											</Form.Group>
										</>
									)}
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
										min={new Date().toISOString().split("T")[0]}
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
										min={startDate || new Date().toISOString().split("T")[0]}
										max={startDate ? new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1) - 1).toISOString().split("T")[0] : ""}
										disabled={!startDate}
									/>
								</Form.Group>
							</div>
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
					// removed unused variable videoDuration
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
										disabled={!selectedContent}
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
									})()}
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
													<Button size="sm" variant="outline-danger" onClick={() => setAddedContent(addedContent.filter((_, i) => i !== idx))}>Remove</Button>
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
							<div className="d-flex gap-2">
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
										if (editingPlaylistId) {
											let updatedPlaylist = {
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
												createdAt: Date.now()
											};
											await updatePlaylistInDB(editingPlaylistId, updatedPlaylist);
										} else {
											let newPlaylist = {
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
												createdAt: Date.now()
											};
											await savePlaylistToDB(newPlaylist);
										}
										setShowAddAlert(true);
										setEditingPlaylistId(null);
										setWasApproved(false);
										// Reload all lists from DB to ensure correct tab movement
										const all = await getAllPlaylistsFromDB();
										setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
										setInactiveRows(all.filter(r => r.inactive));
										setApprovedRows(all.filter(r => r.status === 'approved'));
										setRejectedRows(all.filter(r => r.status === 'rejected'));
										// Clear fields after save
										setPlaylistName("");
										setTerritoryType("country");
										setSelectedState("");
										setSelectedCity("");
										setFilteredStoreIds([]);
										setStoreIdInput([]);
										setSelectedContent(null);
										setStartDate(todayStr);
										setEndDate("");
										setAddedContent([]);
										setTimeout(() => setShowAddAlert(false), 1000);
										setActiveTab('list');
									}}
									disabled={!playlistName.trim() || !addedContent.length || !startDate || !endDate}
								>
									{editingPlaylistId ? 'Save Changes' : 'Create Playlist'}
								</Button>
							</div>
						</Form>
						{showAddAlert && (
							<Alert variant="success" className="mt-3">Playlist added!</Alert>
						)}
					</div>
		</div>
	);
}

export default AssignContent;
