/**
 * @param polygon
 *
 * @return Array
 */
function transformPolygonCoordinatesToArray(polygon)
{
  let coordinatesArray = [];

  polygon.getPath().forEach(function(latLng)
  {
    coordinatesArray.push({
      lat: latLng.lat(),
      lng: latLng.lng(),
    });
  });

  return coordinatesArray;
}

/**
 * Function loads Google Maps script
 *
 * @param <function> callback - Called after the script has been loaded
 *
 * @return <void>
 */
function googleMapsLoaded(callback) {
  //  if already exists
  if (window.google && google.maps) {
    callback(window.google);
  } else {
    $.getScript('https://www.google.com/jsapi', function() {
        google.load('maps', '3', {
            other_params: 'key=AIzaSyAaXtJ_jrhUil0eg3UJUClqLOr_75Tws4g&libraries=drawing,places',
            callback: function() {
              callback(google);
            }
      });
    });
  }
}