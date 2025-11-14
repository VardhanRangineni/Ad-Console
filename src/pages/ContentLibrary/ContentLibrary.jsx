import React, { useState, useEffect } from 'react';
import { Row, Col, Form, InputGroup, Button, Modal, Alert, Badge, ProgressBar } from 'react-bootstrap';
import imageCompression from 'browser-image-compression';
import ContentCard from '../../components/ContentCard/ContentCard';
import { useApp } from '../../context/AppContext';
import './ContentLibrary.css';

function ContentLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contentList, setContentList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteContent, setDeleteContent] = useState(null);
  const { setBulkAssignContent } = useApp();

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('image');
  const [uploadDuration, setUploadDuration] = useState(10);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadPreviews, setUploadPreviews] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  useEffect(() => {
    loadContent();
    
    const handleStorageChange = (e) => {
      if (e.key === 'customContent') {
        loadContent();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadContent = () => {
    const stored = localStorage.getItem('customContent');
    const customContent = stored ? JSON.parse(stored) : [];
    setContentList(customContent);
  };

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)}MB -> Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return compressedFile;
    } catch (error) {
      console.error('Compression error:', error);
      throw error;
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsCompressing(true);
    setCompressionProgress(0);
    setUploadError('');

    if (files.length > 1 && uploadType !== 'slideshow') {
      setUploadType('slideshow');
    }

    try {
      const previews = [];
      const compressedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCompressionProgress(Math.round(((i + 1) / files.length) * 100));

        let processedFile = file;
        if (file.type.startsWith('image/')) {
          processedFile = await compressImage(file);
        }

        compressedFiles.push(processedFile);

        const reader = new FileReader();
        const preview = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(processedFile);
        });

        previews.push(preview);
      }

      const totalSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
      
      console.log(`Total compressed size: ${totalSizeMB}MB`);

      if (totalSize > 8 * 1024 * 1024) {
        setUploadError(`Total size after compression is ${totalSizeMB}MB. Please select fewer or smaller images (max 8MB total).`);
        setIsCompressing(false);
        return;
      }

      setUploadFiles(compressedFiles);
      setUploadPreviews(previews);
      setIsCompressing(false);
      setCompressionProgress(0);

    } catch (error) {
      console.error('File processing error:', error);
      setUploadError('Failed to process files. Please try again with smaller images.');
      setIsCompressing(false);
      setCompressionProgress(0);
    }
  };

  const removePreview = (index) => {
    const newFiles = uploadFiles.filter((_, i) => i !== index);
    const newPreviews = uploadPreviews.filter((_, i) => i !== index);
    setUploadFiles(newFiles);
    setUploadPreviews(newPreviews);
  };

  const handleUpload = () => {
    if (!uploadTitle || uploadFiles.length === 0 || uploadPreviews.length === 0) {
      setUploadError('Please fill all fields and select file(s)');
      return;
    }

    try {
      let newContent;

      if (uploadType === 'slideshow' && uploadPreviews.length > 1) {
        newContent = {
          id: Date.now(),
          title: uploadTitle,
          type: 'slideshow',
          duration: parseInt(uploadDuration),
          thumbnail: uploadPreviews[0],
          fileUrl: uploadPreviews[0],
          slides: uploadPreviews,
          slideCount: uploadPreviews.length,
          createdAt: new Date().toISOString().split('T')[0],
          custom: true
        };
      } else {
        newContent = {
          id: Date.now(),
          title: uploadTitle,
          type: uploadType,
          duration: parseInt(uploadDuration),
          thumbnail: uploadPreviews[0],
          fileUrl: uploadPreviews[0],
          createdAt: new Date().toISOString().split('T')[0],
          custom: true
        };
      }

      const stored = localStorage.getItem('customContent');
      const customContent = stored ? JSON.parse(stored) : [];
      customContent.push(newContent);
      localStorage.setItem('customContent', JSON.stringify(customContent));

      loadContent();

      setUploadTitle('');
      setUploadType('image');
      setUploadDuration(10);
      setUploadFiles([]);
      setUploadPreviews([]);
      setUploadError('');
      setShowUploadModal(false);

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'customContent',
        newValue: JSON.stringify(customContent)
      }));
    } catch (error) {
      console.error('Save error:', error);
      setUploadError('Failed to save content. Storage might be full. Try uploading fewer images.');
    }
  };

  const confirmDelete = (content) => {
    setDeleteContent(content);
    setShowDeleteModal(true);
  };

  const handleDelete = () => {
    if (deleteContent) {
      const stored = localStorage.getItem('customContent');
      const customContent = stored ? JSON.parse(stored) : [];
      const filtered = customContent.filter(c => c.id !== deleteContent.id);
      localStorage.setItem('customContent', JSON.stringify(filtered));
      
      loadContent();
      setShowDeleteModal(false);
      setDeleteContent(null);

      window.dispatchEvent(new StorageEvent('storage', {
        key: 'customContent',
        newValue: JSON.stringify(filtered)
      }));
    }
  };

  // SMART SELECTION: Auto multi-select when clicking multiple items
  const handleItemSelect = (content) => {
    setSelectedItems(prev => {
      const exists = prev.find(item => item.id === content.id);
      
      if (exists) {
        // Deselect item
        return prev.filter(item => item.id !== content.id);
      } else {
        // Add to selection
        return [...prev, content];
      }
    });
  };

  const handleAssignClick = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one content item');
      return;
    }

    // Store only IDs in localStorage
    const contentIds = selectedItems.map(item => item.id);
    localStorage.setItem('bulkAssignContentIds', JSON.stringify(contentIds));
    
    // Store in Context for immediate access
    setBulkAssignContent(selectedItems);
    
    // Navigate based on selection count
    if (selectedItems.length === 1) {
      window.location.href = '/assign';
    } else {
      window.location.href = '/assign?bulk=true';
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const filteredContent = contentList.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || content.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="content-library">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-collection-play me-2"></i>
          Content Library
        </h2>
      </div>

      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4} className="mb-3">
          <Form.Select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="video">Videos</option>
            <option value="image">Images</option>
            <option value="slideshow">Slideshows</option>
          </Form.Select>
        </Col>
        <Col md={2} className="mb-3">
          <Button 
            variant="primary" 
            className="w-100"
            onClick={() => setShowUploadModal(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Upload
          </Button>
        </Col>
      </Row>

      {/* Selection Info Bar */}
      {selectedItems.length > 0 && (
        <Alert variant="primary" className="d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-check-circle me-2"></i>
            <strong>{selectedItems.length}</strong> item(s) selected
            {selectedItems.length > 1 && <Badge bg="success" className="ms-2">Multi-Select</Badge>}
          </span>
          <div className="d-flex gap-2">
            <Button variant="success" onClick={handleAssignClick}>
              <i className="bi bi-arrow-right-circle me-2"></i>
              Assign to Screens
            </Button>
            <Button variant="outline-secondary" onClick={clearSelection}>
              <i className="bi bi-x-circle me-2"></i>
              Clear
            </Button>
          </div>
        </Alert>
      )}

      <Row>
        {filteredContent.length === 0 ? (
          <Col>
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3">No content uploaded yet</p>
              <Button variant="primary" onClick={() => setShowUploadModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Upload Your First Content
              </Button>
            </div>
          </Col>
        ) : (
          filteredContent.map(content => {
            const isSelected = selectedItems.find(item => item.id === content.id);
            
            return (
              <Col key={content.id} lg={3} md={4} sm={6} className="mb-4">
                <div className={`content-card-wrapper ${isSelected ? 'selected' : ''}`}>
                  <ContentCard 
                    content={content} 
                    onSelect={handleItemSelect}
                    isSelected={!!isSelected}
                    onDelete={() => confirmDelete(content)}
                    showDelete={true}
                  />
                </div>
              </Col>
            );
          })
        )}
      </Row>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload New Content</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {uploadError && (
            <Alert variant="danger" dismissible onClose={() => setUploadError('')}>
              {uploadError}
            </Alert>
          )}

          {isCompressing && (
            <Alert variant="info">
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm me-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="flex-grow-1">
                  <div>Compressing images...</div>
                  <ProgressBar now={compressionProgress} label={`${compressionProgress}%`} className="mt-2" />
                </div>
              </div>
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Content Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Medical Center Slideshow"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Content Type *</Form.Label>
                  <Form.Select 
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    disabled={isCompressing}
                  >
                    <option value="image">Single Image</option>
                    <option value="video">Video</option>
                    <option value="slideshow">Slideshow (Multiple Images)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Duration per {uploadType === 'slideshow' ? 'Slide' : 'Item'} (seconds) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={uploadDuration}
                    onChange={(e) => setUploadDuration(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>
                Upload File(s) * (Auto-compressed to save space)
                {uploadType === 'slideshow' && <Badge bg="info" className="ms-2">Multiple files allowed</Badge>}
              </Form.Label>
              <Form.Control
                type="file"
                accept={uploadType === 'video' ? 'video/*' : 'image/*'}
                multiple={uploadType === 'slideshow'}
                onChange={handleFileSelect}
                disabled={isCompressing}
              />
              <Form.Text className="text-muted">
                {uploadType === 'slideshow' 
                  ? 'Select multiple images (will be auto-compressed). Recommended: 4-8 images.'
                  : uploadType === 'video'
                  ? 'Supported: MP4, WebM (max 5MB)'
                  : 'Supported: JPG, PNG, GIF (auto-compressed)'}
              </Form.Text>
            </Form.Group>

            {uploadPreviews.length > 0 && !isCompressing && (
              <div className="upload-preview mb-3">
                <Form.Label>
                  Preview: {uploadPreviews.length > 1 && `(${uploadPreviews.length} files)`}
                </Form.Label>
                <div className="preview-grid">
                  {uploadPreviews.map((preview, index) => (
                    <div key={index} className="preview-item">
                      {uploadType === 'video' ? (
                        <video src={preview} controls className="preview-media-small" />
                      ) : (
                        <img src={preview} alt={`Preview ${index + 1}`} className="preview-media-small" />
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        className="remove-preview-btn"
                        onClick={() => removePreview(index)}
                      >
                        <i className="bi bi-x"></i>
                      </Button>
                      <div className="preview-number">{index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpload}
            disabled={isCompressing || uploadPreviews.length === 0}
          >
            <i className="bi bi-cloud-upload me-2"></i>
            Upload {uploadPreviews.length > 1 ? `${uploadPreviews.length} Files` : 'Content'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3 mb-0">Are you sure you want to delete:</p>
            <p className="fw-bold">{deleteContent?.title}</p>
            <p className="text-muted">This action cannot be undone.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <i className="bi bi-trash me-2"></i>
            Delete Content
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ContentLibrary;
