'use strict';

var gulp = require('gulp');
var watch = require('gulp-watch');
var webpack = require('webpack');
var path = require('path');

var webpackConfig = require('./webpack.config.js');
var pathConfig = require('./path.config.js');

gulp.task('build-scripts', function() {
	return webpack(webpackConfig, function(error, state) {
		console.log(error);
	});
});

gulp.task('watch', ['build-scripts'], function() {
	watch([path.resolve(__dirname, pathConfig.entryJS + '/**/*.js')], function() {
		gulp.start('build-scripts');
	});
});
