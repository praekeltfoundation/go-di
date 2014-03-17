var src = {};

src.app = [
    'src/index.js',
    'src/ushahidi.js',
    'src/app.js'
];

src.prd = src.app.concat([
    'src/init.js'
]);

module.exports = {
    src: src,
    dest: {prd: 'go-di.js'},
    test: {
        spec: [
            'test/**/*.test.js'
        ],
        requires: [
            'test/setup.js'
        ]
    }
};
