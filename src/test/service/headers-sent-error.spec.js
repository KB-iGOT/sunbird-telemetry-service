const chai = require('chai'),
    sinon = require('sinon'),
    expect = chai.expect;

describe('ERR_HTTP_HEADERS_SENT Prevention Tests', () => {
    let telemetryService, req, res;
    
    beforeEach(() => {
        // Clean require cache
        delete require.cache[require.resolve('./../../service/telemetry-service')];
        delete require.cache[require.resolve('./../../envVariables')];
        
        // Setup environment for dual storage + proxy
        process.env.telemetry_local_storage_enabled = 'true';
        process.env.telemetry_proxy_enabled = 'true';
        process.env.telemetry_log_level = 'info';
        process.env.telemetry_local_storage_type = 'console';
        process.env.telemetry_proxy_url = 'http://test.proxy.com/telemetry';
        
        telemetryService = require('./../../service/telemetry-service');
        
        // Mock request and response objects
        req = {
            body: { eid: 'TEST', data: 'test' },
            get: sinon.stub().returns('test-header')
        };
        
        res = {
            headersSent: false,
            status: sinon.stub().returnsThis(),
            json: sinon.stub().returnsThis()
        };
    });

    it('should prevent double response when both dispatcher and proxy succeed', (done) => {
        // Mock dispatcher to succeed
        sinon.stub(telemetryService.dispatcher, 'dispatch').callsFake((mid, data, callback) => {
            setTimeout(() => callback(null, { success: true }), 10);
        });
        
        // Mock successful proxy request
        const request = require('request');
        sinon.stub(request, 'post').callsFake((options, callback) => {
            setTimeout(() => callback(null, { body: { success: true } }), 5);
        });
        
        telemetryService.dispatch(req, res);
        
        // Wait for both operations to complete
        setTimeout(() => {
            // Should only call response methods once
            expect(res.status.calledOnce).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            
            // Cleanup stubs
            telemetryService.dispatcher.dispatch.restore();
            request.post.restore();
            done();
        }, 50);
    });

    it('should handle response already sent scenario gracefully', () => {
        const callback = telemetryService.getRequestCallBack(req, res);
        
        // Simulate headers already sent
        res.headersSent = true;
        
        // Should not throw error
        expect(() => {
            callback(null, { success: true });
        }).to.not.throw();
        
        // Should not call response methods
        expect(res.status.called).to.be.false;
        expect(res.json.called).to.be.false;
    });

    it('should handle sendError when headers already sent', () => {
        res.headersSent = true;
        
        expect(() => {
            telemetryService.sendError(res, { id: 'test.error', params: { err: 'test' } });
        }).to.not.throw();
        
        expect(res.status.called).to.be.false;
        expect(res.json.called).to.be.false;
    });

    it('should handle sendSuccess when headers already sent', () => {
        res.headersSent = true;
        
        expect(() => {
            telemetryService.sendSuccess(res, { id: 'test.success' });
        }).to.not.throw();
        
        expect(res.status.called).to.be.false;
        expect(res.json.called).to.be.false;
    });

    it('should catch and handle response method exceptions', () => {
        // Mock res.json to throw ERR_HTTP_HEADERS_SENT
        res.json = sinon.stub().throws(new Error('ERR_HTTP_HEADERS_SENT'));
        
        expect(() => {
            telemetryService.sendSuccess(res, { id: 'test.success' });
        }).to.not.throw();
    });
});