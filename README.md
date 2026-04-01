# sunbird-telemetry-service

This is the repository for Sunbird telemetry microservice. It provides APIs for Sunbird telemetry.

## Features

- RESTful APIs for telemetry data ingestion
- Multiple storage backends (Kafka, File, Cassandra, Console)
- Configurable proxy support for forwarding telemetry data
- Message size validation and handling
- Comprehensive error logging with full event details

## API Endpoints

- `POST /v1/telemetry` - Submit telemetry events
- `GET /health` - Health check endpoint

## Configuration

The service can be configured using environment variables:

### Core Configuration
- `telemetry_local_storage_enabled` - Enable local storage (default: true)
- `telemetry_proxy_enabled` - Enable proxy forwarding (default: false)
- `telemetry_log_level` - Logging level (default: info)
- `telemetry_local_storage_type` - Storage type: kafka/file/cassandra/console

### Kafka Configuration
- `telemetry_kafka_broker_list` - Kafka broker list
- `telemetry_kafka_topic` - Kafka topic name
- `telemetry_kafka_compression` - Compression type: gzip/snappy/none (default: gzip)

### Proxy Configuration  
- `telemetry_proxy_url` - Proxy endpoint URL
- `telemetry_proxy_auth_key` - Proxy authentication key

### Service Configuration
- `telemetry_service_port` - Service port (default: 9001)
- `telemetry_service_threads` - Number of threads (default: CPU cores)

## Request Body Size Limits

The service handles different message size scenarios:

- **Body Parser Limit**: 5MB (configurable in app.js)
- **Kafka Default Limit**: 1MB (may cause MessageSizeTooLarge errors)
- **Large Message Handling**: Complete event details logged on errors

## Testing

### Running Tests

```bash
# Install dependencies
cd src && npm install

# Run all tests
npm test

# Run tests with coverage
npm run test-with-coverage

# Run specific test suites
npm test -- --grep "Message Size"    # Message size handling tests
npm test -- --grep "Request Body"    # Request body size tests
npm test -- --grep "telemetry Service"  # Core service tests
```

### Test Categories

#### 1. Core Service Tests (`src/test/service/telemetry-service.spec.js`)
- Service initialization and configuration
- Dispatcher setup (Kafka, File, Cassandra, Console)
- Health check functionality
- Proxy forwarding behavior
- Error handling and logging

#### 2. Message Size Handling Tests
- **Normal Size Events**: < 1KB events (should succeed)
- **Medium Size Events**: 100KB-1MB events (should succeed)  
- **Large Size Events**: 1MB-5MB events (should succeed with body-parser)
- **Oversized Events**: > 5MB events (should return 413 Payload Too Large)
- **Kafka Size Limit Tests**: Events that trigger MessageSizeTooLarge errors
- **Error Logging Tests**: Verification of complete event detail logging

#### 3. API Route Tests (`src/test/routes/index.spec.js`)
- Health endpoint functionality
- Telemetry endpoint with various payload sizes
- Request body size limit validation
- HTTP status code verification

#### 4. Dispatcher Tests (`src/test/dispatcher/`)
- Kafka dispatcher functionality and health checks
- Message publishing to Kafka topics
- Error handling in dispatcher layer

### Test Data

Test events are located in `src/test/data/`:

- **`normal-event.json`**: Standard telemetry event (~1KB)
- **`large-event-1mb.json`**: 1MB test event
- **`large-event-2mb.json`**: 2MB test event  
- **`large-event-6mb.json`**: 6MB test event (exceeds body-parser limit)
- **`large-event-10mb.json`**: 10MB test event (much larger than Kafka default)

### Generating Test Data

```bash
cd src/test/data
node generate-large-event.js
```

This generates events of various sizes for testing size limits and error handling.

### Expected Test Behaviors

| Event Size | Body Parser | Kafka | Expected Result |
|------------|-------------|-------|-----------------|
| < 1KB | ✅ Pass | ✅ Pass | 200 Success |
| 100KB-1MB | ✅ Pass | ⚠️ May fail | 200 Success or 500 with MessageSizeTooLarge |
| 1MB-5MB | ✅ Pass | ❌ Likely fails | 200 Success or 500 with MessageSizeTooLarge |
| > 5MB | ❌ Fails | ❌ Not reached | 413 Payload Too Large |

### Error Logging Features

When errors occur, the service logs:
- Complete error details
- Full event payload as formatted JSON
- Error response sent to client
- Message size information

Example error log output:
```
error MessageSizeTooLarge
Complete event details: {
  "eid": "INTERACT",
  "ets": 1638360000000,
  "edata": { ... }
}
Error response: {
  "id": "api.telemetry",
  "responseCode": "SERVER_ERROR",
  "params": { "err": "MessageSizeTooLarge" }
}
```

### Test Configuration

Set test environment:
```bash
export telemetry_local_storage_enabled=true
export telemetry_proxy_enabled=false  
export telemetry_log_level=info
export telemetry_local_storage_type=console
export node_env=test
```

Or use the provided script:
```bash
source src/test/test-config.sh
```

## Installation & Deployment

### Development Setup

```bash
# Clone repository
git clone https://github.com/project-sunbird/sunbird-telemetry-service.git
cd sunbird-telemetry-service

# Install dependencies
cd src && npm install

# Start service
npm start
```

### Docker Deployment

```bash
# Build Docker image
./build.sh <tag> <node> <org>

# Run container
docker run -p 9001:9001 <org>/telemetry-service:<tag>
```

### Environment Variables for Production

```bash
# Required for Kafka
telemetry_kafka_broker_list=localhost:9092
telemetry_kafka_topic=telemetry.ingestion

# Optional configurations
telemetry_kafka_compression=gzip
telemetry_service_port=9001
telemetry_local_storage_enabled=true
telemetry_proxy_enabled=false
```

## Troubleshooting

### Common Issues

1. **MessageSizeTooLarge Error**
   - Increase Kafka broker `message.max.bytes` setting
   - Enable compression: `telemetry_kafka_compression=gzip`
   - Check event size in error logs

2. **413 Payload Too Large**
   - Increase body-parser limit in `app.js`
   - Current default: 5MB

3. **Health Check Failures**
   - Verify Kafka broker connectivity
   - Check dispatcher configuration
   - Review service logs for connection errors

## License

The code in this repository is licensed under MIT License unless otherwise noted. Please see the [LICENSE](https://github.com/project-sunbird/sunbird-telemetry-service/blob/master/LICENSE) file for details.
