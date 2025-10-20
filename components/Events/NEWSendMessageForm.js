function NEWSendMessageForm({ eventId, assignedVendors = [], currentUser, selectedVendorId, onVendorSelect, onMessageSent }) {
    try {
        const [content, setContent] = React.useState('');
        const [sending, setSending] = React.useState(false);
        
        // Check if current user is a vendor
        const currentVendorProfileId = window.currentVendorProfileId;
        
        // Auto-select event planner for vendors if no selection
        React.useEffect(() => {
            if (currentVendorProfileId && !selectedVendorId) {
                if (onVendorSelect) {
                    onVendorSelect('event_planner');
                }
            }
        }, [currentVendorProfileId, selectedVendorId, onVendorSelect]);

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!selectedVendorId || !content.trim()) return;

            setSending(true);
            try {
                
                const messageId = await window.NEWMessageAPI.sendMessage(
                    eventId,
                    selectedVendorId,
                    content.trim()
                );

                setContent('');
                
                if (onMessageSent) {
                    onMessageSent();
                }
                
                window.showToast && window.showToast('Message sent', 'success');
            } catch (error) {
                
                let errorMessage = 'Failed to send message. Please try again.';
                if (error.message) {
                    if (error.message.includes('Thread creation failed')) {
                        errorMessage = 'Unable to create conversation thread. Please check your permissions.';
                    } else if (error.message.includes('Message creation failed')) {
                        errorMessage = 'Message could not be saved. Please try again.';
                    } else {
                        errorMessage = `Error: ${error.message}`;
                    }
                }
                
                window.showToast && window.showToast(errorMessage, 'error');
            } finally {
                setSending(false);
            }
        };

        return React.createElement('div', {
            className: 'border-t border-gray-200 p-4 bg-white'
        }, [
            React.createElement('form', {
                key: 'form',
                onSubmit: handleSubmit,
                className: 'space-y-3'
            }, [
                React.createElement('div', {
                    key: 'recipient-select',
                    className: 'flex items-center space-x-2'
                }, [
                    React.createElement('label', {
                        key: 'label',
                        className: 'text-sm font-medium text-gray-700'
                    }, 'To:'),
                    React.createElement('select', {
                        key: 'select',
                        value: selectedVendorId || '',
                        onChange: (e) => onVendorSelect && onVendorSelect(e.target.value),
                        className: 'flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                        required: true
                    }, [
                        React.createElement('option', {
                            key: 'placeholder',
                            value: '',
                            disabled: true
                        }, 'Select recipient...'),
                        // For vendors, show only Event Planner and All Participants
                        ...(currentVendorProfileId ? [
                            React.createElement('option', {
                                key: 'event_planner',
                                value: 'event_planner'
                            }, 'Event Planner'),
                            React.createElement('option', {
                                key: 'all_participants',
                                value: 'all_participants'
                            }, 'All Event Participants')
                        ] : [
                            // For event planners, show individual vendors and group
                            React.createElement('option', {
                                key: 'all_participants',
                                value: 'all_participants'
                            }, 'All Event Participants'),
                            ...(assignedVendors || [])
                                .filter(vendor => !vendor.isGroup && vendor.id !== 'all_participants')
                                .map(vendor => 
                                    React.createElement('option', {
                                        key: vendor.id || vendor.vendorProfileId,
                                        value: vendor.id || vendor.vendorProfileId
                                    }, vendor.name || vendor.company || 'Unknown Vendor')
                                )
                        ])
                    ])
                ]),
                React.createElement('div', {
                    key: 'message-input',
                    className: 'flex space-x-2'
                }, [
                    React.createElement('textarea', {
                        key: 'textarea',
                        value: content,
                        onChange: (e) => setContent(e.target.value),
                        placeholder: 'Type your message...',
                        rows: 2,
                        className: 'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
                        disabled: sending,
                        required: true
                    }),
                    React.createElement('button', {
                        key: 'send-btn',
                        type: 'submit',
                        disabled: sending || !selectedVendorId || !content.trim(),
                        className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1'
                    }, [
                        sending && React.createElement('div', {
                            key: 'spinner',
                            className: 'icon-loader animate-spin text-sm'
                        }),
                        React.createElement('span', {
                            key: 'text'
                        }, sending ? 'Sending...' : 'Send')
                    ])
                ])
            ])
        ]);
    } catch (error) {
        return React.createElement('div', {
            className: 'p-4 text-center text-red-600'
        }, 'Error loading message form');
    }
}

window.NEWSendMessageForm = NEWSendMessageForm;