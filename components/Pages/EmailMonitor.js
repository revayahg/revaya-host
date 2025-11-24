import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../utils/supabaseClient';

const EmailMonitor = () => {
    const [emails, setEmails] = useState([]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRecentEmails = async () => {
        try {
            const { data, error } = await supabaseClient
                .rpc('get_recent_emails', { limit_count: 20 });
            
            if (error) throw error;
            setEmails(data || []);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchEmailSummary = async () => {
        try {
            const { data, error } = await supabaseClient
                .rpc('get_email_test_summary');
            
            if (error) throw error;
            setSummary(data || []);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchRecentEmails(),
                fetchEmailSummary()
            ]);
            setLoading(false);
        };

        loadData();
        
        // Refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'sent': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'pending': return 'text-yellow-600';
            default: return 'text-gray-600';
        }
    };

    const getEmailTypeColor = (type) => {
        switch (type) {
            case 'task_assigned': return 'bg-blue-100 text-blue-800';
            case 'event_invitation': return 'bg-green-100 text-green-800';
            case 'vendor_invitation': return 'bg-purple-100 text-purple-800';
            case 'welcome': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">📧 Email Monitor</h3>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">📧 Email Monitor</h3>
                <button 
                    onClick={() => {
                        setLoading(true);
                        fetchRecentEmails();
                        fetchEmailSummary();
                        setLoading(false);
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: {error}
                </div>
            )}

            {/* Email Summary */}
            <div className="mb-6">
                <h4 className="font-semibold mb-3">Email Summary (Last 24h)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summary.map((item, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                            <div className="text-sm font-medium text-gray-600">{item.email_type}</div>
                            <div className="text-2xl font-bold text-blue-600">{item.total_sent}</div>
                            <div className="text-xs text-gray-500">
                                {item.unique_recipients} unique recipients
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Emails */}
            <div>
                <h4 className="font-semibold mb-3">Recent Emails</h4>
                <div className="space-y-3">
                    {emails.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">
                            No emails sent yet. Try creating an event or assigning a task!
                        </div>
                    ) : (
                        emails.map((email) => (
                            <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEmailTypeColor(email.email_type)}`}>
                                            {email.email_type}
                                        </span>
                                        <span className={`text-sm font-medium ${getStatusColor(email.status)}`}>
                                            {email.status}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(email.sent_at).toLocaleString()}
                                    </span>
                                </div>
                                
                                <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                        To: {email.recipient_email}
                                    </div>
                                    {email.subject && (
                                        <div className="text-gray-600 mt-1">
                                            Subject: {email.subject}
                                        </div>
                                    )}
                                    {email.event_name && (
                                        <div className="text-gray-500 mt-1">
                                            Event: {email.event_name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailMonitor;
