'use strict';

module.exports = {
	getDimensions (image, mask) {
		// calculate element coords to fit in mask
		let ratio = this.getRatio(image),
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
	getRatio (image) {
		return this.getRealDimensions(image).w / this.getRealDimensions(image).h;
	},
	getRealDimensions (image) {
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