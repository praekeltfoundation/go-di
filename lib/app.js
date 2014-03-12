var vumigo = require('vumigo_v02');
var App = vumigo.App;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.InteractionMachine;
var MenuState = vumigo.states.MenuState;
var FreeText = vumigo.states.FreeText;
var JsonApi = vumigo.http.api.JsonApi;

var GoDiApp = App.extend(function(self) {
    App.call(self, 'states:start');
    var $ = self.$;

    self.get_date = function() {
        return new Date().toISOString();
    };

    self.init = function() {
        self.http = new JsonApi(self.im);
        return self.im.contacts.for_user().then(function(user_contact) {
           self.contact = user_contact;
        });
    };

    self.states.add('states:start',function(name) {
        if ( typeof self.contact.extra.is_registered === 'undefined' || self.contact.extra.is_registered === "false") {
            return self.states.create('states:register');
        } else {
            return self.states.create('states:address');
        }
    });

    self.states.add('states:register', function(name) {
        return new ChoiceState(name, {
            question: $('Welcome to Voting is Power! Start by choosing your language:'),
            choices: [
                new Choice('en',$('English')),
                new Choice('af',$('Afrikaans')),
                new Choice('zu',$('Zulu')),
                new Choice('xh',$('Xhosa')),
                new Choice('so',$('Sotho'))
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
           question: $('Are you excited about the election?'),
           choices: [
               new Choice('yes',$('Yes')),
               new Choice('no',$('No'))
           ],
           next: function(choice) {
               self.contact.extra.engagement_question = choice.value;
               self.contact.extra.it_engagement_question = self.get_date();

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

    self.states.add('states:address',function(name){
        var error = $("Oops! Something went wrong! Please try again.");
        var response;

        return new FreeText(name,{
            question: $("Please enter your home address. i.e. 9 Dover Street"),
            check: function(content) {
                return self
                    .http.get('http://wards.code4sa.org/',{
                        params: {address: encodeURI(content)}
                    })
                    .then(function(resp) {
                        response = resp;

                        if (typeof resp.data.error  !== 'undefined') {
                            return error;
                        } else {
                            self.contact.extra.ward = resp.data.ward;
                            self.contact.extra.it_ward = self.get_date();
                            return self.im.contacts.save(self.contact);
                        }
                    });
            },
            next: function(resp) {
                return 'states:menu';
            }
        }) ;
    });

    self.states.add('states:menu',function(name) {
        return new MenuState(name, {
            question: $('Welcome to the Campaign'),
            choices:[
                new Choice('states:quiz:tier2:question1',$('Take the quiz & win!')),
                new Choice('states:report',$('Report an Election Activity')),
                new Choice('states:results',$('View the results...')),
                new Choice('states:about',$('About')),
                new Choice('states:end',$('End'))
            ]
        });
    });

    self.states.add('states:quiz:tier2:question1',function(name) {
        return new ChoiceState(name, {
           question: $('Are you registered to vote?'),
           choices: [
                new Choice('yes',$('Yes')),
                new Choice('no',$('No')),
                new Choice('u18',$('I am u18 and not able to register yet'))
            ],
            next: function(content) {
                self.contact.extra.question1 = content.value;
                self.contact.extra.it_question1 = self.get_date();
                return self.im
                    .contacts.save(self.contact)
                    .then(function() {
                        return 'states:quiz:tier2:question2';
                    });
            }
        });
    });

    self.states.add('states:quiz:tier2:question2',function(name) {
        return new ChoiceState(name, {
            question: $('How old are you?'),
            choices: [
                new Choice('u18',$('under 18')),
                new Choice('19-20',$('19-20')),
                new Choice('21-30',$('21-30')),
                new Choice('31-40',$('31-40')),
                new Choice('41-50',$('41-50')),
                new Choice('51-60',$('51-60')),
                new Choice('61-70',$('61-70')),
                new Choice('71-80',$('71-80')),
                new Choice('81-90',$('81-90')),
                new Choice('90+',$('90+'))
            ],
            next: function(content) {
                self.contact.extra.question2 = content.value;
                self.contact.extra.it_question2 = self.get_date();

                return self.im
                    .contacts.save(self.contact)
                    .then(function() {
                        return 'states:quiz:tier2:question3';
                    });
            }
        });
    });

    self.states.add('states:quiz:tier2:question3',function(name) {
        return new ChoiceState(name, {
            question: $('How likely is it that you will vote in the upcoming election?'),
            choices: [
                new Choice('highly_likely',$('highly likely')),
                new Choice('likely',$('likely')),
                new Choice('not_likely',$('not likely')),
                new Choice('highly_unlikely',$('highly unlikely'))
            ],
            next: function(content) {
                self.contact.extra.question3 = content.value;
                self.contact.extra.it_question3 = self.get_date();

                return self.im
                    .contacts.save(self.contact)
                    .then(function() {
                        return 'states:quiz:tier2:question4';
                    });
            }
        });
    });

    self.states.add('states:quiz:tier2:question4',function(name) {
        return new ChoiceState(name,{
            question: $('What education level do you have?'),
            choices: [
                new Choice('less_than_matric',$('Less than a matric')),
                new Choice('matric',$('matric')),
                new Choice('diploma',$('diploma')),
                new Choice('degree',$('degree')),
                new Choice('postgrad',$('post-grad degree/diploma'))
            ],
            next: function(content) {
                self.contact.extra.question4 = content.value;
                self.contact.extra.it_question4 = self.get_date();

                return self.im
                    .contacts.save(self.contact)
                    .then(function() {
                        return 'states:menu';
                    });
            }
        });
    });

    self.states.add('states:report',function(name) {
        return new EndState(name, {
            text: $('To be continued'),
            next: 'states:start'
        });
    });
    self.states.add('states:results',function(name) {
        return new EndState(name, {
            text: $('To be continued'),
            next: 'states:start'
        });
    });
    self.states.add('states:about',function(name) {
        return new EndState(name, {
            text: $('To be continued'),
            next: 'states:start'
        });
    });

    self.states.add('states:end',function(name) {
        return new EndState(name, {
            text: $('Bye.'),
            next: 'states:start'
        });
    });

});

// if we have the real api, this is not a test, start the interaction machine
if (typeof api != 'undefined') {
    new InteractionMachine(api, new GoDiApp());
}

this.GoDiApp = GoDiApp;
