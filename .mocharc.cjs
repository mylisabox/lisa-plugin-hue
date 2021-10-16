const config = {
    'files': ['./test/**/*.test.js'],
    'reporter': 'spec',
    'timeout': 120000,
    'recursive': true,
    'full-trace': true,
    'slow': 50,
    'check-leaks': true,
    'globals': ['app']
};

module.exports = config;
