'use strict';

var path = require('path');
var pathConfig = require('./path.config.js');

module.exports = {
	entry: path.resolve(__dirname, pathConfig.entryJS + '/main.js'),
	output:{
		path: path.resolve(__dirname, pathConfig.outputJS + '/'),
		filename: 'main.js',
		library: 'FileUploader'
	},
	watch: false,
	debug: true,
	devtool: 'inline-source-map',
	module:{
		loaders: [{
			test: /\.js$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'babel',
			query:{
				presets: ['es2015']
			}
		}]
	},
	provide:{
		$: 'jquery',
		jQuery: 'jquery'
	}
};