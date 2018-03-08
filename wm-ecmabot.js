var file = require('fs');
var path = require('path');
var util = require("util");
var http = require("http");

//var Sandbox = require("./lib/sandbox");

var Bot = require("./lib/irc");
var Shared = require("./shared");
var scrapeMdn = require('scrape-mdn');


var JSBot = function(profile) {
	// PATCH(wm-ecmabot): Only V8-based for now. --Krinkle
	//this.sandbox = new Sandbox(path.join(__dirname, "ecmabot-utils.js"));
	//this.executeRegex = /^(v8?>|>>>?)(.*)/;

	Bot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_trigger("wm-ecmabot:");
};


util.inherits(JSBot, Bot);


JSBot.prototype.init = function() {
	Bot.prototype.init.call(this);

	// TODO: The v8/shovel doesn't work anymore. The new docker-run
	// based approach is nice and works, but needs work to work
	// on Wikimedia Toolforge. Disable for now.
	// this.register_listener(this.executeRegex, this.execute_js);

	this.register_command("mdn", this.mdn, {
		help: "Search the Mozilla Developer Network. "
			+ "Usage: `" + this.__trigger + " mdn <keywords>`"
	});

	this.register_command("ecma", this.ecma, {
		help: "Lookup a section from the ECMAScript spec. "
			+ "Usage: `" + this.__trigger + " ecma <keywords>`"
	});

	this.register_command("re", this.re, {
		help: "Usage: `" + this.__trigger + " re <Text here> /expression/[flags]` – FLAGS: (g: global match, i: ignore case)"
	});

	this.register_command("commands", Shared.commands);

	this.register_command("help", this.help);

	this.load_ecma_ref();
};

JSBot.prototype.execute_js = function(context, text, command, code) {
	if (!(/\breturn\b/.test(code))) {
		// PATCH(wm-ecmabot):
		// Unlike the older v8/shovel, the docker-based sandbox used by oftn,
		// doesn't act like the console, it needs an explicit `return`.
		// Add one for simple cases with no mention of return or semi-colon.
		code = 'return ' + code;
	}


	return Shared.execute_js.call(this, context, text, command, code);
}

JSBot.prototype.re = function(context, msg) {
	// Okay first we need to check for the regex literal at the end
	// The regular expression to match a real js regex literal
	// is too long, so we need to use a simpler one.
	var regexmatches, regexliteral = /\/((?:[^\\\/]|\\.)*)\/([gi]*)$/;

	if (regexmatches = msg.match(regexliteral)) {
		try {
			var regexpobj = new RegExp(regexmatches[1], regexmatches[2]);
		} catch (e) {
			/* We have an invalid regular expression */
			context.channel.send_reply(context.sender, e.message);
			return;
		}

		var texttomatch = msg.slice(0, -regexmatches[0].length).trim();
		var result = texttomatch.match(regexpobj);
		if (result === null) {
			context.channel.send_reply(context.intent, "No matches found.");
			return;
		}

		var reply = [];
		for (var i = 0, len = result.length; i < len; i++) {
			reply.push(typeof result[i] !== "undefined" ?
				"'"+result[i]+"'" :
				"[undefined]");
		}

		context.channel.send_reply(context.intent, "Matches: "+reply.join(", "), {truncate: true});
	} else {
		context.channel.send_reply(context.sender, this.get_command_help("re"));
	}
};

JSBot.prototype.help = function(context, text) {
	try {
		if (!text || text.trim() === 'help' || text.trim() === 'commands') {
			return context.channel.send_reply(context.intent,
				"Usage: `" + this.__trigger + " help <command>` - "
					+ "Valid commands: " + this.get_commands().join(", ")
			);
		}
		context.channel.send_reply(context.intent, this.get_command_help(text));
	} catch(e) {
		context.channel.send_reply(context.sender, e);
	}
};

JSBot.prototype.mdn = function(context, text, command) {
	if (!text) {
		return;
	}

	scrapeMdn.search(text).then(function(results) {
		var result = results[0];
		context.channel.send_reply(
			context.intent,
			'\x02' + result.title + '\x0F \x032< ' + result.url + '>\x0F',
			{color: true}
		);
	})
	.catch(function(err) {
		console.error('Error with command "!' + command + ' ' + text + '"');
		console.error(err);
	});
};


// ```
// JSON.stringify([].slice.call(document.querySelectorAll('#toc-full a')).map(function(v) {return {title: v.firstChild.textContent, id: v.href.replace(/.+#/, '')};}));
// ```
// Use the above to generate the required JSON from es5.github.io.
JSBot.prototype.ecma = function(context, text) {
	try {

	if (typeof this.ecma_ref === "undefined") {
		context.channel.send_reply(context.sender, "The ECMA-262 reference is not loaded.");
		return;
	}

	text = text.toLowerCase();
	var ref = this.ecma_ref, ch = text.charCodeAt(0);

	// If text begins with a number, the search must match at the beginning of the string
	var muststart = ch >= 48 && ch <= 57;

	for (var i = 0, len = ref.length; i < len; i++) {
		var item = ref[i], title = item.title.toLowerCase();
		if (muststart ? title.substring(0, text.length) === text : ~title.indexOf(text)) {
			context.channel.send_reply(context.intent,
				// PATCH(wm-ecmabot): Use HTTPS. --Krinkle
				"Found: " + item.title + " <https://es5.github.io/#" + item.id + ">");
			return;
		}
	}

	throw new Error("Could not find text '"+text+"' in the ECMAScript 5.1 Table of Contents.");

	} catch (e) { context.channel.send_reply(context.sender, e); }
};

JSBot.prototype.load_ecma_ref = function() {
	var filename = path.join(__dirname, "ecmabot-reference.json");
	console.log("Loading ECMA-262 reference...");
	var bot = this;
	file.readFile(filename, function (err, data) {
		if (err) console.log(err);
		try {
			bot.ecma_ref = JSON.parse(data);
		} catch (e) {
			console.log("ECMA-262 Error: "+e.name+": "+e.message);
		}
	});
};

var profile = require(path.resolve(process.env.ECMABOT_PROFILE || 'Specify ECMABOT_PROFILE'));
(new JSBot(profile)).init();
