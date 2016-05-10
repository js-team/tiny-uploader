'use strict';

export let Validation = {
	// validate formats
	validateFormats(value, extensions) {
		var typeParam = extensions.replace(/\s/g, '').replace(/,/g, '|');

		return value.match(new RegExp('' + typeParam + '$', 'i'));
	},

	// validate types
	validateTypes(value, mimetypes) {
		var typeParam = mimetypes.replace(/\s/g, '').replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, '\$&').replace(/,/g, '|').replace(/\//g, '.');

		return value.replace(/\//g, '.').match(new RegExp('' + typeParam + '$', 'i'));
	}
};