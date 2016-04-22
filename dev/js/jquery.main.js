'use strict';

window.jQuery = require('jquery');
let ImageUploader = require('./file.uploader.js').ImageUploader;

// page init
jQuery(function(){
	initUploadImage();
});

function initUploadImage() {
	jQuery('.image-uploader-form').each(function() {
		new ImageUploader({
			form: this,
			validateTypes: 'image.*',
			onRemoveThumb (thumb) {
				console.log(thumb)
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
		new ImageUploader({
			form: this,
			validateFormats: 'css|js'
		});
	});
}
