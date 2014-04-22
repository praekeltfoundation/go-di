di.base = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var AppStates = vumigo.app.AppStates;
    var State = vumigo.states.State;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var PushMessageApi = di.pushmessage.PushMessageApi;
    var _ = require('lodash');

    var DiAppStates  = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);
        var create =  self.create;


        self.create = function(name,opts) {
            if (!app.is(self.app.im.msg.inbound_push_trigger)) {
                return create(name, opts);
            }
            return !app.push_api.should_push()
                ? create('states:noop')
                : create('states:push:start');
        };
    });

    var BaseDiApp = App.extend(function(self, start_state_name) {
        App.call(self, start_state_name, {AppStates: DiAppStates});
        self.push_api = new PushMessageApi(self.im,self);

        self.init = function() {
            return self.im
                .contacts.for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                });
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
                return Date.parse(self.im.config.override_date);
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
