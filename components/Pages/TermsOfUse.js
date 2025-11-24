function TermsOfUse() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 legal-page-container" data-name="terms-of-use" data-file="components/Pages/TermsOfUse.js">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 legal-page-content">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Use</h1>
                        <p className="text-gray-600">Last updated: November 2, 2025</p>
                    </div>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Acceptance of Terms
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                By accessing or using Revaya Host, you agree to these Terms and our Privacy Policy.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Use of the Services
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                You will comply with applicable laws and use Revaya Host only for lawful purposes. You are responsible for the content you submit and for maintaining the confidentiality of your credentials.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Prohibited Conduct
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-3">
                                You may not:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                                <li>(a) upload unlawful, infringing, or harmful content;</li>
                                <li>(b) attempt to access data without authorization;</li>
                                <li>(c) interfere with or disrupt the Service;</li>
                                <li>(d) reverse engineer or copy our software; or</li>
                                <li>(e) use the Service to send unsolicited or deceptive communications.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Client & Vendor Content
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                You grant us a limited license to host and process the content you submit solely to provide and improve the Service. You represent you have all rights needed to submit that content.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Beta; No Warranties
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                The Service may be offered on a beta basis and is provided "as is" without warranties of any kind, express or implied.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Limitation of Liability
                            </h2>
                            <p className="text-gray-700 leading-relaxed mb-3">
                                To the maximum extent permitted by law, Revaya will not be liable for indirect, incidental, special, consequential, or punitive damages, nor for loss of profits, revenue, data, or goodwill. Our total liability for any claim will not exceed the amounts paid for the Service in the 12 months preceding the claim (or $100 if no amounts were paid).
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Indemnity
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                You agree to indemnify and hold Revaya harmless from claims arising out of your unlawful or unauthorized use of the Service.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Termination
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                We may suspend or terminate access for violation of these Terms. You may stop using the Service at any time.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-indigo-100 pb-2">
                                Governing Law
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                Florida law governs these Terms, without regard to its conflicts rules. Venue lies in Miami-Dade County, Florida.
                            </p>
                        </section>

                        <section className="mb-8 bg-indigo-50 p-6 rounded-lg legal-page-contact-box">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                                Contact
                            </h2>
                            <div className="space-y-2 text-gray-700">
                                <p><strong>Email:</strong> <a href="mailto:info@revayahg.com" className="text-indigo-600 hover:text-indigo-800 underline">info@revayahg.com</a></p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

window.TermsOfUse = TermsOfUse;

