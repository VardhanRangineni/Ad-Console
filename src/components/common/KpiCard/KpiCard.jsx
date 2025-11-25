import React from 'react';
import PropTypes from 'prop-types';
import { Card } from 'react-bootstrap';
import './KpiCard.css';

function KpiCard({ title, left, right, bgClass = 'bg-light', onClickLeft, onClickRight, role = 'button', tabIndex = 0 }) {
  const hasClick = Boolean(onClickLeft || onClickRight);
  const handleCardClick = (e) => {
    if (onClickLeft) return onClickLeft(e);
    if (onClickRight) return onClickRight(e);
  };
  const handleCardKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClickLeft) {
      e.preventDefault();
      onClickLeft(e);
    }
  };
  return (
    <Card
      className={`kpi-card ${bgClass}`}
      role={hasClick ? role : undefined}
      tabIndex={hasClick ? tabIndex : undefined}
      onClick={hasClick ? handleCardClick : undefined}
      onKeyDown={hasClick ? handleCardKeyDown : undefined}
    >
      <Card.Body className="kpi-body">
          <div className="d-flex justify-content-between">
            <h6 className="kpi-title mb-4">{title}</h6>
          </div>
          <div className="d-flex justify-content-between kpi-label-row">
            <div className="kpi-left-label small text-muted">{left.sub}</div>
            <div className="kpi-right-label small text-muted">{right.sub}</div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2 kpi-main-row">
            <div className="kpi-left">
              <div className="kpi-left-main d-flex align-items-center" onClick={(e) => { e.stopPropagation(); if (onClickLeft) onClickLeft(e); }} role={onClickLeft ? 'button' : undefined} tabIndex={0} aria-label={left && left.sub ? String(left.sub) : 'left kpi'}>
                <h2 className="mb-0 kpi-main-value">{left.main}</h2>
                {/* Left subItems displayed in the centered bottom row */}
              </div>
            </div>
            <div className="kpi-right text-end">
              <div className="kpi-right-main d-flex align-items-center justify-content-end" onClick={(e) => { e.stopPropagation(); if (onClickRight) onClickRight(e); }} role={onClickRight ? 'button' : undefined} tabIndex={0} aria-label={right && right.sub ? String(right.sub) : 'right kpi'}>
                {/* Right subItems displayed in the centered bottom row */}
                <h2 className="mb-0 kpi-right-value">{right.main}</h2>
              </div>
            </div>
          </div>
          {/* Bottom badges anchored under each column (absolute positioned so card height stays fixed) */}
          {left.subItems && (
            <div className="kpi-bottom-left d-flex align-items-center">
              {left.subItems.map((s, idx) => (
                <div key={`l-${idx}`} className="me-3">{s}</div>
              ))}
            </div>
          )}
          {right.subItems && (
            <div className="kpi-bottom-right d-flex align-items-center">
              {right.subItems.map((s, idx) => (
                <div key={`r-${idx}`} className="me-3">{s}</div>
              ))}
            </div>
          )}
      </Card.Body>
    </Card>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  left: PropTypes.shape({ main: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), subItems: PropTypes.arrayOf(PropTypes.node) }).isRequired,
  right: PropTypes.shape({ main: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), sub: PropTypes.node }).isRequired,
  bgClass: PropTypes.string,
  onClickLeft: PropTypes.func,
  onClickRight: PropTypes.func,
};

export default KpiCard;
