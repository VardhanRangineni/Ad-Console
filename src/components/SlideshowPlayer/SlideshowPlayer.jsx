import React, { useState, useEffect } from 'react';
import './SlideshowPlayer.css';

function SlideshowPlayer({ slides, duration }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!slides || slides.length === 0) return;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [currentSlide, slides, duration]);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="slideshow-player">
      <img
        src={slides[currentSlide]}
        alt={`Slide ${currentSlide + 1}`}
        className="slideshow-image"
      />
      <div className="slideshow-indicator">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
}

export default SlideshowPlayer;
