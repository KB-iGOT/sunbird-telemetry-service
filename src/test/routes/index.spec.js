const chai = require('chai'),
    expect = chai.expect,
    chaiHttp = require('chai-http'),
    fs = require('fs'),
    path = require('path'),
    { generateLargeEvent } = require('../data/generate-large-event'),
    appPath = './../../app';
let app, mockServer;
chai.use(chaiHttp);
describe('route test', () => {

    beforeEach(() => {
        console.log(process.env.node_env);
        process.env.node_env = 'test'
        process.env.telemetry_local_storage_type = 'kafka';
        app = require(appPath);
        mockServer = chai.request(app);
    });

    after(() => process.env.node_env = 'prod');

    it('should return success if telemetry_local_storage_type is console if "/health" is called', function (done) {
        mockServer.get('/health').then(res => {
            expect(res.status).to.equal(200);
            done()
        });
    });

    it('should return success if telemetry_local_storage_type is console if  "/v1/telemetry" is called', function (done) {
        mockServer.post('/v1/telemetry').then(res => {
            expect(res.status).to.equal(200);
            done()
        });
    });

    describe('Request Body Size Tests', () => {
        let normalEvent, largeEvent1MB, largeEvent2MB;

        before(() => {
            // Load test data
            normalEvent = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/normal-event.json'), 'utf8'));
            
            // Generate different sized events for testing
            largeEvent1MB = generateLargeEvent(1);
            largeEvent2MB = generateLargeEvent(2);
        });

        it('should successfully handle normal size telemetry event', function (done) {
            mockServer
                .post('/v1/telemetry')
                .send(normalEvent)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('responseCode', 'SUCCESS');
                    done();
                });
        });

        it('should successfully handle 1MB telemetry event', function (done) {
            this.timeout(10000); // Increase timeout for large payload
            
            mockServer
                .post('/v1/telemetry')
                .send(largeEvent1MB)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('responseCode', 'SUCCESS');
                    done();
                });
        });

        it('should successfully handle 2MB telemetry event', function (done) {
            this.timeout(15000); // Increase timeout for larger payload
            
            mockServer
                .post('/v1/telemetry')
                .send(largeEvent2MB)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('responseCode', 'SUCCESS');
                    done();
                });
        });

        it('should handle 6MB telemetry event and return 413 Payload Too Large from body-parser', function (done) {
            this.timeout(20000); // Increase timeout for very large payload
            
            const largeEvent6MB = generateLargeEvent(6); // Exceeds 5MB body-parser limit
            
            mockServer
                .post('/v1/telemetry')
                .send(largeEvent6MB)
                .end((err, res) => {
                    // Should be rejected by body-parser middleware with 413 status
                    expect(res).to.have.status(413);
                    done();
                });
        });

        it('should handle event with very large edata field', function (done) {
            const eventWithLargeEdata = {
                ...normalEvent,
                edata: {
                    ...normalEvent.edata,
                    largeField: 'x'.repeat(500 * 1024), // 500KB string
                    additionalData: {
                        description: 'This is a test event with large edata to test Kafka message size handling',
                        metadata: Array(1000).fill({ key: 'value', data: 'test'.repeat(100) })
                    }
                }
            };

            mockServer
                .post('/v1/telemetry')
                .send(eventWithLargeEdata)
                .end((err, res) => {
                    // Should succeed if under 5MB body-parser limit
                    // But may fail later in Kafka with MessageSizeTooLarge
                    if (res.status === 200) {
                        expect(res.body).to.have.property('responseCode', 'SUCCESS');
                    } else {
                        expect(res.status).to.be.oneOf([413, 500]);
                    }
                    done();
                });
        });

        it('should handle empty request body gracefully', function (done) {
            mockServer
                .post('/v1/telemetry')
                .send({})
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('responseCode', 'SUCCESS');
                    done();
                });
        });
    });
});