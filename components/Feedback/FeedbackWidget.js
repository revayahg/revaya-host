function FeedbackWidget() {
    try {
        const context = React.useContext(window.AuthContext || React.createContext({}));
        const { user, loading } = context;
        const [isOpen, setIsOpen] = React.useState(false);
        const [formData, setFormData] = React.useState({
            easyToUse: 0,
            visuallyAppealing: 0,
            worksAsExpected: 0,
            feedback: ''
        });
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        // Don't show widget while loading auth state
        if (loading) {
            return null;
        }

        // Don't show widget for unauthenticated users
        if (!user) {
            return null;
        }

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        };

        const handleRatingChange = (category, rating) => {
            setFormData(prev => ({
                ...prev,
                [category]: rating
            }));
        };

        const StarRating = ({ category, value, onChange, label }) => {
            return (
                <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => onChange(category, star)}
                                className={`text-lg ${
                                    star <= value ? 'text-yellow-400' : 'text-gray-300'
                                } hover:text-yellow-400 transition-colors`}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                </div>
            );
        };

        const isFormValid = () => {
            const hasRating = formData.easyToUse > 0 || formData.visuallyAppealing > 0 || formData.worksAsExpected > 0;
            const hasFeedback = formData.feedback.trim() !== '';
            return hasRating || hasFeedback;
        };

        const getUserName = (user) => {
            if (!user) return 'Anonymous';
            
            const name = user.user_metadata?.full_name || 
                        user.user_metadata?.display_name || 
                        user.user_metadata?.name;
            
            if (name && name.trim()) {
                return name.trim();
            }
            
            if (user.email) {
                const emailPart = user.email.split('@')[0];
                return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
            }
            
            return 'Anonymous';
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            
            if (!isFormValid()) {
                if (window.toast && window.toast.error) {
                    window.toast.error('Please provide at least one rating or feedback message');
                } else {
                    alert('Please provide at least one rating or feedback message');
                }
                return;
            }

            setIsSubmitting(true);

            try {
                const feedbackData = {
                    user_name: getUserName(user),
                    user_email: user?.email || 'anonymous@example.com',
                    message: formData.feedback,
                    easy_to_use: formData.easyToUse,
                    visually_appealing: formData.visuallyAppealing,
                    works_as_expected: formData.worksAsExpected,
                    submitted_at: new Date().toISOString()
                };

                const { error } = await window.supabaseClient
                    .from('feedback')
                    .insert([feedbackData]);

                if (error) throw error;

                setFormData({ 
                    easyToUse: 0, 
                    visuallyAppealing: 0, 
                    worksAsExpected: 0, 
                    feedback: '' 
                });

                if (window.toast && window.toast.success) {
                    window.toast.success('Thank you for your feedback! 🎉');
                } else if (window.toast && window.toast.show) {
                    window.toast.show('Thank you for your feedback! 🎉', 'success');
                } else {
                    alert('Thank you for your feedback!');
                }

                setTimeout(() => {
                    setIsOpen(false);
                }, 2000);

            } catch (error) {
                
                if (window.toast && window.toast.error) {
                    window.toast.error('Failed to submit feedback. Please try again.');
                } else if (window.toast && window.toast.show) {
                    window.toast.show('Failed to submit feedback. Please try again.', 'error');
                } else {
                    alert('Failed to submit feedback. Please try again.');
                }
                
                reportError(error);
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <div data-name="feedback-widget" className="fixed bottom-6 right-6 z-50">
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 hover:scale-110"
                        aria-label="Give Feedback"
                        title="Share your feedback"
                    >
                        <i className="fas fa-comment text-lg"></i>
                    </button>
                )}

                {isOpen && (
                    <div className="bg-white rounded-lg shadow-xl border p-4 w-80 max-h-96 overflow-y-auto animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Quick Feedback</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Close feedback"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <StarRating
                                category="easyToUse"
                                value={formData.easyToUse}
                                onChange={handleRatingChange}
                                label="Easy to Use"
                            />
                            
                            <StarRating
                                category="visuallyAppealing"
                                value={formData.visuallyAppealing}
                                onChange={handleRatingChange}
                                label="Visually Appealing"
                            />
                            
                            <StarRating
                                category="worksAsExpected"
                                value={formData.worksAsExpected}
                                onChange={handleRatingChange}
                                label="Works as Expected"
                            />

                            <div>
                                <label htmlFor="feedback" className="block text-xs font-medium text-gray-700 mb-1">
                                    Comments (Optional)
                                </label>
                                <textarea
                                    id="feedback"
                                    name="feedback"
                                    value={formData.feedback}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Share your thoughts..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !isFormValid()}
                                className="w-full bg-indigo-600 text-white py-2 px-3 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                                {isSubmitting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                ) : (
                                    'Submit Feedback'
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.FeedbackWidget = FeedbackWidget;
