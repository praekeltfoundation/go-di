di.base = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var App = vumigo.App;
    var AppStates = vumigo.app.AppStates;
    var State = vumigo.states.State;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var PushMessageApi = di.pushmessage.PushMessageApi;

    var DiAppStates  = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);
        var create =  self.create;

        self.create = function(name,opts) {
            var push_api =  new PushMessageApi(app.im,app);
            if (!self.app.im.msg.inbound_push_trigger) {
                return create(name, opts);
            }

            return !push_api.should_push()
                ? create('states:noop')
                : create('states:push:start');
        };
    });

    var BaseDiApp = App.extend(function(self, start_state_name) {
        App.call(self, start_state_name, {AppStates: DiAppStates});

        // workaround for https://github.com/praekelt/vumi-jssandbox-toolkit/pull/179
        self.states = new DiAppStates(self);
        self.push_api = new PushMessageApi(self);

        self.init = function() {
            return self.im
                .contacts.for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                });
        };

        self.states.add('states:noop', function(name) {
            var state = self.im.user.state.serialize();

            return new State(name, {
                send_reply: false,
                events: {
                    'im im:shutdown': function() {
                        self.im.user.state.reset(state);
                    }
                }
            });
        });

        self.states.add('states:push:start', function(name) {
            //Rerandomize week_day - on client's orders
            self.push_api.rerandomize_week_day();

            //Get the new message
            var msg = self.push_api.get_push_msg();
            var field = self.push_api.get_push_field(msg.type,msg.num);

            //Make changes to the contact
            self.contact.extra['it_'+field] = self.get_date_string();
            self.im.contacts
                .save(self.contact)
                .then(function() {
                    return self.states.create('states:push:question',{
                        msg:msg,
                        field:field
                    });
                });
        });

        self.states.add('states:push:question', function(name,opts) {
            var msg = opts.msg;
            var field = opts.field;
            //Create state
            return new FreeText(name, {
                question: msg.question,
                next: function(content) {
                    self.contact.extra[field+'_reply'] = content;
                    self.contact.extra['it_'+field+'_reply'] = self.get_date_string();
                    return self
                        .im.contacts.save(self.contact)
                        .thenResolve('states:push:end');
                }
            });
        });

        self.states.add('states:push:end', function(name) {
            return new EndState(name, {
                send_reply: false,
                next: self.start_state_name
            });
        });
    });

    return {
        DiAppStates : DiAppStates,
        BaseDiApp : BaseDiApp
    };
}();