/**
* Seamap JQuery Plugin
*/
(function( $, window ){
	/**
	* *************************************************************************************
	* Default Options
	* *************************************************************************************
	*/
	var options = {
		contextMenuContainer : '#map_canvas .menu',
		startLat : 47.655,
		startLong : 9.205,
		zoom : 15,
		height : function() {
			return $(window).height() - $(".header-wrapper .navbar-fixed-top").height() - 20
		},
		polyOptions : {
			strokeColor: '#000000',
			strokeOpacity: 0.8,
			strokeWeight: 2
		},
		distancePolyOptions : {
			strokeColor: '#550000',
			strokeOpacity: 0.8,
			strokeWeight: 2
		},
		boatmarker : {
			crosshairShape : {
				coords:[0,0,0,0],
				type:'rect'
			},
			image : new google.maps.MarkerImage(
				'images/boat.png', 
				new google.maps.Size(32,32),	
				new google.maps.Point(0,0),	
				new google.maps.Point(16,16))	
		},
		crosshairmarker : {
			crosshairShape : {
				coords:[0,0,0,0],
				type:'rect'
			},
			image : new google.maps.MarkerImage(
				'http://www.daftlogic.com/images/cross-hairs.gif', 
				new google.maps.Size(19,19),	
				new google.maps.Point(0,0),	
				new google.maps.Point(8,8))	
		}
	};
	
	/**
	* *************************************************************************************
	* Seamap class
	* *************************************************************************************
	*/
	$.seamap = function(element){	
		var options = $.seamap.options;
	
		var States = {
			"NORMAL" : 0, 
			"ROUTE" : 1, 
			"DISTANCE" : 2
		},
		ContextMenuTypes = {
			"DEFAULT" : 0, 
			"DELETE_MARKER" : 1, 
			"DELETE_ROUTEMARKER" : 2
		};
		
		// maps
		var map = null;

		// crosshair marker
		var crosshairMarker = null;

		// boat marker
		var boatMarker = null;
		
		// routes
		var routeCounter = 1,
			routes = new Array(),
			activeRoute = null;

		// distance
		var distanceroute = null;
		
		// marker
		var markers = new Array();

		// editing states
		var state = States.NORMAL;

		// context-menu/selection
		var contextMenuType = ContextMenuTypes.DEFAULT,
			selectedMarker = null,
			contextMenuVisible = false;
	
		// bind our jquery element
		var $this = $(element);

		init();

		positionConnect();

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function init() {
			initMap();
			initOpenSeaMaps();
			initContextMenu();	
			initGoogleMapsListeners();	
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function initMap() {
			$this.append("<div class='seamapsidebar' style='float:left;width:0%;height:100%;' />")
				.append("<div class='seamapinner' style='width:100%;height:100%;right:0;' />");
			
			if(typeof options.height == 'function') {
				$this.height(options.height());
				
				$(window).resize(function(){
					$this.height(options.height());
				});
			} else {
				$this.height(options.height);
			}		
						
			map = new google.maps.Map($(".seamapinner", $this).get(0), {
				zoom: options.zoom,
				center: new google.maps.LatLng(options.startLat, options.startLong),
				mapTypeId: google.maps.MapTypeId.ROADMAP
			});
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function initOpenSeaMaps() {
			map.overlayMapTypes.push(new google.maps.ImageMapType({
				getTileUrl: function(coord, zoom) {
					return "http://tiles.openseamap.org/seamark/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
				},
				tileSize: new google.maps.Size(256, 256),
				name: "OpenSeaMap",
				maxZoom: 18
			}));
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function initContextMenu() {
			$this.append('<div id="tooltip_helper"></div>');

			$this.on("click", "#addMarker", handleAddMarker);
			$this.on("click", "#deleteMarker", handleDeleteMarker);
			
			$this.on("click", "#addNewRoute", handleAddNewRoute);
			/*$this.on("click", "#exitRouteCreation", handleExitRouteCreation);
			
			$this.on("click", "#addNewDistanceRoute", handleAddNewDistanceRoute);
			
			$this.on("click", "#setAsDestination", handleSetAsDestination);
			
			$this.on("click", "#hideContextMenu", handleHideContextMenu);
			
			$this.on("click", "#deleteMarker", handleDeleteMarker);
			$this.on("click", "#deleteRouteMarker", handleDeleteRouteMarker);
			$this.on("click", "#deleteDistanceMarker", handleDeleteDistanceMarker);*/
		}
				
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function initGoogleMapsListeners() {
			google.maps.event.addListener(map, 'center_changed', function() {
				/*updateLatLngInputs();
	
				if (crosshairMarker != null) {
					updateContextMenu(crosshairMarker.getPosition());
				}*/
			});
	
			google.maps.event.addListener(map, 'rightclick', function(event) {
				switch(state) {
					case States.NORMAL: 
						removeCrosshairMarker(crosshairMarker);
						setCrosshairMarker(event.latLng);
	
						showContextMenu(event.latLng, ContextMenuTypes.DEFAULT, crosshairMarker);
						break;
						
					case States.ROUTE:
						removeMarker(crosshairMarker);
						setCrosshairMarker(event.latLng);
	
						showContextMenu(event.latLng, ContextMenuTypes.DEFAULT, crosshairMarker);
						break;
						
					case States.DISTANCE:
						endDistance();
						break;
				}
			});
	
			google.maps.event.addListener(map, 'click', function(event) {
				switch(state) {
					case States.NORMAL: 
						removeCrosshairMarker(crosshairMarker);
						hideContextMenu();
						break;
						
					case States.ROUTE:
						addRouteMarker(event.latLng);
						break;
						
					case States.DISTANCE:
						if (contextMenuVisible) {
							hideContextMenu();
						} else {
							addDistancePosition(event.latLng);
						}
						break;
				}
			});	
		}
				
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function positionConnect(){
			$.ajax({
				type: 'GET',
				url : "boatposition.php",
				dataType : 'json',
				data: null,
				success : function(response){
					position = new google.maps.LatLng(response.lat, response.lng);
					updateBoatPosition(position);
					noerror = true;
				},
				complete: function(response){
					if(!self.noerror){
						setTimeout(function(){positionConnect();},5000);
					}else{
						positionConnect();
					}
					noerror = false;
				}
			});
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function updateBoatPosition(position){
			if(boatMarker == null){
				boatMarker = new google.maps.Marker({
					position: position,
					map: map,
					title:"boat",
					shape: options.boatmarker.crosshairShape,
					icon: options.boatmarker.image
				});
			}else{
				boatMarker.setPosition(position);
			}
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function removeCrosshairMarker(marker) {
			if (marker != null) {
				marker.setMap(null);
			}
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function setCrosshairMarker(position) {
			if(crosshairMarker != null) {
				crosshairMarker.setPosition(position);
				crosshairMarker.setMap(map);
			}else {
				crosshairMarker = new google.maps.Marker({
					position: position,
					map: map,
					title:"crosshair",
					shape: options.crosshairmarker.crosshairShape,
					icon: options.crosshairmarker.image
				});
			}
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function hideCrosshairMarker() {
			if (crosshairMarker != null) {
				crosshairMarker.setMap(null);
			}
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function showContextMenu(latLng, type, marker) {
			contextMenuVisible = true;
			contextMenuType = type;
			selectedMarker = marker;
			showContextMenuInternal(latLng);
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function hideContextMenu() {
			$('#tooltip_helper').popover('hide');
			contextMenuVisible = false;
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function showContextMenuInternal(latLng) {
			$('#tooltip_helper').popover({title: function() {
					var lat = crosshairMarker.getPosition().lat();
					var lng = crosshairMarker.getPosition().lng();

					return '<span><b>Lat</b> ' + toGeoString(lat, "N", "S", 2) + ' <b>Lon</b> ' + toGeoString(lng, "E", "W", 3) + '</span>'
						 + '<span><b>BTM</b> XXX° <b>DTM</b> X.XXXnm</span>';
				},
				html : true,
				content: getContextMenuContent,
				placement: function(){
					var leftDist = $('#tooltip_helper').position().left;
					var width = $('#map_canvas').width();

					return (leftDist > width / 2 ? "left" : "right");
				}
			});
			$('#tooltip_helper').popover('show');
			
			$(".seamapinner", $this).css("overflow","visible"); // bugfix > menu overlaps!
			updateContextMenu(latLng);	
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function updateContextMenu(latLng){
			if ($('.popover').is(':visible')) {
				var pos = getCanvasXY(latLng);

				var xPos = pos.x;
				var yPos = pos.y + 10;
				var width = $this.width();
				var height = $this.height();

				$('#tooltip_helper').css({top: yPos, left: xPos});

				// check whether the popup is displayed outside of the maps container
				if (xPos > 5 && xPos < width - 5 && yPos > 5 && yPos < height - 5) {
					$('#tooltip_helper').popover('show');
					contextMenuVisible = true;
				} else {
					hideContextMenu();
				}
			}
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function getContextMenuContent() {
			var ctx = '<div id="contextmenu">'
			switch(contextMenuType) {
				case ContextMenuTypes.DEFAULT:
					ctx += '<button id="addMarker" type="button" class="btn"><i class="icon-map-marker"></i> Markierung setzen</button>';
					if (state != States.ROUTE) {
						ctx += '<button id="addNewRoute" type="button" class="btn"><i class="icon-flag"></i> Route beginnen</button>';
					} else {
						ctx += '<button id=exitRouteCreation" type="button" class="btn"><i class="icon-flag"></i> Routenaufzeichnung beenden</button>';
					}
					ctx += '<button id="addNewDistanceRoute" type="button" class="btn"><i class="icon-resize-full"></i> Abstand von hier</button>'
						+ '<button id="setAsDestination" type="button" class="btn"><i class="icon-star"></i> Zum Ziel machen</button>'
						+ '<button id="hideContextMenu" type="button" class="btn"><i class="icon-remove"></i> Schließen</button>'; 
					break;
				case ContextMenuTypes.DELETE_MARKER:
					ctx += '<button id="deleteMarker" type="button" class="btn"><i class="icon-map-marker"></i> Markierung löschen</button>';
					break;
				case ContextMenuTypes.DELETE_ROUTEMARKER:
					ctx += '<button id="deleteRouteMarker" type="button" class="btn"><i class="icon-map-marker"></i> Routenpunkt löschen</button>';
					break;
				case ContextMenuTypes.DELETE_DISTANCEMARKER:
					ctx += '<button id="deleteDistanceMarker" type="button" class="btn"><i class="icon-map-marker"></i> Distanzpunkt löschen</button>';
					break;
			}
			ctx += '</div>'
			return ctx;
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function setMarkClicked() {
			setDefaultMarker(crosshairMarker.getPosition())

			// make the crosshair invisible
			crosshairMarker.setVisible(false);

			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function toTargetClicked() {
			alert("not implemented");
			crosshairMarker.setVisible(false);
			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function distanceHereClicked() {
			//startDistance(crosshairMarker.getPosition());
			addDistancePosition(crosshairMarker.getPosition());

			// make the crosshair invisible
			crosshairMarker.setVisible(false);

			state = States.DISTANCE;

			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function deleteClicked() {
			alert("not implemented");
			crosshairMarker.setVisible(false);
			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function exitRouteModeClicked () {
			crosshairMarker.setVisible(false);
			state = States.NORMAL;
			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function deleteMarkerClicked () {
			removeMarker(selectedMarker);
			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function deleteRouteMarkerClicked () {
			removeRoutePosition(selectedMarker);
			hideContextMenu();
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function deleteDistanceMarkerClicked () {
			removeDistancePosition(selectedMarker);
			hideContextMenu();
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function handleAddNewRoute() {
			hideContextMenu();
			hideCrosshairMarker();
			
			routeId = routeCounter++;
			
			activeRoute = routes[routeId] = new $.seamap.route(routeId, map);			
			activeRoute.addMarker(crosshairMarker.getPosition());

			state = States.ROUTE;
			
			$(".seamapinner", $this).animate({width:'80%'});
			$(".seamapsidebar", $this).animate({width:'20%'});
		}	
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function addRouteMarker(latLng) {
			hideContextMenu();
			hideCrosshairMarker();
			
			activeRoute.addMarker(latLng);
			activeRoute.drawPath();
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function handleAddMarker() {
			hideContextMenu();
			hideCrosshairMarker();
			addDefaultMarker(crosshairMarker.getPosition());
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function handleDeleteMarker() {
			deleteSelectedMarker();
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function addDefaultMarker(position) {
			var newMarker = new google.maps.Marker({
				map: map,
				position: position,
				draggable: true
			});

			google.maps.event.addListener(newMarker, 'rightclick', function(event) {
				showContextMenu(event.latLng, ContextMenuTypes.DELETE_MARKER, newMarker);
			});
			
			markers[markers.length] = newMarker;
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function deleteSelectedMarker() {
			if(selectedMarker != null) {
				selectedMarker.setMap(null);
			}
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function toGeoString(value, posChar, negChar, degLength) {
			var direction;

			if (value >= 0) {
				direction = posChar;
				
			} else {
				direction = negChar;
				value = -value;
			}

			var deg = Math.floor(value);
			var min = (value - deg) * 60;
			var min_pre = Math.floor(min);
			return leadingZero(deg, degLength) + "°" + leadingZero(min.toFixed(2), 2) + "'" + direction;
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function leadingZero(num, size) {
			var string = num+"";
			var length = (Math.floor(num) + "").length;
				for (var i = length; i < size; i++) {
					string = "0" + string;
				}

			return string;
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		function getCanvasXY(currentLatLng){
			var scale = Math.pow(2, map.getZoom());
			var nw = new google.maps.LatLng(
			  map.getBounds().getNorthEast().lat(),
			  map.getBounds().getSouthWest().lng()
		  );
		  var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
		  var worldCoordinate = map.getProjection().fromLatLngToPoint(currentLatLng);
		  var currentLatLngOffset = new google.maps.Point(
			  Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
			  Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
		  );
		  return currentLatLngOffset;
		}
	};
	
	/**
	* *************************************************************************************
	* Route class 
	* *************************************************************************************
	*/
	$.seamap.route = function(newrouteid, newgooglemaps){
		this.id = newrouteid;
		this.googlemaps = newgooglemaps;
		
		this.path = null;
		this.markers = new Array();
		this.label = null;
		
		// internal data
		var options = $.seamap.options;
			
		this.path = new google.maps.Polyline(options.polyOptions);
		this.path.setMap(this.googlemaps);
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.addMarker = function(position) {
			var $this = this;
			
			var pinColor = "007569";
			var pinImage = new google.maps.MarkerImage(
				"http://maps.gstatic.com/mapfiles/ridefinder-images/mm_20_blue.png",
				new google.maps.Size(21, 34),
				new google.maps.Point(0,0),
				new google.maps.Point(7, 19)
			);

			var marker = new google.maps.Marker({
				map: this.googlemaps,
				position: position,
				icon: pinImage,
				draggable: true,
			});
			
			this.markers[this.markers.length] = marker;
			
			var label = this.addLabel(marker);

			google.maps.event.addListener(marker, 'dragend', function() {
				$this.drawPath();
				$this.updateLabel(label, marker);
			});

			google.maps.event.addListener(marker, 'rightclick', function(event) {
				showContextMenu(event.latLng, ContextMenuTypes.DELETE_ROUTEMARKER, marker);
			});
		}
		
		this.removeMarker = function(marker) {
			removeMarkerRef = $.grep(this.markers, function(value) {
			  return value != marker;
			});
			
			// ...
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.addLabel = function(marker) {
			this.label = new Label({map: this.googlemaps });
			this.label.bindTo('position', marker, 'position');
			this.label.set('text', this.getTotalDistanceText());
			
			return this.label;
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.updateLabel = function(label, marker) {
			label.setMap(null);
			
			this.addLabel(marker);
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.removeLabel = function() {
			if( this.label != null ) {
				this.label.setMap(null);
			}
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.drawPath = function() {
			var newPath = new Array();
			for (var i = 0; i < this.markers.length; ++i) {
				newPath[i] = this.markers[i].getPosition();
			}

			this.path.setPath(newPath);
		}
		
		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.getTotalDistanceText = function() {
			var dist = 0;

			if( this.markers.length > 1 ) {
				for( var i = 0; i < this.markers.length - 1; ++i ) {
					dist += this.distance(	this.markers[i].getPosition().lat(),
									 		this.markers[i].getPosition().lng(),
									 		this.markers[i + 1].getPosition().lat(),
									 		this.markers[i + 1].getPosition().lng())
				}
			}

			return dist + "m";
		}

		/**
		* *********************************************************************************
		* 
		* *********************************************************************************
		*/
		this.distance = function(lat1,lon1,lat2,lon2) {
			var R = 6371; // km (change this constant to get miles)
			var dLat = (lat2-lat1) * Math.PI / 180;
			var dLon = (lon2-lon1) * Math.PI / 180; 
			var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) * 
				Math.sin(dLon/2) * Math.sin(dLon/2); 
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
			var d = R * c;
			return Math.round(d*1000); // in meters
		}
	};
	
	$.seamap.options = options;

	// extend jquery with our new fancy seamap plugin
	$.fn.seamap = function( opts ) {
		if( typeof opts === 'object') {
			$.extend(options, opts);
		}
	
		return this.each(function () {
			$this = $(this);
		
			if($this.data('seamap') === undefined) {
				$this.data('seamap:original', $this.clone());
				var seamap = new $.seamap(this);
				$this.data('seamap', seamap);
			} else {
				$.error("Another initialization of the seamap plugin is not possible!");
			}
		});
  
	};

})( jQuery, window );