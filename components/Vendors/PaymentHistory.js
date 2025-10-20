function PaymentHistory({ vendorId }) {
  try {
    const [payments, setPayments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      const fetchPayments = async () => {
        try {
          setLoading(true);
          const history = await getPaymentHistory(vendorId);
          setPayments(history);
        } catch (err) {
          setError('Failed to load payment history');
        } finally {
          setLoading(false);
        }
      };

      fetchPayments();
    }, [vendorId]);

    if (loading) {
      return (
        <div className="flex justify-center py-4">
          <i className="fas fa-spinner fa-spin text-indigo-600"></i>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded">
          {error}
        </div>
      );
    }

    return (
      <div data-name="payment-history">
        <h3 className="text-lg font-medium mb-4">Payment History</h3>
        
        {payments.length > 0 ? (
          <div className="space-y-4">
            {payments.map((payment, index) => (
              <div key={index} className="payment-history-item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {payment.type === 'featured_upgrade' ? 'Featured Vendor Upgrade' : payment.type}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </div>
                    <div className={`text-sm ${
                      payment.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No payment history available
          </div>
        )}
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
