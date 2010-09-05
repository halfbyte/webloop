function genSound(bufferSize, bufferPos) {
  return seq.update(bufferSize, bufferPos);
}

var SoundBridge = function() {
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
  var method = 'audiocontext';
  var audioElement = null;
  var soundData;
  var tail = null;
  var prebufferSize = 0;
  var currentWritePosition = 0;

  var log = function(text) {
    if (typeof console !== 'undefined' && console.log)
      console.log(text);
  };

  var getMovie = function(movieName) {
    if (navigator.appName.indexOf("Microsoft") != -1) {
      return window[movieName];
    } else {
      return document[movieName];
    }
  };

  var fallThrough = function() {
    playerCode = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="200" height="30" id="soundbridgeFlash" align="middle">';
    playerCode += '<param name="movie" value="/soundbridge/soundbridge.swf"/>';
    playerCode += '<param name="allowScriptAccess" value="always" />';
    playerCode += '<param name="quality" value="high" />';
    playerCode += '<param name="scale" value="noscale" />';
    playerCode += '<param name="salign" value="lt" />';
    playerCode += '<param name="bgcolor" value="#ffffff"/>';
    playerCode += '<embed src="/soundbridge/soundbridge.swf" bgcolor="#ffffff" width="200" height="30" name="soundbridgeFlash" quality="high" align="middle" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />';
    playerCode += '</object>';
    $('body').append(playerCode);
    flashObject = getMovie('soundbridgeFlash');
    log(flashObject);
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
    } else if (method === 'mozilla') {
      window.setInterval(function() {
        var written;
        // Check if some data was not written in previous attempts.
        if(tail) {  
          written = audio.mozWriteAudio(tail);
          currentWritePosition += written;
          if(written < tail.length) {
            // Not all the data was written, saving the tail...
            tail = tail.slice(written);
            return; // ... and exit the function.
          }
          tail = null;
        }

        // Check if we need add some data to the audio output.
        var currentPosition = audio.mozCurrentSampleOffset();
        var available = currentPosition + prebufferSize - currentWritePosition;
        if(available > 0) {
         // Request some sound data from the callback function.
         soundData = new Float32Array(available);
         bufferCounter = 0;
         if (playing) {
           fun(soundData.length, 0);
         } else {
           var len = soundData.length;
           for(i=0;i<len;i++) soundData[i] = 0.0;
         }
         

         // Writting the data.
         written = audio.mozWriteAudio(soundData);
         if(written < soundData.length) {
           // Not all the data was written, saving the tail.
           tail = soundData.slice(written);
         }
         currentWritePosition += written;
        }
      },100);
    } else if (method === 'flash') {
      window.__soundbridgeGenSound = function(bufferSize, bufferPos) {
        buffer = "";
        callback(bufferSize, bufferPos);
        return buffer;
      };
      window.setTimeout(function() { flashObject.setCallback("__soundbridgeGenSound"); }, 500);
            
    }
    
    
  };

  
  that.addToBuffer = function(sound) {
    if (context != null && jsNodeOutputBuffer != null) {      
      chanL[bufferCounter] = sound;
      chanR[bufferCounter] = sound;
      bufferCounter++;
    } else if (method === 'mozilla') {
      soundData[bufferCounter] = sound;
      bufferCounter++;
    } else if (method === 'flash') {
      var word = Math.round((sound * 32768.0 * 0.5) + 32768.0);
      buffer += soundbridge.encodeHex(word);      
    }
    
    
  };
  that.play = function() {
    playing = true;
    if(method === 'flash' && flashObject !== null) flashObject.play();      
  };

  that.stop = function() {
    playing = false;
    if(method === 'flash' && flashObject !== null) flashObject.stop();
  };

  if (typeof AudioContext !== 'undefined') {
    context = new AudioContext();
    jsNode = context.createJavaScriptNode(4096, 0, 2);
    jsNode.connect(context.destination);
    method = 'webkit';
    log("I'm on webkit");
  } else if ((typeof Audio !== 'undefined') && (audio = new Audio()) && audio.mozSetup) {
    log("I'm on an audio build of mozilla");
    audioElement = audio;
    audioElement.mozSetup(1, 44100);
    prebufferSize = 44100 / 2;
    method = 'mozilla';
  } else {
    method = 'flash';
    log("I suck and will fall through to flash");
    fallThrough();
    
  }


  // initializing
  return that;




};
