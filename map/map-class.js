
/**
 *
 * @param <object> map - 
 * @param <object> google - 
 * @param <string> elementContainerId - 
 * 
 * @return <void>
 */
function MapUtilMethods(google, map) {

	// internal functions
	function processMapContainer(google, map, elementContainerId) {
		// maps are loaded to hidden element, so we need to fire "resize" event once hidden element is shown
		// when bootstrap mod~al is shown ...
		$('#' + elementContainerId).on('shown.bs.modal', function() {
			google.maps.event.trigger(map, "resize");
		});

		// each RESIZABLE map container must include iframe inside it
		var iframeName = $('#' + elementContainerId).find('iframe').attr('name');

		// now we listen iframe resize event and update map
		for (var i = window.frames.length - 1; i >= 0; i--) {
			if (iframeName === window.frames[i].name) {
				window.frames[i].onresize = function() {
					google.maps.event.trigger(map, "resize");
				}
			}
		}
	}
	


	// process container
	this.processMapContainer = function(containerId) {
		processMapContainer(google, map, containerId);
	}
}


/**
 * class DrawingManagerDataShell
 * Contains methods to work with overlays
 *
 * @param <object> dmanagerShell - Drawing manager shell object
 * 
 * @return <object>
 */
function DrawingManagerDataShell(dmanagerShell) {

	// closure
	var self = this;

	// support MicroEvent event mixin
	MicroEvent.mixin(self);

	// define vars
	var map = dmanagerShell.map();
	var google = dmanagerShell.google();
	var dmanager = dmanagerShell.dmanager();


	// internal functions

	// on overlay click. set system behaviors
	function onOverlayClick(event, overlay, type) {
		__overlayToggleSelection(overlay);
	}

	// on overlay selection change event
	function onOverlaySelectionChange(prev, current) {
		__processOverlaySelectionEventsOnChange(prev, current);
	}

	// on overlay complete
	function onOverlayComplete(overlayComplete) {
		__registerOverlay(overlayComplete);
		__registerOverlayHandlers(overlayComplete);

		// add to array
		self.features.push({
			type: overlayComplete.type,
			feature: overlayComplete.overlay,
		});
	}

	// on overlay complete
	function onOverlayAdd(feature) {
		// get type
		let featureType = detectOverlayType(feature);
		// force this map
		feature.setMap(map);
		// handle
		onOverlayComplete({
			type: featureType,
			overlay: feature,
		});
	}

	// on overlay remove
	function onOverlayRemove(feature) {
		self.each(function(currentFeature, type, featureObject) {
			if (feature === currentFeature) {
				let index = self.features.indexOf(featureObject);
				if (index > -1) {

					feature.setMap(null);
					self.features.splice(index, 1);

					// fire event
					self.trigger('removefeature', currentFeature, type);
				}
			}
		});
	}

	// clear selected overlay
	function resetSelectedOverlay() {
		let selectedOverlay = self.selectedOverlay();
		if (selectedOverlay) {
			onOverlayClick(null, selectedOverlay);
		}
	}

	// detect overlay type
	function detectOverlayType(overlay) {
		let supportedOverlays = self.supportedOverlays();

		for (current in supportedOverlays) {
			if (overlay instanceof supportedOverlays[current]) {
				return current; break;
			}
		}
		return null;
	}

	// init this class
	function init(map, dmanager) {
		dmanager.addListener('overlaycomplete', onOverlayComplete);

		// unfocus selected overlay by clicking on map
		map.addListener('click', function(event) {
			resetSelectedOverlay();
		});
	}


	// internal system functions

	// toggle overlays on map
	// current overlay is stored in "__overlayToggleSelection.previousOverlay" property
	function __overlayToggleSelection(overlay) {
		let selectedWhenCalled = __overlayToggleSelection.previousOverlay;

		let previousOverlay = __overlayToggleSelection.previousOverlay;
				previousOverlay = previousOverlay ?
				previousOverlay : overlay;

		if (previousOverlay === overlay) {
			if (previousOverlay.getEditable() === true) {
				previousOverlay.setEditable( ! previousOverlay.getEditable() );
				__overlayToggleSelection.previousOverlay = null;
			} else {
				previousOverlay.setEditable( ! previousOverlay.getEditable() );
				__overlayToggleSelection.previousOverlay = overlay;
			}
		} else {
			previousOverlay.setEditable(false);
			overlay.setEditable(true);
			__overlayToggleSelection.previousOverlay = overlay;
		}

		if (selectedWhenCalled !== __overlayToggleSelection.previousOverlay) {
			onOverlaySelectionChange(selectedWhenCalled, __overlayToggleSelection.previousOverlay);
		}
	}

	// add some events
	function __processOverlaySelectionEventsOnChange(prev, current) {
		if (current) {
			self.trigger('feature:selectfocus', current, prev);
		}
		if (prev) {
			self.trigger('feature:selectblur', prev, current);
		}
		self.trigger('feature:selectchange', prev, current);
	}

	// add some event listeners
	function __registerOverlayHandlers(overlayComplete) {
		// click event on overlay
		overlayComplete.overlay.addListener('click', function(event) {
			onOverlayClick(event, overlayComplete.overlay, overlayComplete.type);
		});
		// fire event
		self.trigger('addfeature', overlayComplete.overlay, overlayComplete.type);
	}

	// process overlay
	// we allow only features that has area and markers
	function __registerOverlay(overlayComplete) {
		// overlayComplete is: {overlay: <object>, type: <string:circle|polygon>}
		var overlay = overlayComplete.overlay;
		var overlayType = overlayComplete.type;

		if ( ! (overlayType in self.supportedOverlays())) {
			throw new Error(
				'Cannot register overlay of type: ' + overlayType + ', use ' + Object.keys(self.supportedOverlays())
			);
		}
	}


	// remove feature (overlay)
	this.removeFeature = function(feature) {
		onOverlayRemove(feature);
	}
	// add feature (overlay)
	this.addFeature = function(feature) {
		onOverlayAdd(feature);
	}
	// iterate over created features
	this.each = function(callback) {
		self.features.every(function(feature) {
			if (false === callback(feature.feature, feature.type, feature))
				return false;
			return true;
		});
	}
	// get selected feature on map if any
	this.selectedOverlay = function() {
		return __overlayToggleSelection.previousOverlay;
	}
	// unfocus selected overlay
	this.selectedOverlayReset = function() {
		resetSelectedOverlay();
	}
	// supported overlays
	this.supportedOverlays = function() {
		return {
			'polygon': google.maps.Polygon,
			'circle': google.maps.Circle,
			'rectangle': google.maps.Rectangle,
			'marker': google.maps.Marker,
		};
	}
	// overlays
	this.features = [];


	// init object
	init.call(this, map, dmanager);
}


/**
 * Function {Class} ControlsManagerShell
 * 
 *
 * @param <object> dmanagerShell - 
 * 
 * @return <object>
 */
function ControlsManagerShell(dmanagerShell) {

	var self = this;

	// control panel, containin all the control elements
	this.controlsPanel = __createControlsPanel();

	// control elements
	this.controls = {};

	// create control element
	this.create = function(innerHTML) {
		let id = 'control_' + randomString(12);
		
		let controlElement = {
			id: id,
			html: __createControlElement(innerHTML, id),
			content: innerHTML,
		};

		onControlElementCreate(controlElement);

		return controlElement;
	}

	// add control element
	this.add = function(control) {
		this.controls[control.id] = ( control );
		__controlsPanelAddChild(this.controlsPanel, control);
	}

	// remove control element
	this.remove = function(control) {
		for (let currentControl in this.controls) {
			if (currentControl === control.id) {
				__controlsPanelRemoveChild(self.controlsPanel, self.controls[currentControl]);
				delete self.controls[currentControl];
			}
		}
	}


	function onControlElementCreate(ce) {
		
	}

	// inner system functions

	// create panel
	function __createControlsPanel() {
		var controlUI = document.createElement('div');
				// controlUI.style.backgroundColor = '#fff';
				controlUI.style.height = 'auto';
				controlUI.style.width = 'auto';
				controlUI.style.textAlign = 'center';
				controlUI.style.marginLeft = '5px';
				controlUI.style.marginTop = '4px';
				controlUI.style.verticalAlign = 'middle';
				controlUI.style.textAlign = 'center';
				controlUI.style.fontSize = '1.44em';
				controlUI.style.boxSizing = 'border-box';

		return controlUI;
	}

	// remove child
	function __controlsPanelRemoveChild(panel, controlChild) {
		panel.removeChild(controlChild.html);
	}

	// append child
	function __controlsPanelAddChild(panel, controlChild) {
		panel.appendChild(controlChild.html);
	}

	// '<i class="fa fa-remove"></i>'
	function __createControlElement(innerHTML, id) {
		var item = document.createElement('div');
			 item.style.backgroundColor = '#fff';
			 item.style.display = 'inline-block';
			 item.style.width = '28px';
			 item.style.height = '100%';
			 item.style.overflow = 'hidden';
			 item.style.verticalAlign = 'middle';
			 item.style.marginRight = '2px';
			 item.className = 'map-control-bc';

			 item.id = id;
			 item.innerHTML = innerHTML;

		return item;
	}


	// init class
	function init(dmanagerShell) {
		dmanagerShell.map().controls[google.maps.ControlPosition.TOP_LEFT].push( this.controlsPanel );
	}


	init.call(this, dmanagerShell);
}



/**
 * Function {Class} OsmMapDrawingManagerContainer
 * Creates google draw manager holder and returns object containing it {DrawingManagerShell}
 *
 * @param <object> map - google map
 * @param <object> dmanagerOptions - init options for google drawing manager (used during creating manager object)
 * 
 * @return <object>
 */
function DrawingManagerShell(map, dmanagerOptions) {

	// define options for drawing manager
	dmanagerOptions = dmanagerOptions ?
	dmanagerOptions :
	// set default options if not any specified
	{
			// @see
			// https://developers.google.com/maps/documentation/javascript/reference?hl=ru#DrawingManagerOptions
			drawingControl: true,
			drawingControlOptions:
			{
				position: google.maps.ControlPosition.TOP_CENTER,
			},
	};

	// # to be fixed
	dmanagerOptions.drawingControlOptions.drawingModes = [
		// allow everything than can have area + marker
		google.maps.drawing.OverlayType.MARKER,
		google.maps.drawing.OverlayType.CIRCLE,
		google.maps.drawing.OverlayType.POLYGON,
		google.maps.drawing.OverlayType.RECTANGLE,
	]

	// define styles for each feature. hardcoded, yes.
	var customStyles = {
		fillColor: '#59a9b1',
		strokeColor: '#59a9b1',
		strokeOpacity: 1,
		strokeWeight: 2,
		fillOpacity: .09,
		clickable: true,
		editable: true,
		zIndex: 1
	};


	// google drawing Manager
	var drawingManager = new google.maps.drawing.DrawingManager( dmanagerOptions );


	// setting default behavior of drawing manager
	// some defaulties
	drawingManager.addListener('overlaycomplete', function(overlayComplete) {
		// reset drawing mode
		drawingManager.setDrawingMode(null);
		// marker, for instance, do not have setEditable() method
		if (overlayComplete.type !== google.maps.drawing.OverlayType.MARKER) {
			// unfocus overlay
			overlayComplete.overlay.setEditable(false);
		}
	});
	

	// init class
	function init() {
		// set custom options
		this.dmanager().setOptions({
			markerOptions: {},
			circleOptions: customStyles,
			polygonOptions: customStyles,
			rectangleOptions: customStyles,
		});
		// attach manager to map
		this.dmanager().setMap(this.map());

		// data object for map
		this.data = new DrawingManagerDataShell(this);
		// controls, buttons
		this.controls = new ControlsManagerShell(this);
	}



	// create visible outside properties

	// used map
	this.map = () => map;
	// google
	this.google = () => google;
	// drawing manager
	this.dmanager = () => drawingManager;


	// init
	init.call(this);
}



/**
 * Function {Class} MapShell
 * Creates google map instance container (shell)
 *
 * @param <object> options - google map options
 * @param <string> mapContainerId - selector like [ #{map-id} .{map-canvas} ], where 'map-id' is a container id
 *                                  and 'map-canvas' is an element, map to be loaded in
 * 
 * @return new <object>
 */
function MapShell(options, mapContainerId)
{

	// some simple checks
	{
		// google object must be loaded already
		if ( ! window.google ) throw new Error('<Google> Is Not Defined!');
		// container for map to be loaded in
		if ( ! mapContainerId ) throw new Error('<MapContainerId> Is Not Defined!');
		// container must have .map-canvas node
		if ( ! parseMapContainerId(mapContainerId) )
			throw new Error('<MapContainerId> is invalid. Follow the structure -> #{map-id} .{map-canvas}');
	}



	// each map container must have .map-canvas element inside it
	// this element holds the map
	function parseMapContainerId(containerId) {
		return document.querySelectorAll('#' + containerId + ' .map-canvas')[0];
	}

	// define OSM map type pointing at the OpenStreetMap tile server
	function addMaptypes(map) {
		// OSM map, see more here: http://openstreetmap.ru
		map.mapTypes.set('OSM', new google.maps.ImageMapType(
		{
			getTileUrl: function(coord, zoom) {
				var tilesPerGlobe = 1 << zoom;
				var x = coord.x % tilesPerGlobe;
				if (x < 0)
				{
					x = tilesPerGlobe + x;
				}
				return 'http://tile.openstreetmap.org/' + zoom + '/' + x + '/' + coord.y + '.png';
			},
			tileSize: new google.maps.Size(256, 256),
			name: 'openstreetmap',
			maxZoom: 19
		}));
	}

	// init map
	function init(map, mapContainerId) {
		// add OSM ability for instance
		addMaptypes(map);

		// utility class
		this.utility = new MapUtilMethods(google, map);
		// @see MapUtilMethods.processMapContainer
		this.utility.processMapContainer(mapContainerId);
	}


	// get map element (html node) #id -> .map-canvas
	var element = parseMapContainerId(mapContainerId);
	// create map
	var map = new google.maps.Map(element, options);



	// create visible outside properties
	// map
	this.map = () => map;
	// map element
	this.htmlNode = () => element;


	// init
	init.call(this, map, mapContainerId);
}