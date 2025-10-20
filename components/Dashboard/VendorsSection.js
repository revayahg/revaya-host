function VendorsSection({ vendors = [], onDeleteVendor, loading = false }) {
    try {
        if (loading) {
            return React.createElement('div', {
                className: 'space-y-6'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-xl font-semibold text-gray-900'
                }, 'My Vendor Profiles'),
                window.SkeletonLoader ? React.createElement(window.SkeletonLoader, {
                    key: 'skeleton',
                    type: 'card',
                    count: 3
                }) : React.createElement('div', {
                    key: 'loading',
                    className: 'text-center py-8'
                }, 'Loading vendor profiles...')
            ]);
        }

        if (vendors.length === 0) {
            return React.createElement('div', {
                className: 'text-center py-12'
            }, [
                React.createElement('div', {
                    key: 'icon',
                    className: 'text-gray-400 mb-4'
                }, React.createElement('i', { className: 'fas fa-store fa-3x' })),
                React.createElement('h3', {
                    key: 'title',
                    className: 'text-lg font-medium text-gray-900 mb-2'
                }, 'No vendor profiles yet'),
                React.createElement('p', {
                    key: 'desc',
                    className: 'text-gray-500 mb-4'
                }, 'Create a vendor profile to offer your services'),
                React.createElement('a', {
                    key: 'create-btn',
                    href: '#/vendor-form',
                    className: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700'
                }, [
                    React.createElement('i', { key: 'icon', className: 'fas fa-plus mr-2' }),
                    'Create Vendor Profile'
                ])
            ]);
        }

        return React.createElement('div', {
            className: 'space-y-6'
        }, [
            React.createElement('h2', {
                key: 'title',
                className: 'text-xl font-semibold text-gray-900'
            }, 'My Vendor Profiles'),
            React.createElement('div', {
                key: 'grid',
                className: 'grid gap-6'
            }, vendors.map(vendor =>
                React.createElement('div', {
                    key: vendor.id,
                    className: 'bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow'
                }, React.createElement('div', {
                    className: 'flex justify-between items-start'
                }, [
                    React.createElement('div', {
                        key: 'content',
                        className: 'flex-1'
                    }, [
                        React.createElement('a', {
                            key: 'title',
                            href: `#/vendor/view/${vendor.id}`,
                            className: 'block hover:text-indigo-600 transition-colors'
                        }, React.createElement('h3', {
                            className: 'text-lg font-medium text-gray-900'
                        }, vendor.company || vendor.name || 'Unknown Vendor')),
                        React.createElement('p', {
                            key: 'category',
                            className: 'mt-1 text-sm text-gray-500'
                        }, vendor.category || 'General Services')
                    ]),
                    React.createElement('div', {
                        key: 'actions',
                        className: 'flex space-x-3'
                    }, [
                        React.createElement('a', {
                            key: 'edit',
                            href: `#/vendor/edit/${vendor.id}`,
                            className: 'inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
                        }, [
                            React.createElement('i', { key: 'icon', className: 'fas fa-edit mr-2' }),
                            'Edit'
                        ]),
                        React.createElement('button', {
                            key: 'delete',
                            onClick: () => onDeleteVendor(vendor.id),
                            className: 'inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700'
                        }, [
                            React.createElement('i', { key: 'icon', className: 'fas fa-trash-alt mr-2' }),
                            'Delete'
                        ])
                    ])
                ]))
            ))
        ]);
    } catch (error) {
        return React.createElement('div', {
            className: 'p-4 bg-red-50 border border-red-200 rounded-lg'
        }, [
            React.createElement('h3', {
                key: 'error-title',
                className: 'text-red-800 font-medium'
            }, 'Error Loading Vendor Profiles'),
            React.createElement('p', {
                key: 'error-message',
                className: 'text-red-600 text-sm mt-1'
            }, 'There was an issue loading your vendor profiles.')
        ]);
    }
}

window.VendorsSection = VendorsSection;

// Also export for potential named imports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VendorsSection;
}
