var vumigo = require('vumigo_v02');
var App = vumigo.App;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.InteractionMachine;
var HttpApi = vumigo.http.api.HttpApi;


var GoDiApp = App.extend(function(self) {
    App.call(self, 'states:start');

    self.init = function() {
        self.http = new HttpApi(self.im);
    };

    self.states.add('states:start', function(name) {
        return new EndState(name, {
            text: 'Hello :)'
        });
    });
});


// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}


this.GoDiApp = GoDiApp;
