import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab, Button, Alert } from 'react-bootstrap';

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

    // Normalize store id for comparisons (removed as unused)

    // Helper: is playlist expiring in `expiringDays` days
    function isExpiring(row) {
        if (!row.endDate) return false;
        const today = new Date();
        const expiryFromNow = new Date(today);
        expiryFromNow.setDate(today.getDate() + (expiringDays || 5));
        const end = new Date(row.endDate);
        return end >= today && end <= expiryFromNow;
    }

    // Territory display/label helpers removed - territory column is hidden in UI

    function getTriggerTypeLabel(row) {
        if (!row || row.type !== 'trigger') return '-';
        const st = (row.triggerSubType || '').toLowerCase();
        if (st === 'time') return 'Time';
        if (st === 'customer') return 'Customer';
        if (st === 'product') return 'Product';
        return '-';
    }

    function formatDateShort(dt) {
        if (!dt) return '-';
        const d = new Date(dt);
        if (isNaN(d.getTime())) return '-';
        const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day = pad(d.getDate());
        const mon = months[d.getMonth()];
        const year = String(d.getFullYear()).slice(-2);
        const hours = pad(d.getHours());
        const mins = pad(d.getMinutes());
        return `${day}-${mon}-${year}, ${hours}:${mins}`;
    }

    function generateCreatorId(item, idx) {
        // Similar deterministic generator to DeviceManagement; fallback if no createdBy is present
        let base = String(item?.id || `ITEM${idx}`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        let suffix = base.slice(-5);
        if (suffix.length < 5) suffix = suffix.padStart(5, '0');
        let sum = 0;
        for (let i=0;i<base.length;i++) sum += base.charCodeAt(i);
        const letter = String.fromCharCode(65 + (sum % 26));
        return `OTG${suffix}${letter}`;
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
                    Dashboard
                </h2>
            </div>
            <Tabs
                id="playlist-tabs"
                activeKey={activeTab}
                onSelect={setActiveTab}
                className="mb-3"
            >
                <Tab eventKey="list" title="Created">
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
                                            <th>Type</th>
                                            <th>Trigger Type</th>
                                            <th>Contents</th>
                                            <th>Created on</th>
                                            <th>Created by</th>
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
                                                                <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                                <td>{getTriggerTypeLabel(row)}</td>
                                                                <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
                                                                <td>{row.createdAt ? formatDateShort(row.createdAt) : '-'}</td>
                                                                <td className="font-monospace small">{row.createdBy || generateCreatorId(row, idx)}</td>
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
                                                   <th>Type</th>
                                                   <th>Trigger Type</th>
                                                <th>From Date</th>
                                                   <th>Effective From</th>
                                                   <th>End Date</th>
                                                <th>Contents</th>
                                                <th>Approved on</th>
                                                <th>Approved by</th>
                                                <th>Created on</th>
                                                <th>Created by</th>
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
                                                   <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                   <td>{getTriggerTypeLabel(row)}</td>
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
                                                   <td>{row.approvedAt ? formatDateShort(row.approvedAt) : '-'}</td>
                                                   <td className="font-monospace small">{row.approvedBy || generateCreatorId(row, idx)}</td>
                                                   <td>{row.createdAt ? formatDateShort(row.createdAt) : '-'}</td>
                                                   <td className="font-monospace small">{row.createdBy || generateCreatorId(row, idx)}</td>
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
                                            <th>Type</th>
                                            <th>Trigger Type</th>
                                            <th>From Date</th>
                                            <th>Rejected on</th>
                                            <th>Rejected by</th>
                                            <th>Contents</th>
                                            <th>Created on</th>
                                            <th>Created by</th>
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
                                                   <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                   <td>{getTriggerTypeLabel(row)}</td>
                                                   <td>{row.startDate || '-'}</td>
                                                   <td>{row.rejectedAt ? formatDateShort(row.rejectedAt) : '-'}</td>
                                                   <td className="font-monospace small">{row.rejectedBy || generateCreatorId(row, idx)}</td>
                                                   <td>{row.selectedContent ? row.selectedContent.length : 0}</td>
                                                   <td>{row.createdAt ? formatDateShort(row.createdAt) : '-'}</td>
                                                   <td className="font-monospace small">{row.createdBy || generateCreatorId(row, idx)}</td>
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
                <Tab eventKey="inactive" title="Expired">
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
                                                        <th>Type</th>
                                                        <th>Trigger Type</th>
                                                        <th>State</th>
                                                        <th>City</th>
                                                        <th>Stores</th>
                                                        <th>Contents</th>
                                                        <th>From Date</th>
                                                        <th>End Date</th>
                                                        <th>Created on</th>
                                                        <th>Created by</th>
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
                                                                         <td>{row.type ? (row.type === 'trigger' ? 'Trigger' : 'Regular') : 'Regular'}</td>
                                                                     <td>{getTriggerTypeLabel(row)}</td>
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
                                                    <td>{row.createdAt ? formatDateShort(row.createdAt) : '-'}</td>
                                                    <td className="font-monospace small">{row.createdBy || generateCreatorId(row, idx)}</td>
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