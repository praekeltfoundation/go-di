var vumigo = require('vumigo_v02');
var App = vumigo.App;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.InteractionMachine;
var HttpApi = vumigo.http.api.HttpApi;


var GoDiApp = App.extend(function(self) {
    App.call(self, 'states:start');

    self.init = function() {
        self.http = new HttpApi(self.im);
    };

    self.states.add('states:start', function(name) {
        return new ChoiceState(name, {
            question: 'Please accept the terms and conditions to get started. Find them on www.livevip.co.za',
            choices: [ new Choice('accept','Accept & Join'),
                        new Choice('read','Read t&c'),
                        new Choice('quit','Quit')],
            next: function(choice) {
                return {
                    accept: 'states:accept',
                    read: 'states:read',
                    quit: 'states:end'
                } [choice.value]
            }
        })
    });

    self.states.add('states:accept',function(name){
       return new EndState(name, {
           text: 'Thank you for accepting',
           next: 'states:start'
       })
    });

    self.states.add('states:read',function(name){
        return new EndState(name, {
            text: 'Please go read the terms and conditions',
            next: 'states:start'
        })
    });

    self.states.add('states:end',function(name){
        return new EndState(name, {
            text: 'The end',
            next: 'states:start'
        })
    });


});


// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}

this.GoDiApp = GoDiApp;
