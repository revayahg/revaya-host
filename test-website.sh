#!/bin/bash

# Comprehensive Website Testing Script
# This script executes systematic testing of all Revaya Host features

echo "🧪 Starting Comprehensive Website Testing"
echo "=========================================="

# Test Configuration
BASE_URL="http://localhost:8000"
TEST_RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).md"

# Initialize test results
echo "# 🧪 Website Testing Results - $(date)" > $TEST_RESULTS_FILE
echo "" >> $TEST_RESULTS_FILE
echo "**Testing Date:** $(date)" >> $TEST_RESULTS_FILE
echo "**Base URL:** $BASE_URL" >> $TEST_RESULTS_FILE
echo "**Environment:** Development" >> $TEST_RESULTS_FILE
echo "" >> $TEST_RESULTS_FILE

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
CRITICAL_ISSUES=0

# Test result logging function
log_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "✅ $test_name" >> $TEST_RESULTS_FILE
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "❌ $test_name" >> $TEST_RESULTS_FILE
        if [ "$status" = "CRITICAL" ]; then
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
        fi
    fi
    
    if [ -n "$details" ]; then
        echo "   Details: $details" >> $TEST_RESULTS_FILE
    fi
    echo "" >> $TEST_RESULTS_FILE
}

# Test server availability
echo "🔍 Testing Server Availability..."
if curl -s -I "$BASE_URL" | grep -q "200 OK"; then
    log_test_result "Server Availability" "PASS" "Server responding on $BASE_URL"
else
    log_test_result "Server Availability" "CRITICAL" "Server not responding"
    echo "❌ Server not available. Please start the development server."
    exit 1
fi

# Test main page loading
echo "🔍 Testing Main Page Loading..."
if curl -s "$BASE_URL" | grep -q "Revaya Host"; then
    log_test_result "Main Page Loading" "PASS" "Homepage loads correctly"
else
    log_test_result "Main Page Loading" "CRITICAL" "Homepage not loading properly"
fi

# Test static assets
echo "🔍 Testing Static Assets..."
if curl -s -I "$BASE_URL/styles/global.css" | grep -q "200 OK"; then
    log_test_result "CSS Assets" "PASS" "Stylesheets loading"
else
    log_test_result "CSS Assets" "FAIL" "CSS files not accessible"
fi

if curl -s -I "$BASE_URL/assets/favicon-32x32.png" | grep -q "200 OK"; then
    log_test_result "Image Assets" "PASS" "Images loading"
else
    log_test_result "Image Assets" "FAIL" "Image files not accessible"
fi

# Test JavaScript files
echo "🔍 Testing JavaScript Files..."
if curl -s -I "$BASE_URL/config/environment.js" | grep -q "200 OK"; then
    log_test_result "Configuration Files" "PASS" "Environment config accessible"
else
    log_test_result "Configuration Files" "CRITICAL" "Environment config not accessible"
fi

# Test API endpoints (Supabase)
echo "🔍 Testing API Connectivity..."
if curl -s -I "https://drhzvzimmmdbsvwhlsxm.supabase.co" | grep -q "200 OK"; then
    log_test_result "Supabase API" "PASS" "Development database accessible"
else
    log_test_result "Supabase API" "CRITICAL" "Database not accessible"
fi

# Test security headers
echo "🔍 Testing Security Headers..."
if curl -s -I "$BASE_URL" | grep -q "Content-Security-Policy"; then
    log_test_result "CSP Header" "PASS" "Content Security Policy enabled"
else
    log_test_result "CSP Header" "FAIL" "Content Security Policy not found"
fi

# Test mobile responsiveness (simulate mobile user agent)
echo "🔍 Testing Mobile Compatibility..."
if curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" "$BASE_URL" | grep -q "viewport"; then
    log_test_result "Mobile Viewport" "PASS" "Mobile viewport meta tag present"
else
    log_test_result "Mobile Viewport" "FAIL" "Mobile viewport not configured"
fi

# Test file upload capabilities
echo "🔍 Testing File Upload Endpoints..."
if curl -s -I "$BASE_URL/components/common/FileUpload.js" | grep -q "200 OK"; then
    log_test_result "File Upload Component" "PASS" "File upload component accessible"
else
    log_test_result "File Upload Component" "FAIL" "File upload component not found"
fi

# Test authentication components
echo "🔍 Testing Authentication Components..."
if curl -s -I "$BASE_URL/components/Auth/Login.js" | grep -q "200 OK"; then
    log_test_result "Login Component" "PASS" "Login component accessible"
else
    log_test_result "Login Component" "CRITICAL" "Login component not found"
fi

if curl -s -I "$BASE_URL/components/Auth/Signup.js" | grep -q "200 OK"; then
    log_test_result "Signup Component" "PASS" "Signup component accessible"
else
    log_test_result "Signup Component" "CRITICAL" "Signup component not found"
fi

# Test core feature components
echo "🔍 Testing Core Feature Components..."
if curl -s -I "$BASE_URL/components/Events/TaskManager.js" | grep -q "200 OK"; then
    log_test_result "Task Manager Component" "PASS" "Task management accessible"
else
    log_test_result "Task Manager Component" "CRITICAL" "Task management not found"
fi

if curl -s -I "$BASE_URL/components/Events/CreateEventForm.js" | grep -q "200 OK"; then
    log_test_result "Event Creation Component" "PASS" "Event creation accessible"
else
    log_test_result "Event Creation Component" "CRITICAL" "Event creation not found"
fi

if curl -s -I "$BASE_URL/components/Events/AIDocumentUploader.js" | grep -q "200 OK"; then
    log_test_result "AI Document Uploader" "PASS" "AI feature accessible"
else
    log_test_result "AI Document Uploader" "FAIL" "AI feature not found"
fi

# Test vendor management components
echo "🔍 Testing Vendor Management Components..."
if curl -s -I "$BASE_URL/components/Vendors/CreateVendorProfileForm.js" | grep -q "200 OK"; then
    log_test_result "Vendor Profile Creation" "PASS" "Vendor management accessible"
else
    log_test_result "Vendor Profile Creation" "FAIL" "Vendor management not found"
fi

# Test notification components
echo "🔍 Testing Notification Components..."
if curl -s -I "$BASE_URL/components/Notifications/NotificationsSection.js" | grep -q "200 OK"; then
    log_test_result "Notification System" "PASS" "Notifications accessible"
else
    log_test_result "Notification System" "FAIL" "Notifications not found"
fi

# Test dashboard components
echo "🔍 Testing Dashboard Components..."
if curl -s -I "$BASE_URL/components/Dashboard/Dashboard.js" | grep -q "200 OK"; then
    log_test_result "Main Dashboard" "PASS" "Dashboard accessible"
else
    log_test_result "Main Dashboard" "CRITICAL" "Dashboard not found"
fi

# Generate test summary
echo "" >> $TEST_RESULTS_FILE
echo "## 📊 Test Summary" >> $TEST_RESULTS_FILE
echo "" >> $TEST_RESULTS_FILE
echo "- **Total Tests:** $TOTAL_TESTS" >> $TEST_RESULTS_FILE
echo "- **Passed:** $PASSED_TESTS" >> $TEST_RESULTS_FILE
echo "- **Failed:** $FAILED_TESTS" >> $TEST_RESULTS_FILE
echo "- **Critical Issues:** $CRITICAL_ISSUES" >> $TEST_RESULTS_FILE
echo "" >> $TEST_RESULTS_FILE

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "- **Success Rate:** $SUCCESS_RATE%" >> $TEST_RESULTS_FILE
else
    echo "- **Success Rate:** 0%" >> $TEST_RESULTS_FILE
fi

echo "" >> $TEST_RESULTS_FILE

# Overall status
if [ $CRITICAL_ISSUES -eq 0 ] && [ $FAILED_TESTS -eq 0 ]; then
    echo "## ✅ Overall Status: ALL TESTS PASSED" >> $TEST_RESULTS_FILE
elif [ $CRITICAL_ISSUES -eq 0 ]; then
    echo "## ⚠️ Overall Status: TESTS PASSED WITH MINOR ISSUES" >> $TEST_RESULTS_FILE
else
    echo "## ❌ Overall Status: CRITICAL ISSUES FOUND" >> $TEST_RESULTS_FILE
fi

echo "" >> $TEST_RESULTS_FILE
echo "## 🔧 Next Steps" >> $TEST_RESULTS_FILE
echo "" >> $TEST_RESULTS_FILE
echo "1. Review failed tests and critical issues" >> $TEST_RESULTS_FILE
echo "2. Address critical issues immediately" >> $TEST_RESULTS_FILE
echo "3. Fix minor issues in next development cycle" >> $TEST_RESULTS_FILE
echo "4. Re-run tests after fixes" >> $TEST_RESULTS_FILE
echo "5. Proceed with manual testing for interactive features" >> $TEST_RESULTS_FILE

# Display results
echo ""
echo "📊 Testing Complete!"
echo "==================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Critical Issues: $CRITICAL_ISSUES"

if [ $TOTAL_TESTS -gt 0 ]; then
    echo "Success Rate: $SUCCESS_RATE%"
fi

echo ""
echo "📄 Detailed results saved to: $TEST_RESULTS_FILE"
echo ""
echo "🔍 Next: Manual testing of interactive features required"
echo "   - Authentication flows"
echo "   - User interactions"
echo "   - Real-time features"
echo "   - File uploads"
echo "   - AI document processing"
