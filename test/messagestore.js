var vumigo = require('vumigo_v02');
var DummyResource = vumigo.dummy.resources.DummyResource;


var DummyMessageStoreResource = DummyResource.extend(function(self) {
    DummyResource.call(self, 'messagestore');

    self.inbound_uniques = 0;
    self.outbound_uniques = 0;
    self.replies = 0;
    self.sent_messages = 0;
    self.inbound_throughput = 0;
    self.outbound_throughput = 0;

    self.progress_status = {
        ack: 0,
        delivery_report: 0,
        delivery_report_delivered: 0,
        delivery_report_failed: 0,
        delivery_report_pending: 0,
        nack: 0,
        sent: 0
    };

    self.handlers.count_inbound_uniques = function() {
        return {
            success: true,
            count: self.inbound_uniques
        };
    };

    self.handlers.count_outbound_uniques = function() {
        return {
            success: true,
            count: self.outbound_uniques
        };
    };

    self.handlers.count_replies = function() {
        return {
            success: true,
            count: self.replies
        };
    };

    self.handlers.count_sent_messages = function() {
        return {
            success: true,
            count: self.sent_messages
        };
    };

    self.handlers.count_inbound_throughput = function() {
        return {
            success: true,
            count: self.inbound_throughput
        };
    };

    self.handlers.count_outbound_throughput = function() {
        return {
            success: true,
            count: self.outbound_throughput
        };
    };

    self.handlers.progress_status = function() {
        return {
            success: true,
            progress_status: self.progress_status
        };
    };
});


this.DummyMessageStoreResource = DummyMessageStoreResource;
