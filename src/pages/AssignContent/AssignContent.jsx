import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { Tabs, Tab, Button, Form, Alert, Table } from 'react-bootstrap';
import { storeList } from '../../data/storeList';

import { getAllContent, getDB } from '../../services/indexeddb';
// Playlists store helpers using shared ad-console-db

const PLAYLIST_STORE = 'playlists';

// Update playlist in DB by id
async function updatePlaylistInDB(id, updates) {
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

async function getAllPlaylistsFromDB() {
	const db = await getDB();
	if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return [];
	return await db.getAll(PLAYLIST_STORE);
}

function AssignContent() {
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
	const [activeTab, setActiveTab] = useState('create');
	const [playlistName, setPlaylistName] = useState('');
	const [territoryType, setTerritoryType] = useState('country');
	const [selectedCountry, setSelectedCountry] = useState('India');
	const [selectedState, setSelectedState] = useState('');
	const [selectedCity, setSelectedCity] = useState('');
	const [filteredStoreIds, setFilteredStoreIds] = useState([]);
	const [storeIdInput, setStoreIdInput] = useState([]);
	const [pendingRows, setPendingRows] = useState([]);
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
		return states.sort();
	}, []);

	const cityOptions = useMemo(() => {
		if (!selectedState) return [];
		const filtered = storeList.filter(s => s.state === selectedState);
		const cityAreaPairs = filtered.map(s => ({ city: s.city, area: s.area }));
		// Remove duplicates by city
		const unique = [];
		const seen = new Set();
		for (const pair of cityAreaPairs) {
			if (!seen.has(pair.city)) {
				unique.push(pair);
				seen.add(pair.city);
			}
		}
		return unique.sort((a, b) => a.city.localeCompare(b.city));
	}, [selectedState]);


	// For dropdown: filter by state/city
	const storeOptions = useMemo(() => {
		let filtered = storeList;
		if (selectedState) filtered = filtered.filter(s => s.state === selectedState);
		if (selectedCity) filtered = filtered.filter(s => s.city === selectedCity);
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
			<Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
				<Tab eventKey="create" title="Create Playlist">
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
							</Form.Group>

							{/* COUNTRY: No dropdowns or store ID input */}
							{territoryType === 'state' && (
								<Form.Group className="mb-3">
									<Form.Label style={{ fontWeight: 'bold' }}>Select State</Form.Label>
									<Select
										options={stateOptions.map(state => ({ value: state, label: state }))}
										value={selectedState ? { value: selectedState, label: selectedState } : null}
										onChange={selected => {
											setSelectedState(selected ? selected.value : '');
											setSelectedCity('');
											setFilteredStoreIds([]);
											setStoreIdInput([]);
										}}
										placeholder="Select state..."
										isClearable
										classNamePrefix="react-select"
										styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
									/>
								</Form.Group>
							)}

							{territoryType === 'city' && (
								<>
									<Form.Group className="mb-3">
										<Form.Label style={{ fontWeight: 'bold' }}>Select State</Form.Label>
										<Select
											options={stateOptions.map(state => ({ value: state, label: state }))}
											value={selectedState ? { value: selectedState, label: selectedState } : null}
											onChange={selected => {
												setSelectedState(selected ? selected.value : '');
												setSelectedCity('');
												setFilteredStoreIds([]);
												setStoreIdInput([]);
											}}
											placeholder="Select state..."
											isClearable
											classNamePrefix="react-select"
											styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
										/>
									</Form.Group>
									{selectedState && (
										<Form.Group className="mb-3">
											<Form.Label style={{ fontWeight: 'bold' }}>Select City</Form.Label>
											<Form.Select
												value={selectedCity}
												onChange={e => {
													setSelectedCity(e.target.value);
													setFilteredStoreIds([]);
												}}
											>
												<option value="">-- Select City --</option>
												{cityOptions.map(opt => (
													<option key={opt.city} value={opt.city}>{opt.area}</option>
												))}
											</Form.Select>
										</Form.Group>
									)}
								</>
							)}

							{territoryType === 'store' && (
								<>
									<Form.Group className="mb-3">
										<Form.Label style={{ fontWeight: 'bold' }}>Select State</Form.Label>
										<Select
											options={stateOptions.map(state => ({ value: state, label: state }))}
											value={selectedState ? { value: selectedState, label: selectedState } : null}
											onChange={selected => {
												setSelectedState(selected ? selected.value : '');
												setSelectedCity('');
												setFilteredStoreIds([]);
												setStoreIdInput([]);
											}}
											placeholder="Select state..."
											isClearable
											classNamePrefix="react-select"
											styles={{ menu: provided => ({ ...provided, zIndex: 20 }) }}
										/>
									</Form.Group>
									{selectedState && (
										<Form.Group className="mb-3">
											<Form.Label style={{ fontWeight: 'bold' }}>Select City</Form.Label>
											<Form.Select
												value={selectedCity}
												onChange={e => {
													setSelectedCity(e.target.value);
													setFilteredStoreIds([]);
												}}
											>
												<option value="">-- Select City --</option>
												{cityOptions.map(opt => (
													<option key={opt.city} value={opt.city}>{opt.area}</option>
												))}
											</Form.Select>
										</Form.Group>
									)}
									{selectedState && selectedCity && (
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
												if (c && c.type === 'video' && c.duration) setCurrentDuration(c.duration);
												else setCurrentDuration(5);
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
										max={selectedContent ? (contentList.find(c => String(c.id) === String(selectedContent))?.type === 'video' ? contentList.find(c => String(c.id) === String(selectedContent))?.duration || 3600 : 3600) : 3600}
										value={currentDuration}
										onChange={e => {
											let val = parseInt(e.target.value, 10);
											if (isNaN(val) || val < 1) val = 1;
											const max = selectedContent ? (contentList.find(c => String(c.id) === String(selectedContent))?.type === 'video' ? contentList.find(c => String(c.id) === String(selectedContent))?.duration || 3600 : 3600) : 3600;
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
									disabled={!selectedContent || !currentDuration}
									onClick={() => {
										const c = contentList.find(x => String(x.id) === String(selectedContent));
										if (!c) return;
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
								{editingPlaylistId ? (
									<Button
										variant="success"
										type="button"
										   onClick={async () => {
											   // Validate endDate is not before today
											   const nowDate = new Date().toISOString().split('T')[0];
											   if (endDate && endDate < nowDate) {
												   alert('End date cannot be before today.');
												   return;
											   }
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
												   status: 'pending',
											   };
											   // Restrict endDate to max 1 year from startDate
											   const maxEnd = new Date(startDate);
											   maxEnd.setFullYear(maxEnd.getFullYear() + 1);
											   // If date range is 1st to 4th, only allow editing before the 4th
											   let is1to4 = false;
											   if (startDate && endDate) {
												   const startDay = Number(startDate.split('-')[2]);
												   const endDay = Number(endDate.split('-')[2]);
												   is1to4 = (startDay === 1 && endDay === 4);
											   }
											   const today = new Date().toISOString().split('T')[0];
											   if (is1to4 && today > endDate) {
												   // Move to inactive
												   await updatePlaylistInDB(editingPlaylistId, { ...updatedPlaylist, inactive: true });
												   setInactiveRows(prev => [...prev, { ...updatedPlaylist, inactive: true }]);
												   setEditingPlaylistId(null);
												   setShowAddAlert(false);
												   setWasApproved(false);
												   return;
											   }
											   if (new Date(endDate) > maxEnd) {
												   // Move to inactive
												   await updatePlaylistInDB(editingPlaylistId, { ...updatedPlaylist, inactive: true });
												   setInactiveRows(prev => [...prev, { ...updatedPlaylist, inactive: true }]);
												   setEditingPlaylistId(null);
												   setShowAddAlert(false);
												   setWasApproved(false);
												   return;
											   }
											   // If editing an approved playlist, set status to pending
											   if (wasApproved) {
												   updatedPlaylist.status = 'pending';
											   }
											   await updatePlaylistInDB(editingPlaylistId, updatedPlaylist);
											   setShowAddAlert(true);
											   setEditingPlaylistId(null);
											   setWasApproved(false);
											   // Reload all lists from DB to ensure correct tab movement
											   const all = await getAllPlaylistsFromDB();
											   setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
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
										   }}
										disabled={!playlistName.trim() || !addedContent.length || !startDate || !endDate}
									>
										Save Changes
									</Button>
								) : (
									<Button
										variant="secondary"
										type="button"
										onClick={async () => {
											// Validate endDate is not before today
											const nowDate = new Date().toISOString().split('T')[0];
											if (endDate && endDate < nowDate) {
												alert('End date cannot be before today.');
												return;
											}
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
											};
											setPendingRows(prev => [...prev, newPlaylist]);
											setShowAddAlert(true);
											// Clear fields after add
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
										}}
										disabled={!playlistName.trim() || !addedContent.length || !startDate || !endDate}
									>
										Add
									</Button>
								)}
								<Button variant="primary" type="button" disabled={pendingRows.length === 0}
									onClick={async e => {
										e.preventDefault();
										// Save all pendingRows to DB
										for (const row of pendingRows) {
											await savePlaylistToDB(row);
										}
										setPendingRows([]);
										// Reload from DB
										const all = await getAllPlaylistsFromDB();
										setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
										setInactiveRows(all.filter(r => r.inactive));
										setApprovedRows(all.filter(r => r.status === 'approved'));
										setRejectedRows(all.filter(r => r.status === 'rejected'));
										setActiveTab('list');
									}}
								>
									Create Playlist
								</Button>
							</div>
						</Form>
						{/* Table of added rows (active only) */}
						{showAddAlert && (
							<Alert variant="success" className="mt-3">Playlist added to table!</Alert>
						)}
						{pendingRows.length > 0 && (
							<div className="mt-4">
								<h5>Playlists to be Created</h5>
								<div style={{ overflowX: 'auto' }}>
									<table className="table table-bordered table-sm align-middle">
										<thead>
											<tr>
												<th>Playlist Name</th>
												<th>Territory</th>
												<th>State</th>
												<th>City</th>
												<th>Stores</th>
												<th>Content</th>
												<th>Start Date</th>
												<th>End Date</th>
												<th>Action</th>
											</tr>
										</thead>
										<tbody>
											{pendingRows.map((row, idx) => (
												<tr key={idx}>
													<td>{row.playlistName}</td>
													<td>{row.territoryType}</td>
													<td>{row.selectedState || '-'}</td>
													<td>{row.selectedCity || '-'}</td>
													<td>
														{row.filteredStoreIds && row.filteredStoreIds.length > 0 && (
															<>
																<div><b>Filtered:</b> {row.filteredStoreIds.join(', ')}</div>
															</>
														)}
														{row.storeIdInput && row.storeIdInput.length > 0 && (
															<>
																<div><b>IDs:</b> {row.storeIdInput.join(', ')}</div>
															</>
														)}
														{(!row.filteredStoreIds || row.filteredStoreIds.length === 0) && (!row.storeIdInput || row.storeIdInput.length === 0) && '-'}
													</td>
													<td>{row.selectedContent
														? row.selectedContent.map(cid => {
															const c = contentList.find(mc => String(mc.id) === String(cid));
															return c ? c.title : cid;
														}).join(', ')
														: '-'}</td>
													<td>{row.startDate || '-'}</td>
													<td>{row.endDate || '-'}</td>
													<td>
														<Button size="sm" variant="outline-danger" onClick={() => {
															setPendingRows(pendingRows.filter((_, i) => i !== idx));
														}}>Remove</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				</Tab>
				<Tab eventKey="list" title="List of Playlists">
					<div className="p-3">
						   <div className="mb-2">
							   <input
								   type="text"
								   className="form-control"
								   placeholder="Search by name, region, or store..."
								   value={searchList}
								   onChange={e => setSearchList(e.target.value)}
								   style={{ maxWidth: 320, display: 'inline-block' }}
							   />
						   </div>
						   {addedRows.filter(row => {
							   const q = searchList.toLowerCase();
							   if (!q) return true;
							   return (
								   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
								   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
								   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
								   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
								   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
								   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
							   );
						   }).length > 0 ? (
							   <div style={{ overflowX: 'auto' }}>
								   <table className="table table-bordered table-sm align-middle">
									<thead>
										<tr>
											<th>Playlist ID</th>
											<th>Playlist Name</th>
											<th>Region/Territory</th>
											<th>Content Count</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										   {addedRows
											   .filter(row => {
												   const q = searchList.toLowerCase();
												   if (!q) return true;
												   return (
													   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
													   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
													   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
													   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
													   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
													   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
												   );
											   })
											   .map((row, idx) => (
											<tr key={row.id || idx}>
												<td>{idx + 1}</td>
												<td>{row.playlistName}</td>
												<td>
													{row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1)}
													{row.selectedState ? ` / ${row.selectedState}` : ''}
													{row.selectedCity ? ` / ${row.selectedCity}` : ''}
												</td>
												<td>{row.selectedContent ? row.selectedContent.length : 0}</td>
												<td>
													   {(!row.status || row.status === 'pending') ? (
														   <>
															   <Button size="sm" variant="primary" className="me-2" onClick={async () => {
																   // Only allow edit for pending playlists if today is before endDate, endDate is within 1 year from startDate, and (if 1st-4th) only before the 4th
																   const today = new Date().toISOString().split('T')[0];
																   const start = row.startDate;
																   const end = row.endDate;
																   let canEdit = true;
																   if (!start || !end) canEdit = false;
																   else {
																	   // Check today <= endDate
																	   if (today > end) canEdit = false;
																	   // Check endDate <= startDate + 1 year
																	   const maxEnd = new Date(start);
																	   maxEnd.setFullYear(maxEnd.getFullYear() + 1);
																	   if (new Date(end) > maxEnd) canEdit = false;
																	   // If date range is 1st to 4th, only allow editing before the 4th
																	   const startDay = Number(start.split('-')[2]);
																	   const endDay = Number(end.split('-')[2]);
																	   if (startDay === 1 && endDay === 4 && today > end) canEdit = false;
																   }
																   if (!canEdit) {
																	   // Move to inactive
																	   await updatePlaylistInDB(row.id, { ...row, inactive: true });
																	   setAddedRows(prev => prev.filter(r => (r.id || r) !== (row.id || row)));
																	   setInactiveRows(prev => [...prev, { ...row, inactive: true }]);
																	   return;
																   }
																   // Set form fields for editing
																   setActiveTab('create');
																   setPlaylistName(row.playlistName);
																   setTerritoryType(row.territoryType);
																   setSelectedCountry(row.selectedCountry || 'India');
																   setSelectedState(row.selectedState || '');
																   setSelectedCity(row.selectedCity || '');
																   setFilteredStoreIds(row.filteredStoreIds ? [...row.filteredStoreIds] : []);
																   setStoreIdInput(row.storeIdInput ? [...row.storeIdInput] : []);
																   setAddedContent(row.selectedContent ? row.selectedContent.map(id => {
																	   const c = contentList.find(mc => String(mc.id) === String(id));
																	   return c ? { id: c.id, title: c.title, type: c.type, duration: 5 } : { id, title: id, type: 'unknown', duration: 5 };
																   }) : []);
																   setStartDate(row.startDate || '');
																   setEndDate(row.endDate || '');
																   setEditingPlaylistId(row.id);
															   }}>Edit</Button>
															   <Button size="sm" variant="success" className="ms-2" onClick={async () => {
																   await updatePlaylistInDB(row.id, { status: 'approved' });
																   // Reload all lists from DB to ensure correct tab movement
																   const all = await getAllPlaylistsFromDB();
																   setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
																   setInactiveRows(all.filter(r => r.inactive));
																   setApprovedRows(all.filter(r => r.status === 'approved'));
																   setRejectedRows(all.filter(r => r.status === 'rejected'));
															   }}>Approve</Button>
															   <Button size="sm" variant="danger" className="ms-2" onClick={async () => {
																   await updatePlaylistInDB(row.id, { status: 'rejected' });
																   // Reload all lists from DB to ensure correct tab movement
																   const all = await getAllPlaylistsFromDB();
																   setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
																   setInactiveRows(all.filter(r => r.inactive));
																   setApprovedRows(all.filter(r => r.status === 'approved'));
																   setRejectedRows(all.filter(r => r.status === 'rejected'));
															   }}>Reject</Button>
														   </>
													   ) : (
														   <Button size="sm" variant="outline-secondary" disabled>Edit</Button>
													   )}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<Alert variant="secondary">No playlists created yet.</Alert>
						)}
					</div>
				</Tab>
				   <Tab eventKey="approved" title="Approved">
					   <div className="p-3">
						   <div className="mb-2">
							   <input
								   type="text"
								   className="form-control"
								   placeholder="Search by name, region, or store..."
								   value={searchApproved}
								   onChange={e => setSearchApproved(e.target.value)}
								   style={{ maxWidth: 320, display: 'inline-block' }}
							   />
						   </div>
						   {approvedRows.filter(row => {
							   const q = searchApproved.toLowerCase();
							   if (!q) return true;
							   return (
								   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
								   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
								   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
								   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
								   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
								   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
							   );
						   }).length > 0 ? (
							   <div style={{ overflowX: 'auto' }}>
								   <table className="table table-bordered table-sm align-middle">
									   <thead>
										   <tr>
											   <th>Playlist ID</th>
											   <th>Playlist Name</th>
											   <th>Region/Territory</th>
											   <th>Content Count</th>
											   <th>Action</th>
										   </tr>
									   </thead>
									   <tbody>
										   {approvedRows
											   .filter(row => !row.inactive)
											   .filter(row => {
												   const q = searchApproved.toLowerCase();
												   if (!q) return true;
												   return (
													   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
													   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
													   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
													   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
													   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
													   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
												   );
											   })
											   .map((row, idx) => (
											   <tr key={row.id || idx} style={row.inactive ? { opacity: 0.6, background: '#f8d7da' } : {}}>
												   <td>{idx + 1}</td>
												   <td>{row.playlistName}</td>
												   <td>
													   {row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1)}
													   {row.selectedState ? ` / ${row.selectedState}` : ''}
													   {row.selectedCity ? ` / ${row.selectedCity}` : ''}
												   </td>
												   <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
												   <td>
													   {row.inactive ? (
														   <span className="badge bg-danger">Disabled</span>
													   ) : (
														   <>
															   <Button size="sm" variant="primary" className="me-2" onClick={async () => {
																   setActiveTab('create');
																   setPlaylistName(row.playlistName);
																   setTerritoryType(row.territoryType);
																   setSelectedCountry(row.selectedCountry || 'India');
																   setSelectedState(row.selectedState || '');
																   setSelectedCity(row.selectedCity || '');
																   setFilteredStoreIds(row.filteredStoreIds ? [...row.filteredStoreIds] : []);
																   setStoreIdInput(row.storeIdInput ? [...row.storeIdInput] : []);
																   setAddedContent(row.selectedContent ? row.selectedContent.map(id => {
																	   const c = contentList.find(mc => String(mc.id) === String(id));
																	   return c ? { id: c.id, title: c.title, type: c.type, duration: 5 } : { id, title: id, type: 'unknown', duration: 5 };
																   }) : []);
																   setStartDate(row.startDate || '');
																   setEndDate(row.endDate || '');
																   setEditingPlaylistId(row.id);
																   setWasApproved(true);
															   }}>Edit</Button>
															   <Button size="sm" variant="danger" className="ms-2" onClick={() => {
																   setDisableTargetId(row.id);
																   setShowDisableModal(true);
															   }}>Disable</Button>
															{/* Disable Confirmation Modal */}
															{showDisableModal && (
																<div className="modal fade show" style={{display:'block', background:'rgba(0,0,0,0.5)'}} tabIndex="-1">
																	<div className="modal-dialog" style={{maxWidth: 400, margin: 'auto'}}>
																		<div className="modal-content">
																			<div className="modal-header">
																				<h5 className="modal-title text-danger">Disable Playlist</h5>
																				<button type="button" className="btn-close" onClick={() => setShowDisableModal(false)}></button>
																			</div>
																			<div className="modal-body">
																				<p>Are you sure you want to <b>disable</b> this playlist? This action cannot be undone and the playlist will be moved to Inactive Playlists.</p>
																			</div>
																			<div className="modal-footer">
																				<Button variant="secondary" onClick={() => setShowDisableModal(false)}>Cancel</Button>
																				<Button variant="danger" onClick={async () => {
																					await updatePlaylistInDB(disableTargetId, { inactive: true });
																					// Move to inactive: reload all lists
																					const all = await getAllPlaylistsFromDB();
																					setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
																					setInactiveRows(all.filter(r => r.inactive));
																					setApprovedRows(all.filter(r => r.status === 'approved'));
																					setRejectedRows(all.filter(r => r.status === 'rejected'));
																					setShowDisableModal(false);
																					setDisableTargetId(null);
																				}}>Disable</Button>
																			</div>
																		</div>
																	</div>
																</div>
															)}
														   </>
													   )}
												   </td>
											   </tr>
										   ))}
									   </tbody>
								   </table>
							   </div>
						   ) : (
							   <Alert variant="secondary">No approved playlists.</Alert>
						   )}
					   </div>
				   </Tab>
				<Tab eventKey="rejected" title="Rejected">
					<div className="p-3">
						{rejectedRows.length > 0 ? (
							<div style={{ overflowX: 'auto' }}>
								<div className="mb-2" style={{ maxWidth: 320 }}>
											   <input
												   type="text"
												   className="form-control"
												   placeholder="Search by name, region, or store..."
												   value={searchRejected}
												   onChange={e => setSearchRejected(e.target.value)}
											   />
										   </div>

								<table className="table table-bordered table-sm align-middle">
									<thead>
										<tr>
											<th>Playlist ID</th>
											<th>Playlist Name</th>
											<th>Region/Territory</th>
											<th>Content Count</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										   {rejectedRows
											   .filter(row => {
												   const q = searchRejected.toLowerCase();
												   if (!q) return true;
												   return (
													   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
													   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
													   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
													   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
													   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
													   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
												   );
											   })
											   .map((row, idx) => (
											   <tr key={row.id || idx}>
												   <td>{idx + 1}</td>
												   <td>{row.playlistName}</td>
												   <td>
													   {row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1)}
													   {row.selectedState ? ` / ${row.selectedState}` : ''}
													   {row.selectedCity ? ` / ${row.selectedCity}` : ''}
												   </td>
												   <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
												   <td>
													   <Button size="sm" variant="outline-primary" onClick={() => {
														   setActiveTab('create');
														   setPlaylistName("");
														   setTerritoryType(row.territoryType);
														   setSelectedCountry(row.selectedCountry || 'India');
														   setSelectedState(row.selectedState || '');
														   setSelectedCity(row.selectedCity || '');
														   setFilteredStoreIds(row.filteredStoreIds ? [...row.filteredStoreIds] : []);
														   setStoreIdInput(row.storeIdInput ? [...row.storeIdInput] : []);
														   setAddedContent(row.selectedContent ? row.selectedContent.map(id => {
															   const c = contentList.find(mc => String(mc.id) === String(id));
															   return c ? { id: c.id, title: c.title, type: c.type, duration: 5 } : { id, title: id, type: 'unknown', duration: 5 };
														   }) : []);
														   setStartDate(todayStr);
														   setEndDate("");
														   setEditingPlaylistId(null);
														   setWasApproved(false);
													   }}>Clone</Button>
												   </td>
											   </tr>
										   ))}
									</tbody>
								</table>
							</div>
						) : (
							<Alert variant="secondary">No rejected playlists.</Alert>
						)}
					</div>
				</Tab>
				<Tab eventKey="inactive" title="Inactive Playlists">
					<div className="p-3">
						   <div className="mb-2">
							   <input
								   type="text"
								   className="form-control"
								   placeholder="Search by name, region, or store..."
								   value={searchInactive}
								   onChange={e => setSearchInactive(e.target.value)}
								   style={{ maxWidth: 320, display: 'inline-block' }}
							   />
						   </div>
						   {inactiveRows.filter(row => {
							   const q = searchInactive.toLowerCase();
							   if (!q) return true;
							   return (
								   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
								   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
								   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
								   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
								   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
								   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
							   );
						   }).length > 0 ? (
							   <div>
								   <div style={{ overflowX: 'auto' }}>
									   <table className="table table-bordered table-sm align-middle">
										<thead>
											<tr>
												<th>Playlist Name</th>
												<th>Territory</th>
												<th>State</th>
												<th>City</th>
												<th>Stores</th>
												<th>Content</th>
												<th>Start Date</th>
												<th>End Date</th>
												<th>Action</th>
											</tr>
										</thead>
										<tbody>
											   {inactiveRows
												   .filter(row => {
													   const q = searchInactive.toLowerCase();
													   if (!q) return true;
													   return (
														   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
														   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
														   (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
														   (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
														   (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
														   (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
													   );
												   })
												   .map((row, idx) => (
												<tr key={idx}>
													<td>{row.playlistName}</td>
													<td>{row.territoryType}</td>
													<td>{row.selectedState || '-'}</td>
													<td>{row.selectedCity || '-'}</td>
													<td>
														{row.filteredStoreIds && row.filteredStoreIds.length > 0 && (
															<>
																<div><b>Filtered:</b> {row.filteredStoreIds.join(', ')}</div>
															</>
														)}
														{row.storeIdInput && row.storeIdInput.length > 0 && (
															<>
																<div><b>IDs:</b> {row.storeIdInput.join(', ')}</div>
															</>
														)}
														{(!row.filteredStoreIds || row.filteredStoreIds.length === 0) && (!row.storeIdInput || row.storeIdInput.length === 0) && '-'}
													</td>
													<td>{row.selectedContent
														? row.selectedContent.map(cid => {
															const c = contentList.find(mc => String(mc.id) === String(cid));
															return c ? c.title : cid;
														}).join(', ')
														: '-'}</td>
													<td>{row.startDate || '-'}</td>
													<td>{row.endDate || '-'}</td>
													<td>
														<Button size="sm" variant="outline-primary" onClick={() => {
															setActiveTab('create');
															setPlaylistName(row.playlistName);
															setTerritoryType(row.territoryType);
															setSelectedCountry(row.selectedCountry || 'India');
															setSelectedState(row.selectedState || '');
															setSelectedCity(row.selectedCity || '');
															setFilteredStoreIds(row.filteredStoreIds ? [...row.filteredStoreIds] : []);
															setStoreIdInput(row.storeIdInput ? [...row.storeIdInput] : []);
															setAddedContent(row.selectedContent ? row.selectedContent.map(id => {
																const c = contentList.find(mc => String(mc.id) === String(id));
																return c ? { id: c.id, title: c.title, type: c.type, duration: 5 } : { id, title: id, type: 'unknown', duration: 5 };
															}) : []);
															setStartDate(row.startDate || '');
															setEndDate(row.endDate || '');
														}}>Clone</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<Alert variant="secondary">No inactive playlists.</Alert>
						)}
					</div>
				</Tab>
			</Tabs>
		</div>
	);
}

export default AssignContent;
