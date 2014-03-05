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
    };

    self.states.add('states:start', function(name) {
        return new ChoiceState(name, {
            question: 'your language:',
            choices: [
                new Choice('en','English'),
                new Choice('af','Afrikaans'),
                new Choice('zu','Zulu'),
                new Choice('xh','Xhosa'),
                new Choice('so','Sotho')
            ],
            next: function(choice) {
                return self.im.user.set_lang(choice.value).then(function() {
                        return 'states:address'
                });
            }
        });
    });

    self.states.add('states:address',function(name){
       return new EndState(name,{
           text: $('To be completed'),
           next: 'states:start'
       }) ;
    });
});


// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}


this.GoDiApp = GoDiApp;
