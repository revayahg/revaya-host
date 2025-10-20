function InviteCollaboratorForm({ eventId, onClose, onSuccess }) {
    const [rawInput, setRawInput] = React.useState('');
    const [role, setRole] = React.useState('viewer');
    const [inviting, setInviting] = React.useState(false);
    const [error, setError] = React.useState('');
    const [preview, setPreview] = React.useState([]);
    
    const textareaRef = React.useRef(null);
    const context = React.useContext(window.AuthContext || React.createContext({}));
    const { user } = context;

    // Auto-resize textarea
    const autoResize = React.useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        textarea.style.height = 'auto';
        const maxHeight = 320; // About 10-12 lines
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, []);

    // Update preview when input changes
    React.useEffect(() => {
        setPreview(window.parseEmails ? window.parseEmails(rawInput) : []);
        autoResize();
    }, [rawInput, autoResize]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!preview.length) {
            setError('Please enter at least one valid email address');
            return;
        }

        try {
            setInviting(true);
            setError('');
            
            const result = await window.collaboratorAPI.inviteMany(eventId, rawInput, role);
            
            // Dispatch events for real-time updates
            window.dispatchEvent(new CustomEvent('collaboratorUpdated', {
                detail: { eventId, type: 'bulk_invitation_sent', count: result.invited.length }
            }));
            window.dispatchEvent(new CustomEvent('eventsUpdated'));
            window.dispatchEvent(new CustomEvent('dashboardRefresh'));

            // Show appropriate message based on result type
            let message = result.message || 'Invitations processed';
            let toastType = 'success';
            
            if (result.reminder) {
                message = `Reminder sent! ${result.message}`;
                toastType = 'info';
            } else if (result.resent) {
                message = `Invitation resent! ${result.message}`;
                toastType = 'success';
            }

            window.showToast?.(message, toastType);
            setRawInput('');
            setPreview([]);
            onSuccess?.();
        } catch (error) {
            const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
            const userFriendlyError = errorMessage.includes('not authenticated')
                ? 'Please log in to send invitations'
                : errorMessage.includes('permission')
                ? 'You do not have permission to invite collaborators to this event'
                : errorMessage.includes('already accepted')
                ? 'This collaborator has already accepted an invitation to this event'
                : errorMessage || 'Failed to send invitations. Please try again.';
            setError(userFriendlyError);
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg mx-4 w-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Invite Collaborators</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <div className="icon-x text-xl"></div>
                    </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-800">
                        <i className="fas fa-shield-check text-blue-600 mr-2"></i>
                        Invited collaborators' contact information is processed according to our 
                        <a href="#/privacy" className="text-blue-700 hover:text-blue-600 underline ml-1">Privacy & Cookie Policy</a>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Addresses
                        </label>
                        <div className="text-xs text-gray-500 mb-2">
                            Paste emails or "Name &lt;email&gt;" format. Separate with commas, semicolons, or newlines.
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            onPaste={() => setTimeout(autoResize, 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[72px] resize-none"
                            placeholder="e.g. John Smith <john@example.com>; jane.doe@company.com, bob@email.com"
                            rows={3}
                        />
                    </div>

                    {preview.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-500 mb-2">
                                Detected {preview.length} email{preview.length > 1 ? 's' : ''}
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {preview.slice(0, 30).map(email => (
                                    <span
                                        key={email}
                                        className={`px-2 py-1 rounded-full text-xs border ${
                                            window.isValidEmail && window.isValidEmail(email)
                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                : 'bg-red-50 text-red-700 border-red-200'
                                        }`}
                                    >
                                        {email}
                                    </span>
                                ))}
                                {preview.length > 30 && (
                                    <span className="text-xs text-gray-500 px-2 py-1">
                                        +{preview.length - 30} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="viewer">Viewer - Can view event details</option>
                            <option value="editor">Editor - Can edit event details</option>
                        </select>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm">{error}</div>
                    )}

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={inviting || !preview.length}
                            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {inviting && <div className="icon-loader-2 text-sm animate-spin"></div>}
                            Send {preview.length ? `(${preview.length})` : ''} Invitation{preview.length === 1 ? '' : 's'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

window.InviteCollaboratorForm = InviteCollaboratorForm;