function genSound(bufferSize, bufferPos) {
  return seq.update(bufferSize, bufferPos);
}

var SoundBridge = function(objName) {
  var that = {};
  var flashObject = null;
  var buffer = "";
  var callback = null;
  var context = null;
  var jsNode = null;
  var jsNodeOutputBuffer = null;
  var chanL = null;
  var chanR = null;
  var bufferCounter = 0;
  var playing = false;

  if (AudioContext) {
    context = new AudioContext();
    jsNode = context.createJavaScriptNode(4096, 0, 2);
    jsNode.connect(context.destination);
  }

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
    
    if(context != null) {
      jsNode.onaudioprocess = function(event) {
        bufferCounter = 0;
        jsNodeOutputBuffer = event.outputBuffer;
        chanL = jsNodeOutputBuffer.getChannelData(0);
        chanR = jsNodeOutputBuffer.getChannelData(1);
        
        if (playing) {
          callback(chanL.length, 0);        
        } else {
        
          var len = chanL.length;
          for(i=0;i<len;i++) {
            chanL[i] = 0.0;
            chanR[i] = 0.0;
          }
        }
          
      };
    } else {
      window.__soundbridgeGenSound = function(bufferSize, bufferPos) {
        buffer = "";
        callback(bufferSize, bufferPos);
        return buffer;
      };
      flashObject.setCallback("__soundbridgeGenSound");      
    }
    
    
  };

  
  that.addToBuffer = function(sound) {
    if (context != null && jsNodeOutputBuffer != null) {      
      chanL[bufferCounter] = sound;
      chanR[bufferCounter] = sound;
      bufferCounter++;
      
    } else {
      var word = Math.round((sound * 32768.0 * 0.2) + 32768.0);
      buffer += soundbridge.encodeHex(word);      
    }
    
    
  };
  that.play = function() {
    if (context != null) {
      playing = true;
    } else {
      if(flashObject != null)
        flashObject.play();      
    }
    
  };

  that.stop = function() {
    if (context != null) {
      playing = false;
    } else {
      if(flashObject != null)
        flashObject.stop();      
    }
  };

  // initializing
  flashObject = getMovie(objName);
  return that;

};
