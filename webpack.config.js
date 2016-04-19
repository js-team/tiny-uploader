var path = require('path');
var pathConfig = require('./path.config.js');


module.exports = {
    entry: path.resolve(__dirname, pathConfig.entryJS + '/jquery.main.js'),
    output: {
        path: path.resolve(__dirname, pathConfig.outputJS + '/'),
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
            'jquery': path.resolve(__dirname, pathConfig.entryJS + '/lib/jquery-1.12.2.js')
        }
    }

};