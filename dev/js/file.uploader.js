'use strict';

let ImageStretcher = require('./image-stretcher.js');
import {} from 'jquery-formdata';

// image uploader constructor
class ImageUploader {
	constructor(options) {
		let defaults = {
			form: 'form',
			uploaderHolders: '.image-uploader',
			dropArea: '.drop-area',
			fileInput: 'input[type="file"]',
			thumbsHolder: '.thumbnails',
			thumbType: 'canvas', // 'image', 'canvas',
			cropSize: { // width / height (px)
				w: 100,
				h: 100
			},
			tpl: {
				default: '<div class="uploaded-file"></div>',
				image: '<div class="thumb"><button type="button" class="remove">x</button></div>',
			},
			validateFormats: '', // 'css|js'
			validateTypes: '', // 'image.*'
			btnRemove: 'button.remove',
			insertAfter: '',
			insertBefore: '',
			onSendProgress(percent) {},
			onSuccess(data) {},
			onError(jqXHR) {},
			onCreateThumb(thumb) {},
			onRemoveThumb(thumb) {},
			onClear() {}
		};

		this.options = Object.assign(defaults, options);

		if (this.options.form) {
			this.findElements();
			this.attachEvents();
			this.makeCallback('onInit', this);
		}
	}

	findElements () {
		let self = this;
		this.form = jQuery(this.options.form);
		this.uploaderHolders = this.form.find(this.options.uploaderHolders);
		this.structure = [];

		this.uploaderHolders.each((i, item) => {
			let uHolder = jQuery(item);
			let tHolder = uHolder.find(this.options.thumbsHolder);
			let dropArea = uHolder.find(this.options.dropArea);
			let fInput = uHolder.find(this.options.fileInput);
			let opts = Object.assign({}, this.options, uHolder.data('file') || {});
			let files = [];

			this.structure.push({
				opts,
				uHolder,
				tHolder,
				dropArea,
				fInput,
				files
			});
		});
	}

	attachEvents () {
		// event handlers
		for (let obj of this.structure) {
			// change handler
			obj.fInput.on('change', (e) => {
				e.preventDefault();

				let oldFiles = obj.files;
				let newFiles = this.getFiles(e);

				if (newFiles.length) {
					let arr = Array.from(newFiles);

					obj.newFiles = arr;

					for (let file of arr) {
						obj.files.push(file);
					}

					this.drawThumb(obj);
				}
			});

			if (obj.dropArea.length) {
				// prevent drag and drop handler
				obj.dropArea.on('dragenter dragover dragleave drop', (e) => {
					e.stopPropagation();
					e.preventDefault();
				});

				// drop handler
				obj.dropArea.on('drop', (e) => {
					e.preventDefault();

					let files = this.getFiles(e);

					if (files.length) {
						obj.fInput.get(0).files = files;
					}
				});
			}
		}

		// submit handler
		this.form.on('submit', (e) => {
			e.preventDefault();
			this.submitHandler(e);
		});
	}

	// submit handler
	submitHandler () {
		this.makeCallback('onSubmit', this);

		// get form data
		let data = {};
		let serializeArray = this.form.serializeArray();

		for (let obj of this.structure) {
			let fileEl = obj.fInput.get(0);

			data[fileEl.name] = obj.files;
		}

		for (let obj of serializeArray) {
			data[obj.name] = obj.value;
		}

		this.uploadHandler(this.form.attr('action'), data);
	}

	// upload handler
	uploadHandler(url, data) {
		// abort previous request if not completed
		if (this.acXHR && typeof this.acXHR.abort === 'function') this.acXHR.abort();
		// start new request
		this.acXHR = jQuery.ajaxFormData(url, {
			data: data,
			xhr: () => this.progress()
		})
		.done((request, textStatus, jqXHR) => this.makeCallback('onSuccess', request))
		.fail((jqXHR, textStatus, errorThrown) => this.makeCallback('onError', jqXHR));
	}

	// sending progress
	progress () {
		let xhr = jQuery.ajaxSettings.xhr();

		if (xhr.upload) {

			xhr.upload.addEventListener('progress', (event) => {
				let percent = 0;
				let position = event.loaded || event.position; //event.position is deprecated
				let total = event.total;

				if (event.lengthComputable) {
					percent = Math.ceil(position / total * 100);

					this.makeCallback('onSendProgress', percent);
				}
			}, false);
		}
		return xhr;
	}

	// draw thumb
	drawThumb (obj) {
		let self = this;

		for (let file of obj.newFiles) {

			// Supports File or Blob objects
			if (file instanceof File || file instanceof Blob) {

				let reader = new FileReader();

				if (obj.opts.validateTypes) {
					let type = file.type;
					let success = this.validateTypes(type, obj.opts.validateTypes);

					if (!success) {
						console.log('error type');
						return false;
					}
				}

				if (obj.opts.validateFormats) {
					let format = this.fileExt(file.name)[0]
					let success = this.validateFormats(format, obj.opts.validateFormats);

					if (!success) {
						console.log('error format');
						return false;
					}
				}

				if (file.type.match(/image.*/)) { // image type
					let image = new Image();

					image.file = file;

					let imgLoadPromise = new Promise( (resolve, reject) => {
						reader.onload = (function (aImg){
							return (e) => {
								aImg.src = e.target.result;
								resolve();
							};
						}(image));
					});

					imgLoadPromise.then(() => this.addImageThumb(image, obj));
				} else { // other types
					file.file = file;

					let fileLoadPromise = new Promise(resolve => {
						reader.onload = ((e) => resolve());
					});

					fileLoadPromise.then(() => this.addFileThumb(file, obj));
				}

				// read file as data url
				reader.readAsDataURL(file);
			}
		}
	}

	// validate formats
	validateFormats (validFormat, formats) {
		return validFormat.match(formats);
	}

	// validate types
	validateTypes (validType, types) {
		return validType.match(types);
	}

	// remove thumb
	romoveThumb (obj, currThumb, currFile) {
		currThumb.remove();
		obj.thumbs = obj.thumbs.not(currThumb);

		let currFiles = obj.files;

		for (let i = 0; i < currFiles.length; i++) {
			if (Object.is(obj.files[i], currFile)) {
				obj.files.splice(i, 1);

				this.makeCallback('onRemoveThumb', currThumb);

				break;
			}
		}
	}

	// attach remove thumb handler
	removeHandler (btnRemove, obj, thumb) {
		if (btnRemove.length) {
			btnRemove.on('click', (e) => {
				e.preventDefault();
				this.romoveThumb(obj, thumb, thumb.file);
			});
		}
	}

	// append thumb to html
	appendThumb (newThumb, obj) {
		let btnRemove = newThumb.find(obj.opts.btnRemove);

		this.removeHandler(btnRemove, obj, newThumb);

		// add thumb to collection
		if (!obj.thumbs) {
			obj.thumbs = newThumb;
		} else {
			obj.thumbs = obj.thumbs.add(newThumb);
		}

		// append thumb
		if (obj.opts.insertBefore) {
			newThumb.insertBefore(obj.opts.insertBefore);
		} else if (obj.opts.insertAfter) {
			newThumb.insertAfter(obj.opts.insertAfter);
		} else {
			newThumb.appendTo(obj.tHolder);
		}

		this.makeCallback('onCreateThumb', newThumb);
	}

	// add file thumb
	addFileThumb (file, obj) {
		let format = this.fileExt(file.name)[0];
		let newThumb = jQuery(obj.opts.tpl[format] || obj.opts.tpl.default);

		newThumb.file = file;
		newThumb.addClass(format || '').attr('data-format', format);
		newThumb.text(file.name || 'uploaded file');

		this.appendThumb(newThumb, obj);
	}

	// add image thumb
	addImageThumb (image, obj) {
		let imageFormat = image.file.type.split('/')[1];

		// create image
		this.createCanvasCrop(image, obj)
			.then((canvas) => {
				let elem = canvas;
				let newThumb = jQuery(obj.opts.tpl.image);

				newThumb.file = image.file;

				if (Object.is(obj.opts.thumbType , 'image')) {
					let base64resized = canvas.toDataURL('image/' + imageFormat); // 'type, encoderOptions' (image/png, between 0 and 1 indicating image quality if the requested type is image/jpeg or image/webp)
					elem = image;
					image.src = base64resized;
				}

				newThumb.append(jQuery(elem));

				this.appendThumb(newThumb, obj);
			});
	}

	// remove all thumbs
	clearArea (obj) {
		if (obj.thumbs && obj.thumbs.length) {
			obj.thumbs.remove();
			obj.thumbs = jQuery();
			obj.fInput.val('');
			obj.files = [];

			this.makeCallback('onClear', this);
		}
	}

	// create canvas
	createCanvasCrop (image, obj) {
		let canvas = document.createElement('canvas');
		let ctx = canvas.getContext('2d');

		canvas.height = obj.opts.cropSize.h;
		canvas.width = obj.opts.cropSize.w;

		return new Promise((resolve, reject) => {
			image.onload = () => {
				let dim = ImageStretcher.getDimensions(image, canvas);
				let sourceWidth = canvas.width * dim.koef;
				let sourceHeight = canvas.height * dim.koef;
				let destWidth = canvas.width;
				let destHeight = canvas.height;
				let sourceX = -1 * dim.left * dim.koef;
				let sourceY = -1 * dim.top * dim.koef;
				let destX = 0;
				let destY = 0;

				ctx.drawImage(
					image,
					sourceX, sourceY, // Start at sourceX/sourceY pixels from the left and the top of the image (crop),
					sourceWidth, sourceHeight, // "Get" a `sourceWidth * sourceHeight` (w * h) area from the source image (crop),
					destX, destY, // Place the result at destX, destY in the canvas,
					destWidth, destHeight // With as width / height: destWidth * destHeight (scale)
				);

				resolve(canvas);
			}
		});
	}

	// make callback
	makeCallback (name, ...args) {
		if (typeof this.options[name] === 'function') {
			this.options[name].apply(this, args);
		}
	}

	// get files
	getFiles (e) {
		return 'files' in e.target ? e.target.files : 'dataTransfer' in e.originalEvent ? e.originalEvent.dataTransfer.files : [];
	}

	// get file extension
	fileExt (filename) {
		return (/[.]/.exec(filename)) ? /[^.]+$/.exec(filename) : undefined;
	}

}

module.exports = {
	ImageUploader: ImageUploader
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
;(function (factory) {

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

    let makeBoundary = function() {
        return '----JQBoundary'+btoa(Math.random().toString()).substr(0,12);
    };

    let str2Uint8Array = function(str) {
        let arr = [], c;
        for(let i = 0; i < str.length; ++i) {
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
    let utf8encode = window.TextEncoder ? function(str) {
        let encoder = new TextEncoder('utf8');
        let bytes = encoder.encode(str);
        let result = '';
        for(let i = 0; i < bytes.length; ++i) {
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
        let s = jQuery.ajaxSetup({}, options);

        // Bypassing http safe methods.
        if(typeof(s.data) !== 'object' ||
                !/^(GET|HEAD|OPTIONS|TRACE)$/.test(s.type)) {
            return $.ajax(s);
        }

        let data = s.data;
        let boundary = makeBoundary();
        let promises = [];
        let postdata = '';

        /**
         * Serialize a single field, and export to formdata.
         * If async load is required, add promise to queue.
         * @param name: field key
         * @param val {string|number|boolean|File|Blob}: field content
         * @returns string: a boundary divided form-data part as a string.
         */
        let appendField = function(name, val) {

            // Supports File or Blob objects
            if(val instanceof File || val instanceof Blob) {
                promises.push($.Deferred(function(dfd) {
                    let reader = new FileReader();
                    reader.onload = function(e) {
                        let bin_val = e.target.result;
                        let filename = val.name && utf8encode(val.name) || 'blob';
                        let content_type = val.type || 'application/octet-stream';
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
                let pos = val.search(';base64,');
                let content_type = val.substr(5, pos-5);
                let bin_val = atob(val.substr(pos+8));
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