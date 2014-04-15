di.push_message_states = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var AppStates = vumigo.app.AppStates;
    var PushMessageApi = di.push_message.PushMessageApi;

    var DiAppStates  = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);
        self.pushmessage = new PushMessageApi(app.im,app);
        var create =  self.create;

        self.create = function(name,opts) {
            if (!self.app.im.msg.inbound_push_trigger) {
                return create(name, opts);
            }

            return !self.should_push()
                ? create('states:noop')
                : self.get_push();
        };

        self.should_push = function() {
            return self.pushmessage.should_send_push();
        };

        self.get_push = function() {
            self.pushmessage
                .rerandomize_week_day()
                .then(function() {
                    var state = self.pushmessage.get_push_message();
                    return create('states:push:start',state);
                });
        };
    });

    return {
        DiAppStates : DiAppStates
    };
}();