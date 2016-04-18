var path = require('path');

module.exports = {
    entry: './dev/js/jquery.main.js',
    output: {
        path: './build/scripts/',
        filename: 'main.js'
    },
    watch: false,
    debug: true,
    devtool: 'inline-source-map',
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            loader: 'babel',
            query: {
                presets: ['es2015']
            }
        }]
    },
    resolve: {
        alias: {
            jquery: path.resolve(__dirname, './dev/js/lib/jquery-1.12.2.js')
        }
    }

};