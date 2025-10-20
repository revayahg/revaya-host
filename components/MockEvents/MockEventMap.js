function MockEventMap() {
    try {
        const mockMapUrl = 'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/52342d10-83a4-4bb3-a7b5-27c7ba18f2d7.webp';

        return React.createElement('section', { 
            'data-name': 'mock-map', 
            className: 'bg-white rounded-lg p-6 shadow-sm' 
        },
            React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Event Map'),
            React.createElement('img', {
                src: mockMapUrl,
                alt: 'Event Map',
                className: 'w-full rounded-lg'
            })
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.MockEventMap = MockEventMap;
