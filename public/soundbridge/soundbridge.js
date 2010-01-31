var SoundBridge = function(objName) {
  var that = {};
  var flashObject = null;

  var getMovie = function(movieName) {
    if (navigator.appName.indexOf("Microsoft") != -1) {
      return window[movieName];
    } else {
      return document[movieName];
    }
  };

  that.encodeHex = function(word) {
    var HEX = "0123456789ABCDEF";
    var buffer = "";
    buffer += HEX.charAt(word & 0xF);
    buffer += HEX.charAt((word >> 4) & 0xF);
    buffer += HEX.charAt((word >> 8) & 0xF);
    buffer += HEX.charAt((word >> 12) & 0xF);
    return buffer;
  };

  that.setCallback = function(callbackName) {
    if(flashObject != null)
      flashObject.setCallback(callbackName);
  };

  that.play = function() {
    if(flashObject != null)
      flashObject.play();
  };

  that.stop = function() {
    if(flashObject != null)
      flashObject.stop();
  };

  // initializing
  flashObject = getMovie(objName);


  return that;

};
