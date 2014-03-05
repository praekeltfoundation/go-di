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
            it("should say hello", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:start',
                        reply: 'Hello :)'
                    })
                    .run();
            });
        });
    });
});
