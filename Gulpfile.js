'use strict';

var gulp = require('gulp');
var watch = require('gulp-watch');

var webpack = require('webpack');
var webpackConfig = require('./webpack.config.js');

gulp.task('build-scripts', function() {
	return webpack(webpackConfig, function(error, state) {
		console.log(error);
	});
});

gulp.task('watch', ['build-scripts'], function() {
	watch(['./dev/js/**/*.js'], function() {
		gulp.start('build-scripts');
	});
});
