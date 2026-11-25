window.la_studio = {};

(function($) {
    "use strict";

    var la_studio = window.la_studio || {},
        $window = $(window),
        $document = $(document),
        $htmlbody = $('html,body'),
        $body = $(document.body),
        $masthead = $('#masthead'),
        $masthead_inner = $masthead.find('>.site-header-inner'),
        $masthead_aside = $('#masthead_aside'),
        $masthead_aside_inner = $masthead_aside.find('.site-header-inner'),
        $footer_colophon = $('#colophon'),
        $la_full_page = $('#la_full_page');

    function userAgentDetection() {
        var ua = navigator.userAgent.toLowerCase(),
            platform = navigator.platform.toLowerCase(),
            UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0],
            mode = UA[1] == 'ie' && document.documentMode;

        window.laBrowser = {
            name: (UA[1] == 'version') ? UA[3] : UA[1],
            version: UA[2],
            platform: {
                name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
            }
        };
    }
    function getOffset(elem) {
        if (elem.getBoundingClientRect && window.laBrowser.platform.name != 'ios') {
            var bound = elem.getBoundingClientRect(), html = elem.ownerDocument.documentElement, htmlScroll = getScroll(html), elemScrolls = getScrolls(elem), isFixed = (styleString(elem, 'position') == 'fixed');
            return {
                x: parseInt(bound.left) + elemScrolls.x + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
                y: parseInt(bound.top) + elemScrolls.y + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
            };
        }
        var element = elem, position = {x: 0, y: 0};
        if (isBody(elem))return position;
        while (element && !isBody(element)) {
            position.x += element.offsetLeft;
            position.y += element.offsetTop;
            if (window.laBrowser.name == 'firefox') {
                if (!borderBox(element)) {
                    position.x += leftBorder(element);
                    position.y += topBorder(element);
                }
                var parent = element.parentNode;
                if (parent && styleString(parent, 'overflow') != 'visible') {
                    position.x += leftBorder(parent);
                    position.y += topBorder(parent);
                }
            } else if (element != elem && window.laBrowser.name == 'safari') {
                position.x += leftBorder(element);
                position.y += topBorder(element);
            }
            element = element.offsetParent;
        }
        if (window.laBrowser.name == 'firefox' && !borderBox(elem)) {
            position.x -= leftBorder(elem);
            position.y -= topBorder(elem);
        }
        return position;
    }
    function getScroll(elem) {
        return {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop
        };
    }
    function getScrolls(elem) {
        var element = elem.parentNode, position = {x: 0, y: 0};
        while (element && !isBody(element)) {
            position.x += element.scrollLeft;
            position.y += element.scrollTop;
            element = element.parentNode;
        }
        return position;
    }
    function styleString(element, style) {
        return $(element).css(style);
    }
    function styleNumber(element, style) {
        return parseInt(styleString(element, style)) || 0;
    }
    function borderBox(element) {
        return styleString(element, '-moz-box-sizing') == 'border-box';
    }
    function topBorder(element) {
        return styleNumber(element, 'border-top-width');
    }
    function leftBorder(element) {
        return styleNumber(element, 'border-left-width');
    }
    function isBody(element) {
        return (/^(?:body|html)$/i).test(element.tagName);
    }
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    function addStyleSheet( css ) {
        var head, styleElement;
        head = document.getElementsByTagName('head')[0];
        styleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText = css;
        } else {
            styleElement.appendChild(document.createTextNode(css));
        }
        head.appendChild(styleElement);
        return styleElement;
    }
    function addQueryArg(key, value){
        key = escape(key);
        value = escape(value);
        var s = document.location.search,
            kvp = key+"="+value,
            r = new RegExp("(&|\\?)"+key+"=[^\&]*");
        s = s.replace(r,"$1"+kvp);
        if(!RegExp.$1) {
            s += (s.length>0 ? '&' : '?') + kvp;
        }
        return s;
    }
    function addQueryArgWithURI(uri, key, value) {
        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";
        if (uri.match(re)) return uri.replace(re, '$1' + key + "=" + value + '$2');
        else return uri + separator + key + "=" + value;
    }
    function showMessageBox( html ){
        lightcase.start({
            href: '#',
            showSequenceInfo: false,
            maxWidth:600,
            maxHeight: 500,
            onFinish: {
                insertContent: function () {
                    lightcase.get('contentInner').children().html('<div class="la-global-message">' + html + '</div>');
                    lightcase.resize();
                    clearTimeout(la_studio.timeOutMessageBox);
                    la_studio.timeOutMessageBox = setTimeout(function(){
                        lightcase.close();
                    }, 20 * 1000);
                }
            },
            onClose : {
                qux: function() {
                    clearTimeout(la_studio.timeOutMessageBox);
                }
            }
        });

    }
    function isCookieEnable (){
        if (navigator.cookieEnabled) return true;
        document.cookie = "cookietest=1";
        var ret = document.cookie.indexOf("cookietest=") != -1;
        document.cookie = "cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT";
        return ret;
    }
    userAgentDetection();

    la_studio.helps = {

        isDebug : true,

        log: function(){
            if(la_studio.helps.isDebug){
                console.log(arguments);
            }
        },

        makeRandomId : function(){
            var text = "",
                char = "abcdefghijklmnopqrstuvwxyz",
                num = "0123456789",
                i;
            for( i = 0; i < 5; i++ ){
                text += char.charAt(Math.floor(Math.random() * char.length));
            }
            for( i = 0; i < 5; i++ ){
                text += num.charAt(Math.floor(Math.random() * num.length));
            }
            return text;
        },
        getOffset: function( $elm ){
            return $elm.length ? getOffset($elm[0]) : {x:0, y:0};

        },
        getAdminbarHeight : function(){
            return ($('#wpadminbar').length && $('#wpadminbar').css('position') == 'fixed') ? $('#wpadminbar').height() : 0;
        },
        fullscreenFooterCalcs: function() {

        },
        is_rtl: $body.hasClass('rtl') ? true : false,
        is_active_vc : $body.hasClass('wpb-js-composer') ? true : false
    }

    la_studio.shortcodes = {
        unit_responsive : function(){
            var xlg = '',
                lg  = '',
                md  = '',
                sm  = '',
                xs  = '',
                mb  = '';
            $('.la-unit-responsive').each(function(){
                var t 		= $(this),
                    n 		= t.attr('data-responsive-json-new'),
                    target 	= t.attr('data-unit-target'),
                    tmp_xlg = '',
                    tmp_lg  = '',
                    tmp_md  = '',
                    tmp_sm  = '',
                    tmp_xs  = '',
                    tmp_mb  = '';
                if (typeof n != "undefined" || n != null) {
                    $.each($.parseJSON(n), function (i, v) {
                        var css_prop = i;
                        if (typeof v != "undefined" && v != null && v != '') {
                            $.each(v.split(";"), function(i, vl) {
                                if (typeof vl != "undefined" && vl != null && vl != '') {
                                    var splitval = vl.split(":"),
                                        _elm_attr = css_prop + ":" + splitval[1] + ";";
                                    switch( splitval[0]) {
                                        case 'xlg':
                                            tmp_xlg     += _elm_attr;
                                            break;
                                        case 'lg':
                                            tmp_lg      += _elm_attr;
                                            break;
                                        case 'md':
                                            tmp_md      += _elm_attr;
                                            break;
                                        case 'sm':
                                            tmp_sm      += _elm_attr;
                                            break;
                                        case 'xs':
                                            tmp_xs      += _elm_attr;
                                            break;
                                        case 'mb':
                                            tmp_mb      += _elm_attr;
                                            break;
                                    }
                                }
                            });
                        }
                    });
                }
                if(tmp_xlg!='') {   xlg += target+ '{' + tmp_xlg + '}' }
                if(tmp_lg!='') {    lg  += target+ '{' + tmp_lg  + '}' }
                if(tmp_md!='') {    md  += target+ '{' + tmp_md  + '}' }
                if(tmp_sm!='') {    sm  += target+ '{' + tmp_sm  + '}' }
                if(tmp_xs!='') {    xs  += target+ '{' + tmp_xs  + '}' }
                if(tmp_mb!='') {    mb  += target+ '{' + tmp_mb  + '}' }
            });

            var css = '';
            css += lg;
            css += "\n@media (min-width: 1824px) {\n" + xlg + "\n}";
            css += "\n@media (max-width: 1199px) {\n" + md  + "\n}";
            css += "\n@media (max-width: 991px)  {\n" + sm  + "\n}";
            css += "\n@media (max-width: 767px)  {\n" + xs  + "\n}";
            css += "\n@media (max-width: 479px)  {\n" + mb  + "\n}";
            addStyleSheet(css);
            $('.la-divider').removeAttr('style');
        },
        fix_tabs : function(){
            $document
                .on( 'click.vc.tabs.data-api', '[data-vc-tabs]', function(e){
                    var plugin_tabs, $slick_slider, $selector;
                    plugin_tabs = $(this).data('vc.tabs');
                    $selector = $(plugin_tabs.getSelector());
                    $slick_slider = $('.slick-slider', $selector);
                    e.preventDefault();
                    $('.elm-ajax-loader', $selector).trigger('la_event_ajax_load');
                    if( $slick_slider.length > 0 ){
                        $slick_slider.css('opacity','0').slick("setPosition").css('opacity','1');
                    }
                })
                .on('show.vc.accordion','[data-vc-accordion]',function(e){
                    var $data = $(this).data("vc.accordion"),
                        $selector = $data.getTarget(),
                        $slick_slider = $('.slick-slider', $selector);
                    $('.elm-ajax-loader', $selector).trigger('la_event_ajax_load');
                    if( $slick_slider.length > 0 ){
                        $slick_slider.css('opacity','0').slick("setPosition").css('opacity','1');
                    }
                });
        },
        fix_parallax_row: function(){
            var call_vc_parallax = setInterval(function(){
                if(window.vcParallaxSkroll !== 'undefined'){
                    try{
                        window.vcParallaxSkroll.refresh();
                    }catch (ex){
                        //la_studio.helps.log(ex);
                    }
                    clearInterval(call_vc_parallax);
                }
            },100);
        },
        fix_rtl_row_fullwidth : function(){
            if(!la_studio.helps.is_active_vc){
                return;
            }
        },

        fix_row_fullwidth: function(){
            if(!la_studio.helps.is_active_vc){
                return;
            }
            $document.on('la-vc-gradient', '.la_row_grad', function(e){
                var selector = $(this),
                    grad = selector.data('grad'),
                    row = selector.next();
                grad = grad.replace('url(data:image/svg+xml;base64,','');
                var e_pos = grad.indexOf(';');
                grad = grad.substring(e_pos+1);
                row.attr('style', row.attr('style') + grad);
                selector.remove();
            });

            $('.la_row_grad').trigger('la-vc-gradient');

        },
        google_map: function(){
            $('.la-shortcode-maps').each(function(){
                 $(this).closest('.wpb_wrapper').height('100%');
            });
            $window.on('load resize',function(){
                var $maps = $('.map-full-height');
                $maps.css('height',$maps.closest('.vc_column-inner ').height());
            });
        },
        counter : function(){
            var $shortcode = $('.la-stats-counter');
            $shortcode.appear();
            $shortcode.on('appear', function(){
                var $this = $(this),
                    $elm = $this.find('.icon-value');
                if(false === !!$this.data('appear-success')){
                    var endNum = parseFloat($elm.data('counter-value'));
                    var Num = $elm.data('counter-value') + ' ';
                    var speed = parseInt($elm.data('speed'));
                    var sep = $elm.data('separator');
                    var dec = $elm.data('decimal');
                    var dec_count = Num.split(".");
                    var grouping = true;
                    var prefix = endNum > 0 && endNum < 10 ? '0' : '';
                    if(dec_count[1])
                        dec_count = dec_count[1].length-1;
                    else
                        dec_count = 0;
                    if(dec == "none")
                        dec = "";
                    if(sep == "none")
                        grouping = false;
                    else
                        grouping = true;

                    $elm.countup({
                        startVal: 0,
                        endVal: endNum,
                        decimals: dec_count,
                        duration: speed,
                        options: {
                            useEasing : true,
                            useGrouping : grouping,
                            separator : sep,
                            decimal : dec,
                            prefix: prefix
                        }
                    });
                    $this.data('appear-success','true');
                }
            });
        },
        countdown : function(){
            $document.on('la_event_countdown','.elm-countdown-dateandtime',function(e){
                var $this = $(this),
                    t = new Date($this.html()),
                    tfrmt = $this.data('countformat'),
                    labels_new = $this.data('labels'),
                    new_labels = labels_new.split(","),
                    labels_new_2 = $this.data('labels2'),
                    new_labels_2 = labels_new_2.split(",");

                var server_time = new Date($this.data('time-now'));

                var ticked = function (a){
                    var $amount = $this.find('.countdown-amount'),
                        $period = $this.find('.countdown-period');
                    $amount.css({
                        'color': $this.data('tick-col'),
                        'border-color':$this.data('br-color'),
                        'border-width':$this.data('br-size'),
                        'border-style':$this.data('br-style'),
                        'border-radius':$this.data('br-radius'),
                        'background':$this.data('bg-color'),
                        'padding':$this.data('padd')
                    });
                    $period.css({
                        'font-size':$this.data('tick-p-size'),
                        'color':$this.data('tick-p-col')
                    });

                    if($this.data('tick-style')=='bold'){
                        $amount.css('font-weight','bold');
                    }
                    else if ($this.data('tick-style')=='italic'){
                        $amount.css('font-style','italic');
                    }
                    else if ($this.data('tick-style')=='boldnitalic'){
                        $amount.css('font-weight','bold');
                        $amount.css('font-style','italic');
                    }
                    if($this.data('tick-p-style')=='bold'){
                        $period.css('font-weight','bold');
                    }
                    else if ($this.data('tick-p-style')=='italic'){
                        $period.css('font-style','italic');
                    }
                    else if ($this.data('tick-p-style')=='boldnitalic'){
                        $period.css('font-weight','bold');
                        $period.css('font-style','italic');
                    }
                };

                if($this.hasClass('usrtz')){
                    $this.countdown({labels: new_labels, labels1: new_labels_2, until : t, format: tfrmt, padZeroes:true,onTick:ticked});
                }else{
                    $this.countdown({labels: new_labels, labels1: new_labels_2, until : t, format: tfrmt, padZeroes:true,onTick:ticked , serverSync:server_time});
                }
            });
            $('.elm-countdown-dateandtime').trigger('la_event_countdown')
        },
        pie_chart : function(){
            $('.la-circle-progress')
                .appear({ force_process: true })
                .on('appear',function(){
                    var $this = $(this);
                    var value = $this.data('pie-value'),
                        color = $this.data('pie-color'),
                        unit  = $this.data('pie-units'),
                        emptyFill = $this.data('empty-fill'),
                        border = 5,
                        init = $(this).data('has_init'),
                        $el_val = $this.find('.sc-cp-v');

                    if(init !== 'true'){
                        $this.find('.sc-cp-canvas').circleProgress({
                            value: parseFloat(value/100),
                            thickness: border,
                            emptyFill: emptyFill,
                            reverse: false,
                            lineCap: 'round',
                            size: 200,
                            startAngle: - Math.PI / 4,
                            fill: {
                                color: color
                            }
                        }).on('circle-animation-progress', function(event, progress, stepValue) {
                            $el_val.text( parseInt(100 * stepValue) + unit );
                        });
                        $this.data('has_init','true');
                    }
                });
        },
        progress_bar: function(){
            if("undefined" != typeof $.fn.waypoint){
                $(document).on('la_event:vc_progress_bar', '.vc_progress_bar', function(){
                    $(this).find('.vc_label_units').removeAttr('style');
                    $(this).find('.vc_bar').removeAttr('style');
                    $(this).find(".vc_single_bar").each(function (index) {
                        var $this = $(this),
                            bar = $this.find(".vc_bar"),
                            unit = $this.find(".vc_label_units"),
                            val = bar.data("percentage-value");
                        setTimeout(function () {
                            unit.css({
                                opacity: 1
                            });
                            if(la_studio.helps.is_rtl){
                                unit.css('right', val + '%');
                            }else{
                                unit.css('left', val + '%');
                            }
                            bar.css({
                                width: val + "%"
                            })
                        }, 200 * index);
                    })
                });
                $('.vc_progress_bar').waypoint(function () {
                    $(this).trigger('la_event:vc_progress_bar');
                }, { offset: "85%"} )
            }
        },
        tweetsFeed : function(){
            $('.la-tweets-feed').each(function(idx){
                $(this).attr('id', 'la_tweets_' + idx );
                var $this = $(this),
                    widget_id = $this.attr('data-widget-id'),
                    profile = $this.attr('data-profile'),
                    count = $this.attr('data-amount');

                var config = {
                    "id": '',
                    "profile": {"screenName": 'lastudioweb'},
                    "dataOnly": true,
                    "maxTweets": count,
                    "customCallback": handleTweetCallback
                };
                if(widget_id){
                    config.id = widget_id;
                }
                if(profile){
                    config.profile = {"screenName": profile};
                }

                function handleTweetCallback(tweets){
                    var html = '';
                    for (var i = 0, lgth = tweets.length; i < lgth ; i++) {
                        var tweetObject = tweets[i];
                        html += '<div class="tweet-feed-item">'
                            + '<div class="tweet-content">' + tweetObject.tweet + '</div>'
                            + '<div class="tweet-infos">' + tweetObject.author + '</div>'
                            + '<div class="tweet-link"><a href="' + tweetObject.permalinkURL + '"><i class="fa fa-twitter"></i>' + tweetObject.time + '</a></div>'
                            + '</div>';
                    }
                    $this.html(html);
                    $('.tweet-content a.link.customisable', $this).each(function(){
                        var $that = $(this);
                        $that.html($that.attr('href'));
                    });
                    if($this.parent('.twitter-feed').hasClass('tweets-slider')){
                        $this.slick({
                            arrows: false,
                            infinite: true,
                            autoplay: true,
                            autoplaySpeed: 5000,
                            adaptiveHeight: true,
                            speed: 1000,
                            rtl: la_studio.helps.is_rtl
                        })
                    }
                }

                twitterFetcher.fetch(config);
            });

        },
        instagramFeed: function(){
            $(document).on('la_event_ajax_load_instagram', '.la-instagram-feeds', function(){
                var $this = $(this),
                    _configs = $this.data('feed_config'),
                    $target, feed_configs, feed;

                if($this.hasClass('loading')){
                    return;
                }
                $this.addClass('loading');

                $target = $('.la-instagram-loop', $this);

                var _api = addQueryArgWithURI(cosy_configs.ajax_url, 'action', 'lastudio_ig_feed');

                $.getJSON( _api, function( data ) {

                    if(data.success){
                        var items = data.data;
                        var _limit = parseInt(_configs.limit) || 8;
                        if(items.length > _limit){
                            items = items.splice(0, _limit);
                        }
                        if(items.length > 0){
                            var _html = '';
                            items.forEach(function(item){
                                var _item_html = _configs.template,
                                    _thumb_src = item.media_url;
                                if(item.media_type == 'VIDEO'){
                                    _thumb_src = item.thumbnail_url;
                                }
                                _item_html = _item_html
                                    .replace(/{{link}}/gi, item.permalink)
                                    .replace(/{{caption}}/gi, item.caption ? item.caption : '')
                                    .replace(/{{image}}/gi, _thumb_src)
                                    .replace(/{{likes}}/gi, '')
                                    .replace(/{{comments}}/gi, '');
                                _html += _item_html;
                            });
                            $target.html(_html);
                            if($target.hasClass('la-instagram-slider')){
                                $target.addClass('la-slick-slider');
                                setTimeout(function(){
                                    $target.trigger('la_event_init_carousel');
                                    $this.addClass('loaded');
                                },200);
                            }
                            else{
                                $this.addClass('loaded');
                            }
                        }
                        else {
                            $this.addClass('loaded loaded-error');
                        }
                    }
                    else{
                        $this.addClass('loaded loaded-error');
                        $target.html( data.data.msg );
                    }
                });
            });

            $('.la-instagram-feeds').trigger('la_event_ajax_load_instagram');
        },
        timeline: function(){
            function t_get_maxheight($elm){
                var max_height = 0;
                $elm.each(function(){
                    if($(this).outerHeight() > max_height){
                        max_height = $(this).outerHeight();
                    }
                });
                return max_height;
            }
            var $timeline2 = $('.la-timeline-wrap.style-2');
            $timeline2.each(function(){
                var _this = $(this),
                    _h1 = t_get_maxheight( $('.timeline-block:nth-child(2n+1)', _this)),
                    _h2 = t_get_maxheight( $('.timeline-block:nth-child(2n)', _this)),
                    _w = 0;

                $('.timeline-line', _this).css('top', _h1 );

                _this.css({
                    height: _h1 + _h2
                });
                $('.timeline-wrapper', _this).css({
                    height: _h1 + _h2
                });
                $('.timeline-block', _this).each(function(idx){
                    var customStyle = {
                        //left: $(this).outerWidth() * idx,
                        top: 0
                    };
                    if(idx%2 != 0){
                        customStyle.top = _h1;
                    }
                    _w += $(this).outerWidth();
                    $(this).css(customStyle);
                });

                $('.timeline-wrapper', _this).slick({
                    variableWidth: true,
                    infinite: false,
                    prevArrow: '<button type="button" class="slick-prev"><i class="cosy-icon-arrows-minimal-left"></i></button>',
                    nextArrow: '<button type="button" class="slick-next"><i class="cosy-icon-arrows-minimal-right"></i></button>',
                    draggable: true,
                    rtl: la_studio.helps.is_rtl
                });

                _this.addClass('la-inited');

            });
        },
        fullpage: function(){
            if( "undefined" != typeof $.fn.fullpage ){
                var anchors = [],
                    navigationTooltips = [],
                    fp_config;

                $('<div class="la-fp-arrows"><ul><li class="prev"><i></i></li><li class="num"><span class="current">01</span><span class="total">01</span></li><li class="next"><i></i></li></ul></div>').appendTo($body);
                $document
                    .on('click', '.la-fp-arrows .prev', function(e){
                        e.preventDefault();
                        $.fn.fullpage.moveSectionUp();
                    })
                    .on('click', '.la-fp-arrows .next', function(e){
                        e.preventDefault();
                        $.fn.fullpage.moveSectionDown();
                    });

                $footer_colophon.addClass('la_fp_section fp-auto-height').attr('data-anchor', 'colophon').appendTo($la_full_page);

                $('.vc_section.la_fp_section').each(function(){
                    var _name = $(this).attr('data-anchor'),
                        _tip = $(this).attr('data-fp-tooltip');
                    if(!_name) _name = la_studio.helps.makeRandomId();
                    if(!_tip) _tip = '';
                    anchors.push(_name);
                    navigationTooltips.push(_tip);
                });

                fp_config = $.extend({
                    sectionSelector : '.la_fp_section',
                    slideSelector : '.la_fp_slide',
                    navigation : false,
                    anchors: anchors,
                    navigationTooltips: navigationTooltips,
                    onLeave: function(index, nextIndex, direction){
                        var $that = $(this),
                            $next_elem = $('#la_full_page > .fp-section:nth-child('+nextIndex+')');

                        $('.la-fp-arrows .num .current').html(nextIndex < 10 ? '0' + nextIndex : nextIndex );

                        var $transformProp = (!navigator.userAgent.match(/(Android|iPod|iPhone|iPad|BlackBerry|IEMobile|Opera Mini)/)) ? 'transform' : 'all';
                        /* Checking header sticky */
                        if($body.hasClass('enable-header-sticky')){
                            if( 'up' == direction && nextIndex == 1 ) {
                                $masthead.removeClass('fp-header-is-sticky');
                            }
                            if( 'down' == direction && nextIndex > 1 ) {
                                $masthead.addClass('fp-header-is-sticky');
                            }
                        }

                        if($next_elem.hasClass('site-footer')){
                            $next_elem.prev('.vc_section').addClass('last-before-footer');
                        }
                        else{
                            $next_elem.css({
                                paddingTop: $masthead.height()
                            });
                            $next_elem.find('.wpb_animate_when_almost_visible:not(.animated)').addClass('animated');

                            if($window.width() > fp_config.responsiveWidth){
                                if($that.find('.fp-slides').length){
                                    $that.find('.fp-slide.active .wpb_animate_when_almost_visible.wpb_start_animation').removeClass('wpb_start_animation').addClass('la_reinit_animation');
                                }else{
                                    $that.find('.wpb_animate_when_almost_visible.wpb_start_animation').removeClass('wpb_start_animation').addClass('la_reinit_animation');
                                }
                            }
                        }

                        /* reset animation */
                        $la_full_page.trigger('la_event_fp:onLeave', [index, nextIndex, direction]);
                    },
                    afterLoad: function(anchorLink, index){
                        var $that = $(this),
                            $row_current = $('#la_full_page > .fp-section:nth-child('+index+')');

                        if($row_current.hasClass('site-footer')){
                            $row_current.prev('.vc_section').addClass('last-before-footer');
                        }
                        if($window.width() > fp_config.responsiveWidth) {
                            if ($that.find('.fp-slides').length) {
                                $that.find('.fp-slide.active .wpb_animate_when_almost_visible:not(.wpb_start_animation)').addClass('wpb_start_animation');
                            }
                            else {
                                $that.find('.wpb_animate_when_almost_visible:not(.wpb_start_animation)').addClass('wpb_start_animation');
                            }
                        }
                        $la_full_page.trigger('la_event_fp:afterLoad', [anchorLink, index]);
                    },
                    afterRender: function(){
                        $('.la-fp-arrows .num .total').html(anchors.length);
                        $masthead.addClass('is-sticky');
                        $masthead_inner.css('top', la_studio.helps.getAdminbarHeight());
                        $('#fp-nav li:gt('+ parseInt(anchors.length - 1) +')').remove();
                        $la_full_page.trigger('la_event_fp:afterRender');
                    },
                    afterResize: function(){
                        la_studio.helps.fullscreenFooterCalcs();

                        $la_full_page.trigger('la_event_fp:afterResize');
                    },
                    afterResponsive: function(isResponsive){
                        $la_full_page.trigger('la_event_fp:afterResponsive', [isResponsive]);
                    },
                    afterSlideLoad: function(anchorLink, index, slideAnchor, slideIndex){
                        var $that = $(this);
                        if($window.width() > fp_config.responsiveWidth) {
                            $that.find('.wpb_animate_when_almost_visible:not(.wpb_start_animation)').addClass('wpb_start_animation');
                        }
                        $la_full_page.trigger('la_event_fp:afterSlideLoad', [anchorLink, index, slideAnchor, slideIndex]);
                    },
                    onSlideLeave: function(anchorLink, index, slideIndex, direction, nextSlideIndex){
                        var $that = $(this);
                        if($window.width() > fp_config.responsiveWidth) {
                            $that.find('.wpb_animate_when_almost_visible.wpb_start_animation').removeClass('wpb_start_animation').addClass('la_reinit_animation');
                        }
                        $la_full_page.trigger('la_event_fp:onSlideLeave', [anchorLink, index, slideIndex, direction, nextSlideIndex]);
                    }
                }, cosy_configs.fullpage );

                if($('.vc_section.la_fp_fixed_top').length == 0){
                    fp_config.fixedElements = fp_config.fixedElements.replace('.la_fp_fixed_top', '');
                }
                if($('.vc_section.la_fp_fixed_bottom').length == 0 ){
                    fp_config.fixedElements = fp_config.fixedElements.replace('.la_fp_fixed_bottom', '');
                }

                fp_config.fixedElements = fp_config.fixedElements.replace(/^,+/, '');

                console.log(fp_config.responsiveWidth);

                la_studio.helps.log(fp_config);

                $la_full_page.fullpage(fp_config);

                $window.resize(function(){$.fn.fullpage.reBuild()});

            }
        },
        team_member: function(){
            $(document).on('click', '.la-team-member > .loop-style-9 .team-member-item .item--image > a', function(e){
                e.preventDefault();
                var $that = $(this).closest('.team-member-item'),
                    $parent = $that.closest('.la-team-member').find('>.member-info-09');
                $parent.html($that.find('.item--info').html());
                $('.vc_progress_bar', $parent).trigger('la_event:vc_progress_bar');
            });
            $('.team-member-loop.loop-style-9 .slick-current .item--image > a').trigger('click');
            $('.team-member-loop.loop-style-9').on('afterChange', function(e,slick,currentSlide){
                slick.$slides.eq(currentSlide).find('.item--image > a').trigger('click');
            });
        }
    }

    la_studio.theme = {
        ajax_loader : function(){
            $('.elm-ajax-loader').appear();
            $document
                .on('la_event_ajax_load', '.elm-ajax-loader', function(e){
                    if($(this).hasClass('is-loading') || $(this).hasClass('has-loaded')){
                        return;
                    }
                    var $this = $(this),
                        query = $this.data('query-settings'),
                        request_url = $this.data('request'),
                        nonce = $this.data('public-nonce'),
                        requestData = {
                            action : 'get_shortcode_loader_by_ajax',
                            tag : query.tag,
                            data : query,
                            _vcnonce : nonce
                        };

                    $this.addClass('is-loading');

                    $.ajax({
                        url : request_url,
                        method: "POST",
                        dataType: "html",
                        data : requestData
                    }).done(function(data){
                        var $data = $(data);
                        $document.trigger('la_event_ajax_load:before_render',[$this,$data]);
                        $this.removeClass('is-loading');
                        $this.addClass('has-loaded');
                        $data.addClass('fadeIn animated');
                        $data.appendTo($this);
                        $document.trigger('la_event_ajax_load:after_render',[$this,$data]);
                    });
                })
                .on('la_event_ajax_load:after_render',function( e, $wrap, $data ){
                    var $slider = $wrap.find('.la-slick-slider'),
                        $isotope = $wrap.find('.la-isotope-container'),
                        $isotope_filter = $wrap.find('.la-isotope-filter-container');
                    if($slider.length){
                        $slider.trigger('la_event_init_carousel')
                    }
                    if($isotope.length){
                        $isotope.trigger('la_event_init_isotope');
                    }
                    if($isotope_filter.length){
                        $isotope_filter.trigger('la_event_init_isotope_filter')
                    }
                    la_studio.shortcodes.fix_parallax_row();
                    $window.trigger('resize');
                })
                .on('appear', '.elm-ajax-loader', function( e ){
                    $(this).trigger('la_event_ajax_load');
                })
                .on('click', '.elm-loadmore-ajax', function(e){
                    e.preventDefault();
                    if($(this).hasClass('is-loading')){
                        return;
                    }
                    var $this = $(this),
                        $container = $($this.data('container')),
                        elem = $this.data('item-class'),
                        query = $this.data('query-settings'),
                        request_url = $this.data('request'),
                        nonce = $this.data('public-nonce'),
                        paged = parseInt($this.data('paged')),
                        max_page = parseInt($this.data('max-page')),
                        requestData;
                    if(paged < max_page){
                        query.atts.paged = paged + 1;
                        requestData = {
                            action : 'get_shortcode_loader_by_ajax',
                            tag : query.tag,
                            data : query,
                            _vcnonce : nonce
                        };
                        $this.addClass('is-loading');
                        $.ajax({
                            url : request_url,
                            method: "POST",
                            dataType: "html",
                            data : requestData
                        }).done(function(data){
                            var $data = $(data).find(elem);
                            $data.imagesLoaded(function() {
                                if($container.data('slider_config')){
                                    $container.slick('slickAdd', $data);
                                    $container.slick('setPosition');
                                }else if( $container.data('isotope') ){
                                    $container.isotope('insert', $data);
                                    setTimeout(function(){
                                        $container.isotope('layout');
                                    },300)
                                }else{
                                    $data.appendTo($container);
                                }
                                if($data.find('.la-slick-slider').length){
                                    setTimeout(function(){
                                        $data.find('.la-slick-slider').trigger('la_event_init_carousel');
                                    }, 350);
                                }
                                $this.data('paged', paged + 1);
                                $this.removeClass('is-loading');
                                if( max_page === paged + 1 ){
                                    $this.addClass('hide');
                                }
                            });
                        });
                    }
                })
                .on('click', '.elm-pagination-ajax a', function(e){
                    e.preventDefault();
                    if($(this).closest('.elm-pagination-ajax').hasClass('is-loading')){
                        return;
                    }
                    var $this = $(this),
                        $parent = $this.closest('.elm-pagination-ajax'),
                        $container = $($parent.data('container')),
                        elem = $parent.data('item-class'),
                        query = $parent.data('query-settings'),
                        request_url = $parent.data('request'),
                        nonce = $parent.data('public-nonce'),
                        paged = parseInt(getParameterByName('la_paged', $this.attr('href'))),
                        appendType = $parent.data('append-type'),
                        requestData;
                    if(paged > 0){
                        query.atts.paged = paged;
                        requestData = {
                            action : 'get_shortcode_loader_by_ajax',
                            tag : query.tag,
                            data : query,
                            _vcnonce : nonce
                        };
                        $parent.addClass('is-loading');
                        $.ajax({
                            url : request_url,
                            method: "POST",
                            dataType: "html",
                            data : requestData
                        }).done(function(data){
                            var $data = $(data).find(elem);
                            $data.imagesLoaded(function() {
                                if( $container.data('isotope') ){
                                    $container.isotope('remove', $container.isotope('getItemElements'));
                                    $container.isotope('insert', $data);
                                    setTimeout(function(){
                                        $container.isotope('layout');
                                    },300)
                                }else{
                                    $data.addClass('fadeIn animated');
                                    $data.appendTo($container.empty());
                                }
                                if($data.find('.la-slick-slider').length){
                                    setTimeout(function(){
                                        $data.find('.la-slick-slider').trigger('la_event_init_carousel');
                                    }, 350);
                                }
                                $parent.removeClass('is-loading');
                            });
                            $parent.find('.la-pagination').html($(data).find('.la-pagination').html());
                        });
                    }
                });
        },
        mega_menu : function(){

            function fix_megamenu_position( $elem, containerClass, container_width, isVerticalMenu) {
                if($('.megamenu-inited', $elem).length){
                    return false;
                }

                var $popup = $('> .popup', $elem);

                if ($popup.length == 0) return;
                var megamenu_width = $popup.outerWidth();

                if (megamenu_width > container_width) {
                    megamenu_width = container_width;
                }
                if (!isVerticalMenu) {
                    var $container = $(containerClass),
                        container_padding_left = parseInt($container.css('padding-left')),
                        container_padding_right = parseInt($container.css('padding-right')),
                        parent_width = $popup.parent().outerWidth(),
                        left = 0,
                        container_offset = la_studio.helps.getOffset($container),
                        megamenu_offset = la_studio.helps.getOffset($popup);

                    if (megamenu_width > parent_width) {
                        left = -(megamenu_width - parent_width) / 2;
                    }else{
                        left = 0
                    }

                    if ((megamenu_offset.x - container_offset.x - container_padding_left + left) < 0) {
                        left = -(megamenu_offset.x - container_offset.x - container_padding_left);
                    }
                    if ((megamenu_offset.x + megamenu_width + left) > (container_offset.x + $container.outerWidth() - container_padding_right)) {
                        left -= (megamenu_offset.x + megamenu_width + left) - (container_offset.x + $container.outerWidth() - container_padding_right);
                    }
                    $popup.css('left', left).css('left');
                }

                if (isVerticalMenu) {
                    var clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
                        itemOffset = $popup.offset(),
                        itemHeight = $popup.outerHeight(),
                        scrollTop = $window.scrollTop();
                    if (itemOffset.top - scrollTop + itemHeight > clientHeight) {
                        $popup.css({top: clientHeight - itemOffset.top + scrollTop - itemHeight - 20});
                    }
                }

                $popup.addClass('megamenu-inited');
            }

            var $megamenu = $('.mega-menu'),
                $mobile_nav = $('#la_mobile_nav');

            $document.on('click', '.toggle-category-menu', function(){
                $(this).next().slideToggle();
            });
            $document.on('la_reset_megamenu', '.mega-menu', function(){
                var _that = $(this),
                    containerClass = _that.parent().attr('data-container'),
                    parentContainerClass = _that.parent().attr('data-parent-container'),
                    isVerticalMenu = _that.hasClass('isVerticalMenu'),
                    container_width = $(containerClass).width();

                if(isVerticalMenu){
                    container_width = ( parentContainerClass ? $(parentContainerClass).width() : $window.width() )  -  $(containerClass).outerWidth();
                }

                $('li.mm-popup-wide > .popup', _that).removeAttr('style');

                $('li.mm-popup-wide .megamenu-inited', _that).removeClass('megamenu-inited');

                $('li.mm-popup-wide', _that).each(function(){
                    var $menu_item = $(this),
                        $popup = $('> .popup', $menu_item),
                        $inner_popup = $('> .popup > .inner', $menu_item),
                        item_max_width = parseInt($inner_popup.css('maxWidth')),
                        default_width = 1170;

                    if(container_width < default_width){
                        default_width = container_width;
                    }
                    if(default_width > item_max_width){
                        default_width = item_max_width;
                    }

                    var new_megamenu_width = default_width - parseInt($inner_popup.css('padding-left')) - parseInt($inner_popup.css('padding-right')),
                        _tmp = $menu_item.attr('class').match(/mm-popup-column-(\d)/),
                        columns = _tmp && _tmp[1] || 4;

                    $('> ul > li', $inner_popup).each(function(){
                        var _col = parseFloat($(this).data('column')) || 1;
                        if(_col < 0) _col = 1;
                        var column_width = parseFloat( (new_megamenu_width / columns) * _col);
                        $(this).data('old-width', $(this).width()).css('width', column_width);
                    });

                    $popup.width(default_width);

                    fix_megamenu_position( $menu_item, containerClass, container_width, isVerticalMenu);

                });

            });

            $megamenu.trigger('la_reset_megamenu');

            $window.on('resize', function(){
                $megamenu.trigger('la_reset_megamenu');
            });

            var $primary_menu = $('.main-menu').clone();

            $primary_menu.find('.mm-menu-block').remove();
            $primary_menu.find('.sub-menu').addClass('dl-submenu').removeAttr('style');
            $primary_menu.find('.mm-item-level-0').each(function(){
                var _that = $(this);
                if($('>.popup', _that).length){
                    var $submenu = _that.find('> .popup > .inner > .sub-menu').clone();
                    _that.find('> .popup').remove();
                    $submenu.find('li').removeAttr('style data-column');
                    $submenu.appendTo(_that);
                }
            });
            $primary_menu.removeAttr('id class').attr('class', 'dl-menu dl-menuopen').appendTo($mobile_nav);
            $mobile_nav.dlmenu({
                backtext: cosy_configs.text.backtext,
                animationClasses : {
                    classin : 'dl-animate-in-2',
                    classout : 'dl-animate-out-2'
                }
            });

            var $header5_menu = $('.header5-nav .main-menu');
            $('.sub-menu', $header5_menu).addClass('dl-submenu');
            $header5_menu.removeAttr('id class').attr('class', 'dl-menu dl-menuopen');
            $('.header5-nav').dlmenu({
                animationClasses : {
                    classin : 'dl-animate-in-2',
                    classout : 'dl-animate-out-2'
                }
            });
        },
        accordion_menu : function(){
            var $sidebar_inner =  $('.sidebar-inner');
            $('.widget_pages > ul, .widget_archive > ul, .widget_categories > ul, .widget_product_categories > ul', $sidebar_inner).addClass('menu').closest('.widget').addClass('accordion-menu');
            $('.widget_nav_menu', $sidebar_inner).closest('.widget').addClass('accordion-menu');
            $('.widget_categories > ul li.cat-parent,.widget_product_categories li.cat-parent', $sidebar_inner).addClass('mm-item-has-sub');

            $('.menu li > ul').each(function(){
                var $ul = $(this);
                $ul.before('<span class="narrow"><i></i></span>');
            });

            $document.on('click','.accordion-menu li.menu-item-has-children > a,.menu li.mm-item-has-sub > a,.menu li > .narrow',function(e){
                e.preventDefault();
                var $parent = $(this).parent();
                if ($parent.hasClass('open')) {
                    $parent.removeClass('open');
                    $parent.find('>ul').stop().slideUp();
                } else {
                    $parent.addClass('open');
                    $parent.find('>ul').stop().slideDown();
                    $parent.siblings().removeClass('open').find('>ul').stop().slideUp();
                }
            });
        },

        headerSidebar: function(){
            $masthead_aside_inner.stick_in_parent({
                offset_top: la_studio.helps.getAdminbarHeight()
            });
            $window.on('resize', function(){
                if($masthead_aside_inner.length){
                    setTimeout(function(){
                        $body.trigger("sticky_kit:recalc");
                    },300);
                }
            })
        },
        header_sticky : function(){

            if(!$body.hasClass('enable-header-sticky')) return;

            var lastScrollTop = 0,
                $header_sticky_fallback = $('.la-header-sticky-height');

            $window.on('resize', function(e){
                //$masthead.height('auto');
                delete window['latest_height'];
            });

            $window.on('load scroll', function(e){
                if($body.hasClass('la-enable-fullpage')){
                    return;
                }
                var scrollTop = $window.scrollTop(),
                    header_offset = la_studio.helps.getOffset($masthead),
                    header_offset_y = header_offset.y;

                if(typeof window['latest_height'] === 'undefined'){
                    $header_sticky_fallback.height($masthead.height()).hide();
                    window['latest_height'] = $masthead.height();
                }
                //if($window.width() > 991 && scrollTop > window['latest_height'] + header_offset_y){
                if($window.width() > 991 && scrollTop > header_offset_y + window['latest_height']){
                    if(!$masthead.hasClass('is-sticky')){
                        window['latest_height'] = $masthead.height();
                        //$masthead.height($masthead.height());
                        $header_sticky_fallback.height($masthead.height()).show();
                        $masthead.addClass('is-sticky');
                        $masthead_inner.css('top',la_studio.helps.getAdminbarHeight());
                    }
                    if(scrollTop < $('#page.site').height() && scrollTop < lastScrollTop){
                        $masthead_inner.removeClass('sticky--unpinned').addClass('sticky--pinned');
                    }else{
                        $masthead_inner.removeClass('sticky--pinned').addClass('sticky--unpinned');
                    }
                }else{
                    if($masthead.hasClass('is-sticky')){
                        $masthead.removeClass('is-sticky');
                        $masthead_inner.css('top','0').removeClass('sticky--pinned sticky--unpinned');
                        //window['latest_height'] = $masthead.height('auto').height();
                        $header_sticky_fallback.hide().height($masthead.height());
                        window['latest_height'] = $masthead.height();
                    }
                }
                lastScrollTop = scrollTop;
            });
        },
        auto_popup : function(){
            $('.la-popup:not(.wpb_single_image), .banner-video .banner--link-overlay, .la-popup.wpb_single_image a,.la-popup-slideshow').lightcase({
                showTitle: false,
                showCaption: false,
                maxWidth: $window.width(),
                maxHeight: $window.height(),
                iframe:{
                    width:1280,
                    height:720
                }
            });
        },
        auto_carousel : function(){
            $document.on('la_event_init_carousel','.la-slick-slider, .la-carousel-for-products ul.products',function(e){
                var $this = $(this),
                    slider_config = $this.data('slider_config') || {};
                $this.slick($.extend({
                    prevArrow: '<button type="button" class="slick-prev"><i class="cosy-icon-arrows-minimal-left"></i></button>',
                    nextArrow: '<button type="button" class="slick-next"><i class="cosy-icon-arrows-minimal-right"></i></button>',
                    adaptiveHeight: true,
                    rtl: la_studio.helps.is_rtl
                }, slider_config));
            });
            $('.la-slick-slider,.la-carousel-for-products ul.products').trigger('la_event_init_carousel');
        },
        init_isotope  : function(){
            $document
                .on( 'la_event_init_isotope', '.la-isotope-container', function(e){
                    var $this           = $(this),
                        item_selector   = $(this).data('item_selector'),
                        callback        = ( $this.data('callback') || false ),
                        configs         = ( $this.data('config_isotope') || {} );
                    if ($().isotope) {
                        $this.find('.la-isotope-loading').show();
                        configs = $.extend({
                            percentPosition: true,
                            itemSelector : item_selector,
                            layoutMode: 'packery'
                        },configs);
                        $this.isotope(configs);
                        $this.imagesLoaded(function() {
                            $this.isotope('layout').find('.la-isotope-loading').hide();
                        });
                    }
                })
                .on( 'la_event_init_isotope_filter', '.la-isotope-filter-container', function(e){
                    var $this = $(this),
                        options = ($this.data('isotope_option') || {}),
                        $isotope = $($this.data('isotope_container'));

                    $this.find('li').on('click', function c(e) {
                        e.preventDefault();
                        var selector = $(this).attr('data-filter');
                        $this.find('.active').removeClass('active');

                        if (selector != '*')
                            selector = '.' + selector;
                        if ($isotope){
                            $isotope.isotope(
                                $.extend(options,{
                                    filter: selector
                                })
                            );
                        }
                        $(this).addClass('active');
                        $this.find('.la-toggle-filter').removeClass('active').text($(this).text());
                    })
                })
                .on('click', '.la-toggle-filter', function(e){
                    e.preventDefault();
                    $(this).toggleClass('active');
                });

            $('.la-isotope-container').trigger('la_event_init_isotope');
            $('.la-isotope-filter-container').trigger('la_event_init_isotope_filter');

        },
        init_infinite : function(){


            $document.on('la_event_init_infinite', '.la-infinite-container', function(){
                var $this           = $(this),
                    itemSelector    = $this.data('item_selector'),
                    curr_page       = $this.data('page_num'),
                    page_path       = $this.data('path'),
                    max_page        = $this.data('page_num_max');

                var default_options =  {
                    navSelector  : ".la-pagination",
                    nextSelector : ".la-pagination a.next",
                    loading      : {
                        finished: function(){
                            $('.la-infinite-loading', $this).remove();
                        },
                        msg: $("<div class='la-infinite-loading'><div class='la-loader spinner3'><div class='dot1'></div><div class='dot2'></div><div class='bounce1'></div><div class='bounce2'></div><div class='bounce3'></div></div></div>")
                    }
                };
                $this.parent().append('<div class="la-infinite-container-flag"></div>');
                default_options = $.extend( default_options, {
                    itemSelector : itemSelector,
                    state : {
                        currPage: curr_page
                    },
                    pathParse : function(a, b) {
                        return [page_path, '/'];
                    },
                    maxPage : max_page
                });
                $this.infinitescroll(
                    default_options,
                    function(data) {
                        var $data = $(data);
                        $('.la-slick-slider,.la-carousel-for-products ul.products', $data).trigger('la_event_init_carousel');
                        if( $this.data('isotope') ){
                            $this.append( $data )
                                .isotope( 'appended', $data )
                                .isotope('layout');
                        }else{
                            $data.each(function(idx){
                                if(idx == 0){
                                    idx = 1;
                                }
                                $(this).css({
                                    'animation-delay': (idx * 100) + 'ms',
                                    '-webkit-animation-delay': (idx * 100) + 'ms'
                                });
                            });
                            $data.addClass('fadeInUp animated');
                        }

                        $('.la-infinite-loading', $this).remove();

                        if($('.la-infinite-container-flag', $this.parent()).length){
                            var $offset = getOffset($('.la-infinite-container-flag', $this.parent())[0]);
                            if($offset.y < window.innerHeight){
                                $this.infinitescroll('retrieve');
                            }
                        }
                    }
                );
                if($('.la-infinite-container-flag', $this.parent()).length){
                    var $offset = getOffset($('.la-infinite-container-flag', $this.parent())[0]);
                    if($offset.y < window.innerHeight){
                        $this.infinitescroll('retrieve');
                    }
                }
            });

            $('.la-infinite-container').trigger('la_event_init_infinite');
        },
        scrollToTop : function(){
            $window.on('load scroll', function(){
                if($window.scrollTop() > $window.height() + 100){
                    $('.backtotop-container').addClass('show');
                }else{
                    $('.backtotop-container').removeClass('show');
                }
            })
            $document.on('click', '.btn-backtotop', function(e){
                e.preventDefault();
                $htmlbody.animate({
                    scrollTop: 0
                }, 800)
            })
        },
        css_animation : function(){
            $('.la-animation').each(function(){
                var delay = $(this).attr('data-animation-delay');
                 if(delay){
                     $(this).css({
                         "-webkit-animation-delay": delay,
                         "animation-delay": delay
                     });
                 }
            });
            if( "undefined" != typeof $.fn.waypoint ){
                $('.la-animation:not(.wpb_start_animation)').waypoint(function(){
                    $(this).addClass($(this).data('animation-class'));
                }, {offset: "85%"} )
            }
        },
        extra_func : function(){
            $document
                .on('click','.wc-view-toggle span',function(){
                    var _this = $(this),
                        _mode = _this.data('view_mode');
                    if(!_this.hasClass('active')){
                        $('.wc-view-toggle span').removeClass('active');
                        _this.addClass('active');
                        $('.page-content').find('ul.products').removeClass('products-grid').removeClass('products-list').addClass('products-'+_mode);
                        Cookies.set('cosy_wc_catalog_view_mode', _mode, { expires: 30 });
                    }
                })
                .on('click','.quantity .desc-qty',function(e){
                    e.preventDefault();
                    var $qty = $(this).closest('.quantity').find('.qty'),
                        min_val = 0,
                        max_val = 0,
                        default_val = 1,
                        old_val = parseInt($qty.val());
                    if( $qty.attr('min') )  min_val = parseInt( $qty.attr('min') );
                    if( $qty.attr('max') )  max_val = parseInt( $qty.attr('max') );
                    if( min_val ) default_val = min_val;
                    if( max_val > 0 ) default_val = max_val;
                    if( max_val ){
                        $qty.val( (old_val && max_val > old_val) ? old_val + 1 : default_val);
                    }else{
                        $qty.val( (old_val) ? old_val + 1 : default_val);
                    }
                })
                .on('click','.quantity .inc-qty',function(e){
                    e.preventDefault();
                    var $qty = $(this).closest('.quantity').find('.qty'),
                        min_val = 0,
                        old_val = parseInt($qty.val());
                    if( $qty.attr('min') )  min_val = parseInt( $qty.attr('min') );
                    $qty.val((old_val > 0 && old_val > min_val) ? old_val - 1 : min_val);
                })
                .on('click', '.popup-button-continue', function(e){
                    e.preventDefault();
                    lightcase.close();
                })
                .on('click', '.btn-aside-toggle', function(e){
                    e.preventDefault();
                    $body.toggleClass('open-header-aside');
                })
                .on('click', '.header-toggle-search', function(e){
                    e.preventDefault();
                    $body.addClass('open-search-form');
                    $('.searchform-fly .search-field').removeAttr('placeholder','')
                    setTimeout(function(){
                        $('.searchform-fly .search-field').focus();
                    }, 600);
                })
                .on('click', '.btn-close-search', function(e){
                    e.preventDefault();
                    $body.removeClass('open-search-form');
                })
                .on('click', '.la-overlay-global,.header-aside-overlay,.btn-close-sidebarfilter', function(e){
                    e.preventDefault();
                    $body.removeClass('open-aside open-search-form open-mobile-menu open-widget-filter open-header-aside');
                })
                .on('click', '.btn-mobile-menu-trigger', function(e){
                    e.preventDefault();
                    $(this).toggleClass('active');
                    $body.toggleClass('open-mobile-menu');
                })
                .on('click', '.shop-filter-toggle', function(e){
                    e.preventDefault();
                    $body.toggleClass('open-widget-filter');
                });

            if($window.width() > 992 && $window.width() < 1200 && $masthead_aside.find('.la-sticky-sidebar').length){
                $masthead_aside.find('.la-sticky-sidebar').css('position', 'static');
            }

            $('.wpcf7-form-control-wrap + i').each(function(){
               $(this).appendTo($(this).prev());
            });

            $('.append-css-to-head').each(function(){
                addStyleSheet( $(this).text() );
            });
            $body.data('header-transparency', ($body.hasClass('enable-header-transparency') || $body.hasClass('enable-header7-transparency')));
        }
    }

    la_studio.woocommerce = {
        ProductZoom : function(_images, _thumbs, _vertical){

            var $images, $thumbs, enable_zoom, enable_popup, zoom_type;
            var vertical = (_vertical || false);
            $images =  _images || $('.product-main-image .product--large-image');
            $thumbs = _thumbs || $('.product-main-image .product--thumbnails');
            enable_zoom = ($images.data('zoom') == 1 ? true : false);
            zoom_type = ($images.data('zoom_type') == 'lens' ? 'lens' : 'inner');

            if(enable_zoom){
                $images.easyZoom({
                    preventClicks: false
                });
                $document.on('click', '.easyzoom-flyout' , function(){
                    $(this).prev('a').trigger('click');
                });
            }

            var slick_option = {
                prevArrow: '<span class="slick-prev"><i class="fa fa-angle-left"></i></span>',
                nextArrow: '<span class="slick-next"><i class="fa fa-angle-right"></i></span>',
                slidesToShow: 4,
                vertical: vertical,
                rtl: la_studio.helps.is_rtl,
                responsive: [
                    {
                        breakpoint: 1200,
                        settings: {
                            slidesToShow: 3
                        }
                    },
                    {
                        breakpoint: 767,
                        settings: {
                            vertical: false
                        }
                    }
                ]
            };
            $thumbs.slick(slick_option);

            $thumbs.on('beforeChange', function(event, slick, currentSlide, nextSlide){
                var $current = slick.$slides.eq(nextSlide);
                try {
                    $images.data('easyZoom').swap(
                        $current.data('standard'),
                        $current.attr('href'),
                        ((!!$current.find('img').attr('srcset') && !!$images.find('img').attr('srcset')) ? $current.find('img').attr('srcset') : '')
                    )
                }catch (ex){
                    $images.find('a').attr('href',$current.attr('href')).find('img').removeAttr('sizes srcset').attr('src',$current.attr('data-standard'));
                }
            });
            $thumbs.on('click', 'a', function(e) {
                e.preventDefault();
                var $this = $(this),
                    $slick = $thumbs.slick('getSlick'),
                    currentSlide = $this.data('slickIndex');
                if($slick.$slides.length > 4){
                    $thumbs.slick('slickGoTo',currentSlide,false);
                }else{
                    $slick.$slides.removeClass('slick-current slick-center');
                    $this.addClass('slick-current slick-center');
                    try {
                        $images.data('easyZoom').swap(
                            $this.data('standard'),
                            $this.attr('href'),
                            ((!!$this.find('img').attr('srcset') && !!$images.find('img').attr('srcset')) ? $this.find('img').attr('srcset') : '')
                        )
                    }catch (ex){
                        $images.find('a').attr('href',$this.attr('href')).find('img').removeAttr('sizes srcset').attr('src',$this.attr('data-standard'));
                    }
                }
            });
        },
        ProductThumbnail: function(){
            $('.product-main-image .p---large').on('woocommerce_gallery_init_zoom', function(e){
                var api = $('.product--large-image', $(this)).data('easyZoom');
                try {
                    api.teardown();
                    api._init();
                }catch (ex){ }
            });
            $('.product-main-image .product--large-image a.zoom').unbind('click.prettyphoto');
            $(document.body).on('reset_image' ,'.variations_form', function(e){
                var api = $('.product-main-image .product--large-image').data('easyZoom');
                try {
                    api.teardown();
                    api._init();
                }catch (ex){

                }
            });
            if($('.product-main-image .product--thumbnails').length == 0){
                $('.product-main-image .p---large').addClass('no-thumbgallery');
            }
            la_studio.woocommerce.ProductZoom($('.la-p-single-wrap:not(.la-p-single-3) .product-main-image .product--large-image'),$('.la-p-single-wrap:not(.la-p-single-3) .product-main-image .product--thumbnails'),true);
        },
        ProductQuickView : function(){
            if($window.width() > 900){
                $document.on('click','.la-quickview-button',function(e){
                    e.preventDefault();
                    lightcase.start({
                        href: $(this).data('href'),
                        showSequenceInfo: false,
                        type: 'ajax',
                        maxWidth: $window.width(),
                        maxHeight: $window.height(),
                        iframe:{
                            width: $window.width(),
                            height: $window.height()
                        },
                        ajax: {
                            width: $window.width(),
                            height: $window.height()
                        },
                        onFinish: {
                            renderContent: function () {
                                var $popup = lightcase.get('case');
                                if ( typeof wc_add_to_cart_variation_params !== 'undefined' ) {
                                    $popup.find('.variations_form').wc_variation_form().find('.variations select:eq(0)').change();
                                }
                                la_studio.woocommerce.ProductZoom($popup.find('.product-main-image .product--large-image'), $popup.find('.product-main-image .product--thumbnails'), true);
                                setTimeout(function(){
                                    lightcase.resize();
                                },300);
                            }
                        }
                    })
                });
            }
        },
        ProductAddCart : function(){
            $document.on( 'adding_to_cart', function( e ){
                $('.header-toggle-cart > a > i').removeClass('cosy-icon-bag').addClass('fa-spinner fa-spin');
            });
            $document.on( 'added_to_cart', function( e, fragments, cart_hash, $button ){
                var $product_image = $button.closest('.product').find('.product--thumbnail img:eq(0)'),
                    target_attribute = $body.is('.woocommerce-yith-compare') ? ' target="_parent"' : '',
                    product_name = 'Product';

                if ( !!$button.data('product_title')){
                    product_name = $button.data('product_title');
                }
                var html = '<div class="popup-added-msg">';
                if ($product_image.length){
                    html += $('<div>').append($product_image.clone()).html();
                }
                html += '<div class="popup-message"><strong class="text-color-heading">'+ product_name +' </strong>' + cosy_configs.addcart.success + '</div>';
                html += '<a rel="nofollow" class="btn btn-secondary view-popup-addcart" ' + target_attribute + ' href="' + wc_add_to_cart_params.cart_url + '">' + wc_add_to_cart_params.i18n_view_cart + '</a>';
                html += '<a class="btn popup-button-continue" rel="nofollow" href="#">'+ cosy_configs.global.continue_shopping + '</a>';
                html += '</div>';
                $('.header-toggle-cart > a > i').removeClass('fa-spinner fa-spin').addClass('cosy-icon-bag');
                showMessageBox(html);
            } );
            $('.la-global-message').on('click','.popup-button-continue',function(e){
                e.preventDefault();
                $('.la-global-message .close-message').trigger('click');
            })
        },
        ProductAddCompare : function(){
            $document.on('click','.view-popup-compare', function(e){
                e.preventDefault();
                $body.trigger('yith_woocompare_open_popup', { response: addQueryArg('action', yith_woocompare.actionview) + '&iframe=true' });
            });
            $document.on( 'click', '.product a.add_compare', function(e){
                e.preventDefault();
                var $button     = $(this),
                    widget_list = $('.yith-woocompare-widget ul.products-list'),
                    $product_image = $button.closest('.product').find('.product--thumbnail img:eq(0)'),
                    data        = {
                        action: yith_woocompare.actionadd,
                        id: $button.data('product_id'),
                        context: 'frontend'
                    },
                    product_name = 'Product';
                if(!!$button.data('product_title')){
                    product_name = $button.data('product_title');
                }

                $.ajax({
                    type: 'post',
                    url: yith_woocompare.ajaxurl.toString().replace( '%%endpoint%%', yith_woocompare.actionadd ),
                    data: data,
                    dataType: 'json',
                    beforeSend: function(){
                        $button.addClass('loading');
                    },
                    complete: function(){
                        $button.removeClass('loading').addClass('added');
                    },
                    success: function(response){
                        if( typeof $.fn.block != 'undefined' ) {
                            widget_list.unblock()
                        }
                        var html = '<div class="popup-added-msg">';
                        if ($product_image.length){
                            html += $('<div>').append($product_image.clone()).html();
                        }
                        html += '<div class="popup-message"><strong class="text-color-heading">'+ product_name +' </strong>' + cosy_configs.compare.success + '</div>';
                        html += '<a class="btn btn-secondary view-popup-compare" rel="nofollow" href="'+response.table_url+'">'+cosy_configs.compare.view+'</a>';
                        html += '<a class="btn popup-button-continue" href="#" rel="nofollow">'+ cosy_configs.global.continue_shopping + '</a>';
                        html += '</div>';

                        showMessageBox(html);

                        widget_list.unblock().html( response.widget_table );
                    }
                });
            });
        },
        ProductAddWishlist : function(){
            $document.on('click','.product a.add_wishlist',function(e){
                if(!$(this).hasClass('added')) {
                    e.preventDefault();
                    var $button     = $(this),
                        product_id = $button.data( 'product_id' ),
                        $product_image = $button.closest('.product').find('.product--thumbnail img:eq(0)'),
                        product_name = 'Product',
                        data = {
                            add_to_wishlist: product_id,
                            product_type: $button.data( 'product-type' ),
                            action: yith_wcwl_l10n.actions.add_to_wishlist_action,
                            context: 'frontend',
                            nonce: yith_wcwl_l10n.nonce.add_to_wishlist_nonce
                        };

                    if($button.closest('.la-custom-pright').length){
                        $product_image = $button.closest('.product').find('.product-main-image .woocommerce-product-gallery__image img:eq(0)');
                    }

                    if (!!$button.data('product_title')) {
                        product_name = $button.data('product_title');
                    }
                    try {
                        if (yith_wcwl_l10n.multi_wishlist && yith_wcwl_l10n.is_user_logged_in) {
                            var wishlist_popup_container = $button.parents('.yith-wcwl-popup-footer').prev('.yith-wcwl-popup-content'),
                                wishlist_popup_select = wishlist_popup_container.find('.wishlist-select'),
                                wishlist_popup_name = wishlist_popup_container.find('.wishlist-name'),
                                wishlist_popup_visibility = wishlist_popup_container.find('.wishlist-visibility');

                            data.wishlist_id = wishlist_popup_select.val();
                            data.wishlist_name = wishlist_popup_name.val();
                            data.wishlist_visibility = wishlist_popup_visibility.val();
                        }

                        if (!isCookieEnable()) {
                            alert(yith_wcwl_l10n.labels.cookie_disabled);
                            return;
                        }

                        $.ajax({
                            type: 'POST',
                            url: yith_wcwl_l10n.ajax_url,
                            data: data,
                            dataType: 'json',
                            beforeSend: function () {
                                $button.addClass('loading');
                            },
                            complete: function () {
                                $button.removeClass('loading').addClass('added');
                            },
                            success: function (response) {
                                var msg = $('#yith-wcwl-popup-message'),
                                    response_result = response.result,
                                    response_message = response.message;

                                if (yith_wcwl_l10n.multi_wishlist && yith_wcwl_l10n.is_user_logged_in) {
                                    var wishlist_select = $('select.wishlist-select');
                                    if (typeof $.prettyPhoto != 'undefined') {
                                        $.prettyPhoto.close();
                                    }
                                    wishlist_select.each(function (index) {
                                        var t = $(this),
                                            wishlist_options = t.find('option');
                                        wishlist_options = wishlist_options.slice(1, wishlist_options.length - 1);
                                        wishlist_options.remove();

                                        if (typeof( response.user_wishlists ) != 'undefined') {
                                            var i = 0;
                                            for (i in response.user_wishlists) {
                                                if (response.user_wishlists[i].is_default != "1") {
                                                    $('<option>')
                                                        .val(response.user_wishlists[i].ID)
                                                        .html(response.user_wishlists[i].wishlist_name)
                                                        .insertBefore(t.find('option:last-child'))
                                                }
                                            }
                                        }
                                    });

                                }
                                var html = '<div class="popup-added-msg">';
                                if (response_result == 'true') {
                                    if ($product_image.length){
                                        html += $('<div>').append($product_image.clone()).html();
                                    }
                                    html += '<div class="popup-message"><strong class="text-color-heading">'+ product_name +' </strong>' + cosy_configs.wishlist.success + '</div>';
                                }else {
                                    html += '<div class="popup-message">' + response_message + '</div>';
                                }
                                html += '<a class="btn btn-secondary view-popup-wishlish" rel="nofollow" href="' + response.wishlist_url.replace('/view', '') + '">' + cosy_configs.wishlist.view + '</a>';
                                html += '<a class="btn popup-button-continue" rel="nofollow" href="#">' + cosy_configs.global.continue_shopping + '</a>';
                                html += '</div>';

                                showMessageBox(html);
                                $button.attr('href',response.wishlist_url);
                                $body.trigger('added_to_wishlist');
                            }
                        });
                    } catch (ex) {
                        la_studio.helps.log(ex);
                    }
                }
            })
        },
        ProductSticky: function(){
            $('.la-single-product-page .la-custom-pright').stick_in_parent({
                parent: $('.la-single-product-page'),
                offset_top: $masthead_inner.height()
            });

            $document.on('click', '.la-p-single-wrap .wc-tab .wc-tab-title a', function(e){
                e.preventDefault();
                $(this).closest('.wc-tab').toggleClass('active').siblings().removeClass('active');
                $body.trigger("sticky_kit:recalc");
            });
            $('.woocommerce-Tabs-panel--description').addClass('active');
        }
    }

    la_studio.theme.for_demo = function(){
        $('.main-02-collection-slider').slick({
            infinite: true,
            autoplay: true,
            slidesToShow: 2,
            slidesToScroll: 2,
            dots: true,
            centerMode: true,
            arrows: false,
            centerPadding: '20%',
            autoplaySpeed: 5000,
            rtl: la_studio.helps.is_rtl,
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        centerPadding: '5%',
                        slidesToShow: 2
                    }
                },
                {
                    breakpoint: 768,
                    settings: {
                        centerPadding: '0px',
                        slidesToShow: 1
                    }
                },
                {
                    breakpoint: 400,
                    settings: {
                        centerPadding: '0px',
                        slidesToShow: 1
                    }
                }
            ]
        });

        var $flower_gallery = $('.grid-image-masonry .wpb_wrapper:not(.vc_figure)')
        $flower_gallery.isotope({
            percentPosition: true,
            itemSelector : '.wpb_single_image',
            layoutMode: 'packery'
        });
        $flower_gallery.imagesLoaded(function() {
            $flower_gallery.isotope('layout');
        });

        $('.header-v5 #masthead_aside').mouseover(function(){
            $body.addClass('open-header-aside');
        })
    }

    $(function(){
        la_studio.shortcodes.fullpage();

        la_studio.theme.ajax_loader();
        la_studio.theme.mega_menu();
        la_studio.theme.accordion_menu();
        la_studio.theme.header_sticky();
        la_studio.theme.headerSidebar();
        la_studio.theme.auto_popup();
        la_studio.theme.auto_carousel();
        la_studio.theme.init_isotope();
        la_studio.theme.init_infinite();
        la_studio.theme.scrollToTop();
        la_studio.theme.css_animation();

        la_studio.shortcodes.unit_responsive();
        la_studio.shortcodes.fix_parallax_row();
        la_studio.shortcodes.google_map();
        la_studio.shortcodes.counter();
        la_studio.shortcodes.fix_tabs();
        la_studio.shortcodes.countdown();
        la_studio.shortcodes.pie_chart();
        la_studio.shortcodes.progress_bar();
        la_studio.shortcodes.fix_row_fullwidth();
        la_studio.shortcodes.fix_rtl_row_fullwidth();

        la_studio.shortcodes.timeline();
        la_studio.shortcodes.team_member();

        la_studio.woocommerce.ProductThumbnail();
        la_studio.woocommerce.ProductQuickView();
        la_studio.woocommerce.ProductAddCart();
        la_studio.woocommerce.ProductAddCompare();
        la_studio.woocommerce.ProductAddWishlist();
        la_studio.woocommerce.ProductSticky();
        la_studio.theme.extra_func();

        la_studio.theme.for_demo();

    });
    setTimeout(function(){
        $body.removeClass('site-loading');
    }, 500);
    $window.load(function(){

        $body.removeClass('site-loading');

        la_studio.shortcodes.tweetsFeed();
        la_studio.shortcodes.instagramFeed();

        $('.la-testimonials.testimonial-3-with-thumb .la-slick-slider').each(function(){
            var _this = $(this),
               $thumb = $('<div/>',{
                   class: 'testimonial-3-nav'
               });
            $('.item--info', _this).each(function(){
                $(this).clone().wrapInner('<div class="inner--info2"></div>').appendTo($thumb);
            });
            $thumb.insertAfter(_this);
            _this.slick('slickSetOption', 'asNavFor', '#' + _this.parent().attr('id') + ' .testimonial-3-nav', true);
            _this.slick('slickSetOption', 'dots', false, true);
            _this.slick('slickSetOption', 'arrows', false, true);
            _this.addClass('loaded-thumb');
            $thumb.slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                asNavFor: "#" + _this.parent().attr('id') + ' .la-slick-slider',
                dots: false,
                focusOnSelect: true,
                centerMode: true,
                arrows: false,
                rtl: la_studio.helps.is_rtl,
                responsive: [
                    {
                        breakpoint: 1199,
                        settings: {
                            slidesToShow: 1,
                            centerMode: false
                        }
                    }
                ]
            })
        });

        function la_newsletter_popup(){
            var $newsletter_popup = $('#la_newsletter_popup');
            if($newsletter_popup.length){
                var show_on_mobile = $newsletter_popup.attr('data-show-mobile'),
                    p_delay = parseInt($newsletter_popup.attr('data-delay'));
                if( (show_on_mobile && $(window).width() < 767) ){
                    return;
                }
                try{
                    if(Cookies.get('cosy_dont_display_popup') == 'yes'){
                        return;
                    }
                }catch (ex){}

                setTimeout(function(){
                    lightcase.start({
                        href: '#',
                        maxWidth: parseInt(cosy_configs.popup.max_width),
                        maxHeight: parseInt(cosy_configs.popup.max_height),
                        inline: {
                            width : parseInt(cosy_configs.popup.max_width),
                            height : parseInt(cosy_configs.popup.max_height)
                        },
                        onInit : {
                            foo: function() {
                                $('body.lastudio-cosy').addClass('open-newsletter-popup');
                            }
                        },
                        onClose : {
                            qux: function() {
                                if($('.la-newsletter-popup #dont_show_popup').length && $('.la-newsletter-popup #dont_show_popup').is(':checked')){
                                    var backtime = parseInt($newsletter_popup.attr('data-back-time'));
                                    try {
                                        Cookies.set('cosy_dont_display_popup', 'yes', { expires: backtime, path: '/' });
                                    } catch (ex){}
                                }
                                $('body.lastudio-cosy').removeClass('open-newsletter-popup');
                            }
                        },
                        onFinish: {
                            injectContent: function () {
                                lightcase.get('contentInner').children().append($newsletter_popup);
                                $('.lightcase-icon-close').hide();
                                lightcase.resize();
                            }
                        }
                    });
                }, p_delay)
            }

            $(document).on('click', '.btn-close-newsletter-popup', function(e){
                e.preventDefault();
                lightcase.close();
            })
        }
        la_newsletter_popup();
    });
})(jQuery);

(function($) {
    "use strict";

    $.LaStudioHoverDir = function( selector ){
        this.$el = $(selector);
        this._init();
    };
    $.LaStudioHoverDir.prototype = {
        _init : function( ) {
            this._loadEvents();
        },
        _loadEvents : function() {
            var self = this;
            this.$el.on( 'mouseenter.hoverdir, mouseleave.hoverdir', function( event ) {
                var $el = $(this),
                    direction = self._getDir( $el, { x : event.pageX, y : event.pageY } ),
                    _cls = self._getClass( direction),
                    _prefix = ( event.type === 'mouseenter' ) ? 'in-' : 'out-';

                $el.removeClass('in-top in-left in-right in-bottom out-top out-left out-right out-bottom');
                $el.addClass(_prefix + _cls)
            })
        },
        _getDir : function( $el, coordinates ) {
            var w = $el.width(),
                h = $el.height(),
                x = ( coordinates.x - $el.offset().left - ( w/2 )) * ( w > h ? ( h/w ) : 1 ),
                y = ( coordinates.y - $el.offset().top  - ( h/2 )) * ( h > w ? ( w/h ) : 1 );
            return Math.round( ( ( ( Math.atan2(y, x) * (180 / Math.PI) ) + 180 ) / 90 ) + 3 ) % 4;
        },
        _getClass : function( direction ){
            var _cls;
            switch( direction ) {
                case 0:
                    _cls = 'top';
                    break;
                case 1:
                    _cls = 'right';
                    break;
                case 2:
                    _cls = 'bottom';
                    break;
                case 3:
                    _cls = 'left';
                    break;
            }
            return _cls;
        }
    };

    $.fn.lastudiohoverdir = function(){
        return new $.LaStudioHoverDir( this );
    };
    $(function(){
        $('.item-overlay-effect').lastudiohoverdir();
    });

})(jQuery);