di.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoDiApp = di.app.GoDiApp;


    return {
        im: new InteractionMachine(api, new GoDiApp())
    };
}();
