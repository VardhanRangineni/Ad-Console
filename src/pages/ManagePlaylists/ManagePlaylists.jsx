import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
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
            <Tabs
                id="playlist-tabs"
                activeKey={activeTab}
                onSelect={setActiveTab}
                className="mb-3"
            >
                <Tab eventKey="list" title="Created Playlists">
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
                                                       {row.regionNomenclature || (
                                                           row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1)
                                                       )}
                                                   </td>
                                                <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
                                                <td>
                                                       {(!row.status || row.status === 'pending') ? (
                                                           <>
                                                               <Button size="sm" variant="primary" className="me-2" onClick={() => {
                                                                   navigate('/assign', { state: { playlist: row, action: 'edit' } });
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
                                                       {row.regionNomenclature || (
                                                           row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1)
                                                       )}
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
                                                       {row.regionNomenclature || (
                                                           row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1)
                                                       )}
                                                   </td>
                                                   <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
                                                   <td>
                                                       <Button size="sm" variant="outline-primary" onClick={() => {
                                                           navigate('/assign', { state: { playlist: row, action: 'clone' } });
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
                                                    <td>{row.regionNomenclature || (row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1))}</td>
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
                                                            navigate('/assign', { state: { playlist: row, action: 'clone' } });
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
