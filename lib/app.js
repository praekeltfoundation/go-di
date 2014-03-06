var vumigo = require('vumigo_v02');
var App = vumigo.App;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var EndState = vumigo.states.EndState;
var BookletState = vumigo.states.BookletState;
var InteractionMachine = vumigo.InteractionMachine;
var HttpApi = vumigo.http.api.HttpApi;
var bookletState = "Terms and Conditions";


var GoDiApp = App.extend(function(self) {
    App.call(self,'states:start');

    self.init = function() {
        self.http = new HttpApi(self.im);
        return self.im.contacts.for_user().then(function(user_contact) {
           self.contact = user_contact;
        });
    };

    self.states.add('states:start', function(name) {
        return new ChoiceState(name, {
            question: 'Please accept the terms and conditions to get started. Find them on www.livevip.co.za',
            choices: [ new Choice('accept','Accept & Join'),
                        new Choice('read','Read t&c'),
                        new Choice('quit','Quit')],
            next: function(choice) {
                return {
                    accept: 'states:registration:accept',
                    read: 'states:registration:read',
                    quit: 'states:registration:end'
                } [choice.value]
            }
        });
    });

    self.states.add('states:registration:accept',function(name){
        self.contact.extra.is_registered = 'true';
        return self.im.contacts.save(self.contact).then(function() {
            return new EndState(name, {
                text: 'Thanks for volunteering to be a citizen reporter for the 2014 elections! Get started by answering questions to earn airtime!',
                next: 'states:start'
            });
        });
    });

    self.states.add('states:registration:read',function(name){
        return new BookletState(name, {
            text: bookletState,
            next: 'states:'
        });
    });

    self.states.add('states:registration:end',function(name){
        return new EndState(name, {
            text: 'Thanks. Please reconsider being a citizen reporter',
            next: 'states:start'
        })
    });
});


// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}

this.GoDiApp = GoDiApp;
