import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AsideBar.css';


function AsideBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  // Navigation structure with submenus for Playlists and Devices
  const navItems = [
    { to: '/', icon: 'bi-speedometer2', label: 'Dashboard' },
    { to: '/content', icon: 'bi-collection-play', label: 'Content Library' },
    {
      icon: 'bi-plus-circle',
      label: 'Playlists',
      submenu: [
        { to: '/assign', label: 'Create' },
        { to: '/manage-playlists', label: 'Manage' },
      ],
    },
    {
      icon: 'bi-hdd-network',
      label: 'Devices',
      submenu: [
        { to: '/devices', label: 'Add Device' },
        { to: '/settings', label: 'Device Store Mapping' },
      ],
    },
    { to: '/monitor', icon: 'bi-tv', label: 'Monitor' },
  ];

  useEffect(() => {
    // Update CSS variable so other parts of the app can react to the aside width
    const root = document.documentElement;
    if (collapsed) {
      root.style.setProperty('--aside-width', '60px');
    } else {
      root.style.setProperty('--aside-width', '220px');
    }
    return () => {};
  }, [collapsed]);

  // Toggle submenu open/close
  const handleMenuClick = (item) => {
    setOpenMenus((prev) => ({ ...prev, [item.label]: !prev[item.label] }));
    if (item.submenu && item.submenu.length > 0) {
      navigate(item.submenu[0].to);
    }
  };

  return (
    <aside className={`aside-bar${collapsed ? ' collapsed' : ''}`}>  
      <div className="aside-header">
        <span className="brand" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setCollapsed(c => !c)}>
          <i className="bi bi-display me-2"></i>
          {!collapsed && 'Ad Console HQ'}
        </span>
        {/* Show close icon only when expanded */}
        {!collapsed && (
          <button className="collapse-btn" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar">
            <i className="bi bi-x"></i>
          </button>
        )}
      </div>
      <nav className="aside-nav">
        {navItems.map(item => (
          item.submenu ? (
            <div key={item.label} className="aside-menu-group">
              <button
                className={`aside-link aside-menu-parent${openMenus[item.label] ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}
                onClick={() => handleMenuClick(item)}
                title={item.label}
                type="button"
              >
                <i className={`bi ${item.icon} me-2`}></i>
                {!collapsed && item.label}
                {!collapsed && (
                  <i className={`bi ms-auto ${openMenus[item.label] ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                )}
              </button>
              {/* Submenu */}
              <div className={`aside-submenu${openMenus[item.label] ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
                {item.submenu.map(sub => (
                  <Link
                    key={sub.to}
                    to={sub.to}
                    className={`aside-link aside-sublink${location.pathname === sub.to ? ' active' : ''}`}
                    title={sub.label}
                  >
                    {!collapsed && sub.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.to}
              to={item.to}
              className={`aside-link${location.pathname === item.to ? ' active' : ''}`}
              title={item.label}
            >
              <i className={`bi ${item.icon} me-2`}></i>
              {!collapsed && item.label}
            </Link>
          )
        ))}
      </nav>
    </aside>
  );
}

export default AsideBar;
