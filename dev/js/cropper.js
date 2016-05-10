'use strict';

export let ImageCropper = {

	// create canvas
	createCanvasCrop(image, height, width) {
		let canvas = document.createElement('canvas');
		let ctx = canvas.getContext('2d');

		canvas.height = height;
		canvas.width = width;

		return new Promise((resolve) => {
			image.onload = () => {
				let dim = this.getDimensions(image, canvas);
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
			};
		});
	},

	// get stretch dimensions
	getDimensions(image, mask) {
		// calculate element coords to fit in mask
		let ratio = this.getRatio(image),
			slideWidth = mask.width,
			slideHeight = slideWidth / ratio;

		if (slideHeight < mask.height) {
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

	// get ratio
	getRatio(image) {
		return this.getRealDimensions(image).w / this.getRealDimensions(image).h;
	},

	// get real dimensions
	getRealDimensions(image) {
		if (jQuery(image).prop('naturalWidth')) {
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