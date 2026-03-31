# Test configuration for running message size tests

# Test Commands:
# npm test                           - Run all tests
# npm test -- --grep "Message Size" - Run only message size tests  
# npm test -- --grep "Request Body" - Run only body size tests

# Environment variables for testing:
export telemetry_local_storage_enabled=true
export telemetry_proxy_enabled=false  
export telemetry_log_level=info
export telemetry_local_storage_type=console
export node_env=test

# To test with different body size limits, modify app.js:
# app.use(bodyParser.json({ limit: '1mb' }));  // Test with 1MB limit
# app.use(bodyParser.json({ limit: '10mb' })); // Test with 10MB limit

# Test Scenarios:
# 1. Normal size events (< 1KB) - Should succeed
# 2. Medium size events (100KB-1MB) - Should succeed  
# 3. Large size events (1MB-5MB) - Should succeed with default body-parser
# 4. Very large events (> 5MB) - Should fail with 413 Payload Too Large
# 5. Kafka size limit events - May succeed in body-parser but fail in Kafka

echo "Test environment configured"
echo "Run 'npm test' to execute all tests"