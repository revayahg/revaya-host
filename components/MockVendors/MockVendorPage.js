function MockVendorPage() {
  try {
    return (
      <Layout>
        <div data-name="mock-vendor-demo" className="min-h-screen bg-gray-50">
          {/* Vendor Hero Section */}
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Logo and Basic Info */}
                <div className="md:w-1/4">
                  <div className="w-full aspect-square rounded-lg overflow-hidden">
                    <img
                      src="https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/951d4cfc-731d-4648-a2b3-7b9ad19d003d.png"
                      alt="Miami Portable Solutions Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                {/* Business Info */}
                <div className="md:w-3/4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">Miami Portable Solutions</h1>
                      <div className="flex items-center space-x-4 text-gray-600 mb-4">
                        <span><i className="fas fa-star text-yellow-400"></i> 4.8 (156 reviews)</span>
                        <span><i className="fas fa-check-circle text-green-500"></i> Verified</span>
                      </div>
                    </div>
                    <button className="bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed" disabled>
                      Request Quote (Demo)
                    </button>
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    Premier portable restroom solutions for events of all sizes. 
                    Providing clean, reliable, and eco-friendly facilities since 2010.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700">Service Area</div>
                      <div className="text-gray-600">Miami-Dade, Broward</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700">Experience</div>
                      <div className="text-gray-600">14+ Years</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700">Fleet Size</div>
                      <div className="text-gray-600">500+ Units</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-700">Events/Year</div>
                      <div className="text-gray-600">1,000+</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Left Column - Services & Gallery */}
              <div className="md:col-span-2 space-y-8">
                {/* Services */}
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6">Our Services</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      {
                        title: 'Standard Units',
                        features: ['Single stall', 'Hand sanitizer', 'Regular service', 'Weekly maintenance']
                      },
                      {
                        title: 'Luxury Trailers',
                        features: ['Climate controlled', 'Running water', 'Premium amenities', 'Interior lighting']
                      },
                      {
                        title: 'ADA Compliant',
                        features: ['Wheelchair accessible', 'Support rails', 'Extra space', 'Compliant fixtures']
                      },
                      {
                        title: 'Hand Wash Stations',
                        features: ['Fresh water tank', 'Soap dispensers', 'Paper towels', 'Waste water collection']
                      }
                    ].map((service, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                        <ul className="space-y-2">
                          {service.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center text-gray-600">
                              <i className="fas fa-check text-green-500 mr-2"></i>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Portfolio */}
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6">Portfolio</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/05bde009-1b1f-4a48-808e-8b7bca5787c4.webp',
                      'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/d470b8e1-dc04-448e-8c64-7ca519e7f63c.png',
                      'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/1761dcb1-6599-4b2e-ac22-f20d4a54b8c8.png',
                      'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/876c34b0-66c8-4312-8599-e9bdd344ebc8.png',
                      'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/54deefaf-a16c-4426-b9cc-b8c7c9f99956.png',
                      'https://app.trickle.so/storage/public/images/usr_0ad8d73270000001/e2b8bd56-9e70-492b-a63b-cafb7288367f.png'
                    ].map((image, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={image}
                          alt={`Portfolio image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition duration-200"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Licenses & Certifications */}
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6">Licenses & Certifications</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                      {
                        icon: 'certificate',
                        title: 'Florida State Licensed',
                        issuer: 'Department of Business',
                        year: '2023'
                      },
                      {
                        icon: 'award',
                        title: 'EPA Certified',
                        issuer: 'Environmental Protection',
                        year: '2023'
                      },
                      {
                        icon: 'shield-alt',
                        title: 'Safety Certified',
                        issuer: 'OSHA Compliance',
                        year: '2023'
                      },
                      {
                        icon: 'medal',
                        title: 'LGBTQ+ Owned Business',
                        issuer: 'NGLCC Certification',
                        year: '2023'
                      },
                      {
                        icon: 'star',
                        title: 'Quality Excellence',
                        issuer: 'Industry Standards',
                        year: '2023'
                      },
                      {
                        icon: 'check-circle',
                        title: 'BBB Accredited',
                        issuer: 'Better Business Bureau',
                        year: '2023'
                      }
                    ].map((cert, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="text-3xl text-blue-600 mb-2">
                          <i className={`fas fa-${cert.icon}`}></i>
                        </div>
                        <h3 className="font-semibold mb-1">{cert.title}</h3>
                        <p className="text-sm text-gray-600">{cert.issuer}</p>
                        <p className="text-sm text-gray-500">Exp. {cert.year}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column - Contact & Reviews */}
              <div className="space-y-8">
                {/* Contact Form */}
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6">Contact Us</h2>
                  {/* Contact Information */}
                  <div className="mb-6 space-y-4 border-b pb-6">
                    <div className="preferred-contact bg-blue-50 p-4 rounded-lg mb-4">
                      <h3 className="font-semibold text-blue-800 mb-2">
                        <i className="fas fa-phone-alt mr-2"></i>Preferred Contact Method
                      </h3>
                      <p className="text-blue-700 text-lg">1-800-555-0123</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Address</h3>
                      <p className="text-gray-600">123 Business Ave, Suite 200<br />Miami, FL 33101</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Email</h3>
                      <p className="text-gray-600">info@miamips.com</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Website</h3>
                      <span className="text-gray-600">www.miamips.com</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Social Media</h3>
                      <div className="flex gap-4">
                        <span className="text-gray-600">
                          <i className="fab fa-facebook-square text-2xl"></i>
                        </span>
                        <span className="text-gray-600">
                          <i className="fab fa-twitter-square text-2xl"></i>
                        </span>
                        <span className="text-gray-600">
                          <i className="fab fa-instagram-square text-2xl"></i>
                        </span>
                        <span className="text-gray-600">
                          <i className="fab fa-linkedin text-2xl"></i>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Form */}
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Your email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        placeholder="Tell us about your event"
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      className="w-full bg-blue-600 text-white py-2 rounded-lg cursor-not-allowed"
                      disabled
                    >
                      Send Message
                    </button>
                  </form>
                </section>

                {/* Reviews */}
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6">Customer Reviews</h2>
                  <div className="space-y-6">
                    {[
                      {
                        name: 'Sarah M.',
                        rating: 5,
                        comment: 'Excellent service! Units were clean and delivered on time.'
                      },
                      {
                        name: 'John D.',
                        rating: 4,
                        comment: 'Professional team and great communication throughout.'
                      },
                      {
                        name: 'Mike R.',
                        rating: 5,
                        comment: 'The luxury trailers were perfect for our wedding.'
                      }
                    ].map((review, index) => (
                      <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                        <div className="flex items-center mb-2">
                          <div className="text-yellow-400 flex">
                            {[...Array(review.rating)].map((_, i) => (
                              <i key={i} className="fas fa-star"></i>
                            ))}
                          </div>
                          <span className="ml-2 font-medium">{review.name}</span>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  } catch (error) {
    reportError(error);
    return null;
  }
}

window.MockVendorPage = MockVendorPage;
