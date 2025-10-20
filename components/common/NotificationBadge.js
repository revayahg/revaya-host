// Notification Badge Component for Header
function NotificationBadge() {
    const [unreadCount, setUnreadCount] = React.useState(0);
    const { user } = React.useContext(AuthContext);
    const subscriptionRef = React.useRef(null);

    React.useEffect(() => {
        if (user) {
            loadUnreadCount();
            setupRealtimeSubscription();
        }

        return () => {
            if (subscriptionRef.current) {
                notificationAPI.unsubscribeFromNotifications(subscriptionRef.current);
            }
        };
    }, [user]);

    const loadUnreadCount = async () => {
        try {
            const count = await notificationAPI.getUnreadCount(user.id);
            setUnreadCount(count);
        } catch (error) {
        }
    };

    const setupRealtimeSubscription = () => {
        if (subscriptionRef.current) {
            notificationAPI.unsubscribeFromNotifications(subscriptionRef.current);
        }

        subscriptionRef.current = notificationAPI.subscribeToNotifications(
            user.id,
            (newNotification) => {
                // Increment unread count when new notification arrives
                setUnreadCount(prev => prev + 1);
                
                // Show browser notification if permission granted
                if (Notification.permission === 'granted') {
                    new Notification(newNotification.title, {
                        body: newNotification.message,
                        icon: '/favicon-32x32.png'
                    });
                }
            }
        );
    };

    // Request notification permission on first load
    React.useEffect(() => {
        if (user && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [user]);

    if (!user || unreadCount === 0) {
        return React.createElement('div', {
            className: 'icon-bell text-xl text-gray-600'
        });
    }

    return React.createElement('div', {
        className: 'relative',
        'data-name': 'notification-badge',
        'data-file': 'components/common/NotificationBadge.js'
    }, [
        React.createElement('div', {
            key: 'icon',
            className: 'icon-bell text-xl text-gray-600'
        }),
        React.createElement('div', {
            key: 'badge',
            className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse'
        }, unreadCount > 99 ? '99+' : unreadCount.toString())
    ]);
}

window.NotificationBadge = NotificationBadge;