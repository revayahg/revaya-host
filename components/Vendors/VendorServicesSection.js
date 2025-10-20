function VendorServicesSection({ vendor }) {
  try {
    if (!vendor.services || vendor.services.length === 0) {
      return null;
    }

    return (
      <section className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Our Services</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Primary Services</h3>
            <div className="flex flex-wrap gap-2">
              {vendor.services.slice(0, Math.ceil(vendor.services.length / 2)).map((service, idx) => (
                <span key={idx} className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                  {service}
                </span>
              ))}
            </div>
          </div>
          
          {vendor.services.length > 1 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Additional Services</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.services.slice(Math.ceil(vendor.services.length / 2)).map((service, idx) => (
                  <span key={idx} className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {vendor.service_areas && vendor.service_areas.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Service Areas</h3>
            <div className="flex flex-wrap gap-2">
              {vendor.service_areas.map((area, idx) => (
                <span key={idx} className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.VendorServicesSection = VendorServicesSection;
