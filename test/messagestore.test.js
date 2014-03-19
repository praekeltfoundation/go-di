var assert = require('assert');
var vumigo = require('vumigo_v02');
var DummyApi = vumigo.DummyApi;

var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;

describe("messagestore", function() {
    describe("DummyMessageStoreResource", function() {
        var api;
        var request;

        beforeEach(function() {
            api = new DummyApi();
            api.resources.add(new DummyMessageStoreResource());
            api.resources.attach(api);
            request = vumigo.test_utils.requester(api);
        });

        describe("handlers", function() {
            describe(".count_inbound_uniques", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.inbound_uniques = 42;

                    return request('messagestore.count_inbound_uniques', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            count: 42
                        });
                    });
                });
            });

            describe(".count_outbound_uniques", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.outbound_uniques = 42;

                    return request('messagestore.count_outbound_uniques', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            count: 42
                        });
                    });
                });
            });

            describe(".count_replies", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.replies = 42;

                    return request('messagestore.count_replies', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            count: 42
                        });
                    });
                });
            });

            describe(".count_sent_messages", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.sent_messages = 42;

                    return request('messagestore.count_sent_messages', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            count: 42
                        });
                    });
                });
            });

            describe(".count_inbound_throughput", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.inbound_throughput = 42;

                    return request('messagestore.count_inbound_throughput', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            count: 42
                        });
                    });
                });
            });

            describe(".count_outbound_throughput", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.outbound_throughput = 42;

                    return request('messagestore.count_outbound_throughput', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            count: 42
                        });
                    });
                });
            });

            describe(".progress_status", function() {
                it("should reply with its stubbed value", function() {
                    api.messagestore.progress_status.ack = 42;

                    return request('messagestore.progress_status', {
                        conversation_key: '123'
                    }).then(function(reply) {
                        assert.deepEqual(reply, {
                            success: true,
                            progress_status: {
                                ack: 42,
                                delivery_report: 0,
                                delivery_report_delivered: 0,
                                delivery_report_failed: 0,
                                delivery_report_pending: 0,
                                nack: 0,
                                sent: 0
                            }
                        });
                    });
                });
            });
        });
    });
});
