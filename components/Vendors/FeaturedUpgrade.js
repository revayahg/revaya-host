function FeaturedUpgrade({ vendorId, onSuccess }) {
  try {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [showConfirm, setShowConfirm] = React.useState(false);

    const handlePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // Process payment (mock for now)
        const paymentData = {
          amount: 99.99,
          currency: 'USD',
          type: 'featured_upgrade',
          status: 'completed',
          duration: 30 // days
        };

        // Save payment history
        await savePaymentHistory(vendorId, paymentData);

        // Update vendor status
        await setVendorFeatured(vendorId);

        onSuccess?.();
        setShowConfirm(true);
      } catch (err) {
        setError('Payment failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (showConfirm) {
      return (
        <div className="text-center py-8">
          <div className="text-green-500 mb-4">
            <i className="fas fa-check-circle text-4xl"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">Upgrade Successful!</h3>
          <p className="text-gray-600">
            Your profile is now featured for the next 30 days.
          </p>
        </div>
      );
    }

    return (
      <div data-name="featured-upgrade" className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="inline-block bg-indigo-100 p-3 rounded-full text-indigo-600 mb-4">
            <i className="fas fa-star text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">Upgrade to Featured Vendor</h3>
          <p className="text-gray-600">
            Get more visibility and attract more clients
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center">
            <i className="fas fa-check text-green-500 mr-3"></i>
            <span>Priority placement in search results</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-check text-green-500 mr-3"></i>
            <span>Featured badge on your profile</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-check text-green-500 mr-3"></i>
            <span>Higher visibility in AI recommendations</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-3xl font-bold mb-2">$99.99</div>
          <div className="text-gray-600">for 30 days of featured status</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Processing...
            </span>
          ) : (
            'Upgrade Now'
          )}
        </button>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
