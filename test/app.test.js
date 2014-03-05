var vumigo = require('vumigo_v02');
var app = require('../lib/app');
var GoDiApp = app.GoDiApp;
var AppTester = vumigo.AppTester;

describe("app", function() {
    describe("GoDiApp", function() {
        var app;
        var tester;
        
        beforeEach(function() {
            app = new GoDiApp();

            tester = new AppTester(app);

            tester.setup.config.app({
                name: 'test_app'
            });
        });

        describe("when the user starts a session", function() {
            it("should ask them to choose a language ", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:start',
                        reply: ['your language:',
                                '1. English',
                                '2. Afrikaans',
                                '3. Zulu',
                                '4. Xhosa',
                                '5. Sotho'
                        ].join('\n')
                    })
                    .run();
            });
        });

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

    });
});
