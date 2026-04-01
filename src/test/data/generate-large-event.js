// Helper to generate events of various sizes for testing
const fs = require('fs');
const path = require('path');

const generateLargeEvent = (sizeInMB) => {
    const baseEvent = {
        "eid": "INTERACT",
        "ets": 1638360000000,
        "ver": "3.0",
        "mid": `LARGE_EVENT:${Date.now()}:${Math.random()}`,
        "actor": {
            "id": "user_large_test",
            "type": "User"
        },
        "context": {
            "channel": "sunbird",
            "pdata": {
                "id": "sunbird.app",
                "ver": "1.0",
                "pid": "sunbird.app.test"
            },
            "env": "test",
            "sid": "test_session",
            "did": "test_device"
        },
        "object": {
            "id": "test_content",
            "type": "Content",
            "ver": "1.0"
        },
        "edata": {
            "id": "large-payload-test",
            "type": "LARGE_PAYLOAD",
            "largeData": ""
        }
    };

    // Calculate target size in bytes
    const targetSizeBytes = sizeInMB * 1024 * 1024;
    const baseEventSize = JSON.stringify(baseEvent).length;
    const requiredDataSize = targetSizeBytes - baseEventSize;

    // Generate large string data
    const chunkSize = 1024; // 1KB chunks
    const chunks = Math.ceil(requiredDataSize / chunkSize);
    let largeData = '';
    
    for (let i = 0; i < chunks; i++) {
        largeData += 'x'.repeat(Math.min(chunkSize, requiredDataSize - (i * chunkSize)));
    }

    baseEvent.edata.largeData = largeData;
    return baseEvent;
};

// Generate different sized events
const events = {
    '1MB': generateLargeEvent(1),
    '2MB': generateLargeEvent(2),
    '6MB': generateLargeEvent(6), // Exceeds 5MB body-parser limit
    '10MB': generateLargeEvent(10) // Much larger than Kafka default limit
};

// Save events to files
Object.keys(events).forEach(size => {
    const filename = `large-event-${size.toLowerCase()}.json`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, JSON.stringify(events[size], null, 2));
    console.log(`Generated ${filename} - Actual size: ${(JSON.stringify(events[size]).length / 1024 / 1024).toFixed(2)}MB`);
});

module.exports = { generateLargeEvent };