function AdSlot({ position }) {
  try {
    return (
      <div 
        data-name={`ad-slot-${position}`}
        className="ad-slot bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-400"
      >
        <div className="text-xs uppercase tracking-wide mb-1">Advertisement</div>
        <div className="text-sm">Google Ad Placeholder</div>
      </div>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}
