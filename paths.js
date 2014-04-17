var src = {};

src.app = [
    'src/ushahidi.js',
    'src/quiz.js',
    'src/vipquiz.js',
    'src/answerwinquiz.js',
    'src/whatsupquiz.js',
    'src/pushmessage.copy.js',
    'src/pushmessage.js',
    'src/base.js',
    'src/app.js'
];

src.prd = [
    'src/index.js'
].concat(src.app, [
    'src/init.js'
]);

src.sms = [
    'src/index.js'
].concat(src.app, [
        'src/init.sms.js'
    ]);

module.exports = {
    src: src,
    dest: {
        prd: 'go-di.js',
        sms: 'sms.go-di.js'
    },
    test: {
        spec: [
            'test/**/*.test.js'
        ],
        requires: [
            'test/setup.js'
        ]
    }
};
