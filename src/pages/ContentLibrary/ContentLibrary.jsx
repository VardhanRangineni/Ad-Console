
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Table, Button, Modal, Tabs, Tab, Form, Alert, Badge } from 'react-bootstrap';
import Select from 'react-select';
import { addContent, getAllContent, updateContent } from '../../services/indexeddb';
import { productList } from '../../data/productList';
import { getAllDevices } from '../../services/deviceIndexeddb';

function ContentLibrary() {
  const [contentList, setContentList] = useState([]);
  const location = useLocation();
  const [contentFilter, setContentFilter] = useState(null); // 'hasImages' | 'hasVideos' | null
  const [activeTab, setActiveTab] = useState('active');
  const [editContent, setEditContent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [productIdInput, setProductIdInput] = useState('');
  const [selectedProductOptions, setSelectedProductOptions] = useState([]);
  const [productInputError, setProductInputError] = useState('');
  const [newContentName, setNewContentName] = useState('');
  // New: content type selection in Add modal: 'image' or 'video'
  const [newContentType, setNewContentType] = useState('image');
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [addError, setAddError] = useState('');
  const [mediaTypeError, setMediaTypeError] = useState('');
  const [deviceResolutions, setDeviceResolutions] = useState({ landscape: [], portrait: [] });
  const [mediaResolutions, setMediaResolutions] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editError, setEditError] = useState('');
  const [editMediaTypeError, setEditMediaTypeError] = useState('');
  const [editMediaResolutions, setEditMediaResolutions] = useState([]);
  const [disableConfirmId, setDisableConfirmId] = useState(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewAnchor, setPreviewAnchor] = useState(null);
  const [viewContent, setViewContent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editProductIdInput, setEditProductIdInput] = useState('');
  const [editSelectedProductOptions, setEditSelectedProductOptions] = useState([]);
  const [editProductInputError, setEditProductInputError] = useState('');

  const handleRemoveSlide = (idx) => {
    if (!editContent || !editContent.slides) return;
    const updatedSlides = editContent.slides.filter((_, i) => i !== idx);
    const updated = { ...editContent, slides: updatedSlides };
    setEditContent(updated);
    updateContent(updated);
    getAllContent().then(setContentList);
  };

  useEffect(() => {
    async function loadContent() {
      const all = await getAllContent();
      setContentList(all);
    }
    loadContent();
    const handleStorageChange = (e) => {
      if (e.key === 'customContent') loadContent();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter === 'hasImages' || filter === 'hasVideos') setContentFilter(filter);
    else setContentFilter(null);
  }, [location.search]);

  // Load device resolutions from actual devices in localStorage
  
  useEffect(() => {
    async function loadDeviceResolutions() {
      const devices = await getAllDevices();
      let landscape = [];
      let portrait = [];
      for (const d of devices) {
        if (d.resolution && typeof d.resolution.width === 'number' && typeof d.resolution.height === 'number') {
          const width = d.resolution.width;
          const height = d.resolution.height;
          if (d.orientation === 'landscape' || d.orientation === 'horizontal') {
            if (!landscape.some(r => r.width === width && r.height === height)) {
              landscape.push({ width, height });
            }
          } else if (d.orientation === 'portrait' || d.orientation === 'vertical') {
            if (!portrait.some(r => r.width === width && r.height === height)) {
              portrait.push({ width, height });
            }
          } else if (d.orientation === 'both') {
            // For 'both', add to landscape and add swapped to portrait
            if (!landscape.some(r => r.width === width && r.height === height)) {
              landscape.push({ width, height });
            }
            if (!portrait.some(r => r.width === height && r.height === width)) {
              portrait.push({ width: height, height: width });
            }
          }
        }
      }
      setDeviceResolutions({ landscape, portrait });
    }
    loadDeviceResolutions();
  }, []);

  // Soft delete (disable, no re-enable)
  // Removed unused handleDisableRequest
  const handleConfirmDisable = async () => {
    // Find the content to disable
    const content = contentList.find(c => c.id === disableConfirmId);
    if (content) {
      const updated = { ...content, active: false, permanentlyDisabled: true };
      await updateContent(updated);
      const all = await getAllContent();
      setContentList(all);
    }
    setShowDisableModal(false);
    setDisableConfirmId(null);
  };
  const handleCancelDisable = () => {
    setShowDisableModal(false);
    setDisableConfirmId(null);
  };

  // Edit modal
  const handleEdit = (content) => {
    setEditContent(content);
    setShowEditModal(true);
    setEditNewFiles([]);
    setEditError('');
    // Initialize edit product options from content if present
    if (content && content.products && Array.isArray(content.products)) {
      const opts = content.products.map(pid => {
        const found = productList.find(p => p.id === pid);
        return { value: pid, label: `${pid}${found ? ' - ' + found.name : ''}` };
      });
      setEditSelectedProductOptions(opts);
    } else {
      setEditSelectedProductOptions([]);
    }
    setEditProductIdInput('');
    setEditProductInputError('');
  };

  const closeEditModal = () => {
    setEditContent(null);
    setShowEditModal(false);
    setEditNewFiles([]);
    setEditError('');
    setEditSelectedProductOptions([]);
    setEditProductIdInput('');
    setEditProductInputError('');
  };

  // Handle adding new images/videos in edit modal
  const handleEditAddFiles = (e) => {
    const files = Array.from(e.target.files);
    const images = files.filter(f => f.type.startsWith('image/'));
    const videos = files.filter(f => f.type.startsWith('video/'));
    // Check if existing slides are all images or all videos
    const existingSlides = (editContent && editContent.slides) ? editContent.slides : [];
    const hasExistingImages = existingSlides.some(s => s.type === 'image');
    const hasExistingVideos = existingSlides.some(s => s.type === 'video');
    if ((hasExistingImages && videos.length > 0) || (hasExistingVideos && images.length > 0)) {
      setEditMediaTypeError('Cannot add images if videos are already present, or videos if images are present.');
      setEditNewFiles([]);
      return;
    }
    if (images.length > 0 && videos.length > 0) {
      setEditMediaTypeError('You can only upload images or videos, not both.');
      setEditNewFiles([]);
    } else {
      setEditMediaTypeError('');
      setEditNewFiles(files);
    }
  };

  const handleEditSaveFiles = async () => {
    if (editMediaTypeError) {
      setEditError(editMediaTypeError);
      return;
    }
    if (!editContent || editNewFiles.length === 0) return;
    // Only allow one type
    const images = editNewFiles.filter(f => f.type.startsWith('image/'));
    const videos = editNewFiles.filter(f => f.type.startsWith('video/'));
    if (images.length > 0 && videos.length > 0) {
      setEditError('You can only upload images or videos, not both.');
      return;
    }
    // Validation: check if all images match available device resolutions
    if (editMediaResolutions.length > 0 && deviceResolutions) {
      const allDeviceSizes = [
        ...deviceResolutions.landscape,
        ...deviceResolutions.portrait
      ];
      const unmatched = editMediaResolutions.filter(m => {
        if (m.type !== 'image') return false; // Only validate images
        return !allDeviceSizes.some(d => d.width === m.width && d.height === m.height);
      });
      if (unmatched.length > 0) {
        setEditError('One or more images do not match any available device resolution. Please upload images with the correct size.');
        return;
      }
    }
    // Save width/height and dataUrl for each slide
    const safeRead = (file, type, width, height, dataUrl) => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ type, name: file.name, data: reader.result, width, height, dataUrl });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    };
    // Get width/height and dataUrl from editMediaResolutions
    const getResolution = (file, type) => {
      const found = editMediaResolutions.find(m => m.name === file.name && m.type === type);
      return found ? { width: found.width, height: found.height, dataUrl: found.dataUrl } : { width: undefined, height: undefined, dataUrl: undefined };
    };
    const imagePromises = images.map(file => {
      const { width, height, dataUrl } = getResolution(file, 'image');
      return safeRead(file, 'image', width, height, dataUrl);
    });
    const videoPromises = videos.map(file => {
      const { width, height, dataUrl } = getResolution(file, 'video');
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const data = reader.result;
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            const duration = video.duration;
            resolve({ type: 'video', name: file.name, data, width, height, dataUrl, duration });
          };
          video.onerror = () => resolve({ type: 'video', name: file.name, data, width, height, dataUrl });
          video.src = data;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });
    const mediaArr = await Promise.all([...imagePromises, ...videoPromises]);
    const validMedia = mediaArr.filter(Boolean);
    if (validMedia.length === 0) {
      setEditError('Failed to read files.');
      return;
    }
    // Update content in IndexedDB
    const updatedSlides = [...(editContent.slides || []), ...validMedia];
    const updatedType = updatedSlides.some(s => s.type === 'video') ? 'video' : (updatedSlides.length > 1 ? 'slideshow' : 'image');
    let updated = { ...editContent, slides: updatedSlides, type: updatedType };
    // If video slides exist, update the top-level duration similar to add flow
    if (updatedSlides.length > 0 && updatedSlides[0].type === 'video') {
      const firstVideo = updatedSlides.find(s => s.type === 'video' && s.duration);
      if (firstVideo && firstVideo.duration) updated = { ...updated, duration: Math.round(firstVideo.duration) };
    }
    await updateContent(updated);
    setEditContent(updated);
    setEditNewFiles([]);
    setEditError('');
    setEditMediaTypeError('');
    const all = await getAllContent();
    setContentList(all);
    // Ensure edit product selection state stays in sync when files are saved
    if (updated && updated.products && Array.isArray(updated.products)) {
      const opts = updated.products.map(pid => {
        const found = productList.find(p => p.id === pid);
        return { value: pid, label: `${pid}${found ? ' - ' + found.name : ''}` };
      });
      setEditSelectedProductOptions(opts);
    }
  };

  // Extract resolution for each selected image/video
  useEffect(() => {
    if (showAddModal && (newImages.length > 0 || newVideos.length > 0)) {
      const files = [...newImages, ...newVideos];
      Promise.all(files.map(file => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
            if (file.type.startsWith('image/')) {
              const img = new window.Image();
              img.onload = () => resolve({ name: file.name, type: 'image', width: img.width, height: img.height, dataUrl: e.target.result });
              img.onerror = () => resolve({ name: file.name, type: 'image', width: '-', height: '-', dataUrl: e.target.result });
              img.src = e.target.result;
            } else if (file.type.startsWith('video/')) {
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.onloadedmetadata = () => {
                resolve({ name: file.name, type: 'video', width: video.videoWidth, height: video.videoHeight, dataUrl: e.target.result, duration: video.duration });
              };
              video.onerror = () => resolve({ name: file.name, type: 'video', width: '-', height: '-', dataUrl: e.target.result, duration: '-' });
              video.src = e.target.result;
            } else {
              resolve({ name: file.name, type: 'other', width: '-', height: '-', dataUrl: e.target.result });
            }
          };
          reader.readAsDataURL(file);
        });
      })).then(results => setMediaResolutions(results));
    } else {
      setMediaResolutions([]);
    }
  }, [newImages, newVideos, showAddModal]);

  // Extract resolution for each selected image/video in edit modal
  useEffect(() => {
    if (showEditModal && editNewFiles.length > 0) {
      const files = [...editNewFiles];
      Promise.all(files.map(file => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
            if (file.type.startsWith('image/')) {
              const img = new window.Image();
              img.onload = () => resolve({ name: file.name, type: 'image', width: img.width, height: img.height, dataUrl: e.target.result });
              img.onerror = () => resolve({ name: file.name, type: 'image', width: '-', height: '-', dataUrl: e.target.result });
              img.src = e.target.result;
            } else if (file.type.startsWith('video/')) {
              const video = document.createElement('video');
              video.onloadedmetadata = () => {
                resolve({ name: file.name, type: 'video', width: video.videoWidth, height: video.videoHeight, dataUrl: e.target.result });
              };
              video.onerror = () => resolve({ name: file.name, type: 'video', width: '-', height: '-', dataUrl: e.target.result });
              video.src = e.target.result;
            } else {
              resolve({ name: file.name, type: 'other', width: '-', height: '-', dataUrl: e.target.result });
            }
          };
          reader.readAsDataURL(file);
        });
      })).then(results => setEditMediaResolutions(results));
    } else {
      setEditMediaResolutions([]);
    }
  }, [editNewFiles, showEditModal]);

  // Filter by active/inactive, and the optional content filter from query params
  const filteredContent = contentList
    .filter(content => {
      if (activeTab === 'active') return content.active !== false;
      return content.active === false;
    })
    .filter(content => {
      if (!contentFilter) return true;
      if (contentFilter === 'hasImages') return (content.type === 'image') || (Array.isArray(content.slides) && content.slides.some(s => s.type === 'image'));
      if (contentFilter === 'hasVideos') return (content.type === 'video') || (Array.isArray(content.slides) && content.slides.some(s => s.type === 'video'));
      return true;
    });

  // Add Content modal handlers
  const openAddModal = () => {
    setShowAddModal(true);
    setNewContentName('');
    setNewImages([]);
    setNewVideos([]);
    setAddError('');
    setProductIdInput('');
    setSelectedProductOptions([]);
    setNewContentType('image');
  };
  const closeAddModal = () => {
    setShowAddModal(false);
    setNewContentName('');
    setNewImages([]);
    setNewVideos([]);
    setAddError('');
    setProductIdInput('');
    setSelectedProductOptions([]);
    setNewContentType('image');
  };
  const handleAddMedia = (e) => {
    const files = Array.from(e.target.files);
    if (newContentType === 'image') {
      const images = files.filter(f => f.type.startsWith('image/'));
      if (images.length !== files.length) {
        setMediaTypeError('Please upload only images for the Image content type.');
        setNewImages([]);
        setNewVideos([]);
        return;
      }
      setNewImages(images);
      setNewVideos([]);
      setMediaTypeError('');
    } else {
      const videos = files.filter(f => f.type.startsWith('video/'));
      if (videos.length !== files.length) {
        setMediaTypeError('Please upload only videos for the Video content type.');
        setNewImages([]);
        setNewVideos([]);
        return;
      }
      setNewVideos(videos);
      setNewImages([]);
      setMediaTypeError('');
    }
  };
  const handleAddContent = async () => {
    if (mediaTypeError) {
      setAddError(mediaTypeError);
      return;
    }
    if (newContentName.trim() === '') {
      setAddError('Content name is required.');
      return;
    }
    if ((newContentType === 'image' && newImages.length === 0) || (newContentType === 'video' && newVideos.length === 0)) {
      setAddError(`At least one ${newContentType === 'image' ? 'image' : 'video'} is required.`);
      return;
    }
    // No need to check both types due to content type selection
    // Validation: check if all images match available device resolutions
    if (mediaResolutions.length > 0 && deviceResolutions) {
      const allDeviceSizes = [
        ...deviceResolutions.landscape,
        ...deviceResolutions.portrait
      ];
      const unmatched = mediaResolutions.filter(m => {
        if (m.type !== 'image') return false; // Only validate images
        return !allDeviceSizes.some(d => d.width === m.width && d.height === m.height);
      });
      if (unmatched.length > 0) {
        setAddError('One or more images do not match any available device resolution. Please upload images with the correct size.');
        return;
      }
    }
    setAddError('');
    // Prepare content object with images as dataUrl and save width/height
    const id = Date.now();
    // Map file name to resolution info from mediaResolutions
    const getResolution = (file, type) => {
      const found = mediaResolutions.find(m => m.name === file.name && m.type === type);
      return found ? { width: found.width, height: found.height } : { width: undefined, height: undefined };
    };
    const slides = await Promise.all([
      ...newImages.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const { width, height } = getResolution(file, 'image');
          resolve({ type: 'image', name: file.name, data: reader.result, width, height });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      })),
      ...newVideos.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const { width, height } = getResolution(file, 'video');
          const dataUrl = reader.result;
          // Extract video duration
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            const duration = video.duration;
            resolve({ type: 'video', name: file.name, data: dataUrl, width, height, duration });
          };
          video.onerror = () => resolve({ type: 'video', name: file.name, data: dataUrl, width, height });
          video.src = dataUrl;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }))
    ]);
    const slidesFiltered = slides.filter(Boolean);
    // Determine whether the content is video or image based on user selection
    const isVideo = newContentType === 'video';
    // If video, set top-level duration for compatibility
    let duration = undefined;
    if (slidesFiltered.length > 0 && slidesFiltered[0].type === 'video') {
      const firstVideo = slidesFiltered.find(s => s.type === 'video' && s.duration);
      if (firstVideo && firstVideo.duration) duration = Math.round(firstVideo.duration);
    }
    const newContent = {
      id,
      title: newContentName,
      active: true,
      type: isVideo ? 'video' : 'image',
      slides: slidesFiltered,
      ...(duration ? { duration } : {})
      , products: (selectedProductOptions.length > 0 ? selectedProductOptions.map(p => p.value) : [])
    };
    await addContent(newContent);
    const all = await getAllContent();
    setContentList(all);
    setShowAddModal(false);
    setNewContentName('');
    setNewImages([]);
    setNewVideos([]);
    setAddError('');
    setMediaTypeError('');
    setSelectedProductOptions([]);
    setProductIdInput('');
  };

  const handleEditProductsChange = async (opts) => {
    const selected = opts || [];
    setEditSelectedProductOptions(selected);
    if (!editContent) return;
    const updated = { ...editContent, products: selected.map(o => o.value) };
    try {
      await updateContent(updated);
      setEditContent(updated);
      const all = await getAllContent();
      setContentList(all);
    } catch (err) {
      console.error('Error saving edited products', err);
    }
  };

  return (
    <div>
      <div className="container-fluid py-4 content-library bg-light min-vh-100">
        <div className="row mb-4">
          <div className="col-12 d-flex justify-content-between align-items-center">
            <h2 className="mb-0 fw-bold text-primary">
              <i className="bi bi-collection-play me-2"></i>
              Content Library
            </h2>
            <Button variant="primary" className="shadow-sm" onClick={openAddModal}>
              <i className="bi bi-plus-circle me-2"></i>
              Add Content
            </Button>
          </div>
        </div>
        <div className="row">
          <div className="col-12">
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
              <Tab eventKey="active" title={<span className="fw-semibold">Active</span>}>
                <div className="table-responsive rounded shadow-sm bg-white p-3">
                  <Table bordered hover responsive className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                            <th>Content ID</th>
                            <th>Content Name</th>
                            <th>Content Type</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                    </thead>
                    <tbody>
                      {filteredContent.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-muted">No content found</td></tr>
                      ) : filteredContent.map(content => (
                        <tr key={content.id}>
                          <td>
                            <span
                              style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                              onClick={() => { setViewContent(content); setShowViewModal(true); }}
                            >
                              {content.id}
                            </span>
                          </td>
                          <td>{content.title}</td>
                          <td>{content.type === 'video' ? 'Video' : 'Image'}</td>
                          <td>
                            <Badge bg={content.active !== false ? 'success' : 'danger'}>
                              {content.active !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <Form.Check
                                type="switch"
                                id={`switch-content-${content.id}`}
                                checked={content.active !== false}
                                onChange={() => {
                                  if (content.active !== false) {
                                    // If toggling to inactive, show confirmation modal
                                    setDisableConfirmId(content.id);
                                    setShowDisableModal(true);
                                  } else {
                                    // If toggling to active (should not happen for permanentlyDisabled), just update
                                    const updated = { ...content, active: true, permanentlyDisabled: false };
                                    updateContent(updated).then(() => {
                                      getAllContent().then(setContentList);
                                    });
                                  }
                                }}
                                label={content.active !== false ? 'Active' : 'Inactive'}
                              />
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="rounded-pill px-3"
                                onClick={() => handleEdit(content)}
                              >
                                <i className="bi bi-pencil-square me-1"></i> Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Tab>
              <Tab eventKey="inactive" title={<span className="fw-semibold">Inactive</span>}>
                <div className="table-responsive rounded shadow-sm bg-white p-3">
                  <Table bordered hover responsive className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                            <th>Content ID</th>
                            <th>Content Name</th>
                            <th>Content Type</th>
                            <th>Status</th>
                          </tr>
                    </thead>
                    <tbody>
                      {filteredContent.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-muted">No content found</td></tr>
                      ) : filteredContent.map(content => (
                        <tr key={content.id}>
                          <td>{content.id}</td>
                          <td>{content.title}</td>
                          <td>{content.type === 'video' ? 'Video' : 'Image'}</td>
                          <td>
                            <Badge bg={content.active !== false ? 'success' : 'danger'}>
                              {content.active !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Tab>
            </Tabs>
          </div>
        </div>
        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={closeEditModal} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>Edit Content</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editError && <div className="alert alert-danger">{editError}</div>}
            {editContent && (
              <>
                <div className="d-flex flex-wrap gap-3 mb-3">
                  {(editContent.slides || [editContent.fileUrl]).map((media, idx) => (
                    <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, position: 'relative' }}>
                      {media.type === 'video' ? (
                        <video src={media.data} controls style={{ maxWidth: 180, maxHeight: 180 }} />
                      ) : (
                        <img src={media.data || media} alt={`slide-${idx}`} style={{ maxWidth: 180, maxHeight: 180 }} />
                      )}
                      <div className="text-center mt-2">{media.type === 'video' ? `Video ${idx + 1}` : `Image ${idx + 1}`}</div>
                      {typeof media.width === 'number' && typeof media.height === 'number' && (
                        <div className="text-center text-muted" style={{ fontSize: '0.95em' }}>
                          {`Size: ${media.width} x ${media.height}`}
                        </div>
                      )}
                      <button
                        className="btn btn-sm btn-danger position-absolute"
                        style={{ top: 4, right: 4, zIndex: 2 }}
                        title="Remove"
                        onClick={() => handleRemoveSlide(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mb-3">
                  <label className="form-label">Add More Images or Videos</label>
                  <input type="file" accept="image/*,video/*" multiple onChange={handleEditAddFiles} className="form-control" />
                  <div className="text-muted" style={{ fontSize: '0.95em' }}>
                    You can select multiple images or multiple videos, but not both at the same time.
                  </div>
                  {editMediaTypeError && <div className="text-danger mt-1">{editMediaTypeError}</div>}
                  {editMediaResolutions.length > 0 && (
                    <div className="mt-2">
                      <strong>Selected Media Resolutions:</strong>
                      <Table bordered size="sm" className="mt-2">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Width</th>
                            <th>Height</th>
                            <th>Orientation</th>
                            <th>Duration (s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editMediaResolutions.map((m, i) => (
                            <tr key={i}>
                              <td>
                                {m.type === 'image' && m.dataUrl ? (
                                  <span
                                    style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer', position: 'relative' }}
                                    onMouseEnter={e => setPreviewAnchor({ x: e.clientX, y: e.clientY, url: m.dataUrl, type: 'image' })}
                                    onMouseLeave={() => setPreviewAnchor(null)}
                                    onClick={() => setPreviewImage(m.dataUrl)}
                                  >
                                    {m.name}
                                  </span>
                                ) : m.type === 'video' && m.dataUrl ? (
                                  <span
                                    style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer', position: 'relative' }}
                                    onMouseEnter={e => setPreviewAnchor({ x: e.clientX, y: e.clientY, url: m.dataUrl, type: 'video' })}
                                    onMouseLeave={() => setPreviewAnchor(null)}
                                  >
                                    {m.name}
                                  </span>
                                ) : m.name}
                              </td>
                              <td>{m.type}</td>
                              <td>{m.width}</td>
                              <td>{m.height}</td>
                              <td>{typeof m.width === 'number' && typeof m.height === 'number' ? (m.width > m.height ? 'Landscape' : m.width < m.height ? 'Portrait' : 'Square') : '-'}</td>
                              <td>{m.type === 'video' && m.duration ? Math.round(m.duration) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                  <button className="btn btn-primary mt-2" onClick={handleEditSaveFiles} disabled={editNewFiles.length === 0 || !!editMediaTypeError}>Add to Content</button>
                </div>
                {/* Product association for edit modal */}
                <div className="mb-3">
                  <Form.Group>
                    <Form.Label>Associated Products</Form.Label>
                    <div>
                      <div style={{ minWidth: 320 }}>
                        <Form.Control
                          type="text"
                          placeholder="Enter product ID(s) and press Enter (e.g., AVEL0093, ARTH0131)"
                          value={editProductIdInput}
                          onChange={e => {
                            setEditProductInputError('');
                            setEditProductIdInput(e.target.value);
                          }}
                          onKeyDown={async e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const raw = editProductIdInput.trim();
                              if (!raw) return;
                              const parts = raw.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean).map(p => p.toUpperCase());
                              if (parts.length === 0) return;
                              const notFound = [];
                              const toAdd = [];
                              for (const id of parts) {
                                const found = productList.find(p => p.id.toUpperCase() === id);
                                if (found) {
                                  const opt = { value: found.id, label: `${found.id} - ${found.name}` };
                                  toAdd.push(opt);
                                } else {
                                  notFound.push(id);
                                }
                              }
                              // Merge into editSelectedProductOptions and persist
                              setEditSelectedProductOptions(prev => {
                                const existing = new Set(prev.map(p => p.value));
                                const merged = [...prev];
                                for (const opt of toAdd) {
                                  if (!existing.has(opt.value)) {
                                    merged.push(opt);
                                    existing.add(opt.value);
                                  }
                                }
                                // Persist updated products
                                (async () => {
                                  if (editContent) {
                                    const updated = { ...editContent, products: merged.map(o => o.value) };
                                    try {
                                      await updateContent(updated);
                                      setEditContent(updated);
                                      const all = await getAllContent();
                                      setContentList(all);
                                    } catch (err) {
                                      console.error('Error saving updated products', err);
                                    }
                                  }
                                })();
                                return merged;
                              });
                              if (notFound.length > 0) {
                                setEditProductInputError(`Product(s) not found: ${notFound.join(', ')}`);
                              } else {
                                setEditProductInputError('');
                              }
                              setEditProductIdInput('');
                            }
                          }}
                        />
                        {editProductInputError && <div className="text-danger mt-2">{editProductInputError}</div>}
                      </div>
                    </div>
                          <div className="text-center my-2 text-muted" style={{ fontSize: '0.9rem' }}></div>
                    <div>
                        <Select
                          isMulti
                          isSearchable={false}
                          menuIsOpen={false}
                          options={productList.map(p => ({ value: p.id, label: `${p.id} - ${p.name}` }))}
                          value={editSelectedProductOptions}
                          onChange={handleEditProductsChange}
                          placeholder="Select products..."
                          classNamePrefix="react-select"
                        />
                      </div>
                  </Form.Group>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeEditModal}>Close</Button>
          </Modal.Footer>
        </Modal>

        {/* View Content Modal */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>View Content</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {viewContent && (
              <>
              <div className="d-flex flex-wrap gap-3 mb-3">
                {(viewContent.slides || [viewContent.fileUrl]).map((media, idx) => (
                  <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, position: 'relative' }}>
                    {media.type === 'video' ? (
                      <video src={media.data} controls style={{ maxWidth: 180, maxHeight: 180 }} />
                    ) : (
                      <img src={media.data || media} alt={`slide-${idx}`} style={{ maxWidth: 180, maxHeight: 180 }} />
                    )}
                    <div className="text-center mt-2">{media.type === 'video' ? `Video ${idx + 1}` : `Image ${idx + 1}`}</div>
                    {typeof media.width === 'number' && typeof media.height === 'number' && (
                      <div className="text-center text-muted" style={{ fontSize: '0.95em' }}>
                        {`Size: ${media.width} x ${media.height}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <strong>Associated Products</strong>
                {Array.isArray(viewContent.products) && viewContent.products.length > 0 ? (
                  <Table bordered size="sm" className="mt-2">
                    <thead>
                      <tr>
                        <th>Product ID</th>
                        <th>Product Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewContent.products.map((pid, i) => {
                        const found = productList.find(p => p.id === pid || p.id === (pid || '').toString());
                        return (
                          <tr key={i}>
                            <td>{pid}</td>
                            <td>{found ? found.name : 'Unknown product'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-muted mt-2">No products associated with this content.</div>
                )}
              </div>
            </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
        {/* Add Content Modal */}
        <Modal show={showAddModal} onHide={closeAddModal} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>Add Content</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {addError && <Alert variant="danger">{addError}</Alert>}
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Content Name</Form.Label>
                <Form.Control
                  type="text"
                  value={newContentName}
                  onChange={e => setNewContentName(e.target.value)}
                  placeholder="Enter content name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Content Type</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    id="content-type-image"
                    label="Image"
                    value="image"
                    checked={newContentType === 'image'}
                    onChange={() => {
                      setNewContentType('image');
                      setNewVideos([]); // clear any existing kept videos when switching
                      setMediaTypeError('');
                    }}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    id="content-type-video"
                    label="Video"
                    value="video"
                    checked={newContentType === 'video'}
                    onChange={() => {
                      setNewContentType('video');
                      setNewImages([]); // clear any existing kept images when switching
                      setMediaTypeError('');
                    }}
                  />
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Upload {newContentType === 'image' ? 'Images' : 'Videos'}</Form.Label>
                <Form.Control
                  type="file"
                  accept={newContentType === 'image' ? 'image/*' : 'video/*'}
                  multiple
                  onChange={handleAddMedia}
                />
                <Form.Text className="text-muted">
                  You can select multiple {newContentType === 'image' ? 'images' : 'videos'} for this content type.
                </Form.Text>
                {mediaTypeError && <div className="text-danger mt-1">{mediaTypeError}</div>}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Associated Products</Form.Label>
                <div>
                  <div style={{ minWidth: 320 }}>
                    <Form.Control
                      type="text"
                      placeholder="Enter product ID(s) and press Enter (e.g., AVEL0093 or AVEL0093, ARTH0131)"
                      value={productIdInput}
                      onChange={e => {
                        setProductInputError('');
                        setProductIdInput(e.target.value);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const raw = productIdInput.trim();
                          if (!raw) return;
                          // Split comma-separated ids, allow spaces
                          const parts = raw.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean).map(p => p.toUpperCase());
                          if (parts.length === 0) return;
                          const notFound = [];
                          const toAdd = [];
                          for (const id of parts) {
                            const found = productList.find(p => p.id.toUpperCase() === id);
                            if (found) {
                              const opt = { value: found.id, label: `${found.id} - ${found.name}` };
                              toAdd.push(opt);
                            } else {
                              notFound.push(id);
                            }
                          }
                          // Add only unique options
                          setSelectedProductOptions(prev => {
                            const existing = new Set(prev.map(p => p.value));
                            const merged = [...prev];
                            for (const opt of toAdd) {
                              if (!existing.has(opt.value)) {
                                merged.push(opt);
                                existing.add(opt.value);
                              }
                            }
                            return merged;
                          });
                          if (notFound.length > 0) {
                            setProductInputError(`Product(s) not found: ${notFound.join(', ')}`);
                          } else {
                            setProductInputError('');
                          }
                          setProductIdInput('');
                        }
                      }}
                    />
                    {productInputError && <div className="text-danger mt-2">{productInputError}</div>}
                  </div>
                                    <div className="text-center my-2 text-muted" style={{ fontSize: '0.9rem' }}></div>
                   <div>
                    <Select
                      isMulti
                      isSearchable={false}
                      menuIsOpen={false}
                      options={productList.map(p => ({ value: p.id, label: `${p.id} - ${p.name}` }))}
                      value={selectedProductOptions}
                      onChange={opts => setSelectedProductOptions(opts || [])}
                      placeholder="Select products..."
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>
              </Form.Group>
              {mediaResolutions.length > 0 && (
                <div className="mb-3">
                  <strong>Selected Media Resolutions:</strong>
                  <Table bordered size="sm" className="mt-2">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Orientation</th>
                        <th>Duration (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediaResolutions.map((m, i) => (
                        <tr key={i}>
                          <td>
                            {m.type === 'image' && m.dataUrl ? (
                              <span
                                style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer', position: 'relative' }}
                                onMouseEnter={e => setPreviewAnchor({ x: e.clientX, y: e.clientY, url: m.dataUrl, type: 'image' })}
                                onMouseLeave={() => setPreviewAnchor(null)}
                                onClick={() => setPreviewImage(m.dataUrl)}
                              >
                                {m.name}
                              </span>
                            ) : m.type === 'video' && m.dataUrl ? (
                              <span
                                style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer', position: 'relative' }}
                                onMouseEnter={e => setPreviewAnchor({ x: e.clientX, y: e.clientY, url: m.dataUrl, type: 'video' })}
                                onMouseLeave={() => setPreviewAnchor(null)}
                              >
                                {m.name}
                              </span>
                            ) : m.name}
                          </td>
                          <td>{m.type}</td>
                          <td>{m.width}</td>
                          <td>{m.height}</td>
                          <td>{typeof m.width === 'number' && typeof m.height === 'number' ? (m.width > m.height ? 'Landscape' : m.width < m.height ? 'Portrait' : 'Square') : '-'}</td>
                          <td>{m.type === 'video' && m.duration ? Math.round(m.duration) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              {deviceResolutions.landscape.length === 0 && deviceResolutions.portrait.length === 0 ? (
                <Alert variant="warning">
                  No device resolutions found.{' '}
                  <a href="/devices" style={{ textDecoration: 'underline', cursor: 'pointer' }}>Add a device</a> to show available resolutions.
                </Alert>
              ) : (
                <Alert variant="info">
                  <div><b>Available Landscape Sizes:</b> {deviceResolutions.landscape.map(r => `${r.width}x${r.height}`).join(', ') || 'None'}</div>
                  <div><b>Available Portrait Sizes:</b> {deviceResolutions.portrait.map(r => `${r.width}x${r.height}`).join(', ') || 'None'}</div>
                </Alert>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAddModal}>Cancel</Button>
            <Button variant="primary" onClick={handleAddContent} disabled={!!mediaTypeError}>Add</Button>
          </Modal.Footer>
        </Modal>
        {/* Disable Warning Modal */}
        <Modal show={showDisableModal} onHide={handleCancelDisable} size="md" centered>
          <Modal.Header closeButton>
            <Modal.Title>Disable Content</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center py-3">
              <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3 mb-0">Are you sure you want to <b>disable</b> this content?</p>
              <p className="fw-bold">This action cannot be undone.</p>
              <p className="text-danger">You cannot enable this content again. It will remain in the database but cannot be used.</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCancelDisable}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmDisable}>Disable</Button>
          </Modal.Footer>
        </Modal>
        {/* Thumbnail preview on hover */}
        {previewAnchor && (
          <div
            style={{
              position: 'fixed',
              left: previewAnchor.x + 10,
              top: previewAnchor.y + 10,
              background: '#fff',
              border: '1px solid #ccc',
              padding: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 2000
            }}
          >
            {previewAnchor.type === 'image' ? (
              <img src={previewAnchor.url} alt="preview" style={{ maxWidth: 120, maxHeight: 80 }} />
            ) : previewAnchor.type === 'video' ? (
              <video src={previewAnchor.url} style={{ maxWidth: 160, maxHeight: 100 }} autoPlay loop muted playsInline />
            ) : null}
          </div>
        )}
        {/* Full image modal on click */}
        <Modal show={!!previewImage} onHide={() => setPreviewImage(null)} centered size="lg">
          <Modal.Body style={{ textAlign: 'center', background: '#222' }}>
            {previewImage && <img src={previewImage} alt="preview" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
}

export default ContentLibrary;
