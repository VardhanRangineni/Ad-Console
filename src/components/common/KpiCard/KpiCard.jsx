import React from 'react';
import PropTypes from 'prop-types';
import { Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import './KpiCard.css';

function KpiCard({ title, left = {}, right = {}, bgClass = 'bg-light', onClickLeft, onClickRight, role = 'button', tabIndex = 0, centerBottom = false }) {
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
          <div className="d-flex justify-content-between align-items-center kpi-header-row">
            <h6 className="kpi-title mb-4">{title}</h6>
            {right && right.header ? (
              <div className="kpi-header-right d-flex align-items-center">
                <h6 className="kpi-title mb-4 text-end kpi-title-right">{right.header}</h6>
                {right.info ? (
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id={`kpi-right-header-info`}>{right.info}</Tooltip>}>
                    <i className="bi align-self-baseline bi-info-circle ms-2 kpi-header-icon" aria-hidden="true" role="img" aria-label="info"></i>
                  </OverlayTrigger>
                ) : null}
              </div>
            ) : null}
          </div>
          {/* Title only: do not render subtitle/label row; displays only the `title` text */}
          <div className="d-flex justify-content-between align-items-center mt-2 kpi-main-row">
            <div className="kpi-left">
              <div className="kpi-left-main d-flex align-items-center" onClick={(e) => { e.stopPropagation(); if (onClickLeft) onClickLeft(e); }} role={onClickLeft ? 'button' : undefined} tabIndex={0} aria-label={left && left.sub ? String(left.sub) : 'left kpi'}>
                <div className="kpi-num-wrapper">
                  <h2 className="mb-0 kpi-main-value">{left.main}</h2>
                  {left.label ? <div className="kpi-number-label">{left.label}</div> : null}
                </div>
                {/* Left subItems displayed in the centered bottom row */}
              </div>
            </div>
            <div className="kpi-right text-end">
              <div className="kpi-right-main d-flex align-items-center justify-content-end" onClick={(e) => { e.stopPropagation(); if (onClickRight) onClickRight(e); }} role={onClickRight ? 'button' : undefined} tabIndex={0} aria-label={right && right.sub ? String(right.sub) : 'right kpi'}>
                {/* Right subItems displayed in the centered bottom row */}
                <div className="kpi-num-wrapper text-end">
                  <h2 className="mb-0 kpi-right-value">{right.main}</h2>
                  {right.label ? <div className="kpi-number-label kpi-number-label-right">{right.label}</div> : null}
                </div>
              </div>
            </div>
          </div>
          {/* Bottom badges row: shows left and right side subItems in a single bottom row */}
          {(left.subItems || right.subItems) && (() => {
            const onlyLeft = left.subItems && !right.subItems;
            const onlyRight = right.subItems && !left.subItems;
            const alignClass = centerBottom || (onlyLeft || onlyRight) ? 'kpi-bottom-centered' : '';
            return (
              <div className={`d-flex justify-content-between kpi-bottom ${alignClass} align-items-center `}>
              <div className="kpi-bottom-left d-flex align-items-center">
                {left.subItems && left.subItems.map((s, idx) => (
                  <div key={`l-${idx}`} className="me-3">{s}</div>
                ))}
              </div>
              <div className="kpi-bottom-right d-flex align-items-center">
                {right.subItems && right.subItems.map((s, idx) => (
                  <div key={`r-${idx}`} className="me-3">{s}</div>
                ))}
              </div>
              </div>
            );
          })()}
      </Card.Body>
    </Card>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  left: PropTypes.shape({ main: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), subItems: PropTypes.arrayOf(PropTypes.node), sub: PropTypes.node, label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]), header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]), info: PropTypes.oneOfType([PropTypes.string, PropTypes.node]) }),
  right: PropTypes.shape({ main: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), subItems: PropTypes.arrayOf(PropTypes.node), sub: PropTypes.node, label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]), header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]), info: PropTypes.oneOfType([PropTypes.string, PropTypes.node]) }),
  bgClass: PropTypes.string,
  onClickLeft: PropTypes.func,
  onClickRight: PropTypes.func,
  centerBottom: PropTypes.bool,
};

export default KpiCard;

KpiCard.defaultProps = {
  left: {},
  right: {},
  centerBottom: false,
};
