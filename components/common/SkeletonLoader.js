function SkeletonLoader({ type = 'card', count = 1 }) {
    try {
        const renderSkeleton = () => {
            if (type === 'card') {
                return React.createElement('div', {
                    className: 'bg-white p-6 rounded-lg shadow animate-pulse'
                }, [
                    React.createElement('div', {
                        key: 'line1',
                        className: 'h-4 bg-gray-200 rounded w-3/4 mb-4'
                    }),
                    React.createElement('div', {
                        key: 'line2',
                        className: 'h-3 bg-gray-200 rounded w-1/2 mb-2'
                    }),
                    React.createElement('div', {
                        key: 'line3',
                        className: 'h-3 bg-gray-200 rounded w-1/4'
                    })
                ]);
            }
            
            if (type === 'list') {
                return React.createElement('div', {
                    className: 'bg-white p-4 rounded-lg border animate-pulse'
                }, [
                    React.createElement('div', {
                        key: 'line1',
                        className: 'h-4 bg-gray-200 rounded w-2/3 mb-3'
                    }),
                    React.createElement('div', {
                        key: 'line2',
                        className: 'h-3 bg-gray-200 rounded w-1/2'
                    })
                ]);
            }
            
            return React.createElement('div', {
                className: 'h-4 bg-gray-200 rounded animate-pulse'
            });
        };

        return React.createElement('div', {
            className: 'space-y-4'
        }, Array.from({ length: count }, (_, index) =>
            React.createElement('div', {
                key: index
            }, renderSkeleton())
        ));
    } catch (error) {
        return React.createElement('div', {
            className: 'text-gray-500'
        }, 'Loading...');
    }
}

window.SkeletonLoader = SkeletonLoader;