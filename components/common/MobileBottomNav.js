function MobileBottomNav({ activeTab, onTabChange }) {
    const navItems = [
        { id: 'dashboard', icon: 'icon-home', label: 'Home' },
        { id: 'events', icon: 'icon-calendar', label: 'Events' },
        { id: 'tasks', icon: 'icon-list-checks', label: 'Tasks' },
        { id: 'messages', icon: 'icon-message-circle', label: 'Chat' },
        { id: 'notifications', icon: 'icon-bell', label: 'Alerts' }
    ];

    const handleNavClick = (tabId) => {
        onTabChange(tabId);
        
        // Scroll to top when changing tabs
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="mobile-bottom-nav md:hidden">
            <div className="mobile-nav-items">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`mobile-nav-item ${
                            activeTab === item.id ? 'active' : ''
                        }`}
                    >
                        <div className={`${item.icon} text-lg`}></div>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

window.MobileBottomNav = MobileBottomNav;