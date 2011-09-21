/**
 * Copyright (C) 2010-2011 Share Extras contributors.
 */

/**
* Extras root namespace.
* 
* @namespace Extras
*/
if (typeof Extras == "undefined" || !Extras)
{
   var Extras = {};
}

/**
* Extras dashlet namespace.
* 
* @namespace Extras.dashlet
*/
if (typeof Extras.dashlet == "undefined" || !Extras.dashlet)
{
   Extras.dashlet = {};
}

/**
 * LinkedIn dashboard component.
 * 
 * @class Extras.dashlet.LinkedIn
 * @namespace Extras.dashlet
 * @author Will Abson
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;

   /**
    * Dashboard LinkedIn constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Extras.dashlet.LinkedIn} The new component instance
    * @constructor
    */
   Extras.dashlet.LinkedIn = function LinkedIn_constructor(htmlId)
   {
      return Extras.dashlet.LinkedIn.superclass.constructor.call(this, "Extras.dashlet.LinkedIn", htmlId, ["selector", "event-delegate"]);
   };

   /**
    * Extend from Alfresco.component.Base and add class implementation
    */
   YAHOO.extend(Extras.dashlet.LinkedIn, Alfresco.component.Base,
   {
      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
      },

      /**
       * OAuth helper for connecting to the LinkedIn service
       * 
       * @property oAuth
       * @type Extras.OAuthHelper
       * @default null
       */
      oAuth: null,

      /**
       * Fired by YUI when parent element is available for scripting
       * 
       * @method onReady
       */
      onReady: function LinkedIn_onReady()
      {
          // Cache DOM elements
          this.widgets.title = Dom.get(this.id + "-title");
          this.widgets.messages = Dom.get(this.id + "-messages");
          this.widgets.connect = Dom.get(this.id + "-connect");
          this.widgets.utils = Dom.get(this.id + "-utils");
          this.widgets.toolbar = Dom.get(this.id + "-toolbar");
          
          // Set up the clear credentials link
          Event.addListener(this.id + "-link-disconnect", "click", this.onDisconnectClick, this, true);
          
          // Set up the new post link
          Event.addListener(this.id + "-link-new-post", "click", this.onNewPostClick, this, true);
          
          // Delegate setting up the favorite/unfavorite and post reply links
          Event.delegate(this.widgets.messages, "click", this.onPostFavoriteClick, "a.linkedin-favorite-link, a.linkedin-favorite-link-on", this, true);
          Event.delegate(this.widgets.messages, "click", this.onPostReplyClick, "a.linkedin-reply-link", this, true);
          
          // Set up the Connect button
          this.widgets.connectButton = new YAHOO.widget.Button(
             this.id + "-btn-connect",
             {
                disabled: true,
                onclick: {
                   fn: this.onConnectButtonClick,
                   obj: this.widgets.connectButton,
                   scope: this
                }
             }
          );
          
          this.oAuth = new Extras.OAuthHelper().setOptions({
              providerId: "linkedin",
              endpointId: "linkedin",
              requestTokenCallbackUri: window.location.href + "?cmpt_htmlid="  + encodeURIComponent(this.id),
              requestTokenPath: "/uas/oauth/requestToken",
              accessTokenPath: "/uas/oauth/accessToken"
          });
          
          this.oAuth.init({
              successCallback: { 
                  fn: function LinkedIn_onReady_oAuthInit()
                  {
                      if (this.oAuth.isAuthorized()) // An access token exists
                      {
                          // Run the success handler directly to load the messages
                          this.onAuthSuccess();
                      }
                      else if (this.oAuth.hasToken()) // Found a request token (TODO persist verifier via a web script and redirect user back)
                      {
                          // Get verifier from URL
                          var verifier = Alfresco.util.getQueryStringParameter("oauth_verifier", window.location.href),
                              cid = Alfresco.util.getQueryStringParameter("cmpt_htmlid", window.location.href);
                          if (verifier != null && cid != null && cid == this.id)
                          {
                              this.oAuth.requestAccessToken(this.oAuth.authData, verifier, {
                                  successCallback: {
                                      fn: this.onAuthSuccess, 
                                      scope: this
                                  },
                                  failureHandler: {
                                      fn: this.onAuthFailure,
                                      scope: this
                                  }
                              });
                          }
                          else // Incomplete verifier info, possible we were not redirected
                          {
                              this.oAuth.clearCredentials();
                              // Display the Connect information and button
                              Dom.setStyle(this.widgets.connect, "display", "block");
                              // Enable the button
                              this.widgets.connectButton.set("disabled", false);
                              // Hide the toolbar
                              Dom.setStyle(this.widgets.toolbar, "display", "none");
                          }
                      }
                      else // Not connected at all
                      {
                          // Display the Connect information and button
                          Dom.setStyle(this.widgets.connect, "display", "block");
                          // Enable the button
                          this.widgets.connectButton.set("disabled", false);
                          // Hide the toolbar
                          Dom.setStyle(this.widgets.toolbar, "display", "none");
                      }
                  }, 
                  scope: this
              },
              failureCallback: { 
                  fn: function LinkedIn_onReady_oAuthInit() {
                      // Failed to init the oauth helper
                      Alfresco.util.PopupManager.displayMessage({
                          text: this.msg("error.initOAuth")
                      });
                  }, 
                  scope: this
              }
          });

          
      },
      
      /**
       * Callback method used to prompt the user for a verification code to confirm that the
       * application has been granted access
       * 
       * @method onRequestTokenGranted
       * @param {object} obj Object literal containing properties
       *    authToken {string} the value of the temporary token granted
       *    onComplete {function} the callback function to be called to pass back the value provided by the user
       */
      onRequestTokenGranted: function LinkedIn_onRequestTokenGranted(obj)
      {
          Alfresco.util.assertNotEmpty(obj);
          Alfresco.util.assertNotEmpty(obj.authParams);
          Alfresco.util.assertNotEmpty(obj.onComplete);
          
          var authToken = obj.authParams.oauth_token,
              callbackConfirmed = obj.authParams.oauth_callback_confirmed,
              callbackFn = obj.onComplete,
              authorizationUrl = "https://www.linkedin.com/uas/oauth/authorize?oauth_token=" + authToken;
          
          if (callbackConfirmed == "true")
          {
              // Save the request token data
              this.oAuth.saveCredentials({
                  successCallback: {
                      fn: function() {
                          // Navigate to the authorization page
                          window.location.href = authorizationUrl;
                      },
                      scope: this
                  }
              });
          }
          else
          {
              Alfresco.util.PopupManager.displayMessage({
                  text: "Callback was not confirmed"
              });
          }
      },
      
      /**
       * Callback method to use to set up the dashlet when it is known that the authentication
       * has completed successfully
       * 
       * @method onAuthSuccess
       */
      onAuthSuccess: function LinkedIn_onAuthSuccess()
      {
          // TODO Wire this up with Bubbling, so multiple LinkedIn dashlets will work

          // Remove the Connect information and button, if they are shown
          Dom.setStyle(this.widgets.connect, "display", "none");

          // Enable the Disconnect button and toolbar
          Dom.setStyle(this.widgets.utils, "display", "block");
          Dom.setStyle(this.widgets.toolbar, "display", "block");
          
          this.loadMessages();
      },
      
      /**
       * Callback method when a problem occurs with the authentication
       * 
       * @method onAuthFailure
       */
      onAuthFailure: function LinkedIn_onAuthFailure()
      {
          Alfresco.util.PopupManager.displayMessage({
              text: this.msg("error.general")
          });
      },
      
      /**
       * Load messages from LinkedIn to display on the dashboard
       * 
       * @method loadMessages
       */
      loadMessages: function LinkedIn_loadMessages()
      {
          // Retrieve the member's first-degree connection updates
          this.oAuth.request({
              url: "/v1/people/~/network/updates",
              dataObj: {
                  count: 40,
                  format: "json"
              },
              successCallback: {
                  fn: function(o) {
                      if (o.responseText == "")
                      {
                          //this.oAuth.clearCredentials();
                          //this.oAuth.saveCredentials();
                      }
                      else
                      {
                          if (typeof o.json == "object")
                          {
                              //this.renderTitle(o.json);
                              this.renderMessages(o.json);
                          }
                          else
                          {
                              Alfresco.util.PopupManager.displayMessage({
                                  text: this.msg("error.post-bad-resp-type")
                              });
                          }
                      }
                  },
                  scope: this
              },
              failureCallback: {
                  fn: function() {
                      Alfresco.util.PopupManager.displayMessage({
                          text: this.msg("error.loadMessages")
                      });
                  },
                  scope: this
              }
          });
      },
      
      /**
       * Render dashlet title
       * 
       * @method renderTitle
       */
      renderTitle: function LinkedIn_renderTitle(json)
      {
          if (json.meta && json.meta.feed_name)
          {
              var title = json.meta.feed_name,
                  desc = json.meta.feed_desc;
              this.widgets.title.innerHTML = this.msg("header.named", "<span title=\"" + desc + "\">" + title + "</span>");
          }
      },

      /**
       * Insert links into message text to highlight users, hashtags and links
       * 
       * @method _formatMessage
       * @private
       * @param {string} text The plain message
       * @return {string} The formatted text, with hyperlinks added
       */
      _formatMessage: function LinkedIn__formatMessage(text)
      {
         return text.replace(/https?:\/\/\S+[^\s.]/gm, "<a href=\"$&\">$&</a>");
      },
      
      /**
       * Generate a user link
       */
      _userLink: function LinkedIn__userLink(person)
      {
          uname = person.firstName + " " + person.lastName;
          profileUri = person.siteStandardProfileRequest.url;
          return "<a href=\"" + profileUri + "\" title=\"" + $html(uname) + "\" class=\"theme-color-1\">" + $html(uname) + "</a>";
      },
      
      /**
       * Generate messages HTML
       * 
       * @method _messagesHTML
       * @private
       */
      _messagesHTML: function LinkedIn_renderMessages(json)
      {
          var message, updateContent, updateType, text, postedOn, postedLink, person, profileUri, mugshotUri, uname, html = "";
          if (json.values)
          {
              for (var i = 0; i < json.values.length; i++)
              {
                  text = null;
                  message = json.values[i];
                  updateContent = message.updateContent;
                  updateType = message.updateType;
                  if (typeof updateContent == "object" && typeof updateContent.person == "object")
                  {
                      person = updateContent.person;
                      uname = person.firstName + " " + person.lastName;
                      postedOn = message.timestamp;
                      profileUri = person.siteStandardProfileRequest.url;
                      mugshotUri = person.pictureUrl || null;
                      userLink = this._userLink(person);
                      postedLink = "<span class=\"linkedin-message-date\" title=\"" + postedOn + "\">" + this._relativeTime(new Date(postedOn)) + "</span>";
                      if (updateType == "STAT")
                      {
                          text = this._formatMessage($html(person.currentStatus));
                      }
                      else if (updateType == "CONN")
                      {
                          var connectionsStr = "", connections = person.connections.values, conn;
                          for (var j = 0; j < connections.length; j++)
                          {
                              conn = connections[j];
                              connectionsStr += this._userLink(conn) + (conn.headline != "" ? ", " + conn.headline : "");
                              connectionsStr += (j == connections.length - 1) ? "" : (j == connections.length - 2 ? "" : this.msg("text.connected-and"));
                          }
                          text = this.msg("text.connected", connectionsStr);
                      }
                      if (text != null)
                      {
                          html += "<div class=\"linkedin-message detail-list-item\">" + "<div class=\"linkedin-message-hd\">" + 
                          "<div class=\"user-icon\"><a href=\"" + profileUri + "\" title=\"" + $html(person.headline || uname) + "\"><img src=\"" + $html(mugshotUri) + "\" alt=\"" + $html(uname) + "\" width=\"48\" height=\"48\" /></a></div>" + 
                          "</div><div class=\"linkedin-message-bd\">" + "<span class=\"screen-name\">" + userLink + "</span> " +
                          text + "</div>" + "<div class=\"linkedin-message-postedOn\">" + 
                          this.msg("text.msgDetails", postedLink) + 
                          //" <span class=\"linkedin-actions\"><a href=\"#\" class=\"linkedin-favorite-link" +
                          //(Alfresco.util.arrayContains(favorites, message.id) ? "-on" : "") + "\" id=\"" + 
                          //this.id + "-favorite-link-" + message.id + "\"><span>" + 
                          //this.msg("link.linkedin-favorite") + "</span></a><a href=\"#\" class=\"linkedin-reply-link\" id=\"" + 
                          //this.id + "-reply-link-" + message.id + "\"><span>" + 
                          //this.msg("link.linkedin-reply") + "</span></a>" + "</span>" + 
                          "</div>" + "</div>";
                      }
                  }
              }
          }
          return html;
      },
      
      /**
       * Render LinkedIn messages
       * 
       * @method renderMessages
       */
      renderMessages: function LinkedIn_renderMessages(json)
      {
          this.widgets.messages.innerHTML = this._messagesHTML(json);
      },
      
      /**
       * Append additional LinkedIn messages
       * 
       * @method appendMessages
       */
      appendMessages: function LinkedIn_appendMessages(json)
      {
          this.widgets.messages.innerHTML += this._messagesHTML(json);
      },
      
      /**
       * Prepend additional LinkedIn messages
       * 
       * @method prependMessages
       */
      prependMessages: function LinkedIn_prependMessages(json)
      {
          this.widgets.messages.innerHTML = this._messagesHTML(json) + this.widgets.messages.innerHTML;
      },
      
      /**
       * Get relative time where possible, otherwise just return a simple string representation of the suppplied date
       * 
       * @method _relativeTime
       * @private
       * @param d {date} Date object
       */
      _relativeTime: function LinkedIn__getRelativeTime(d)
      {
          return typeof(Alfresco.util.relativeTime) === "function" ? Alfresco.util.relativeTime(d) : Alfresco.util.formatDate(d)
      },
      
      /**
       * Post a message
       *
       * @method _postMessage
       * @param replyToId {int} ID of message this is in reply to, null otherwise
       * @param titleId {int} Message ID to use for title text (optional)
       * @param promptId {int} Message ID to use for prompt text (optional)
       */
      _postMessage: function LinkedIn__postMessage(replyToId, titleId, promptId)
      {
         titleId = titleId || this.msg("label.new-post");
         promptId = promptId || this.msg("label.new-post-prompt");
         Alfresco.util.PopupManager.getUserInput({
             title: this.msg(titleId),
             text: this.msg(promptId),
             callback:
             {
                 fn: function LinkedIn_onNewPostClick_postCB(value, obj) {
                     if (value != null && value != "")
                     {
                         var dataStr = '<activity locale="' + (navigator.language || 'en-US') + '"><content-type>linkedin-html</content-type><body>' +
                             $html(value) + '</body></activity>';
                         // Seems we cannot post JSON data, since this requires us to specify Content-Type header to 
                         // 'application/json' exactly, but the browser adds the charset. So dataObj is no good to us.
                         var dataObj = {
                                 contentType: "linkedin-html",
                                 body: value
                         };
                         if (replyToId)
                             dataObj.replied_to_id = replyToId;
                         
                         // Post the update
                         this.oAuth.request({
                             url: "/v1/people/~/person-activities",
                             method: "POST",
                             dataStr: dataStr,
                             requestContentType: "text/xml",
                             successCallback: {
                                 fn: function(o) {
                                     Alfresco.util.PopupManager.displayMessage({
                                         text: this.msg("success.post-message")
                                     });
                                 },
                                 scope: this
                             },
                             failureCallback: {
                                 fn: function() {
                                     Alfresco.util.PopupManager.displayMessage({
                                         text: this.msg("error.post-message")
                                     });
                                 },
                                 scope: this
                             }
                         });
                     }
                 },
                 scope: this
             }
         });
      },
      

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */


      /**
       * Click handler for Connect button
       *
       * @method onConnectButtonClick
       * @param e {object} HTML event
       */
      onConnectButtonClick: function LinkedIn_onConnectButtonClick(e, obj)
      {
         // Disable the button while we make the request
         this.widgets.connectButton.set("disabled", true);

         if (!this.oAuth.isAuthorized()) // Double-check we are still not connected
         {
             this.oAuth.requestToken({
                 successCallback: { 
                     fn: this.onAuthSuccess, 
                     scope: this
                 },
                 failureCallback: { 
                     fn: this.onAuthFailure, 
                     scope: this
                 },
                 requestTokenHandler:  { 
                     fn: this.onRequestTokenGranted, 
                     scope: this
                 }
             });
         }
         else
         {
             this.onAuthSuccess();
         }
      },
      
      /**
       * Click handler for Disconnect link
       *
       * @method onDisconnectClick
       * @param e {object} HTML event
       */
      onDisconnectClick: function LinkedIn_onDisconnectClick(e, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         
         var me = this;
         
         Alfresco.util.PopupManager.displayPrompt({
             title: this.msg("title.disconnect"),
             text: this.msg("label.disconnect"),
             buttons: [
                 {
                     text: Alfresco.util.message("button.ok", this.name),
                     handler: function LinkedIn_onDisconnectClick_okClick() {
                         me.oAuth.clearCredentials();
                         me.oAuth.saveCredentials();
                         // Remove existing messages
                         me.widgets.messages.innerHTML = "";
                         // Display the Connect information and button
                         Dom.setStyle(me.widgets.connect, "display", "block");
                         // Enable the button
                         me.widgets.connectButton.set("disabled", false);
                         // Disable the Disconnect button and toolbar
                         Dom.setStyle(me.widgets.utils, "display", "none");
                         Dom.setStyle(me.widgets.toolbar, "display", "none");
                         this.destroy();
                     },
                     isDefault: true
                 },
                 {
                     text: Alfresco.util.message("button.cancel", this.name),
                     handler: function LinkedIn_onDisconnectClick_cancelClick() {
                         this.destroy();
                     }
                 }
             ]
         });
      },
      
      /**
       * Click handler for New Post link
       *
       * @method onNewPostClick
       * @param e {object} HTML event
       */
      onNewPostClick: function LinkedIn_onNewPostClick(e, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         this._postMessage(null);
      },
      
      /**
       * Click handler for Post Reply link
       *
       * @method onPostReplyClick
       * @param e {object} HTML event
       */
      onPostReplyClick: function LinkedIn_onPostReplyClick(e, matchEl, containerEl)
      {
         // Prevent default action
         Event.stopEvent(e);
         var replyToId = matchEl.id.substring(matchEl.id.lastIndexOf("-") + 1);
         this._postMessage(replyToId, "label.reply", "label.reply-prompt");
      },
      
      /**
       * Click handler for Favorite link
       *
       * @method onPostFavoriteClick
       * @param e {object} HTML event
       */
      onPostFavoriteClick: function LinkedInTimeline_onPostFavoriteClick(e, matchEl, obj)
      {
         // Prevent default action
         Event.stopEvent(e);
         
         var msgId = matchEl.id.substring(matchEl.id.lastIndexOf("-") + 1), // Message id
             isFavorite = Dom.hasClass(matchEl, "linkedin-favorite-link-on"),
             method = !isFavorite ? "POST" : "DELETE",
             urlParams = !isFavorite ? "" : "?message_id=" + encodeURIComponent(msgId),
             dataObj = !isFavorite ? { message_id: msgId } : null,
             newClass = !isFavorite ? "linkedin-favorite-link-on" : "linkedin-favorite-link",
             oldClass = !isFavorite ? "linkedin-favorite-link" : "linkedin-favorite-link-on",
             errMsgId = !isFavorite ? "error.favorite" : "error.unfavorite";
         
         this.oAuth.request({
             url: "/api/v1/messages/liked_by/current.json" + urlParams,
             method: method,
             dataObj: dataObj,
             requestContentType: Alfresco.util.Ajax.FORM,
             successCallback: {
                 fn: function(o) {
                     Dom.addClass(matchEl, newClass);
                     Dom.removeClass(matchEl, oldClass);
                 },
                 scope: this
             },
             failureCallback: {
                 fn: function() {
                     Alfresco.util.PopupManager.displayMessage({
                         text: this.msg(errMsgId)
                     });
                 },
                 scope: this
             }
         });
      },
      
   });
   
})();
