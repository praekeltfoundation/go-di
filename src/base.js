di.base = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var AppStates = vumigo.app.AppStates;
    var State = vumigo.states.State;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var VotingExperienceQuiz = di.quiz.votingexperience.VotingExperienceQuiz;
    var GroupCQuiz = di.quiz.groupc.GroupCQuiz;
    var PushMessageApi = di.pushmessage.PushMessageApi;
    var _ = require('lodash');
    var Q = require('q');

    var DiAppStates  = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);
        var create =  self.create;

        self.create = function(name,opts) {
            if (!app.is(self.app.im.msg.inbound_push_trigger)) {
                return create(name, opts);
            }
            return !app.push_api.should_push()
                ? create('states:noop')
                : create(app.push_api.get_push_state());
        };
    });

    var BaseDiApp = App.extend(function(self, start_state_name) {
        App.call(self, start_state_name, {AppStates: DiAppStates});
        var $ = self.$;
        self.push_api = new PushMessageApi(self.im,self);

        self.init = function() {
            return self.im
                .contacts.for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                });
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

        self.week_day_code = ['Su','M','T','W','Th','F','S'];

        self.is = function(boolean) {
            //If is is not undefined and boolean is true
            return (!_.isUndefined(boolean) && (boolean==='true' || boolean===true));
        };

        self.is_delivery_class = function(delivery_class) {
            return self.im.config.delivery_class == delivery_class;
        };

        /*
         * To abstract which random class is being used
         * */
        self.random = function(begin,end,float) {
            return _.random(begin,end,float);
        };

        self.get_date = function() {
            if (_.isUndefined(self.im.config.override_date)) {
                return new Date();
            } else {
                return new Date(self.im.config.override_date);
            }
        };

        self.get_date_string = function() {
            return self.get_date().toISOString();
        };

        self.states.add('states:noop', function(name) {
            var state = self.im.user.state.serialize();
            return new State(name, {
                send_reply: false,
                events: {
                    'im im:shutdown': function() {
                        self.im.user.state.reset(state);
                    }
                },
                next: self.start_state_name
            });
        });

        self.states.add('states:push:start', function(name,opts) {
            //Get the new message
            var msg = self.push_api.get_push_msg();
            var field = self.push_api.get_push_field(msg.type,msg.push_num);

            return self
                .im.contacts.save(self.contact)
                .then(function() {
                    return new FreeText(name, {
                        question: msg.question,
                        events: {
                            //Needs to be saved when FreeText is served
                            'im state:enter': function() {
                                self.contact.extra['it_'+field] = self.get_date_string();
                                return self
                                    .im.contacts.save(self.contact)
                                    .then(function() {
                                        return self.im.metrics.fire.inc('total.push.sent');
                                    });
                            }
                        },
                        next: function(content) {
                            //Needs to be saved on reply
                            self.contact.extra[field+'_reply'] = content;
                            self.contact.extra['it_'+field+'_reply'] = self.get_date_string();
                            return self
                                .im.contacts.save(self.contact)
                                .then(function() {
                                    return self.im.metrics.fire.inc('total.push.replies');
                                })
                                .thenResolve('states:push:end');
                        }
                    });
                });
        });

        self.states.add('states:push:end', function(name) {
            return new EndState(name, {
                send_reply: false,
                next: self.start_state_name
            });
        });

        self.save_push_trigger_fields = function(field) {
            self.contact.extra['it_'+field] = self.get_date_string();
            return self
                .im.contacts.save(self.contact)
                .then(function() {
                    return self.im.metrics.fire.inc('total.push.sent');
                });
        };

        self.get_quiz_conversation = function(name,quiz,field) {
            return new ChoiceState(name, {
                question: $('VIP wants to know if you voted?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No'))
                ],
                events: {
                    'im state:enter': function() {
                        return self.save_push_trigger_fields(field);
                    }
                },
                next: function(choice) {
                    return self.save_contact_fields(choice,field,quiz,'did_you_vote');
                }
            });
        };

        self.save_contact_fields = function(choice, field, quiz,question_name) {
            self.contact.extra[field+'_reply'] = choice.value;
            self.contact.extra['it_'+field+'_reply'] = self.get_date_string();

            return self
                .im.contacts.save(self.contact)
                .then(function() {
                    return quiz.answer(question_name,choice.value);
                })
                .then(function() {
                    return self.im.metrics.fire.inc('total.push.replies');
                })
                .then(function() {
                    return self.get_next_quiz_conversation_state(quiz,choice.value);
                });
        };

        self.get_other_endline_conversation = function(name,field) {
            return new ChoiceState(name,{
                question: [
                    "Thx 4 joining VIP:Voice & reprtng on the Election! Let us kno wht u think!",
                    "Answr a few qstns & stand chance 2 WIN artime!"
                ].join(' '),
                choices: [
                    new Choice('yes',$('To begin')),
                    new Choice('no',$('No thanks'))
                ],
                events: {
                    'im state:enter': function() {
                        return self.save_push_trigger_fields(field);
                    }
                },
                next: function(choice) {
                    return self.save_contact_fields(choice,field,self.quizzes.endlinesurvey,'begin_quiz');
                }
            });
        };

        self.get_sms_endline_conversation = function(name,field) {
            return new EndState(name, {
                text: [
                    "Thx 4 joining VIP:Voice & reprtng on the Election! Let us kno wht u think!",
                    "Answr a few qstns & stand chance 2 WIN artime! Dial *120*4792*3# for FREE."
                ].join(' '),
                events: {
                    'im state:enter': function() {
                        return self.save_push_trigger_fields(field);
                    }
                },
                next: 'states:push:end'
            });
        };

        self.get_endline_survey_conversation = function(name,field) {
            if (self.im.config.delivery_class === 'sms') {
                return self.get_sms_endline_conversation(name,field);
            } else {
                return self.get_other_endline_conversation(name,field);
            }
        };

        self.get_next_quiz_conversation_state = function(quiz,choice) {
            if (choice === 'yes') {
                if (self.im.config.delivery_class === 'sms') {
                    return quiz.get_prompt_state();
                } else if (self.im.config.delivery_class === 'mxit') {
                    return quiz.get_next_quiz_state();
                }
            } else {
                return 'states:push:thanks';
            }
        };

        self.quizzes =  {};
        self.quizzes.votingexperience = new VotingExperienceQuiz(self);
        self.quizzes.groupc = new GroupCQuiz(self);

        self.states.add('states:push:voting_turnout',function(name) {
            var field = self.push_api.get_push_field('voting_turnout',1);
            return self.get_quiz_conversation(name,self.quizzes.votingexperience,field);
        });

        self.states.add('states:push:group_c_turnout',function(name) {
            var field = self.push_api.get_push_field('group_c_turnout',1);
            return self.get_quiz_conversation(name,self.quizzes.groupc,field);
        });

        self.states.add('states:push:endlinesurvey:prompt',function(name) {
            var field = self.push_api.get_push_field('endlinesurvey',1);
            if (self.im.config.delivery_class === 'sms') {
                return self.get_sms_endline_conversation(name,field);
            } else {
                return self.get_other_endline_conversation(name,field);
            }
        });

        self.states.add('states:push:thanks',function(name) {
            return new EndState(name,{
                text: $('Thanks for your response'),
                next: 'states:push:end'
            }) ;
        });
    });

    var DiSmsApp = BaseDiApp.extend(function(self) {
        BaseDiApp.call(self, 'states:noop');

        self.states.add('states:start',function(name){
            return self.states.create('states:noop');
        });
    });

    return {
        DiAppStates : DiAppStates,
        BaseDiApp : BaseDiApp,
        DiSmsApp : DiSmsApp
    };
}();
