di.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var Q = require('q');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var BookletState = vumigo.states.BookletState;
    var EndState = vumigo.states.EndState;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;
    var UshahidiApi = di.ushahidi.UshahidiApi;
    var VipQuiz = di.quiz.vip.VipQuiz;
    var WhatsupQuiz = di.quiz.whatsup.WhatsupQuiz;
    var AnswerWinQuiz = di.quiz.answerwin.AnswerWinQuiz;
    var BaseDiApp = di.base.BaseDiApp;

    var GoDiApp = BaseDiApp.extend(function(self) {
        BaseDiApp.call(self, 'states:start');
        var $ = self.$;

        self.quizzes = {};
        self.quizzes.vip = new VipQuiz(self);
        self.quizzes.whatsup = new WhatsupQuiz(self);
        self.quizzes.answerwin = new AnswerWinQuiz(self);

        self.week_day_code = ['Su','M','T','W','Th','F','S'];

        self.random_standard = function() {
            if (self.random(0,1,true) < 0.2) {
                return 'GS1';
            } else {
                return 'GS2';
            }
        };

        self.random_geographical = function(ward,ward_treatment) {

            var category = ward_treatment[ward];
            var geographical_group="";
            //get geographical group
            switch (category) {
                case "Standard": geographical_group = self.random_standard(); break;
                case "Control": geographical_group = 'GC'; break;
                case "High Intensity": geographical_group = 'GH'; break;
            }
            return geographical_group;
        };

        self.random_monitoring = function(geographical_group,push_message_group) {

            if (geographical_group === "GH"|| geographical_group === "GS2") {
                //Choose day from 0 to 6 inclusive
                var week_day = self.week_day_code[self.random(0,6)];
                var push_group = self.random(1,30);
                var per_sms_group = push_message_group[push_group];
                return {
                    monitoring_group:'true',
                    week_day: week_day,
                    push_group: push_group.toString(),
                    sms_1: per_sms_group.sms_1,
                    sms_2: per_sms_group.sms_2,
                    sms_3: per_sms_group.sms_3
                };
            }
            return {
                monitoring_group:'false',
                week_day: '',
                push_group: '',
                sms_1: '',
                sms_2:'',
                sms_3: ''
            };
        };

        self.set_contact_group = function(ward,ward_treatment, push_message_group) {
            //Random group setup.
            var geographical = self.random_geographical(ward,ward_treatment);
            var monitoring = self.random_monitoring(geographical,push_message_group);
            self.contact.extra.geographical_group = geographical;
            self.contact.extra.monitoring_group = monitoring.monitoring_group;
            self.contact.extra.week_day = monitoring.week_day;
            self.contact.extra.push_group = monitoring.push_group;
            self.contact.extra.sms_1 = monitoring.sms_1;
            self.contact.extra.sms_2 = monitoring.sms_2;
            self.contact.extra.sms_3 = monitoring.sms_3;
        };

        self.is_registered = function() {
            return (typeof self.contact.extra.is_registered !== 'undefined'
                            && (self.contact.extra.is_registered === "true"));
        };

        self.exists = function(extra) {
            return typeof extra !== 'undefined';
        };

        self.get_group_config = function() {
              return Q.all([
                      self.im.sandbox_config.get('ward_treatment',{
                          json:true
                      }),
                      self.im.sandbox_config.get('push_message_group',{
                          json:true
                      })
                  ]);
        };

        self.init = function() {
            self.http = new JsonApi(self.im);
            self.ushahidi = new UshahidiApi(self.im);
            self.quizzes.answerwin.init();
            self.store_name = self.im.config.name;

            self.im.on('session:new',function() {
                //Sets delivery class of contact.
                if (_.isUndefined(self.contact.extra.delivery_class)) {
                    self.contact.extra.delivery_class = self.im.config.delivery_class;
                }

                //Set the last channel this user accessed
                if (self.is_delivery_class("ussd") && _.isUndefined(self.contact.extra.USSD_number)) {
                    self.contact.extra.USSD_number = self.im.config.channel;
                }

                //Fire metrics
                //Save contact
                return Q.all([
                    self.im.metrics.fire.inc("sum.visits"),
                    self.im.metrics.fire.avg("avg.visits",1),
                    self.get_unique_users(),
                    self.im.contacts.save(self.contact)
                ]);
            });

            self.im.on('session:close', function(e) {
                if (!self.should_send_dialback(e)) { return; }
                return self.send_dialback();
            });

            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };

        self.should_display_results = function() {
            var now = self.get_date();
            var config =  new Date(self.im.config.display_results_date);
            return now >= config;
        };

        self.should_send_dialback = function(e) {
            return e.user_terminated
                && self.is_delivery_class('ussd')
                && self.is_registered()
                && !self.is(self.contact.extra.register_sms_sent);
        };

        self.get_registration_sms = function() {
            return $([
                    "Thanks for volunteering to be a citizen reporter for the 2014 elections!",
                    "Get started by answering questions or reporting election activity!",
                    "Dial {{ USSD_number }} to return to VIP"
                ].join(' '))
                .context({
                    USSD_number: self.contact.extra.USSD_number
                });
        };

        self.send_dialback = function() {
            return self.im.outbound
                .send_to_user({
                    endpoint: 'sms',
                    content: self.get_registration_sms()
                })
                .then(function() {
                    self.contact.extra.register_sms_sent = 'true';
                    return self.im.contacts.save(self.contact);
                });
        };

        /*
        * When users are registered:
        * set as registered.
        * a list of unanswered questions is generated.
        * kv + metrics are fired
        * */
        self.register = function() {
            self.contact.extra.is_registered = 'true';

            //Fire metrics + increment kv store
            return self
                .incr_kv('registered.participants')
                .then(function(result) {
                    return self.im.metrics.fire.last('registered.participants',result.value);
                });
        };

        self.get_unique_users = function() {
            return self.im
                .api_request('messagestore.count_inbound_uniques',{})
                .then(function(result) {
                    return self.im.metrics.fire.last('unique.participants',result.count);
                });
        };

        self.set_twitter_begin_state = function() {
            //Sets language to English
            return self.im.user.set_lang('en').then(function() {
                return self.states.create('states:registration:engagement');
            });
        };

        self.states.add('states:start',function(name) {
            if (!self.is_registered()) {
                if (self.is_delivery_class('twitter')) {
                    return self.set_twitter_begin_state();
                } else {
                    return self.states.create('states:register');
                }
            } else if (!self.is(self.im.config.bypass_address)
                && !self.exists(self.contact.extra.ward)) {
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
                    new Choice('zu',$('Zulu'))
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
                choices: [ new Choice('accept',$('Accept & Join')),
                            new Choice('read',$('Read t&c')),
                            new Choice('quit',$('Quit'))],
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
            return self.register()
                .then(function(result) {
                    return self.im.contacts.save(self.contact).then(function() {
                        if (self.is(self.im.config.bypass_address)) {
                            return self.states.create('states:menu');
                        } else {
                            return self.states.create('states:address');
                        }
                    });
                });
        });

        self.get_terms = function() {
            return [
                $("University of California San Diego requests ur consent to act as a research subject for " +
                    "improving electoral performance through citizen engagement in SA."),
                $("Study provides evaluation on how 2 use marketing &recruitment strategies,with mobile technology " +
                    "to improve how elections r monitored by citizen volunteers."),
                $("If u participate,we will ask questions about urself&ur observations of the elections.U will b " +
                    "anonymous.Ur answers will be kept confidential&won't b shared."),
                $("To view full T&Cs please visit www.yal.mobi/vip.")
            ];
        };

        self.states.add('states:registration:read',function(name) {
            var terms = self.get_terms();
            self.contact.extra.is_registered = 'false';
            return self.im.contacts.save(self.contact).then(function() {
                return new BookletState(name, {
                    pages: terms.length,
                    page_text: function(n) {return terms[n];},
                    buttons: {"1": -1, "2": +1, "3": "exit"},
                    footer_text:$([
                        "1. Prev",
                        "2. Next",
                        "3. Exit"
                    ].join("\n")),
                    next: 'states:registration:tandc'
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

        self.states.add('states:address',function(name,opts){
            var error = $('Please carefully enter your address again: for eg: 12 main street pretoria');
            var response;

            var question = "";
            if (!opts.retry) {
                question =  $([
                        "Thanks 4 joining!2 begin we need ur voting ward.",
                        "Reply with ur home address & we'll work it out.",
                        "This will be kept private, only ur voting ward will be stored",
                        "&u will be anonymous."
                    ].join(" "));
            } else {
                question = error;
            }

            return new FreeText(name,{
                question: question,
                check: function(content) {
                    //If the user is on second attempt, then save in separate field.
                    if (!opts.retry) {
                        self.contact.extra.raw_user_address = content;
                    } else {
                        self.contact.extra.raw_user_address_2 = content;
                    }

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return self
                                .http.get('http://wards.code4sa.org/',{
                                    params: {
                                        address: content,
                                        database: 'vd_2014',
                                        reject_numbers: "true",
                                        reject_short_words: '2',
                                        reject_large_main_places: '7000',
                                        reject_resolution_to_main_place: "7000"
                                    }
                                });
                        })
                        .then(function(resp) {
                            response = resp;
                            if (typeof resp.data.error  !== 'undefined') {
                                return error;
                            }
                        });
                },
                next: function(resp) {
                    return {
                        name: 'states:address:verify',
                        creator_opts: {
                            address_options:response.data,
                            retry: opts.retry
                        }
                    };
                }
            }) ;
        });

        self.set_ward_data = function(choice, opts) {
            var index = choice.value-1;
            self.contact.extra.ward = opts.address_options[index].ward;
            self.contact.extra.voting_district = opts.address_options[index].voting_district;
            self.contact.extra.it_ward = self.get_date_string();

            //Set contact group
            return self
                .get_group_config()
                .spread(function(ward_treatment, push_message_group) {
                    //Set the contact group
                    self.set_contact_group(
                        self.contact.extra.ward,
                        ward_treatment,
                        push_message_group
                    );

                    //Save contact.
                    return self.im.contacts.save(self.contact).then(function() {
                        return "states:menu";
                    });
                });
        };

        self.handle_unavailable_location = function(choice,opts,location_state) {
            //If already retried then set default to unknown.
            if (opts.retry) {
                self.contact.extra.ward = 'unknown';
                return self.im.contacts.save(self.contact).then(function() {
                    return "states:menu";
                });

            } else {
                return {
                    name: 'states:address',
                    creator_opts: {
                        retry: true
                    }
                };
            }
        };

        self.states.add('states:address:verify',function(name,opts){
            var index = 0;
            var choices = _.map(opts.address_options,function(ward) {
                index++;
                return new Choice(index,ward.address.replace(", South Africa",""));
            });

            if (!opts.retry) {
                choices.push( new Choice("not_available",$("Not my address")));
            } else {
                choices.push(new Choice("not_available",$("Still not my address")));
            }

            return new PaginatedChoiceState(name, {
                question: $('Choose your area:'),
                choices: choices,
                characters_per_page: 140,
                options_per_page: 3,
                next: function(choice) {
                    if (choice.value !== "not_available")
                        return self.set_ward_data(choice,opts);
                    else {
                        return self.handle_unavailable_location(choice,opts);
                    }
                }
            });
        });

        self.get_menu_choices = function() {
            var results =  new Choice('states:results',$('View VIP results...'));
            var choices = [
                new Choice('states:quiz:answerwin:begin',$('Answer & win!')),
                new Choice(self.quizzes.vip.get_next_quiz_state(),$('VIP Quiz')),
                new Choice('states:report',$('Report an Election Activity')),
                results,
                new Choice(self.quizzes.whatsup.get_next_quiz_state(),$("What's up?")),
                new Choice('states:about',$('About')),
                new Choice('states:end',$('End'))
            ];

            //Dont display 'View results' menu options before specified
            if (!self.should_display_results()) {
                choices =  _.without(choices, results);
            }

            return choices;
        };

        self.states.add('states:menu',function(name) {
            return new MenuState(name, {
                question: $('Welcome to VIP!'),
                choices: self.get_menu_choices()
            });
        });

        self.states.add('states:quiz:end',function(name){
            return new MenuState(name, {
                question: $('Thanks, u have answered all the questions in this section.'),
                choices: [
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });

        self.get_kv = function(name) {
            return self.im.api_request('kv.get', {key: [self.store_name, name].join('.')});
        };

        self.get_group_kv = function(name) {
            return self.im.api_request('kv.get', {key: [self.im.config.kv_group, name].join('.')});
        };

        self.incr_kv = function(name) {
            return self.im
                .api_request('kv.incr', {key: [self.im.config.kv_group, name].join('.')})
                .then(function(result) {
                    return self.im.api_request('kv.incr', {key: [self.store_name, name].join('.')});
                });
        };

        self.states.add('states:report',function(name) {
            var report_types = [
                new Choice('Party going door-to-door',$('Party going door-to-door')),
                new Choice('Party intimidating voters',$('Party intimidating voters')),
                new Choice('Party distributing food/money/gift',$('Party distributing food/money/gift')),
                new Choice('Campaign rally',$('Campaign rally')),
                new Choice('Campaign violence',$('Campaign violence')),
                new Choice('Protest/Demonstration',$('Protest/Demonstration'))
            ];
            return new ChoiceState(name, {
                question: $("Choose a report type:"),
                choices: report_types ,
                next: function(choice) {
                    var category_index = _.findIndex(report_types,function(c) {
                        return c.value === choice.value;
                    });
                    self.contact.extra.report_type = (category_index + 1).toString();
                    self.contact.extra.report_desc = choice.value;
                    self.contact.extra.it_report_type = self.get_date_string();

                    return self
                        .im.contacts.save(self.contact)
                        .then(function() {
                            return 'states:report:title';
                        });
                }
            });
        });

        self.states.add('states:report:title',function(name) {
            return new FreeText(name, {
                question: $('What is the title of your report?'),
                next: function(content) {
                    self.contact.extra.report_title = content;
                    self.contact.extra.it_report_title = self.get_date_string();

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return 'states:report:location';
                        });
                }
            });
        });

        self.get_location_str = function(content){
            return (content.toLowerCase().indexOf("south africa") > -1) ? content : [content,"south africa"].join(' ');
        };

        self.states.add('states:report:location',function(name,opts) {
            var response;
            var error = $('Please carefully enter your address again: for eg: 12 main street pretoria');
            var question = (!opts.retry)
                ? $('Where did this event happen? Please be as specific as possible and give address and city.')
                : error;

            return new FreeText(name, {
                question: question,
                check: function(content) {
                    return self.http
                        .get("https://maps.googleapis.com/maps/api/geocode/json",{
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
                            address_options:response,
                            retry: opts.retry
                        }
                    };
                }
            });
        });

        self.save_and_send_ushahidi = function(place) {
            return self.ushahidi
                .post_report(self.im.config.ushahidi_map, {
                    task: "report",
                    incident: {
                        title: self.contact.extra.report_title,
                        description: self.contact.extra.report_desc,
                        category: self.contact.extra.report_type
                    },
                    place: place,
                    date:  self.get_date(),
                    who: self.im.user.addr
                })
                .then(function(resp) {
                    return self
                        .incr_kv('total.reports')
                        .then(function(results) {
                            return self.im.metrics.fire.last('total.reports',results.value);
                        })
                        .then(function() {
                            return {
                                name:'states:report:end',
                                creator_opts: {
                                    response: resp.data.payload.success
                                }
                            };
                        });
                });
        };

        self.states.add('states:report:verify_location',function(name,opts) {
            //Create the choices from the location verification.
            var index = 0;
            var choices = _.map(opts.address_options,function(address) {
                index++;
                return new Choice(index,address.formatted_address.replace(", South Africa",""));
            });

            if (!opts.retry) {
                choices.push( new Choice("not_available",$("Not the address")));
            } else {
                choices.push(new Choice("still_not_available",$("Still not the address")));
            }

            return new PaginatedChoiceState(name, {
                question: $("Please select the location from the options below"),
                choices: choices,
                characters_per_page: 140,
                options_per_page: 3,
                next: function(choice) {
                    //If user chooses not available and they haven't already retried
                    if (choice.value === 'not_available') {
                        return {
                            name: 'states:report:location',
                            creator_opts: {
                                retry: true
                            }
                        };
                    } else {
                        //If choice is still unavailable then set place to null
                        var place = (choice.value !== "still_not_available")
                            ? opts.address_options[choice.value-1]
                            : null;

                        return self.save_and_send_ushahidi(place);
                    }
                }
            });
        });

        self.states.add('states:report:end',function(name,opts) {
            return new EndState(name, {
                text: $([
                    'Thank you for your report! Keep up the reporting',
                    '& you may have a chance to be chosen as an official',
                    'election day reporter where you can earn airtime or cash',
                    'for your contribution.'
                ].join(" ")),
                next: 'states:menu'
            });
        });

        self.states.add('states:results',function(name) {
                return Q.all([
                    self.get_group_kv('registered.participants'),
                    self.get_group_kv('total.questions'),
                    self.get_group_kv('total.reports')
                ])
                .spread(function(registered, questions, reports) {
                    return new EndState(name, {
                        text: $([
                            'You are 1 of {{ registered }} citizens who',
                            'are active citizen election reporters!',
                            '{{ questions }} questions and {{ reports }}',
                            'election activity posts have been submitted.',
                            'View results at www.url.com'
                        ].join(' ')).context({
                            registered: registered.value || 0,
                            questions: questions.value || 0,
                            reports: reports.value || 0
                        }),
                        next: 'states:start'
                    });
                });
        });

        self.get_about = function() {
              return [
                  $("The VIP-Ask is a multi-channel political engagement portal.VIP: " +
                    "Ask will engage South Africans from all walks of life to " +
                    "report on electoral activities,"),
                  $("voice their opinions on current issues surrounding the elections, " +
                    "and report on election processes on voting day."),
                      $("VIP:Ask is a partnership between academics, " +
                    "Democracy International, Livity Africa and the Praekelt Foundation")
              ];
        };

        self.states.add('states:about',function(name) {
            var about = self.get_about();
            return new BookletState(name, {
                pages: about.length,
                page_text: function(n) {return about[n];},
                buttons: {"1": -1, "2": +1, "3": "exit"},
                footer_text: $([
                    "1. Prev",
                    "2. Next",
                    "3. Exit"
                ].join("\n")),
                next: 'states:menu'
            });
        });

        self.states.add('states:end',function(name) {
            return new EndState(name, {
                text: $('Bye.'),
                next: 'states:start'
            });
        });
    });

    return {
        GoDiApp: GoDiApp
    };
}();
