'use strict';

window.jQuery = require('jquery');
import FileUploade from 'file-uploader';

// page init
jQuery(function() {
	jQuery('.image-uploader-form').each(function() {
		new FileUploade({
			form: this,
			validateTypes: 'image/*',
			validateFormats: 'png',
			onValidateError: function(errorName, currFormat, validFormat) {
				alert('"' + currFormat + '"' + ' is error ' + errorName + '! Must be ' + '"' + validFormat + '"');
			},
			onSuccess () {
				console.log('success')
			},
			onError () {
				console.log('error')
			}
		});
	});

	jQuery('.file-uploader-form').each(function() {
		new FileUploade({
			form: this,
			validateFormats: 'css,js',
			onValidateError: function(errorName, currFormat, validFormat) {
				alert('"' + currFormat + '"' + ' is error ' + errorName + '! Must be ' + '"' + validFormat + '"');
			}
		});
	});
});
