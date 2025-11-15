import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Tabs, Tab, Form, Alert } from 'react-bootstrap';

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

  useEffect(() => {
    const loadContent = () => {
      const stored = localStorage.getItem('customContent');
      const customContent = stored ? JSON.parse(stored) : [];
      setContentList(customContent);
    };
    loadContent();
    const handleStorageChange = (e) => {
      if (e.key === 'customContent') loadContent();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load device resolutions from actual devices in localStorage
  useEffect(() => {
    let devices = [];
    const stored = localStorage.getItem('devices');
    if (stored) {
      try {
        devices = JSON.parse(stored);
      } catch {
        devices = [];
      }
    }
    // Extract unique resolutions from device.resolution.width/height
    const seen = new Set();
    const resolutions = [];
    for (const d of devices) {
      if (d.resolution && typeof d.resolution.width === 'number' && typeof d.resolution.height === 'number') {
        const width = d.resolution.width;
        const height = d.resolution.height;
        const key = `${width}x${height}`;
        if (!seen.has(key)) {
          seen.add(key);
          resolutions.push({ width, height });
        }
      }
    }
    setDeviceResolutions({
      landscape: resolutions.filter(r => r.width > r.height),
      portrait: resolutions.filter(r => r.height > r.width)
    });
  }, []);

  // Soft delete (disable, no re-enable)
  const handleDisableRequest = (content) => {
    setDisableConfirmId(content.id);
    setShowDisableModal(true);
  };
  const handleConfirmDisable = () => {
    const stored = localStorage.getItem('customContent');
    let customContent = stored ? JSON.parse(stored) : [];
    customContent = customContent.map(c =>
      c.id === disableConfirmId ? { ...c, active: false, permanentlyDisabled: true } : c
    );
    localStorage.setItem('customContent', JSON.stringify(customContent));
    setContentList(customContent);
    setShowDisableModal(false);
    setDisableConfirmId(null);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'customContent',
      newValue: JSON.stringify(customContent)
    }));
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

  const handleEditSaveFiles = () => {
    if (!editContent || editNewFiles.length === 0) return;
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
    Promise.all([...imagePromises, ...videoPromises]).then(mediaArr => {
      const validMedia = mediaArr.filter(Boolean);
      if (validMedia.length === 0) {
        setEditError('Failed to read files.');
        return;
      }
      // Update content in localStorage
      const stored = localStorage.getItem('customContent');
      let customContent = stored ? JSON.parse(stored) : [];
      customContent = customContent.map(c =>
        c.id === editContent.id
          ? { ...c, slides: [...(c.slides || []), ...validMedia] }
          : c
      );
      localStorage.setItem('customContent', JSON.stringify(customContent));
      setContentList(customContent);
      // Update editContent in modal
      setEditContent({ ...editContent, slides: [...(editContent.slides || []), ...validMedia] });
      setEditNewFiles([]);
      setEditError('');
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'customContent',
        newValue: JSON.stringify(customContent)
      }));
    });
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
  const handleAddContent = () => {
    if (newContentName.trim() === '') {
      setAddError('Content name is required.');
      return;
    }
    if (newImages.length === 0 && newVideos.length === 0) {
      setAddError('At least one image or video is required.');
      return;
    }
    setAddError('');
    const id = Date.now();
    const newContent = {
      id,
      title: newContentName,
      active: true,
      slides: []
    };
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
    const imagePromises = newImages.map(file => safeRead(file, 'image'));
    const videoPromises = newVideos.map(file => safeRead(file, 'video'));
    Promise.all([...imagePromises, ...videoPromises]).then(mediaArr => {
      const validMedia = mediaArr.filter(Boolean);
      if (validMedia.length === 0) {
        setAddError('Failed to read files.');
        return;
      }
      newContent.slides = validMedia;
      // Save to localStorage
      const stored = localStorage.getItem('customContent');
      let customContent = stored ? JSON.parse(stored) : [];
      customContent.push(newContent);
      localStorage.setItem('customContent', JSON.stringify(customContent));
      setContentList(customContent);
      // Close modal
      setShowAddModal(false);
      setNewContentName('');
      setNewImages([]);
      setNewVideos([]);
      setAddError('');
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'customContent',
        newValue: JSON.stringify(customContent)
      }));
    });
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
    </>
  );
}

export default ContentLibrary;
