/*
 * (c) Copyright Ascensio System SIA 2010-2016
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at Lubanas st. 125a-25, Riga, Latvia,
 * EU, LV-1021.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

"use strict";

(function(window, undefined)
{
	var c_oCompositionState = {
		start 	: 0,
		process : 1,
		end		: 2
	};
	function CTextInput(api)
	{
		this.Api = api;

		this.compositionValue = [];		// коды символов
		this.compositionState = c_oCompositionState.end;

		this.TargetId 	= null;			// id caret
		this.HtmlDiv 	= null;			// для незаметной реализации одной textarea недостаточно
		this.HtmlArea	= null;

		this.HtmlAreaOffset = 60;

		this.Listener 	= null;
		this.LockerTargetTimer = -1;

		this.KeyDownFlag = false;
	}

	CTextInput.prototype =
	{
		init : function(target_id)
		{
			this.TargetId = target_id;
			var oHtmlTarget = document.getElementById(this.TargetId);
			var oHtmlParent = oHtmlTarget.parentNode;

			this.HtmlDiv = document.createElement("div");
			this.HtmlDiv.style.background = "transparent";
			this.HtmlDiv.style.border = "none";
			this.HtmlDiv.style.position = "absolute";
			this.HtmlDiv.style.zIndex = 0;
			this.HtmlDiv.style.width = "20px";
			this.HtmlDiv.style.height = "50px";
			this.HtmlDiv.style.overflow = "hidden";

			this.HtmlArea = document.createElement("textarea");
			this.HtmlArea.id = "area_id";
			this.HtmlArea.style.background = "transparent";
			this.HtmlArea.style.border = "none";
			this.HtmlArea.style.position = "absolute";
			this.HtmlArea.style["text-shadow"] = "0 0 0 #000";
			this.HtmlArea.style.outline = "none";
			this.HtmlArea.style.color = "transparent";
			this.HtmlArea.style.width = "1000px";
			this.HtmlArea.style.height = "50px";
			this.HtmlArea.style.overflow = "hidden";

			this.HtmlArea.style.left = "0px;";
			this.HtmlArea.style.top = (-this.HtmlAreaOffset) + "px";

			this.HtmlArea.setAttribute("spellcheck", false);

			this.HtmlDiv.appendChild(this.HtmlArea);

			oHtmlParent.appendChild(this.HtmlDiv);

			// events:
			var oThis = this;
			this.HtmlArea["onkeydown"] 	= function(e) { return oThis.onKeyDown(e); };
			this.HtmlArea["onkeypress"] = function(e) { return oThis.onKeyPress(e); };
			this.HtmlArea["onkeyup"] 	= function(e) { return oThis.onKeyUp(e); };
			this.HtmlArea["oninput"] 	= function(e) { return oThis.onInput(e); };

			this.HtmlArea.addEventListener("compositionstart", function(e) { return oThis.onCompositionStart(e); }, false);
			this.HtmlArea.addEventListener("compositionupdate", function(e) { return oThis.onCompositionUpdate(e); }, false);
			this.HtmlArea.addEventListener("compositionend", function(e) { return oThis.onCompositionEnd(e); }, false);

			this.Listener = this.Api.WordControl.m_oLogicDocument;

			if (false)
			{
				// DEBUG_MODE
				this.HtmlAreaOffset = 0;
				this.HtmlArea.style.top = "0px";
				this.HtmlArea.style.color = "black";
				this.HtmlDiv.style.zIndex = 5;
				this.HtmlDiv.style.width = "200px";
			}

			// TODO:
			setInterval(function(){
				if (oThis.Api.asc_IsFocus())
					oThis.HtmlArea.focus();
			}, 10);
		},

		move : function()
		{
			var oTarget = document.getElementById(this.TargetId);
			var xPos = parseInt(oTarget.style.left);
			var yPos = parseInt(oTarget.style.top) + parseInt(oTarget.style.height);

			this.HtmlDiv.style.left = xPos + "px";
			this.HtmlDiv.style.top = yPos + this.HtmlAreaOffset + "px"; // еще бы сдвинуться на высоту строки
		},

		clear : function()
		{
			this.compositionValue = [];
			this.compositionState = c_oCompositionState.end;
			this.HtmlArea.value = "";
		},

		onInput : function(e)
		{
			if (AscCommon.AscBrowser.isMozilla)
			{
				if (c_oCompositionState.process == this.compositionState)
				{
					this.checkTargetPosition();
				}
			}
		},

		onKeyDown : function(e)
		{
			return this.Api.WordControl.onKeyDown(e);
		},

		onKeyPress : function(e)
		{
			if (c_oCompositionState.end != this.compositionState)
				return;

			return this.Api.WordControl.onKeyPress(e);
		},

		onKeyUp : function(e)
		{
			if (c_oCompositionState.end == this.compositionState)
				return this.Api.WordControl.onKeyUp(e);

			if (AscCommon.AscBrowser.isChrome ||
				AscCommon.AscBrowser.isSafari ||
				AscCommon.AscBrowser.isIE)
			{
				this.checkTargetPosition();
			}
		},

		checkTargetPosition : function()
		{
			var _offset = this.HtmlArea.selectionEnd;
			_offset -= (this.HtmlArea.value.length - this.compositionValue.length);
			this.Listener.Set_CursorPosInCompositeText(_offset);

			this.unlockTarget();
		},

		lockTarget : function()
		{
			if (-1 != this.LockerTargetTimer)
				clearTimeout(this.LockerTargetTimer);

			this.Api.asc_LockTargetUpdate(true);

			var oThis = this;
			this.LockerTargetTimer = setTimeout(function(){ oThis.unlockTarget(); }, 1000);
		},

		unlockTarget : function()
		{
			if (-1 != this.LockerTargetTimer)
				clearTimeout(this.LockerTargetTimer);
			this.LockerTargetTimer = -1;

			this.Api.asc_LockTargetUpdate(false);
		},

		onCompositionStart : function(e)
		{
			if (!this.Listener)
				this.Listener = this.Api.WordControl.m_oLogicDocument;

			this.compositionState = c_oCompositionState.start;
			this.Listener.Begin_CompositeInput();
		},

		onCompositionUpdate : function(e)
		{
			var _old = this.compositionValue.splice(0);
			this.checkCompositionData(e.data);

			var _isEqual = (_old.length == this.compositionValue.length);
			if (_isEqual)
			{
				var _len = this.compositionValue.length;
				for (var i = 0; i < _len; i++)
				{
					if (_old[i] != this.compositionValue[i])
					{
						_isEqual = false;
						break;
					}
				}
			}

			this.lockTarget();
			if (!_isEqual)
				this.Listener.Replace_CompositeText(this.compositionValue);

			this.compositionState = c_oCompositionState.process;
		},

		onCompositionEnd : function(e)
		{
			this.Listener.Set_CursorPosInCompositeText(1000); // max

			this.clear();
			this.Listener.End_CompositeInput();
		},

		checkCompositionData : function(data)
		{
			this.compositionValue = [];
			var _length = data.length;
			for (var i = 0; i < _length; i++)
			{
				var _code = data.charCodeAt(i);
				if ((_code < 0xD800 || _code >= 0xDC00) || i >= (_length - 1))
					this.compositionValue.push(_code);
				else
				{
					i++;
					var _code2 = data.charCodeAt(i);
					if (_code2 < 0xDC00 || _code2 >= 0xDFFF)
					{
						this.compositionValue.push(_code);
						this.compositionValue.push(_code2);
					}
					else
					{
						this.compositionValue.push(((_code & 0x3FF) << 10) | (_code2 & 0x3FF));
					}
				}
			}
		}
	};

	window['AscCommon'] = window['AscCommon'] || {};
	window['AscCommon'].CTextInput = CTextInput;
})(window);
