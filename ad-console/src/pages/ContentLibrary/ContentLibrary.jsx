import React, { useState, useEffect } from 'react';
import { Row, Col, Form, InputGroup, Button, Modal, Alert, Badge, ProgressBar } from 'react-bootstrap';
import imageCompression from 'browser-image-compression';
import { mockContent } from '../../data/mockContent';
import ContentCard from '../../components/ContentCard/ContentCard';
import { useApp } from '../../context/AppContext';
import './ContentLibrary.css';

function ContentLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [contentList, setContentList] = useState([]);
  const { selectedContent, setSelectedContent } = useApp();

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('image');
  const [uploadDuration, setUploadDuration] = useState(10);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadPreviews, setUploadPreviews] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = () => {
    const stored = localStorage.getItem('customContent');
    const customContent = stored ? JSON.parse(stored) : [];
    setContentList([...mockContent, ...customContent]);
  };

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 0.5, // Compress to max 500KB
      maxWidthOrHeight: 1920, // Max dimension
      useWebWorker: true,
      fileType: 'image/jpeg' // Convert to JPEG for better compression
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

    // Check if slideshow type is selected for multiple files
    if (files.length > 1 && uploadType !== 'slideshow') {
      setUploadType('slideshow');
      setIsSlideshow(true);
    }

    try {
      const previews = [];
      const compressedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setCompressionProgress(Math.round(((i + 1) / files.length) * 100));

        // Compress image
        let processedFile = file;
        if (file.type.startsWith('image/')) {
          processedFile = await compressImage(file);
        }

        compressedFiles.push(processedFile);

        // Create preview
        const reader = new FileReader();
        const preview = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(processedFile);
        });

        previews.push(preview);
      }

      // Check total size after compression
      const totalSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
      
      console.log(`Total compressed size: ${totalSizeMB}MB`);

      if (totalSize > 8 * 1024 * 1024) { // 8MB limit
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

    if (newFiles.length <= 1) {
      setIsSlideshow(false);
    }
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

      // Reset form
      setUploadTitle('');
      setUploadType('image');
      setUploadDuration(10);
      setUploadFiles([]);
      setUploadPreviews([]);
      setUploadError('');
      setIsSlideshow(false);
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

  const filteredContent = contentList.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || content.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="content-library">
      <h2 className="mb-4">
        <i className="bi bi-collection-play me-2"></i>
        Content Library
      </h2>

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

      <Row>
        {filteredContent.length === 0 ? (
          <Col>
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3">No content found</p>
            </div>
          </Col>
        ) : (
          filteredContent.map(content => (
            <Col key={content.id} lg={3} md={4} sm={6} className="mb-4">
              <ContentCard 
                content={content} 
                onSelect={setSelectedContent}
                isSelected={selectedContent?.id === content.id}
              />
            </Col>
          ))
        )}
      </Row>

      {selectedContent && (
        <div className="floating-action">
          <Button 
            variant="success" 
            size="lg"
            onClick={() => window.location.href = '/assign'}
          >
            <i className="bi bi-arrow-right-circle me-2"></i>
            Assign Selected Content
          </Button>
        </div>
      )}

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
                    onChange={(e) => {
                      setUploadType(e.target.value);
                      if (e.target.value === 'slideshow') {
                        setIsSlideshow(true);
                      }
                    }}
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
    </div>
  );
}

export default ContentLibrary;
