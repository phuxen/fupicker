/*
jQuery color picker
Author: Daniel Fudala

Todo:
if attached again - reinitialize, don't duplicate

in settings:

attaching to input 
easy skinning
offset
proper closing - run close method on active picker so it fires events

add methods:
fupicker('open');
fupicker('close');
fupicker('remove');
fupicker('hex', hex);
etc..

global mathods:
$.fupicker.removeAll();
$.fupicker.closeAll();
etc..

*/

(function($) {
	$.fn.fupicker = function(_settings) {
		_settings = $.extend({}, _settings); // initialize settings to object - if empty
		return this.each(function() {
			var $this = $(this);
			var $target = $this;
			var isInput = $this[0].tagName == 'INPUT';

			var settings = $.extend({}, $.fupicker.settings, _settings);
			// if the input has a value then use this (if settings.hex is not set)
			if(_settings.hex == undefined && isInput) {
				settings.hex = this.value;
			}

			var color = {};
			color.hex = $.fupicker.helpers.getHex(settings.hex);
			color.rgb = $.fupicker.helpers.hex2rgb(color.hex);
			color.hsv = $.fupicker.helpers.rgb2hsv(color.rgb);
			
			// some mess about the button next to the input
			if(isInput) {
				var $trigger = $('<span class="fuPickerTrigger"><span style="display:block;"></span></span>');
				$trigger.width($this.outerHeight() - 2);
				$trigger.height($this.outerHeight() - 2);
				$trigger.css({
					border:"1px solid #888888",
					backgroundColor:"#" + color.hex,
					display:'inline-block',
					cursor:'pointer'
				});
				$this.after($trigger);
				// what a hack?
				$target = $this;
				$this = $trigger;
			}
			
			// make picker from markup depending on the skin
			var $picker = $($.fupicker.markup[$.fupicker.skin[settings.skin]]);
			$picker.addClass(settings.skin);
			
			var updateHex = function(hex) {
				color.hex = hex;
				color.rgb = $.fupicker.helpers.hex2rgb(color.hex);
				color.hsv = $.fupicker.helpers.rgb2hsv(color.rgb);
				updateInterface();
				events.select(true);
			};
			var updateRgb = function(index, value) {
				color.rgb[index] = parseInt(value) & 255;
				color.hsv = $.fupicker.helpers.rgb2hsv(color.rgb);
				color.hex = $.fupicker.helpers.rgb2hex(color.rgb);
				updateInterface();
				events.select(true);
			};
			var updateInterface = function() {
				var colorBoxHex = $.fupicker.helpers.hsv2hex([color.hsv[0], 1, 1]);
				$picker.find('.fuPickerColorBoxColor').css({backgroundColor:"#" + colorBoxHex});
				var posX = color.hsv[1] * 127;
				var posY = 127 - (color.hsv[2] * 127);
				$picker.find('.fuPickerColorSelector').css({top: posY - 4 , left: posX - 4});
				var hueY = color.hsv[0] * 127;
				$picker.find('.fuPickerHueSelector').css({top: hueY - 2});
				updateView();
			};
			var updateView = function() {
				$picker.find('.fuPickerColor_R').val(color.rgb[0]);
				$picker.find('.fuPickerColor_G').val(color.rgb[1]);
				$picker.find('.fuPickerColor_B').val(color.rgb[2]);
				$picker.find('.fuPickerColor_Hex').val(color.hex);
				$picker.find('.fuPickerPreview').css({backgroundColor:"#" + color.hex});
				var colorBoxHex = $.fupicker.helpers.hsv2hex([color.hsv[0], 1, 1]);
				$picker.find('.fuPickerColorBoxColor').css({backgroundColor:"#" + colorBoxHex});
				// if picker is attached to an input element then update this inputs value
				$target.val(color.hex);
			};
			var updateHue = function(e, done) {
				var $hue = $picker.find('.fuPickerHue');
				var offset = $hue.offset();
				var posY = e.pageY - offset.top;
				if(posY < 0) posY = 0;
				if(posY > 127) posY = 127;
				$hue.find('.fuPickerHueSelector').css({top: posY - 2});
				color.hsv[0] = (posY / 127);
				color.rgb = $.fupicker.helpers.hsv2rgb(color.hsv);
				color.hex = $.fupicker.helpers.rgb2hex(color.rgb);
				updateView();
				events.select(done);
			};
			var	updateShade = function(e, done) {
				var $shade = $picker.find('.fuPickerColorBox');
				var offset = $shade.offset();
				var posX = e.pageX - offset.left;
				var posY = e.pageY - offset.top;
				if(posY < 0) posY = 0;
				if(posY > 127) posY = 127;
				if(posX < 0) posX = 0;
				if(posX > 127) posX = 127;
				$shade.find('.fuPickerColorSelector').css({top: posY - 4 , left: posX - 4});
				color.hsv[1] =  posX / 127;
				color.hsv[2] = (127 - posY) / 127;
				color.rgb = $.fupicker.helpers.hsv2rgb(color.hsv);
				color.hex = $.fupicker.helpers.rgb2hex(color.rgb);
				updateView();
				events.select(done);
			};
			var startDrag = function(e, callback) {
				$.fupicker.helpers.bindUpdate($picker, callback);
				// this is nicely preventing selecting text on the page while dragging
				if (e && e.preventDefault) {
					e.preventDefault();
				} else {
					window.event.returnValue = false;
				}
				return false;
			};
			var open = function() {
				// remove any other pickers - close the group
				// this is way too simple but it works for now, change to execute close command on picker so it fires events
				if(settings.single) {
					$('.fuPickerContainer.fuPickerTooltip').hide();
				}
				// in case of input we need to update to the current value of the input cause it could be manually changed
				if(isInput) {
					updateHex($.fupicker.helpers.getHex($target.val()));
				} else {
					updateInterface();
				}
				
				var thisOffset = $this.offset();
				var thisLeft = thisOffset.left;
				var thisTop = thisOffset.top;
				var thisWidth = $this.outerWidth();
				var thisHeight = $this.outerHeight();
				var thisRight = thisLeft + thisWidth;
				var thisBottom = thisTop + thisHeight;

				if(!$picker.hasClass('fuPickerInitialized')) {
					$picker.appendTo('body').addClass('fuPickerInitialized');
				}
				var pickerWidth = $picker.outerWidth();
				var pickerHeight = $picker.outerHeight();
			
				var windowWidth = $(window).width();
				var windowHeight = $(window).height();
				
				// default picker position, right-bottom by default
				var pickerTop = thisBottom;
				var pickerLeft = thisRight;
				
				// projected bottom right corner position within a window
				var pickerRight = pickerLeft + pickerWidth - $(window).scrollLeft();
				var pickerBottom = pickerTop + pickerHeight - $(window).scrollTop();
				
				if(windowWidth - pickerRight < 0) {
					// out of window so recalculate position and attach it to the left side of the element
					pickerLeft = thisLeft - pickerWidth;
				}
				if(windowHeight - pickerBottom < 0) {
					// out of window - recalculate
					pickerTop = thisTop - pickerHeight;
				}
				$picker.css({top:pickerTop, left:pickerLeft});
				// finally, show the picker
				$picker.show();
				events.open();
			};
			var close = function() {
				$picker.hide();
				events.close();
			};
			var events = {
				e: {
					color:color, opener:$target, data:settings.data
				},
				select: function(done) {
					if(done) {
						if(settings.selected != null) settings.selected(this.e);
					} else {
						if(settings.selecting != null) settings.selecting(this.e);
					}
				},
				close: function() {
					if(settings.close != null) settings.close(this.e);
				},
				open: function() {
					if(settings.open != null) settings.open(this.e);
				}
			};
			if(settings.container == null) {
				// no container - tooltip
				$this.bind('click.fupicker', function() {
					open();
				});
				$picker.find('div.fuPickerClose').bind('click.fupicker', function() {
					close();
				});
				$picker.addClass('fuPickerTooltip');
				$picker.css({position:'absolute'});
			} else {
				// container specified
				updateInterface();
				$picker.find('div.fuPickerClose').css({visibility:'hidden'});
				if(settings.container == 'self') {
					// element is container itself
					$this.append($picker);
				} else {
					// another element is a container for this picker
					$(settings.container).append($picker);
				}
			}
			$picker.find('.fuPickerHue').bind('mousedown.fupicker', function(e) {
				return startDrag(e, updateHue);
			});
			$picker.find('.fuPickerColorBox').bind('mousedown.fupicker', function(e) {
				return startDrag(e, updateShade);
			});
			$picker.find('.fuPickerColor_Hex').bind('change.fupicker', function() {
				var hex = this.value
				if(hex.match(/[0-9a-f]{6}/i)) {
					updateHex(hex);
				}
			});
			$picker.find('.fuPickerColor_R').bind('change.fupicker', function() {
				updateRgb(0, this.value);
			});
			$picker.find('.fuPickerColor_G').bind('change.fupicker', function() {
				updateRgb(1, this.value);
			});
			$picker.find('.fuPickerColor_B').bind('change.fupicker', function() {
				updateRgb(2, this.value);
			});
		});
	};
	/*
	// turn into a $(el).picker('remove');
	
	$.fn.fupickerRemove = function() {
		return this.each(function() {
			var $this = $(this);
			var fupicker = $(this).data('fupicker');
			if(fupicker != undefined) {
				fupicker.$.remove();
			}
			$this.unbind('click.fupicker');
			$this.removeData('fupicker');
		});
	};
	*/
	$.fupicker = new Object();
	$.fupicker.helpers = {
		bindUpdate:function($picker, callback) {
			$(document).unbind('mouseup.fupicker').bind('mouseup.fupicker', function(e) {
				if($picker != null) {
					callback(e, true);
					$picker = null;
					$(this).unbind('mouseup.fupicker mousemove.fupicker');
				}
				return false;
			});
			$(document).unbind('mousemove.fupicker').bind('mousemove.fupicker', function(e) {
				if($picker != null) {
					callback(e, false);
				}
				return false;
			});
		},
		// get a hex value from string, return 000000 if not valid
		getHex: function(hex) {
			hex = hex.replace('#', '').toUpperCase();
			return hex.match(/[0-9A-F]{6}/) ? hex : "000000";
		},
		hex2rgb: function(hex) {
			if (hex[0]=="#") {
				hex=hex.substr(1);
			}
			if (hex.length==3) {
				var temp=hex; hex='';
				temp = /^([a-f0-9])([a-f0-9])([a-f0-9])$/i.exec(temp).slice(1);
				for (var i=0;i<3;i++) hex+=temp[i]+temp[i];
			}
			var triplets = /^([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(hex).slice(1);
			return [parseInt(triplets[0],16),parseInt(triplets[1],16),parseInt(triplets[2],16)];
		},
		rgb2hsv: function(rgb){
		    var r = rgb[0] / 255;
		 	var g = rgb[1] / 255;
			var b = rgb[2] / 255;
		    var max = Math.max(r, g, b), min = Math.min(r, g, b);
		    var h, s, v = max;
		    var d = max - min;
		    s = max == 0 ? 0 : d / max;
		    if(max == min) {
		        h = 0; // achromatic
		    } else {
		        switch(max){
		            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
		            case g: h = (b - r) / d + 2; break;
		            case b: h = (r - g) / d + 4; break;
		        }
		        h /= 6;
		    }
		    return [h, s, v];
		},
		hsv2rgb: function(hsv) {
			var h = hsv[0];
			var s = hsv[1];
			var v = hsv[2];
		    var r, g, b;
		    var i = Math.floor(h * 6);
		    var f = h * 6 - i;
		    var p = v * (1 - s);
		    var q = v * (1 - f * s);
		    var t = v * (1 - (1 - f) * s);
		    switch(i % 6){
		        case 0: r = v, g = t, b = p; break;
		        case 1: r = q, g = v, b = p; break;
		        case 2: r = p, g = v, b = t; break;
		        case 3: r = p, g = q, b = v; break;
		        case 4: r = t, g = p, b = v; break;
		        case 5: r = v, g = p, b = q; break;
		    }
		    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		},
		hsv2hex: function(hsv) {
			return $.fupicker.helpers.rgb2hex($.fupicker.helpers.hsv2rgb(hsv));
		},
		rgb2hex: function(rgb) {
			function h(i) {
			    var code = i + 48 + (i > 9 ? 7 : 0);
			    return String.fromCharCode(code);
			}
			return h(rgb[0] >> 4) + h(rgb[0] % 16)
					+ h(rgb[1] >> 4) + h(rgb[1] % 16)
					+ h(rgb[2] >> 4) + h(rgb[2] % 16);
		}
		
	};
	$.fupicker.markup = new Array();
	$.fupicker.markup['one'] = '<div class="fuPickerContainer"><div class="fuPickerWrapper"><div class="fuPickerColorBox"><div class="fuPickerColorBoxColor"></div><div class="fuPickerColorBoxShade"></div><div class="fuPickerColorSelector"></div></div><div class="fuPickerHue"><div class="fuPickerHueSelector"></div></div><div class="fuPickerInputs"><div class="fuPickerClose"></div><div class="fuPickerInput fuPickerInputSmall"><label>R</label><input class="fuPickerColor_R" type="text" maxlength="3" value="255" /></div><div class="fuPickerInput fuPickerInputSmall"><label>G</label><input class="fuPickerColor_G" type="text" maxlength="3" value="127" /></div><div class="fuPickerInput fuPickerInputSmall"><label>B</label><input class="fuPickerColor_B" type="text" maxlength="3" value="63" /></div><div class="fuPickerInput fuPickerInputHex"><label>#</label><input class="fuPickerColor_Hex" type="text" maxlength="6" value="FF7F3F" /></div></div><div class="fuPickerPreview"></div></div></div>';
	$.fupicker.markup['two'] = '<div class="fuPickerContainer"><div class="fuPickerWrapper"><div class="fuPickerColorBox"><div class="fuPickerColorBoxColor"></div><div class="fuPickerColorBoxShade"></div><div class="fuPickerColorSelector"></div></div><div class="fuPickerHue"><div class="fuPickerHueSelector"></div></div><div class="fuPickerInputs"><div class="fuPickerInput fuPickerInputSmall"><label>R</label><input class="fuPickerColor_R" type="text" maxlength="3" value="255" /></div><div class="fuPickerInput fuPickerInputSmall"><label>G</label><input class="fuPickerColor_G" type="text" maxlength="3" value="127" /></div><div class="fuPickerInput fuPickerInputSmall"><label>B</label><input class="fuPickerColor_B" type="text" maxlength="3" value="63" /></div><div class="fuPickerInput fuPickerInputHex"><label>HEX</label><input class="fuPickerColor_Hex" type="text" maxlength="6" value="FF7F3F" /></div><div class="fuPickerPreview"></div><div class="fuPickerClose"></div></div></div></div>';
	// so we know which skin uses which markup
	$.fupicker.skin = new Array();
	$.fupicker.skin['dark'] = 'one';
	$.fupicker.skin['dark2'] = 'two';
	$.fupicker.skin['light2'] = 'two';
	// default settings
	$.fupicker.settings = {
		hex: "000000",
		selecting:null,
		selected:null,
		close:null,
		open:null,
		data: {},
		container:null,
		skin:'dark',
		single:true
	};
}) (jQuery);