import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AsideBar.css';

// Navigation configuration - easier to maintain
const NAV_ITEMS = [
  {
    to: '/',
    icon: 'bi-speedometer2',
    label: 'Dashboard'
  },
  {
    to: '/content',
    icon: 'bi-collection-play',
    label: 'Content Library'
  },
  {
    icon: 'bi-plus-circle',
    label: 'Playlists',
    submenu: [
      { to: '/assign', label: 'Create' },
      { to: '/manage-playlists', label: 'Dashboard' },
    ],
  },
  {
    icon: 'bi-hdd-network',
    label: 'Devices',
    submenu: [
      { to: '/devices', label: 'Device Types' },
      { to: '/settings', label: 'Store Device Mapping' },
    ],
  },
];

const ASIDE_WIDTH = {
  collapsed: '60px',
  expanded: '220px',
};

function AsideBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState({});

  // Update CSS variable for responsive layout
  useEffect(() => {
    const width = collapsed ? ASIDE_WIDTH.collapsed : ASIDE_WIDTH.expanded;
    document.documentElement.style.setProperty('--aside-width', width);
  }, [collapsed]);

  // Toggle sidebar collapse state
  const toggleSidebar = () => setCollapsed(prev => !prev);

  // Handle menu item click - toggle submenu and navigate
  const handleMenuClick = (item) => {
    if (!item.submenu) return;

    setOpenMenus(prev => ({
      ...prev,
      [item.label]: !prev[item.label]
    }));

    // Navigate to first submenu item
    if (item.submenu.length > 0) {
      navigate(item.submenu[0].to);
    }
  };

  // Handle keyboard navigation for accessibility
  const handleKeyDown = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  // Render individual nav link
  const renderNavLink = (item) => (
    <Link
      key={item.to}
      to={item.to}
      className={`aside-link${location.pathname === item.to ? ' active' : ''}`}
      title={item.label}
    >
      <i className={`bi ${item.icon} me-2`}></i>
      {!collapsed && item.label}
    </Link>
  );

  // Render menu with submenu
  const renderMenuGroup = (item) => {
    const isOpen = openMenus[item.label];

    return (
      <div key={item.label} className="aside-menu-group">
        <button
          className={`aside-link aside-menu-parent${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}
          onClick={() => handleMenuClick(item)}
          title={item.label}
          type="button"
          aria-expanded={isOpen}
        >
          <i className={`bi ${item.icon} me-2`}></i>
          {!collapsed && item.label}
          {!collapsed && (
            <i className={`bi ms-auto ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          )}
        </button>

        {/* Submenu items */}
        <div
          className={`aside-submenu${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}
          role="menu"
        >
          {item.submenu.map(sub => (
            <Link
              key={sub.to}
              to={sub.to}
              className={`aside-link aside-sublink${location.pathname === sub.to ? ' active' : ''}`}
              title={sub.label}
              role="menuitem"
            >
              {!collapsed && sub.label}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className={`aside-bar${collapsed ? ' closed' : ' open'}`}>
      {/* Header with logo and brand */}
      <div className="aside-header">
        <span
          className="brand"
          onClick={toggleSidebar}
          onKeyDown={(e) => handleKeyDown(e, toggleSidebar)}
          role="button"
          tabIndex={0}
          aria-label="Toggle sidebar"
        >
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGn4Ly_AHVmUJ7QEnVHNWOpmUdTDteZ5cXzA&s"
            alt="Ad Console HQ"
            className="aside-logo me-2"
          />
          {!collapsed && 'Ad Console'}
        </span>
      </div>

      {/* Navigation menu */}
      <nav className="aside-nav" role="navigation">
        {NAV_ITEMS.map(item =>
          item.submenu ? renderMenuGroup(item) : renderNavLink(item)
        )}
      </nav>

      {/* Footer toggle button */}
      <footer className="aside-bar-footer">
        <button
          className="aside-toggle-btn"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
        </button>
      </footer>
    </aside>
  );
}

export default AsideBar;
