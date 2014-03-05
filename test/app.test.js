var vumigo = require('vumigo_v02');
var app = require('../lib/app');
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
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

        describe("when the user has submitted their language", function() {
            it("should set the user's language",function() {
               return tester
                   .setup.user.state('states:start')
                   .input('1')
                   .check.user.properties({lang: 'en'})
                   .run();
            });

            it("should show them the address menu",function() {
                return tester
                    .setup.user.state('states:start')
                    .input('1')
                    .check.interaction({
                        state:'states:address',
                        reply:'To be completed'
                    });
            });
        });

    });
});
