// page init
jQuery(function(){
	initUploadImage();
});

function initUploadImage() {
	jQuery('.image-uploader').imageUploader({
		//thumbType: 'canvas'
	});
}

;(function($, w, d) {
	'use strict';

	function ImageUploader(options) {
		this.options = $.extend({
			form: 'form',
			dropArea: '.drop-area',
			fileInput: 'input[type="file"]',
			thumbnailHolder: '.thumbnails',
			thumbType: 'image', // 'image', 'canvas',
			cropSize: { // width / height (px)
				w: 100,
				h: 100
			}
		}, options);

		this.init();
	}

	ImageUploader.prototype = {
		init: function() {
			if (this.options.form) {
				this.findElements();
				this.attachEvents();
				this.makeCallback('onInit', this);
			}
		},
		findElements: function() {
			this.form = $(this.options.form);
			this.dropArea = this.form.find(this.options.dropArea);
			this.fileInput = this.form.find(this.options.fileInput);
			this.thumbnailHolder = this.form.find(this.options.thumbnailHolder);
		},
		attachEvents: function() {
			var self = this;

			this.fileInput.on('change', function(e) {
				e.preventDefault();

				var files = 'files' in e.target ? e.target.files : 'dataTransfer' in e.originalEvent ? e.originalEvent.dataTransfer.files : [];

				if (files.length) {
					self.showThumbnail(files);
				}
			});

			this.dropArea.on('dragenter dragover dragleave drop', function(e) {
				e.stopPropagation();
				e.preventDefault();
			});

			this.dropArea.on('drop', function(e) {
				var files = 'files' in e.target ? e.target.files : 'dataTransfer' in e.originalEvent ? e.originalEvent.dataTransfer.files : [];

				if (files.length) {
					self.showThumbnail(files);
				}
			});

			this.form.on('submit', function(e) {
				e.preventDefault();
				self.submitHandler(e);
			});
		},
		submitHandler: function() {
			this.uploadHandler(this.form.attr('action'), this.fileInput[0].files);
		},
		uploadHandler: function(url, files) {
			$.ajaxFormData(url, {
				data: {
					'name': 'images',
					'ufiles[]': files
				},
				xhr: function() {
					var xhr = $.ajaxSettings.xhr();

					if (xhr.upload) {

						xhr.upload.addEventListener('progress', function(event) {
							var percent = 0;
							var position = event.loaded || event.position; /*event.position is deprecated*/
							var total = event.total;
							if (event.lengthComputable) {
								percent = Math.ceil(position / total * 100);
								console.log(percent + '%')
							}
						}, false);
					}
					return xhr;
				}
			}).done(function(data, textStatus, jqXHR) {
				console.log(data);
			}).fail(function(jqXHR, textStatus, errorThrown) {
				console.log(jqXHR.responseText);
			});
		},
		showThumbnail: function(files) {
			var self = this;
			var imageType = /image.*/;

			$.each(files, function(i, file) {
				var imageType = /image.*/

				if (!file.type.match(imageType)) {
					console.log("Not an Image");
				}

				var image = new Image();

				image.file = file;

				var reader = new FileReader();

				reader.onload = (function(aImg) {
					return function(e) {
						aImg.src = e.target.result;
					};
				}(image));

				reader.readAsDataURL(file);

				if (self.options.thumbType === 'canvas') {
					self.addCanvasThumb(image);
				} else if (self.options.thumbType === 'image') {
					self.addImageThumb(image);
				}
			});
		},
		addImageThumb: function(image) {
			var self = this;
			var imageFormat = image.file.type.split('/')[1];

			this.createCanvasCrop(image).done(function(canvas) {
				var base64resized = canvas.toDataURL('image/' + imageFormat); // 'type, encoderOptions' (image/png, between 0 and 1 indicating image quality if the requested type is image/jpeg or image/webp)
				image.src = base64resized;

				$(image).appendTo(self.thumbnailHolder);
			});
		},
		addCanvasThumb: function(image) {
			var self = this;

			this.createCanvasCrop(image).done(function(canvas) {
				$(canvas).appendTo(self.thumbnailHolder);
			});
		},
		createCanvasCrop: function(image) {
			var df = $.Deferred();
			var canvas = d.createElement('canvas');
			var ctx = canvas.getContext('2d');

			canvas.height = this.options.cropSize.w;
			canvas.width = this.options.cropSize.h;

			image.onload = function() {
				var dim = ImageStretcher.getDimensions(image, canvas);
				var sourceWidth = canvas.width * dim.koef;
				var sourceHeight = canvas.height * dim.koef;

				var destWidth = canvas.width;
				var destHeight = canvas.height;
				var sourceX = -1 * dim.left * dim.koef;
				var sourceY = -1 * dim.top * dim.koef;
				var destX = 0;
				var destY = 0;

				ctx.drawImage(
					image,
					sourceX, sourceY, // Start at sourceX/sourceY pixels from the left and the top of the image (crop),
					sourceWidth, sourceHeight, // "Get" a `sourceWidth * sourceHeight` (w * h) area from the source image (crop),
					destX, destY, // Place the result at destX, destY in the canvas,
					destWidth, destHeight // With as width / height: destWidth * destHeight (scale)
				);

				df.resolve(canvas);
			}

			return df;
		},
		makeCallback: function(name) {
			if (typeof this.options[name] === 'function') {
				var args = Array.prototype.slice.call(arguments);
				args.shift();
				this.options[name].apply(this, args);
			}
		}
	};

	// jQuery plugin interface
	$.fn.imageUploader = function(options) {
		return this.each(function() {
			var params = $.extend({}, options, {form: this}),
				instance = new ImageUploader(params);
			$.data(this, 'ImageUploader', instance);
		});
	};

	// export module
	w.ImageUploader = ImageUploader;
}(jQuery, window, document));

var ImageStretcher = {
	getDimensions: function(image, mask) {
		// calculate element coords to fit in mask
		var ratio = this.getRatio(image),
			slideWidth = mask.width,
			slideHeight = slideWidth / ratio;

		if(slideHeight < mask.height) {
			slideHeight = mask.height;
			slideWidth = slideHeight * ratio;
		}
		return {
			koef: this.getRealDimensions(image).w / slideWidth,
			ratio: ratio,
			width: slideWidth,
			height: slideHeight,
			top: (mask.height - slideHeight) / 2,
			left: (mask.width - slideWidth) / 2
		};
	},
	getRatio: function(image) {
		return this.getRealDimensions(image).w / this.getRealDimensions(image).h;
	},
	getRealDimensions: function(image) {
		if(jQuery(image).prop('naturalWidth')) {
			return {
				w: jQuery(image).prop('naturalWidth'),
				h: jQuery(image).prop('naturalHeight')
			};
		} else {
			return {
				w: image.width,
				h: image.height
			};
		}
	}
};



/*!
 * jQuery FormData Plugin
 * version: 0.1
 * Requires jQuery v1.5 or later
 * Copyright (c) 2015 Alfred Huang
 * Examples and documentation at: http://fish-ball.github.io/jquery.formdata.js/
 * Project repository: https://github.com/fish-ball/jquery.formdata.js
 * Dual licensed under the MIT and GPL licenses.
 * https://github.com/fish-ball/jquery.formdata.js#copyright-and-license
 */

// AMD support
(function (factory) {

    "use strict";

    if (typeof define === 'function' && define.amd) {
        // using AMD; register as anon module
        define(['jquery'], factory);
    } else {
        // no AMD; invoke directly
        factory( (typeof(jQuery) != 'undefined') ? jQuery : window.Zepto );
    }

} (function($) {

    "use strict";

    var makeBoundary = function() {
        return '----JQBoundary'+btoa(Math.random().toString()).substr(0,12);
    };

    var str2Uint8Array = function(str) {
        var arr = [], c;
        for(var i = 0; i < str.length; ++i) {
            c = str.charCodeAt(i);
            if(c > 0xff) {
                alert('Char code range out of 8 bit, parse error!');
                return [];
            }
            arr.push(str.charCodeAt(i));
        }
        return new Uint8Array(arr);
    };

    /**
     * Encode a given string to utf8 encoded binary string.
     * @param str:
     * @returns string:
     */
    var utf8encode = window.TextEncoder ? function(str) {
        var encoder = new TextEncoder('utf8');
        var bytes = encoder.encode(str);
        var result = '';
        for(var i = 0; i < bytes.length; ++i) {
            result += String.fromCharCode(bytes[i]);
        }
        return result;
    } : function(str) {
        return eval('\''+encodeURI(str).replace(/%/gm, '\\x')+'\'');
    };

    /**
     * Send an ajax with automatically wrapping data
     *  in the form of: multipart/form-data
     * The method don't accept for HTTP safe methods,
     *  if so, the method bypassing the ajax to a
     *  standard jQuery ajax request.
     * @param url: ajax target url, optional,
     *  if neglected, use option['url'] instead.
     * @param options: standard
     * @returns jqXHR: return a jqXHR Deferred object.
     */
    $.ajaxFormData = function(url, options) {

        // Compatible arguments when url is not given.
        if(typeof url == 'object') {
            options = url;
            url = undefined;
        }
        options = options || {};
        options.url = options.url || url || '';
        options.method = options.method || 'post';  // post method default

        // Create the final options object
        var s = jQuery.ajaxSetup({}, options);

        // Bypassing http safe methods.
        if(typeof(s.data) !== 'object' ||
                !/^(GET|HEAD|OPTIONS|TRACE)$/.test(s.type)) {
            return $.ajax(s);
        }

        var data = s.data;
        var boundary = makeBoundary();
        var promises = [];
        var postdata = '';

        /**
         * Serialize a single field, and export to formdata.
         * If async load is required, add promise to queue.
         * @param name: field key
         * @param val {string|number|boolean|File|Blob}: field content
         * @returns string: a boundary divided form-data part as a string.
         */
        var appendField = function(name, val) {

            // Supports File or Blob objects
            if(val instanceof File || val instanceof Blob) {
                promises.push($.Deferred(function(dfd) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var bin_val = e.target.result;
                        var filename = val.name && utf8encode(val.name) || 'blob';
                        var content_type = val.type || 'application/octet-stream';
                        postdata += '--' + boundary+'\r\n' +
                            'Content-Disposition: form-data; '+
                            'name="' + name + '"; filename="' + filename + '"\r\n' +
                            'Content-Type: ' + content_type + '\r\n\r\n' +
                            bin_val+'\r\n';
                        dfd.resolve();
                    };
                    reader.readAsBinaryString(val);
                }).promise());
            }
            // Supports normal base64 image types
            else if(/^data:image\/\w+;base64,/.test(val)) {
                // data:image/????;base64,xxxxx
                var pos = val.search(';base64,');
                var content_type = val.substr(5, pos-5);
                var bin_val = atob(val.substr(pos+8));
                postdata += '--' + boundary+'\r\n' +
                    'Content-Disposition: form-data; '+
                    'name="' + name + '"; filename="blob"\r\n' +
                    'Content-Type: ' + content_type + '\r\n\r\n' +
                    bin_val+'\r\n';
            }
            // Supports normal string support
            else if(typeof(val) == 'string' || typeof(val) == 'number') {
                // encode unicode characters to utf8 bytes
                postdata += '--' + boundary+'\r\n' +
                    'Content-Disposition: form-data; ' +
                    'name="' + name + '"\r\n\r\n' +
                    utf8encode(val.toString()) + '\r\n';
            }
            // Like a single checkbox, true posts an 'on' value, omit false.
            else if(typeof(val) === 'boolean') {
                // Only true value is export as 'on', false is omitted.
                if(val) {
                    postdata += '--' + boundary+'\r\n' +
                        'Content-Disposition: form-data; ' +
                        'name="' + name + '"\r\n\r\n' +
                        'on' + '\r\n';
                }
            }
            // Not supporting case.
            else {
                alert(
                    'jQuery.formdata: Post field type not supported,\n' +
                    'ignore the field ['+name+'].'
                );
            }

        };

        // Deal with all the fields in the data dict.
        $.each(data, function(name, val) {

            // Deal with multiple fields
            // Like a multiple checkbox, an array yield multiple parts.
            if(val instanceof Array || val instanceof FileList) {
                if(/\[]$/.test(name)) {
                    $.each(val, function() {
                        appendField(name, this);
                    });
                } else {
                    alert(
                        'jQuery.formdata: an array field must have a `[]` suffix.\n' +
                        'ignore the field ['+name+'].'
                    );
                }
            }
            // Deal with single field
            else {
                appendField(name, val);
            }

        });

        // When all async reader field was loaded, start the ajax.
        return $.when.apply($, promises).then(function() {

            postdata += '--' + boundary + '--\r\n';
            postdata = str2Uint8Array(postdata).buffer;

            // Wrapping ajax request and send.
            s.data = postdata;
            s.processData = false;
            s.contentType = 'multipart/form-data; boundary=' + boundary;

            return $.ajax(s);

        });

    };

}));


