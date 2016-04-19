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