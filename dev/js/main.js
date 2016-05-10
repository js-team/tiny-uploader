'use strict';

import {} from 'jquery-formdata';
import {Validation} from './simple-validation.js';
import {ImageCropper} from './cropper.js';

class FileUploader {
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
				image: '<div class="thumb"><button type="button" class="remove">x</button></div>'
			},
			validateFormats: '', // 'css,js'
			validateTypes: '', // 'image/*,audio/mp3'
			btnRemove: 'button.remove',
			insertAfter: '',
			insertBefore: ''
		};

		this.options = Object.assign(defaults, options);

		if (this.options.form) {
			this.findElements();
			this.attachEvents();
			this.makeCallback('onInit', this);
		}
	}

	findElements() {
		this.form = jQuery(this.options.form);
		this.uploaderHolders = this.form.find(this.options.uploaderHolders);
		this.structure = [];

		this.uploaderHolders.each((i, holder) => {
			let uHolder = jQuery(holder);
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

	// attach events
	attachEvents() {
		// event handlers
		for (let obj of this.structure) {

			// change handler
			obj.fInput.on('change', (e) => {
				e.preventDefault();

				let newFiles = FileUploader.getFiles(e);

				if (newFiles.length) {
					let arr = Array.from(newFiles);

					obj.newFiles = arr;

					for (let file of arr) {
						obj.files.push(file);
					}

					this.drawThumb(obj);
				}
			});

			// drag handler
			if (obj.dropArea.length) {
				// prevent drag and drop handler
				obj.dropArea.on('dragenter dragover dragleave drop', (e) => {
					e.stopPropagation();
					e.preventDefault();
				});

				// drop handler
				obj.dropArea.on('drop', (e) => {
					e.preventDefault();

					let files = FileUploader.getFiles(e);

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
	submitHandler() {
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
			.done((request, textStatus, jqXHR) => this.makeCallback('onSuccess', request, textStatus, jqXHR))
			.fail((jqXHR, textStatus, errorThrown) => this.makeCallback('onError', jqXHR, textStatus, errorThrown));
	}

	// sending progress
	progress() {
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
	drawThumb(obj) {
		for (let file of obj.newFiles) {

			// Supports File or Blob objects
			if (file instanceof File) {
				let reader = new FileReader();

				// validate type
				if (obj.opts.validateTypes) {
					let type = file.type;
					let success = Validation.validateTypes(type, obj.opts.validateTypes);

					if (!success) {
						return this.makeCallback('onValidateError', 'type', type, obj.opts.validateTypes);
					}
				}

				// validate format
				if (obj.opts.validateFormats) {
					let format = FileUploader.fileExt(file.name)[0]
					let success = Validation.validateFormats(format, obj.opts.validateFormats);

					if (!success) {
						return this.makeCallback('onValidateError', 'format', format, obj.opts.validateFormats);
					}
				}

				// file reader
				if (file.type.match(/image.*/)) { // image type
					let image = new Image();

					image.file = file;

					let imgLoadPromise = new Promise((resolve, reject) => {
						reader.onload = (function(aImg) {
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

	// remove thumb
	romoveThumb(obj, currThumb, currFile) {
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
	removeHandler(btnRemove, obj, thumb) {
		if (btnRemove.length) {
			btnRemove.on('click', (e) => {
				e.preventDefault();
				this.romoveThumb(obj, thumb, thumb.file);
			});
		}
	}

	// append thumb to html
	appendThumb(newThumb, obj) {
		let btnRemove = newThumb.find(obj.opts.btnRemove);

		this.removeHandler(btnRemove, obj, newThumb);

		// add thumb to collection
		obj.thumbs = !obj.thumbs ? newThumb : obj.thumbs.add(newThumb);

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
	addFileThumb(file, obj) {
		let format = FileUploader.fileExt(file.name)[0];
		let newThumb = jQuery(obj.opts.tpl[format] || obj.opts.tpl.default);

		newThumb.file = file;
		newThumb.addClass(format || '').attr('data-format', format);
		newThumb.text(file.name || 'uploaded file');

		this.appendThumb(newThumb, obj);
	}

	// add image thumb
	addImageThumb(image, obj) {
		let imageFormat = image.file.type.split('/')[1];

		// create image
		ImageCropper.createCanvasCrop(image, obj.opts.cropSize.h, obj.opts.cropSize.w)
			.then((canvas) => {
				let elem = canvas;
				let newThumb = jQuery(obj.opts.tpl.image);

				newThumb.file = image.file;

				if (Object.is(obj.opts.thumbType, 'image')) {
					let base64resized = canvas.toDataURL('image/' + imageFormat); // 'type, encoderOptions' (image/png, between 0 and 1 indicating image quality if the requested type is image/jpeg or image/webp)
					elem = image;
					image.src = base64resized;
				}

				newThumb.append(jQuery(elem));

				this.appendThumb(newThumb, obj);
			});
	}

	// remove all thumbs
	clearArea(obj) {
		if (obj.thumbs && obj.thumbs.length) {
			obj.thumbs.remove();
			obj.thumbs = jQuery();
			obj.fInput.val('');
			obj.files = [];

			this.makeCallback('onClear', this);
		}
	}

	// make callback
	makeCallback(name, ...args) {
		if (typeof this.options[name] === 'function') {
			this.options[name].call(this, ...args);
		}
	}

	// get files
	static getFiles(e) {
		return 'files' in e.target ? e.target.files : 'dataTransfer' in e.originalEvent ? e.originalEvent.dataTransfer.files : [];
	}

	// get file extension
	static fileExt(filename) {
		return (/[.]/.exec(filename)) ? /[^.]+$/.exec(filename) : undefined;
	}
}

module.exports = FileUploader;