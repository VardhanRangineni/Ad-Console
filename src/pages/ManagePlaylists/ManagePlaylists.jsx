import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab, Button, Alert } from 'react-bootstrap';

import { getAllContent, getDB } from '../../services/indexeddb';
import { storeList } from '../../data/storeList';
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

export async function getAllPlaylistsFromDB() {
    const db = await getDB();
    if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return [];
    return await db.getAll(PLAYLIST_STORE);
}

function AssignContent() {
    const navigate = useNavigate();
    // State for search bars
    const [searchList, setSearchList] = useState("");
    const [searchApproved, setSearchApproved] = useState("");
    const [searchRejected, setSearchRejected] = useState("");
    const [searchInactive, setSearchInactive] = useState("");
        // Check for expiring param in URL; allow passing days via expiringDays param
            const [expiringOnly, setExpiringOnly] = useState(false);
            const [expiringDays, setExpiringDays] = useState(5);
            const [expiringDate, setExpiringDate] = useState(null);
            const location = useLocation();
            React.useEffect(() => {
                const params = new URLSearchParams(location.search);
                // Honor explicit `tab` query param first so callers can set the active tab
                const tabParam = params.get('tab');
                if (tabParam) {
                    const allowed = new Set(['list', 'approved', 'rejected', 'inactive']);
                    if (allowed.has(tabParam)) setActiveTab(tabParam);
                }
                // If expiringDate is present, prefer it over expiringDays in filters
                const expiringDateParam = params.get('expiringDate');
                if (expiringDateParam) {
                    // accept YYYY-MM-DD or ISO date
                    const parsed = new Date(expiringDateParam);
                    if (!isNaN(parsed.getTime())) {
                        setExpiringOnly(true);
                        setExpiringDays(0); // not used when expiringDate is present
                        setExpiringDate(expiringDateParam);
                        if (!tabParam) setActiveTab('approved');
                    }
                } else {
                    setExpiringDate(null);
                }
                // tabParam already handled above
                if (params.get('expiring') === '1') {
                    setExpiringOnly(true);
                    // If no explicit tab param, prefer the approved tab when showing expiring
                    if (!tabParam) setActiveTab('approved');
                } else {
                    setExpiringOnly(false);
                }
                const days = parseInt(params.get('expiringDays'), 10);
                if (!expiringDateParam && !isNaN(days) && days > 0) setExpiringDays(days);
                const filter = params.get('filter');
                if (filter === 'videoOnly' || filter === 'imageOnly') {
                    setContentFilter(filter);
                    if (!tabParam) setActiveTab('approved');
                } else {
                    setContentFilter(null);
                }
            }, [location.search]);
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
    // All hooks and state at the top
    const [activeTab, setActiveTab] = useState('list');
    const [contentFilter, setContentFilter] = useState(null); // 'videoOnly' | 'imageOnly' or null

    const [addedRows, setAddedRows] = useState([]);
    const [inactiveRows, setInactiveRows] = useState([]);
    const [approvedRows, setApprovedRows] = useState([]);
    const [rejectedRows, setRejectedRows] = useState([]);
    // Load content from IndexedDB on mount
    React.useEffect(() => {
        async function loadContent() {
            const all = await getAllContent();
            setContentList(all.filter(c => c.active !== false));
        }
        loadContent();
    }, []);

    // Normalize store id for comparisons
    function normalizeStoreId(id) {
        if (!id) return '';
        return String(id).trim().toUpperCase();
    }

    // Helper: is playlist expiring in `expiringDays` days
    function isExpiring(row) {
        if (!row.endDate) return false;
        const today = new Date();
        const expiryFromNow = new Date(today);
        expiryFromNow.setDate(today.getDate() + (expiringDays || 5));
        const end = new Date(row.endDate);
        return end >= today && end <= expiryFromNow;
    }

    function getTerritoryDisplay(row) {
        if (!row) return '-';
        const type = (row.territoryType || '').toLowerCase();
        if (type === 'country') return row.selectedCountry || 'India';
        if (type === 'state') {
            if (Array.isArray(row.selectedState) && row.selectedState.length) return row.selectedState.join(', ');
            if (typeof row.selectedState === 'string' && row.selectedState) return row.selectedState;
            return '-';
        }
        if (type === 'city') {
            if (Array.isArray(row.selectedCity) && row.selectedCity.length) return row.selectedCity.join(', ');
            if (typeof row.selectedCity === 'string' && row.selectedCity) return row.selectedCity;
            return '-';
        }
        if (type === 'store') {
            const names = [];
            const addFromIds = (ids) => {
                if (!ids) return;
                if (!Array.isArray(ids)) ids = [ids];
                ids.forEach(id => {
                    const norm = normalizeStoreId(id);
                    const s = storeList.find(st => normalizeStoreId(st.id) === norm);
                    if (s) names.push(`${s.name} (${s.id})`);
                    else names.push(id);
                });
            };
            // Prefer filteredStoreIds if present, otherwise storeIdInput
            if (row.filteredStoreIds && row.filteredStoreIds.length) addFromIds(row.filteredStoreIds);
            if (names.length === 0 && row.storeIdInput && row.storeIdInput.length) addFromIds(row.storeIdInput);
            if (names.length > 0) return names.join(', ');
            if (row.regionNomenclature) return row.regionNomenclature;
            return '-';
        }
        // Fallback
        return (row.territoryType ? row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1) : '-');
    }

    function getTerritoryLabel(row) {
        if (!row || !row.territoryType) return '-';
        return row.territoryType.charAt(0).toUpperCase() + row.territoryType.slice(1);
    }

    function _findContentById(id) {
        if (!id) return null;
        const key = String(id);
        return contentList.find(c => String(c.id || c.contentId || c.name) === key);
    }

    function isVideoOnlyPlaylist(row) {
        if (!row || !Array.isArray(row.selectedContent) || row.selectedContent.length === 0) return false;
        return row.selectedContent.every(cid => {
            const c = _findContentById(cid);
            return c && c.type === 'video';
        });
    }

    function isImageOnlyPlaylist(row) {
        if (!row || !Array.isArray(row.selectedContent) || row.selectedContent.length === 0) return false;
        return row.selectedContent.every(cid => {
            const c = _findContentById(cid);
            return c && c.type === 'image';
        });
    }

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
                               if (expiringOnly) {
                                   if (expiringDate) {
                                       if (!row.endDate) return false;
                                       const end = new Date(row.endDate).toISOString().split('T')[0];
                                       return end === expiringDate;
                                   }
                                   return isExpiring(row);
                               }
                               if (!q) return true;
                               return (
                                   (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
                                   (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
                                   (row.type && String(row.type).toLowerCase().includes(q)) ||
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
                                            <th>Type</th>
                                                <th>Start At</th>
                                                <th>Stop At</th>
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
                                                       (row.type && String(row.type).toLowerCase().includes(q)) ||
                                                       (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
                                                       (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
                                                       (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
                                                       (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
                                                   );
                                               })
                                               .map((row, idx) => (
                                            <tr key={row.id || idx}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <Button variant="link" style={{ padding: 0 }} onClick={() => navigate('/assign', { state: { playlist: row, action: 'view' } })}>{row.playlistName || '-'}</Button>
                                                </td>
                                                   <td>
                                                               {getTerritoryLabel(row)}
                                                   </td>
                                                <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                <td>{row.triggerStartAt || '-'}</td>
                                                <td>{row.triggerStopAt || '-'}</td>
                                                <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
                                                <td>
                                                       {(!row.status || row.status === 'pending') ? (
                                                           <>
                                                               <Button size="sm" variant="primary" className="me-2" onClick={() => {
                                                                   navigate('/assign', { state: { playlist: row, action: 'edit' } });
                                                               }}>Edit</Button>
                                                                  {/* Draft badge removed per request - drafts are still present but we don't show 'Draft for' in Created list */}
                                                               <Button size="sm" variant="success" className="ms-2" onClick={async () => {
                                                                   const now = new Date().toISOString();
                                                                   await updatePlaylistInDB(row.id, { status: 'approved', approvedAt: now });
                                                                   // If this playlist was a draft created from an approved playlist, disable the original and mark replacement
                                                                   if (row.draftOf) {
                                                                       await updatePlaylistInDB(row.draftOf, { disabledWhileEditing: false, pendingDraftId: null, inactive: true, replacedBy: row.id });
                                                                   }
                                                                   // Reload all lists from DB to ensure correct tab movement
                                                                   const all = await getAllPlaylistsFromDB();
                                                                   setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
                                                                   setInactiveRows(all.filter(r => r.inactive));
                                                                   setApprovedRows(all.filter(r => r.status === 'approved'));
                                                                   setRejectedRows(all.filter(r => r.status === 'rejected'));
                                                               }}>Approve</Button>
                                                               <Button size="sm" variant="danger" className="ms-2" onClick={async () => {
                                                                   const now = new Date().toISOString();
                                                                   await updatePlaylistInDB(row.id, { status: 'rejected', rejectedAt: now });
                                                                   // If this draft was for an approved playlist, re-enable the original
                                                                   if (row.draftOf) {
                                                                       await updatePlaylistInDB(row.draftOf, { disabledWhileEditing: false, pendingDraftId: null });
                                                                   }
                                                                   // Reload all lists from DB to ensure correct tab movement
                                                                   const all = await getAllPlaylistsFromDB();
                                                                   setAddedRows(all.filter(r => !r.inactive && (r.status === undefined || r.status === 'pending')));
                                                                   setInactiveRows(all.filter(r => r.inactive));
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
                               {expiringOnly && (
                                   <div className="mb-3">
                                       <Alert variant="info">
                                           {expiringDate ? (
                                               <span>Showing approved playlists expiring on <strong>{new Date(expiringDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>.</span>
                                           ) : (
                                               <span>Showing approved playlists expiring in the next <strong>{expiringDays}</strong> day(s).</span>
                                           )}
                                           &nbsp; <Button variant="link" className="p-0" onClick={() => { setExpiringOnly(false); setExpiringDate(null); navigate('/manage-playlists'); }}>Clear</Button>
                                       </Alert>
                                   </div>
                               )}
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
                               if (expiringOnly) {
                                   if (expiringDate) {
                                       if (!row.endDate) return false;
                                       const end = new Date(row.endDate).toISOString().split('T')[0];
                                       return end === expiringDate;
                                   }
                                   return isExpiring(row);
                               }
                               if (!q) return true;
                                                       return (
                                                           (row.playlistName && row.playlistName.toLowerCase().includes(q)) ||
                                                           (row.territoryType && row.territoryType.toLowerCase().includes(q)) ||
                                                           (row.type && String(row.type).toLowerCase().includes(q)) ||
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
                                                   <th>Type</th>
                                                   <th>Start At</th>
                                                   <th>Stop At</th>
                                                   <th>Start Date</th>
                                                   <th>Effective From</th>
                                                   <th>End Date</th>
                                                   <th>Content Count</th>
                                                   <th>Action</th>
                                               </tr>
                                       </thead>
                                       <tbody>
                                           {approvedRows
                                               .filter(row => !row.inactive)
                                               .filter(row => {
                                                   // If expiringOnly, only show playlists expiring in configured days or on a specific date
                                                   if (expiringOnly) {
                                                       if (expiringDate) {
                                                           if (!row.endDate) return false;
                                                           const end = new Date(row.endDate).toISOString().split('T')[0];
                                                           return end === expiringDate;
                                                       }
                                                       return isExpiring(row);
                                                   }
                                                   return true;
                                               })
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
                                               .filter(row => {
                                                   if (!contentFilter) return true;
                                                   if (contentFilter === 'videoOnly') return isVideoOnlyPlaylist(row);
                                                   if (contentFilter === 'imageOnly') return isImageOnlyPlaylist(row);
                                                   return true;
                                               })
                                               .map((row, idx) => (
                                               <tr key={row.id || idx} style={(row.inactive || row.disabledWhileEditing || row.pendingDraftId) ? { opacity: 0.6, background: '#f8d7da' } : {}}>
                                                   <td>{idx + 1}</td>
                                                   <td>
                                                       <Button variant="link" style={{ padding: 0 }} onClick={() => navigate('/assign', { state: { playlist: row, action: 'view' } })}>{row.playlistName || '-'}</Button>
                                                   </td>
                                                   <td>{getTerritoryLabel(row)}</td>
                                                   <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                   <td>{row.triggerStartAt || '-'}</td>
                                                   <td>{row.triggerStopAt || '-'}</td>
                                                   <td>{row.startDate || '-'}</td>
                                                   <td>{(() => {
                                                       const start = row.startDate ? new Date(row.startDate) : null;
                                                       const approved = row.approvedAt ? new Date(row.approvedAt) : (row.updatedAt ? new Date(row.updatedAt) : null);
                                                       if (start && approved) {
                                                           return start < approved ? approved.toISOString().split('T')[0] : start.toISOString().split('T')[0];
                                                       } else if (start) {
                                                           return start.toISOString().split('T')[0];
                                                       } else if (approved) {
                                                           return approved.toISOString().split('T')[0];
                                                       } else {
                                                           return '-';
                                                       }
                                                   })()}</td>
                                                   <td>{row.endDate || '-'}</td>
                                                   <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
                                                   <td>
                                                       {row.inactive ? (
                                                           <span className="badge bg-danger">Disabled</span>
                                                       ) : row.pendingDraftId || row.disabledWhileEditing ? (
                                                           <>
                                                               <span className="badge bg-secondary">Pending Update</span>
                                                               <Button size="sm" variant="outline-primary" className="ms-2" onClick={() => {
                                                                   navigate('/assign', { state: { playlist: row, action: 'view' } });
                                                               }}>View</Button>
                                                           </>
                                                       ) : (
                                                           <>
                                                               <Button size="sm" variant="primary" className="me-2" onClick={() => {
                                                                   navigate('/assign', { state: { playlist: row, action: 'edit' } });
                                                               }}>Edit</Button>

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
                                            <th>Type</th>
                                            <th>Start At</th>
                                            <th>Stop At</th>
                                            <th>Start Date</th>
                                            <th>Rejected Date</th>
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
                                                   <td>
                                                       <Button variant="link" style={{ padding: 0 }} onClick={() => navigate('/assign', { state: { playlist: row, action: 'view' } })}>{row.playlistName || '-'}</Button>
                                                   </td>
                                                   <td>{getTerritoryLabel(row)}</td>
                                                   <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                   <td>{row.triggerStartAt || '-'}</td>
                                                   <td>{row.triggerStopAt || '-'}</td>
                                                   <td>{row.startDate || '-'}</td>
                                                   <td>{(() => {
                                                       // Show rejected date if present
                                                       let dateStr = '-';
                                                       if (row.rejectedAt && !isNaN(Date.parse(row.rejectedAt))) {
                                                           dateStr = new Date(row.rejectedAt).toISOString().split('T')[0];
                                                       } else if (row.updatedAt && !isNaN(Date.parse(row.updatedAt))) {
                                                           dateStr = new Date(row.updatedAt).toISOString().split('T')[0];
                                                       }
                                                       return dateStr;
                                                   })()}</td>
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
                <Tab eventKey="inactive" title="Expired Playlists">
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
                                                    <th>Type</th>
                                                    <th>Start At</th>
                                                    <th>Stop At</th>
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
                                                           (row.type && String(row.type).toLowerCase().includes(q)) ||
                                                           (row.selectedState && row.selectedState.toLowerCase().includes(q)) ||
                                                           (row.selectedCity && row.selectedCity.toLowerCase().includes(q)) ||
                                                           (row.filteredStoreIds && row.filteredStoreIds.join(",").toLowerCase().includes(q)) ||
                                                           (row.storeIdInput && row.storeIdInput.join(",").toLowerCase().includes(q))
                                                       );
                                                   })
                                                   .map((row, idx) => (
                                                   <tr key={idx}>
                                                       <td>
                                                           <Button variant="link" style={{ padding: 0 }} onClick={() => navigate('/assign', { state: { playlist: row, action: 'view' } })}>{row.playlistName || '-'}</Button>
                                                       </td>
                                                       <td>{getTerritoryDisplay(row)}</td>
                                                                         <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                                     <td>{row.triggerStartAt || '-'}</td>
                                                                     <td>{row.triggerStopAt || '-'}</td>
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