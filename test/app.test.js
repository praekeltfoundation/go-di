var _ = require('lodash');
var assert = require('assert');
var vumigo = require('vumigo_v02');
var app = require('../lib/app');
var GoDiApp = app.GoDiApp;
var AppTester = vumigo.AppTester;
var HttpApi = vumigo.http.api.HttpApi;
var fixtures = require('./fixtures');


describe("app", function() {
    describe("GoDiApp", function() {
        var app;
        var tester;
        var http;
        beforeEach(function() {
            app = new GoDiApp();
            http = HttpApi;
            tester = new AppTester(app);
            tester.setup.config.app({
                name: 'test_app'
            })
            .setup(function() {
                fixtures().forEach(http.fixtures.add);
            })
        });

        describe("when the user starts a session", function() {
            it("should say hello", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:start',
<<<<<<< Updated upstream
                        reply: 'Hello :)'
=======
                        reply: ['Welcome to Voting is Power! Start by choosing your language:',
                                '1. English',
                                '2. Afrikaans',
                                '3. Zulu',
                                '4. Xhosa',
                                '5. Sotho'
                        ].join('\n')
>>>>>>> Stashed changes
                    })
                    .run();
            });
        });
<<<<<<< Updated upstream
=======

        describe("when the user has submitted their language as english", function() {
            it("should set the user's language to english",function() {
                return tester
                    .setup.user.state('states:start')
                    .input('1')
                    .check.user.properties({lang: 'en'})
                    .run();
            });

            it("should show them the address menu in english",function() {
                return tester
                    .setup.user.state('states:start')
                    .input('1')
                    .check.interaction({
                        state:'states:address',
                        reply:'To be completed'
                    }).run();
            });
        });

        describe("when the user has submitted their language as afrikaans", function() {
            it("should set the user's language",function() {
               return tester
                   .setup.user.state('states:start')
                   .input('2')
                   .check.user.properties({lang: 'af'})
                   .run();
            });
        });

        describe("when the user has submitted their language as zulu", function() {
            it("should set the user's language",function() {
                return tester
                    .setup.user.state('states:start')
                    .input('3')
                    .check.user.properties({lang: 'zu'})
                    .run();
            });
        });

        describe("when the user has submitted their language as Xhosa", function() {
            it("should set the user's language",function() {
                return tester
                    .setup.user.state('states:start')
                    .input('4')
                    .check.user.properties({lang: 'xh'})
                    .run();
            });
        });

        describe("when the user has submitted their language as Sotho", function() {
            it("should set the user's language",function() {
                return tester
                    .setup.user.state('states:start')
                    .input('5')
                    .check.user.properties({lang: 'so'})
                    .run();
            });
        });

        describe("when a user enters there address as:  ", function() {
           it("should send the appropriate http request",function() {
              return tester.
                  setup.user.state('states:address')
                  .input('1600 Amphitheatre Parkway, Mountain View, CA')
                  .check(function(http,im) {
                      var req = _.find(http.requests, {
                          url: "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&sensor=false"
                      });
                      assert.equal(req.response.data.results[0].formatted_address,'1600 Amphitheatre Parkway, Mountain View, CA 94043, USA');
                  });
           });
        });

>>>>>>> Stashed changes
    });
});
