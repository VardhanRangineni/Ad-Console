import React from 'react';
import PropTypes from 'prop-types';
import { Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import './KpiCard.css';

function KpiCard({
  title,
  left,
  right,
  bgClass,
  onClickLeft,
  onClickRight,
  centerBottom,
  role,
  tabIndex
}) {
  const hasCardClick = Boolean(onClickLeft || onClickRight);

  // Handle card-level click
  const handleCardClick = (e) => {
    if (onClickLeft) {
      onClickLeft(e);
    } else if (onClickRight) {
      onClickRight(e);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback(e);
    }
  };

  // Stop event propagation for nested clicks
  const handleNestedClick = (e, callback) => {
    e.stopPropagation();
    if (callback) callback(e);
  };

  // Render KPI section (left or right)
  const renderKpiSection = (data, onClick, alignment = 'left') => {
    const isRight = alignment === 'right';
    const wrapperClass = isRight ? 'kpi-right text-end' : 'kpi-left';
    const mainClass = isRight
      ? 'kpi-right-main d-flex align-items-center justify-content-end'
      : 'kpi-left-main d-flex align-items-center';
    const valueClass = isRight ? 'kpi-right-value' : 'kpi-main-value';
    const labelClass = isRight ? 'kpi-number-label kpi-number-label-right' : 'kpi-number-label';

    return (
      <div className={wrapperClass}>
        <div
          className={mainClass}
          onClick={(e) => handleNestedClick(e, onClick)}
          onKeyDown={(e) => onClick && handleKeyDown(e, onClick)}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          aria-label={data?.sub ? String(data.sub) : `${alignment} kpi`}
        >
          <div className={`kpi-num-wrapper${isRight ? ' text-end' : ''}`}>
            <h2 className={`mb-0 ${valueClass}`}>{data?.main}</h2>
            {data?.label && (
              <div className={labelClass}>{data.label}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render header with optional info tooltip
  const renderHeader = () => {
    if (!right?.header) return null;

    return (
      <div className="kpi-header-right d-flex align-items-center">
        <h6 className="kpi-title mb-4 text-end kpi-title-right">
          {right.header}
        </h6>
        {right.info && (
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip id="kpi-right-header-info">{right.info}</Tooltip>
            }
          >
            <i
              className="bi bi-info-circle ms-2 kpi-header-icon align-self-baseline"
              aria-label="Additional information"
              role="img"
            />
          </OverlayTrigger>
        )}
      </div>
    );
  };

  // Render bottom row with sub-items
  const renderBottomRow = () => {
    if (!left?.subItems && !right?.subItems) return null;

    const onlyLeft = left?.subItems && !right?.subItems;
    const onlyRight = right?.subItems && !left?.subItems;
    const shouldCenter = centerBottom || onlyLeft || onlyRight;

    return (
      <div className={`d-flex justify-content-between align-items-center kpi-bottom${shouldCenter ? ' kpi-bottom-centered' : ''}`}>
        <div className="kpi-bottom-left d-flex align-items-center">
          {left?.subItems?.map((item, idx) => (
            <div key={`left-sub-${idx}`} className="me-3">
              {item}
            </div>
          ))}
        </div>
        <div className="kpi-bottom-right d-flex align-items-center">
          {right?.subItems?.map((item, idx) => (
            <div key={`right-sub-${idx}`} className="me-3">
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card
      className={`kpi-card ${bgClass}`}
      role={hasCardClick ? role : undefined}
      tabIndex={hasCardClick ? tabIndex : undefined}
      onClick={hasCardClick ? handleCardClick : undefined}
      onKeyDown={hasCardClick ? (e) => handleKeyDown(e, handleCardClick) : undefined}
    >
      <Card.Body className="kpi-body">
        {/* Header Row */}
        <div className="d-flex justify-content-between align-items-center kpi-header-row">
          <h6 className="kpi-title mb-4">{title}</h6>
          {renderHeader()}
        </div>

        {/* Main KPI Values Row */}
        <div className="d-flex justify-content-between align-items-center mb-2 kpi-main-row">
          {renderKpiSection(left, onClickLeft, 'left')}
          {renderKpiSection(right, onClickRight, 'right')}
        </div>

        {/* Bottom Sub-Items Row */}
        {renderBottomRow()}
      </Card.Body>
    </Card>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  left: PropTypes.shape({
    main: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    sub: PropTypes.node,
    subItems: PropTypes.arrayOf(PropTypes.node),
    header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    info: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  }),
  right: PropTypes.shape({
    main: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    sub: PropTypes.node,
    subItems: PropTypes.arrayOf(PropTypes.node),
    header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    info: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  }),
  bgClass: PropTypes.string,
  onClickLeft: PropTypes.func,
  onClickRight: PropTypes.func,
  centerBottom: PropTypes.bool,
  role: PropTypes.string,
  tabIndex: PropTypes.number,
};

KpiCard.defaultProps = {
  left: {},
  right: {},
  bgClass: 'bg-light',
  centerBottom: false,
  role: 'button',
  tabIndex: 0,
  onClickLeft: null,
  onClickRight: null,
};

export default KpiCard;
