function genSound(bufferSize, bufferPos) {
  return seq.update(bufferSize, bufferPos);
}

var SoundBridge = function(objName) {
  var that = {};
  var flashObject = null;
  var buffer = "";
  var callback = null;

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

  that.setCallback = function(fun) {
    callback = fun;
    window.__soundbridgeGenSound = function(bufferSize, bufferPos) {
      buffer = "";
      callback(bufferSize, bufferPos);
      return buffer;
    };
    flashObject.setCallback("__soundbridgeGenSound");
  };
  
  that.addToBuffer = function(sound) {
    var word = Math.round((sound * 32768.0 * 0.2) + 32768.0);
    buffer += soundbridge.encodeHex(word);
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
