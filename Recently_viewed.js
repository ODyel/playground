// Throughout this script there will be places marked as [MUST CHANGE]. Make sure you fill in the details accordingly.
// Other places have comments to inform you what kind of customizations you can potentially make there. Make sure you
// read through them.

// A full or trimmed jQuery must be included in the project.
var $ = optimizely.get('jquery');
var utils = optimizely.get('utils');
var recommender = optimizely.get('recommender');

// This boolean tells whether you are in the editor, so that you can special case if needed.
var editorMode = optimizely.state && optimizely.state.directives && optimizely.state.directives.isEditor;
console.log('test2');
var recommenderIds = {
  'co-browse': 8247323458,
  'co-buy': 8246610090,
  'popular-viewed': 8245282514,
  'popular-bought': 8242663073,
  'add-to-wishlist':8481215475,
  'user-based': 8478913454
};

var recommenderKey = {
  recommenderServiceId: 8249221955,
  recommenderId: recommenderIds[extension.algorithm]
};

function getTargetId() {
  // [MUST CHANGE]
  // Replace with actual code to retrieve the id of the target item to recommend for.
  // Can return either a Promise or a fullfilled value.
  if (extension.algorithm.startsWith('popular')) {
    return 'popular';
  }  else if (extension.algorithm.startsWith('user')) {
    return optimizely.get('visitor').visitorId;
  } else {
    return dataLayer.reduce(function(sku, d) { return typeof(sku) === 'string' ? sku : d.missguided_product_sku; }, 0);
  }
}

function getPageViews() {
	var behavior = optimizely.get('behavior');
 	return behavior.query({
 	version: '0.2',
 	filter: [{
     field: ['type'],
     value: 'pageview'
   },
   {
     field: ['name'],
     comparator: 'is',
     value: "product_page"
   }
 	],
 	sort: [{
   field: ['time'],
   direction: 'descending'
 	}]
	});
}

function canonicalize(reco) {
  // Uncomment the next line to log the reco to console to help you debug. Remember to comment it out afterwards.
  // console.log(reco);

  // This is where you perform any necessary cananicalization of the recos before rendering them.
  // In the example below, we convert numeric prices into string form, and treat missing in_stock values as true.
  if (reco.price) {
    reco.price = '$' + (reco.price / 100.0).toFixed(2);
  }

  if (typeof reco.in_stock === 'undefined') {
    reco.in_stock = true;
  }

  return reco;
}

function postFilter(reco) {
  
  // We change the image URL to use smaller sized images 
  reco.image = reco.image.replace("%24product-page__main--1x%24","%24category-page__grid--1x%24");
  
  // This is where you decide what to show and what to hide from the recos.
  return reco.title &&
    reco.image &&
    reco.url &&
    reco.price;
}

function fetchRecos(targetId) {
  if (editorMode && extension.example_json && extension.example_json.trim()) {
    console.log('Using example reco');

    var recos = [];
    for (var i = 0; i < 20; i++) {
      recos.push(JSON.parse(extension.example_json.trim()));
    }
    return recos;
  } else {
    var fetcher = recommender.getRecommendationsFetcher(recommenderKey, targetId, {
      canonicalize: canonicalize,
      postFilter: postFilter
    });
    return fetcher.next(extension.max);
  }
}

function renderRecos(recos) {
  console.log(recos);
  recos = recos.slice(0, extension.max);
  console.log(recos);
  if (recos.length === 0) {
    return;
  }

  
  var html = extension.$render({
    extension: extension,
    recos: recos,
  });
  
  utils.waitForElement(extension.selector).then(function(selectorElem) {
    // Inject the extension html onto the page.
    switch (extension.placement) {
      case 'before':
        $(selectorElem).before(html);
        break;
      case 'after':
        $(selectorElem).after(html);
        break;
      case 'prepend':
        $(selectorElem).prepend(html);
        break;
      case 'append':
        $(selectorElem).append(html);
        break;
      case 'replace-content':
        // Poor man's wrapInner(), which is excluded from trimmed jQuery.
        // This is to save the original content in a hidden div so that we can restore it in undo.js.
        var origHtml = $(selectorElem).html();
        $(selectorElem).empty().append(html).append(
          $('<div>')
            .attr('id', 'optimizely-extension-' + extension.$instance + '-orig')
            .hide()
            .append(origHtml)
        );
        break;
      default:
        throw new Error('Unknown placement ' + extension.placement);
    }
  }).then(function() {
    // This selector should select the anchor element around each reco.
    var recosSelector = '#optimizely-extension-' + extension.$instance + ' a.reco-link';

    $('.ui-carousel--related__items li, .optly-recommendations-scroller li').click(function () {
      optimizely.push({
        type: 'event',
        eventName: 'recommended_item_click'
      });
    });    
    
    if (screen.width < 768) { // mobile
      //jQuery(".reco-img-container:eq(1)").animate({height: '278px', width: '188px'});
      
      var current = jQuery(".reco-img-container:eq(1)").position().left;
			var target = (screen.width-60)/2 - (163/2);
			jQuery(".optly-recommendations-scroller").animate({scrollLeft:(current-target)},500);

      window.optly_reco_previous = jQuery(".reco-img-container:eq(1)");
      
      /*
      jQuery(".reco-img-container").click(function(e) {
        e.preventDefault();
        
        //jQuery(this).animate({height: '278px', width: '188px'});
        //jQuery(window.optly_reco_previous).animate({height: '246px', width: '165px'});
        
        var current = jQuery(this).position().left;
        var target = screen.width/2 - (188/2);
                
        if (current < target) {
          jQuery(".optly-recommendations-scroller").animate({scrollLeft:'+='+(current-target)},500);
        } else if (current > target) {
          jQuery(".optly-recommendations-scroller").animate({scrollLeft:'+='+(current-target-21)},500);
        }
        window.optly_reco_previous = $(this);
    	});
      */
    } else {
     	jQuery(".optly-reco-scroller-chevron-left").click(function(e) {e.preventDefault();jQuery(".optly-recommendations-scroller").animate({scrollLeft:'-=326'},500);});
      jQuery(".optly-reco-scroller-chevron-right").click(function(e) {e.preventDefault();jQuery(".optly-recommendations-scroller").animate({scrollLeft:'+=326'},500);});
    }
  });
}

if (recommender && extension.algorithm != "recently-viewed") {
  $(document).ready(function() {
    Promise.resolve(getTargetId())
      .then(fetchRecos)
      .then(renderRecos);
  });
}else if (extension.algorithm == "recently-viewed"){
  $(document).ready(function() {
    console.log("recently-viewed");
    console.log(getPageViews);
    var recent_pages = getPageViews();
    var recent_reco = [];
    for(i=0;i<recent_pages.length;i++){
		recent_reco.push(recent_pages[i].tags);
		}
    console.log(recent_reco);
    renderRecos(recent_reco);
  });
}