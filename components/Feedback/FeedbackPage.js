function FeedbackPage() {
    try {
        const context = React.useContext(window.AuthContext || React.createContext({}));
        const { user, loading } = context;
        const [formData, setFormData] = React.useState({
            easyToUse: 0,
            visuallyAppealing: 0,
            worksAsExpected: 0,
            feedback: ''
        });
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        // Show loading state while checking authentication
        if (loading) {
            return (
                <div className="max-w-2xl mx-auto p-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-200 rounded"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Redirect to login if not authenticated
        if (!user) {
            return (
                <div data-name="feedback-page" className="max-w-2xl mx-auto p-6">
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <div className="mb-6">
                            <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
                            <p className="text-gray-600">
                                Please sign in to your account to leave feedback.
                            </p>
                        </div>
                        <div className="space-x-4">
                            <a
                                href="#/login"
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                <i className="fas fa-sign-in-alt mr-2"></i>
                                Sign In
                            </a>
                            <a
                                href="#/signup"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                <i className="fas fa-user-plus mr-2"></i>
                                Sign Up
                            </a>
                        </div>
                    </div>
                </div>
            );
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
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => onChange(category, star)}
                                className={`text-2xl ${
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
                window.showToast('Please provide at least one rating or feedback message', 'error');
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

                window.showToast('Thank you for your feedback!', 'success');

            } catch (error) {
                window.showToast('Failed to submit feedback. Please try again.', 'error');
                reportError(error);
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <div data-name="feedback-page" className="max-w-2xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Your Feedback</h1>
                    <p className="text-gray-600">
                        We'd love to hear your thoughts about our platform. Your feedback helps us improve!
                    </p>
                </div>

                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                        <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                        By submitting feedback, you agree to our <a href="#/privacy" className="text-blue-700 hover:text-blue-600 underline">Privacy & Cookie Policy</a>. 
                        We use your information to improve our platform and may contact you for follow-up.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Our Platform</h3>
                        
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
                    </div>

                    <div>
                        <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                            Your Feedback
                        </label>
                        <textarea
                            id="feedback"
                            name="feedback"
                            value={formData.feedback}
                            onChange={handleInputChange}
                            rows="6"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Please share your thoughts, suggestions, or any issues you've encountered..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !isFormValid()}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <span>
                                <i className="fas fa-paper-plane mr-2"></i>
                                Submit Feedback
                            </span>
                        )}
                    </button>
                </form>
            </div>
        );
    } catch (error) {
        reportError(error);
        return null;
    }
}

window.FeedbackPage = FeedbackPage;
