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

    self.geolocate = function(address) {

        var address = address;
        var sensor = false;
        var url ='https://maps.googleapis.com/maps/api/geocode/json?' +address + '&' + sensor;
        return self.http.get(url);
    }

    self.states.add('states:start', function(name) {
        return new ChoiceState(name, {
<<<<<<< Updated upstream
            question: 'Please accept the terms and conditions to get started. Find them on www.livevip.co.za',
            choices: [ new Choice('accept','Accept & Join'),
                        new Choice('read','Read t&c'),
                        new Choice('quit','Quit')],
=======
            question: 'Welcome to Voting is Power! Start by choosing your language:',
            choices: [
                new Choice('en','English'),
                new Choice('af','Afrikaans'),
                new Choice('zu','Zulu'),
                new Choice('xh','Xhosa'),
                new Choice('so','Sotho')
            ],
>>>>>>> Stashed changes
            next: function(choice) {
                return {
                    accept: 'states:accept',
                    read: 'states:read',
                    quit: 'states:end'
                } [choice.value]
            }
        })
    });

<<<<<<< Updated upstream
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

=======
    self.states.add('states:address',function(name){
       return self.then(function() {
           new FreeText(name,{
               question: $("Please enter your home address. i.e. 9 Dover Street (Don't worry you will remain anonymous)"),
               next: 'states:location:results'
           }) ;
       });
    });

    self.states.add('states:location:results',function(name) {
        var address = self.im.user.get_answer('states:address')
        return self.geolocate(address).then(function(response) {
            var results = response.data.results.map(function(result) {
                return new Choice(response.formatted_address,response.formatted_address);
            });
            return new ChoiceState(name, {
                question: 'Choose your location:',
                choices: results,
                next: new EndState(name,"End")
            });
        });
    });

>>>>>>> Stashed changes

});


// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}

this.GoDiApp = GoDiApp;
