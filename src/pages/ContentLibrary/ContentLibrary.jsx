import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Tabs, Tab, Form, Alert } from 'react-bootstrap';
import { addContent, getAllContent, updateContent } from '../../services/indexeddb';
import { getAllDevices } from '../../services/deviceIndexeddb';

function ContentLibrary() {
  const [contentList, setContentList] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [editContent, setEditContent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContentName, setNewContentName] = useState('');
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [addError, setAddError] = useState('');
  const [deviceResolutions, setDeviceResolutions] = useState({ landscape: [], portrait: [] });
  const [mediaResolutions, setMediaResolutions] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editError, setEditError] = useState([]);
  const [editMediaResolutions, setEditMediaResolutions] = useState([]);
  const [disableConfirmId, setDisableConfirmId] = useState(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewAnchor, setPreviewAnchor] = useState(null);

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
  const handleDisableRequest = (content) => {
    setDisableConfirmId(content.id);
    setShowDisableModal(true);
  };
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
  };

  const closeEditModal = () => {
    setEditContent(null);
    setShowEditModal(false);
    setEditNewFiles([]);
    setEditError('');
  };

  // Handle adding new images/videos in edit modal
  const handleEditAddFiles = (e) => {
    const files = Array.from(e.target.files);
    setEditNewFiles(files);
  };

  const handleEditSaveFiles = async () => {
    if (!editContent || editNewFiles.length === 0) return;
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
    const safeRead = (file, type) => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(type === 'image'
          ? { type: 'image', data: reader.result }
          : { type: 'video', data: reader.result, name: file.name });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    };
    const images = editNewFiles.filter(f => f.type.startsWith('image/'));
    const videos = editNewFiles.filter(f => f.type.startsWith('video/'));
    const imagePromises = images.map(file => safeRead(file, 'image'));
    const videoPromises = videos.map(file => safeRead(file, 'video'));
    const mediaArr = await Promise.all([...imagePromises, ...videoPromises]);
    const validMedia = mediaArr.filter(Boolean);
    if (validMedia.length === 0) {
      setEditError('Failed to read files.');
      return;
    }
    // Update content in IndexedDB
    const updated = { ...editContent, slides: [...(editContent.slides || []), ...validMedia] };
    await updateContent(updated);
    setEditContent(updated);
    setEditNewFiles([]);
    setEditError('');
    const all = await getAllContent();
    setContentList(all);
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
              video.onloadedmetadata = () => {
                resolve({ name: file.name, type: 'video', width: video.videoWidth, height: video.videoHeight });
              };
              video.onerror = () => resolve({ name: file.name, type: 'video', width: '-', height: '-' });
              video.src = e.target.result;
            } else {
              resolve({ name: file.name, type: 'other', width: '-', height: '-' });
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
              img.onload = () => resolve({ name: file.name, type: 'image', width: img.width, height: img.height });
              img.onerror = () => resolve({ name: file.name, type: 'image', width: '-', height: '-' });
              img.src = e.target.result;
            } else if (file.type.startsWith('video/')) {
              const video = document.createElement('video');
              video.onloadedmetadata = () => {
                resolve({ name: file.name, type: 'video', width: video.videoWidth, height: video.videoHeight });
              };
              video.onerror = () => resolve({ name: file.name, type: 'video', width: '-', height: '-' });
              video.src = e.target.result;
            } else {
              resolve({ name: file.name, type: 'other', width: '-', height: '-' });
            }
          };
          reader.readAsDataURL(file);
        });
      })).then(results => setEditMediaResolutions(results));
    } else {
      setEditMediaResolutions([]);
    }
  }, [editNewFiles, showEditModal]);

  // Filter by active/inactive
  const filteredContent = contentList.filter(content => {
    if (activeTab === 'active') return content.active !== false;
    return content.active === false;
  });

  // Add Content modal handlers
  const openAddModal = () => {
    setShowAddModal(true);
    setNewContentName('');
    setNewImages([]);
    setNewVideos([]);
    setAddError('');
  };
  const closeAddModal = () => {
    setShowAddModal(false);
    setNewContentName('');
    setNewImages([]);
    setNewVideos([]);
    setAddError('');
  };
  const handleAddMedia = (e) => {
    const files = Array.from(e.target.files);
    const images = files.filter(f => f.type.startsWith('image/'));
    const videos = files.filter(f => f.type.startsWith('video/'));
    setNewImages(images);
    setNewVideos(videos);
  };
  const handleAddContent = async () => {
    if (newContentName.trim() === '') {
      setAddError('Content name is required.');
      return;
    }
    if (newImages.length === 0 && newVideos.length === 0) {
      setAddError('At least one image or video is required.');
      return;
    }
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
    // Prepare content object with images as dataUrl
    const id = Date.now();
    const slides = await Promise.all([
      ...newImages.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ type: 'image', name: file.name, data: reader.result });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      })),
      ...newVideos.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ type: 'video', name: file.name, data: reader.result });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }))
    ]);
    const newContent = {
      id,
      title: newContentName,
      active: true,
      slides: slides.filter(Boolean)
    };
    await addContent(newContent);
    const all = await getAllContent();
    setContentList(all);
    setShowAddModal(false);
    setNewContentName('');
    setNewImages([]);
    setNewVideos([]);
    setAddError('');
  };

  return (
    <>
      <div className="content-library">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">
            <i className="bi bi-collection-play me-2"></i>
            Content Library
          </h2>
        </div>
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
          <Tab eventKey="active" title="Active Content">
            <div className="mb-3 d-flex justify-content-end">
              <Button variant="primary" onClick={openAddModal}>
                <i className="bi bi-plus-circle me-2"></i>
                Add Content
              </Button>
            </div>
            <Table bordered hover responsive>
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Content Name</th>
                  <th>Number of Images</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredContent.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted">No content found</td></tr>
                ) : filteredContent.map(content => (
                  <tr key={content.id}>
                    <td>{content.id}</td>
                    <td>{content.title}</td>
                    <td>{content.slides ? content.slides.length : 1}</td>
                    <td>
                      {content.active !== false && !content.permanentlyDisabled && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="me-2"
                          onClick={() => handleDisableRequest(content)}
                        >
                          Disable
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEdit(content)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="inactive" title="Inactive Content">
            <Table bordered hover responsive>
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Content Name</th>
                  <th>Number of Images</th>
                </tr>
              </thead>
              <tbody>
                {filteredContent.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-muted">No content found</td></tr>
                ) : filteredContent.map(content => (
                  <tr key={content.id}>
                    <td>{content.id}</td>
                    <td>{content.title}</td>
                    <td>{content.slides ? content.slides.length : 1}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
        </Tabs>
      </div>
      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={closeEditModal} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>View Images</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && <div className="alert alert-danger">{editError}</div>}
          {editContent && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-3">
                {(editContent.slides || [editContent.fileUrl]).map((media, idx) => (
                  <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                    {media.type === 'video' ? (
                      <video src={media.data} controls style={{ maxWidth: 180, maxHeight: 180 }} />
                    ) : (
                      <img src={media.data || media} alt={`slide-${idx}`} style={{ maxWidth: 180, maxHeight: 180 }} />
                    )}
                    <div className="text-center mt-2">{media.type === 'video' ? `Video ${idx + 1}` : `Image ${idx + 1}`}</div>
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <label className="form-label">Add More Images or Videos</label>
                <input type="file" accept="image/*,video/*" multiple onChange={handleEditAddFiles} className="form-control" />
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
                        </tr>
                      </thead>
                      <tbody>
                        {editMediaResolutions.map((m, i) => (
                          <tr key={i}>
                            <td>{m.name}</td>
                            <td>{m.type}</td>
                            <td>{m.width}</td>
                            <td>{m.height}</td>
                            <td>{typeof m.width === 'number' && typeof m.height === 'number' ? (m.width > m.height ? 'Landscape' : m.width < m.height ? 'Portrait' : 'Square') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
                <button className="btn btn-primary mt-2" onClick={handleEditSaveFiles} disabled={editNewFiles.length === 0}>Add to Content</button>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEditModal}>Close</Button>
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
              <Form.Label>Upload Images or Videos</Form.Label>
              <Form.Control
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleAddMedia}
              />
              <Form.Text className="text-muted">
                You can select multiple images and videos.
              </Form.Text>
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
                    </tr>
                  </thead>
                  <tbody>
                    {mediaResolutions.map((m, i) => (
                      <tr key={i}>
                        <td>
                          {m.type === 'image' && m.dataUrl ? (
                            <span
                              style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer', position: 'relative' }}
                              onMouseEnter={e => setPreviewAnchor({ x: e.clientX, y: e.clientY, url: m.dataUrl })}
                              onMouseLeave={() => setPreviewAnchor(null)}
                              onClick={() => setPreviewImage(m.dataUrl)}
                            >
                              {m.name}
                            </span>
                          ) : m.name}
                        </td>
                        <td>{m.type}</td>
                        <td>{m.width}</td>
                        <td>{m.height}</td>
                        <td>{typeof m.width === 'number' && typeof m.height === 'number' ? (m.width > m.height ? 'Landscape' : m.width < m.height ? 'Portrait' : 'Square') : '-'}</td>
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
          <Button variant="primary" onClick={handleAddContent}>Add</Button>
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
          <img src={previewAnchor.url} alt="preview" style={{ maxWidth: 120, maxHeight: 80 }} />
        </div>
      )}
      {/* Full image modal on click */}
      <Modal show={!!previewImage} onHide={() => setPreviewImage(null)} centered size="lg">
        <Modal.Body style={{ textAlign: 'center', background: '#222' }}>
          {previewImage && <img src={previewImage} alt="preview" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default ContentLibrary;
