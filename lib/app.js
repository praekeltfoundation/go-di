var vumigo = require('vumigo_v02');
var App = vumigo.App;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.InteractionMachine;
var HttpApi = vumigo.http.api.HttpApi;

var GoDiApp = App.extend(function(self) {
    App.call(self, 'states:start');
    var $ = self.$;


    self.init = function() {
        self.http = new HttpApi(self.im);
        return self.im.contacts.for_user().then(function(user_contact) {
           self.contact = user_contact;
        });
    };

    self.states.add('states:start',function(name) {
        if ( typeof self.contact.extra.is_registered === 'undefined' || self.contact.extra.is_registered === "false") {
            return self.states.create('states:register');
        } else {
            return self.states.create('states:location');
        }
    });

    self.states.add('states:register', function(name) {
        return new ChoiceState(name, {
            question: 'Welcome to Voting is Power! Start by choosing your language:',
            choices: [
                new Choice('en','English'),
                new Choice('af','Afrikaans'),
                new Choice('zu','Zulu'),
                new Choice('xh','Xhosa'),
                new Choice('so','Sotho')
            ],
            next: function(choice) {

                return self.im.user.set_lang(choice.value).then(function() {
                    return 'states:registration:engagement';
                });
            }
        });
    });

    self.states.add('states:registration:engagement', function(name) {
       return new ChoiceState(name, {
           question: $('Engagement question'),
           choices: [
               new Choice('1',$('Dummy Answer')),
               new Choice('2',$('Dummy Answer 2'))
           ],
           next: function(choice) {
               self.contact.extra.question1 = choice.value;
               return self.im.contacts.save(self.contact).then(function() {
                   return 'states:registration:tandc';
               });
           }
       });
    });

    self.states.add('states:registration:tandc', function(name) {
        return new ChoiceState(name, {
            question: $("Please accept the terms and conditions to get started."),
            choices: [ new Choice('accept','Accept & Join'),
                        new Choice('read','Read t&c'),
                        new Choice('quit','Quit')],
            next: function(choice) {
                return {
                    accept: 'states:registration:accept',
                    read: 'states:registration:read',
                    quit: 'states:registration:end'
                } [choice.value];
            }
        });
    });

    self.states.add('states:registration:accept',function(name){
        self.contact.extra.is_registered = 'true';
        return self.im.contacts.save(self.contact).then(function() {
            return new EndState(name, {
                text: $('Thanks for volunteering to be a citizen reporter for the 2014 elections! Get started by answering questions to earn airtime!'),
                next: 'states:start'
            });
        });
    });

    self.states.add('states:registration:read',function(name){
        self.contact.extra.is_registered = 'false';
        return self.im.contacts.save(self.contact).then(function() {
            return new EndState(name, {
                text: $("Terms and Conditions"),
                next: 'states:start'
            });
        });
    });

    self.states.add('states:registration:end',function(name){
        self.contact.extra.is_registered = 'false';
        return self.im.contacts.save(self.contact).then(function() {
           return new EndState(name,{
               text: $('Thank you for your time. Remember, you can always reconsider becoming a citizen reporter.'),
               next: 'states:start'
           }) ;
        });
    });

    self.states.add('states:location',function(name) {
        return new EndState(name, {
            text: "To be continued",
            next: 'states:start'
        });
    });
});


// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}

this.GoDiApp = GoDiApp;
