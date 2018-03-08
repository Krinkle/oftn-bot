var bhttp = require('bhttp');
var assign = require('object.assign');


/* createPaste('some content', {
	 title: 'My title'
	 })
	 .then(url => ...)
	 */
exports.createPaste = function wmPastebinCreatePaste(text, _opts) {
	var opts = assign({
		title: "Untitled",
		name: "Unknown"
	}, _opts);

	console.log('Creating paste (length: %d)', text.length);

	// Per https://tools.wmflabs.org/paste/api
	return bhttp.post('https://tools.wmflabs.org/paste/api/create', {
		text: text,
		title: opts.title,
		name: opts.name,
		private: '1',
		expire: 7 * 24 * 60  // 7 days, in minutes
	}, {
		formFields: true,
		noDecode: true
	})
	.catch(function(e) {
		console.error('Failed to create paste', e);
		throw e;
	})
	.then(function(res){
		var url = res.body;
		if (!url) {
			var error = new Error('Failed to get paste url');
			console.error(error);
			throw error;
		}

		console.log('Created paste ' + url);
		return url;
	});
};
