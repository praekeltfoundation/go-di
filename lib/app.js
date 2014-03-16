var vumigo = require('vumigo_v02');
var _ = require('lodash');
var App = vumigo.App;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.InteractionMachine;
var MenuState = vumigo.states.MenuState;
var FreeText = vumigo.states.FreeText;
var HttpApi = vumigo.http.api.HttpApi;
var JsonApi = vumigo.http.api.JsonApi;


var UshahidiApi = HttpApi.extend(function(self, im, opts) {

    opts = _.defaults(opts || {}, {headers: {}});
    opts.headers['Content-Type'] = ['x-www-form-urlencoded'];
    HttpApi.call(self, im, opts);

    self.decode_response_body = function(body) {
        return JSON.parse(body);
    };

    self.encode_request_data = function(data) {
        var str = [];
        for(var p in data)
            if (data.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));
            }
        return str.join("&");
    };

    self.get_formatted_date = function(date) {
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var year =  date.getFullYear();
        return ([
            (month <10) ? "0" + month  : month ,
            (day < 10) ? "0" + day     : day,
             year
        ].join('/') );
    };


    self.post_report = function(url, opts) {

        var task = opts.task;
        var incident = opts.incident;
        var place = opts.place;
        var date = opts.date;
        return self.post(url, {
                "data": {
                    "task": task,
                    "incident_title": incident.title,
                    "incident_description": incident.description,
                    "incident_category": incident.category,
                    "incident_date":self.get_formatted_date(date),
                    "incident_hour": date.getHours() % 12,
                    "incident_minute": date.getMinutes(),
                    "incident_ampm": (date.getHours() < 12 ? 'am': 'pm'),
                    "latitude": place.geometry.location.lat ,
                    "longitude": place.geometry.location.lng ,
                    "location_name": place.formatted_address
                }
            });
    };
});

var GoDiApp = App.extend(function(self) {
    App.call(self, 'states:start');
    var $ = self.$;


    self.get_date = function() {
        return new Date();
    };

    self.get_date_string = function() {
        return self.get_date().toISOString();
    };

    self.is_delivery_class = function(delivery_class) {
        return self.im.config.delivery_class == delivery_class;
    };

    self.is_registered = function() {
        return (typeof self.contact.extra.is_registered !== 'undefined' && self.contact.extra.is_registered === "true");
    };

    self.is = function(boolean) {
        //If is is not undefined and boolean is true
        return (!_.isUndefined(boolean) && boolean==='true');
    };

    self.exists = function(extra) {
        return typeof extra !== 'undefined';
    };

    self.init = function() {
        self.http = new JsonApi(self.im);
        self.ushahidi = new UshahidiApi(self.im);

        self.im.on('session:close', function(e) {
            if (!self.should_send_dialback(e)) { return; }

            return _.isUndefined(self.contact.extra.ward)
                ? self.send_ward_dialback()
                : self.send_noward_dialback();
        });

        return self.im.contacts.for_user()
            .then(function(user_contact) {
               self.contact = user_contact;
            });
    };

    self.should_send_dialback = function(e) {
        return e.user_terminated
            && self.is_delivery_class('ussd')
            && self.is_registered()
            && !self.is(self.contact.extra.register_sms_sent);
    };

    self.send_ward_dialback = function() {
        return self.im.outbound
            .send_to_user({
                endpoint: 'sms',
                content: [
                    "Hello VIP!2 begin we need ur voting ward.",
                    "Dial *55555# & give us ur home address & we'll work it out.",
                    "This will be kept private, only ur voting ward will be stored &u will be anonymous."
                ].join(' ')
            })
            .then(function() {
                self.contact.extra.register_sms_sent = 'true';
                return self.im.contacts.save(self.contact);
            });
    };

    self.send_noward_dialback = function() {
        return self.im.outbound
            .send_to_user({
                endpoint: 'sms',
                content: [
                    'Thanks for volunteering to be a citizen reporter for the 2014 elections!',
                    'Get started by answering questions or reporting election activity!',
                    'Dial back in to *5555# to begin!'
                ].join(' ')
            }).then(function() {
                self.contact.extra.register_sms_sent = 'true';
                return self.im.contacts.save(self.contact);
            });
    };

    self.states.add('states:start',function(name) {
        if (!self.is_registered()) {
            return self.states.create('states:register');
        } else if (!self.exists(self.contact.extra.ward)) {
            return self.states.create('states:address');
        } else {
            return self.states.create('states:menu');
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
           question: $("It's election time! Do u think ur vote matters?"),
           choices: [
               new Choice("yes",$("YES every vote matters")),
               new Choice("no_vote_anyway",$("NO but I'll vote anyway")),
               new Choice("no_not_vote",$("NO so I'm NOT voting")),
               new Choice("not_registered",$("I'm NOT REGISTERED to vote")),
               new Choice("too_young",$("I'm TOO YOUNG to vote"))
           ],
           next: function(choice) {
               self.contact.extra.engagement_question = choice.value;
               self.contact.extra.it_engagement_question = self.get_date_string();

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

    //Registers the user and saves then redirects to the address state.
    self.states.add('states:registration:accept',function(name){
        self.contact.extra.is_registered = 'true';
        return self.im.contacts.save(self.contact).then(function() {
            return self.states.create('states:address');
        });
    });

    self.states.add('states:registration:read',function(name){
        self.contact.extra.is_registered = 'false';
        return self.im.contacts.save(self.contact).then(function() {
             return new EndState(name,{
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
            question: $("Thanks 4 joining!2 begin we need ur voting ward. " +
                        "Reply with ur home address & we'll work it out. " +
                        "This will be kept private, only ur voting ward will be stored " +
                        "&u will be anonymous."),
            check: function(content) {
                return self
                    .http.get('http://wards.code4sa.org/',{
                        params: {address: content}
                    })
                    .then(function(resp) {
                        response = resp;

                        if (typeof resp.data.error  !== 'undefined') {
                            return error;
                        } else {
                            self.contact.extra.ward = resp.data.ward;
                            self.contact.extra.it_ward = self.get_date_string();
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
                self.contact.extra.it_question1 = self.get_date_string();
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
                self.contact.extra.it_question2 = self.get_date_string();

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
                self.contact.extra.it_question3 = self.get_date_string();

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
                self.contact.extra.it_question4 = self.get_date_string();

                return self.im
                    .contacts.save(self.contact)
                    .then(function() {
                        return 'states:menu';
                    });
            }
        });
    });

    self.states.add('states:report',function(name) {
        return new ChoiceState(name, {
            question: $('What type of report would you like to submit?'),
            choices: [
                new Choice('election_campaign',$('Election Campaign/Rally')),
                new Choice('violence',$('Violence/Intimidation')),
                new Choice('fraud',$('Fraud/Corruption')),
                new Choice('voting_station',$('Voting Station')),
                new Choice('post_election',$('Post Election'))
            ],
            next: function(content) {
                self.contact.extra.report_type = content.value;
                self.contact.extra.it_report_type = self.get_date_string();

                return self.im.contacts.save(self.contact)
                    .then(function() {
                        return 'states:report:title';
                    });
            }
        });
    });

    self.states.add('states:report:title',function(name) {
        return new FreeText(name, {
            text: $('What is the title of your report?'),
            next: function(content) {
                self.contact.extra.report_title = content;
                self.contact.extra.it_report_title = self.get_date_string();

                return self.im.contacts.save(self.contact)
                    .then(function() {
                        return 'states:report:description';
                    });
            }
        });
    });

    self.states.add('states:report:description',function(name) {
        return new FreeText(name, {
            text: $('Describe the event:'),
            next: function(content) {
                self.contact.extra.report_desc = content;
                self.contact.extra.it_report_desc = self.get_date_string();

                return self.im.contacts.save(self.contact)
                    .then(function() {
                        return 'states:report:location';
                    });
            }
        });
    });

    self.get_location_str = function(content){
        return (content.indexOf("south africa") > 0) ? content : [content,"south africa"].join(' ');
    };

    self.states.add('states:report:location',function(name) {
        var response;
        var error =$('An error occured. Please try again');
        return new FreeText(name, {
            text: $('Where did this happen? Type the address + city. i.e. 44 Stanley Avenue Johannesburg'),
            check: function(content) {
                return self
                    .http.get("https://maps.googleapis.com/maps/api/geocode/json",{
                        params: {
                            address: self.get_location_str(content),
                            sensor: "false"
                        }
                    })
                    .then(function(resp) {
                        response = resp.data.results;
                        if (resp.data.status != "OK") {
                            return error;
                        }
                    });
            },
            next: function(content) {
                return {
                    name: 'states:report:verify_location',
                    creator_opts: {
                        address_options:response
                    }
                };
            }
        });
    });

    self.generate_address_id = function(address) {
        return [
            address.geometry.location.lat,
            address.geometry.location.lng,
            address.formatted_address.replace(", South Africa","")
        ].join("@");
    };

    self.states.add('states:report:verify_location',function(name,opts) {
        //Create the choices from the location verification.
        var index = 0;
        var choices = _.map(opts.address_options,function(address) {
            index++;
            //console.log(self.generate_address_id(address));
            return new Choice(index,address.formatted_address.replace(", South Africa",""));
        });
        //console.log(choices);

        return new ChoiceState(name, {
            question: $('Please select your location from the options below:'),
            choices: choices,
            next: function(content) {
                return self.ushahidi
                    .post_report(self.im.config.ushahidi_map, {
                        task: "report",
                        incident: {
                            title: self.contact.extra.report_title,
                            description: self.contact.extra.report_desc,
                            category: self.contact.extra.report_type
                        },
                        place: opts.address_options[content.value],
                        date:  self.get_date()
                    })
                    .then(function(resp) {

                        //get correct result + pass to ushahidi state.
                        return {
                            name:'states:report:end',
                            creator_opts: {
                                response: resp.data.payload.success
                            }
                        };
                    });
            }
        });
    });

    self.states.add('states:report:end',function(name,opts) {
        return new EndState(name, {
            text: $('Thanks for your report. Want to see your report and others on a map? Visit www.livevip.ushahidi.com'),
            next: function(content) {
                return "states:menu";
            }
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
this.UshahidiApi = UshahidiApi;
