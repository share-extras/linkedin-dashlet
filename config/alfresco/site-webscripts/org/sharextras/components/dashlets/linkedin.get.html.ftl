<script type="text/javascript">//<![CDATA[
   new Extras.dashlet.LinkedIn("${args.htmlid}").setMessages(${messages});
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");
//]]></script>
<div class="dashlet linkedin-dashlet">
   <div class="title" id="${args.htmlid}-title">${msg("header")}</div>
   <div class="linkedin-dashlet-toolbar toolbar" id="${args.htmlid}-toolbar">
      <div>
      	<span class="align-right yui-button-align">
      		<span class="first-child">
            	<a id="${args.htmlid}-link-new-post" class="theme-color-1" title="${msg('link.linkedin-new-post')}" href="">${msg('link.linkedin-new-post')}</a>
         	</span>
         </span>
      </div>
   </div>
   <div class="body scrollableList" <#if args.height??>style="height: ${args.height}px;"</#if>>
     <div id="${args.htmlid}-connect" class="linkedin-dashlet-connect" style="display: none;">
     	<div>${msg('message.notConnected')}</div>
     	<input type="button" id="${args.htmlid}-btn-connect" value="${msg('button.connect')}" />
 	 </div>
 	 <div id="${args.htmlid}-messages" class="linkedin-dashlet-messages"></div>
 	 <div id="${args.htmlid}-utils" class="linkedin-dashlet-utils"><a id="${args.htmlid}-link-disconnect" class="theme-color-1" href="#">${msg('link.disconnect')}</a></div>
   </div>
</div>