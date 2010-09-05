
var soundbridge;

var Music = { notes: /* 0 */ [ 16.35,    17.32,    18.35,    19.45,    20.6,     21.83,    23.12,    24.5,     25.96,    27.5,  29.14,    30.87,
                     /* 1 */   32.7,     34.65,    36.71,    38.89,    41.2,     43.65,    46.25,    49,       51.91,    55,    58.27,    61.74,
                     /* 2 */   65.41,    69.3,     73.42,    77.78,    82.41,    87.31,    92.5,     98,       103.83,   110,   116.54,   123.47,
                     /* 3 */   130.81,   138.59,   146.83,   155.56,   164.81,   174.61,   185,      196,      207.65,   220,   233.08,   246.94,
                     /* 4 */   261.63,   277.18,   293.66,   311.13,   329.63,   349.23,   369.99,   392,      415.3,    440,   466.16,   493.88,
                     /* 5 */   523.25,   554.37,   587.33,   622.25,   659.26,   698.46,   739.99,   783.99,   830.61,   880,   932.33,   987.77,
                     /* 6 */   1046.5,   1108.73,  1174.66,  1244.51,  1318.51,  1396.91,  1479.98,  1567.98,  1661.22,  1760,  1864.66,  1975.53,
                     /* 7 */   2093,     2217.46,  2349.32,  2489.02,  2637.02,  2793.83,  2959.96,  3135.96,  3322.44,  3520,  3729.31,  3951.07,
                     /* 8 */   4186.01,  4434.92,  4698.64,  4978 ]
            };


// simple attack, hold, decay env
var ADEnv = function(a, h, d) {

  var that = {};

  that.at = function(pos) {
    if (a > 0 && pos <= a) {
      return pos/a;
    } else if (pos <= (a + h) ) {
      return 1;
    } else if (d > 0 && pos <= (a + h + d) ) {
      return(1 - ((pos - (a + h))/d));
    }
    return 0;
  };
  return that;

};

var Decay = function(d) {
  var that = {};
  that.at = function(pos) {
    if (d > 0 && pos < d) {
      return Math.abs(1 - (pos / d));
    }
    return 0;    
  };
  return that;
};

var Echo = function(delay, amount) {
  var that = {};
  var data = Array(delay);
  var curPos = 0;

  that.process = function(input) {
    var outpos = (curPos + delay) % delay;
    var output = data[outpos] ? data[outpos] : 0;
    data[curPos] = input + (amount * output);
    curPos = (curPos + 1) % delay;
    return output;
  };
  return that;
};

var TableOsc = function() {
  var that = {};
  that.data = [1, 1, 1, 0, 0, 1, 1, -1, -1, 0.5, -1,-1, -1, -1, 0, 0];
  that.at = function(periodPos) {
    var floatIndex = that.data.length * periodPos;
    var bigIndex = Math.ceil(floatIndex) % that.data.length;
    var smallIndex = Math.floor(floatIndex);
    var factor = floatIndex - smallIndex;
    var inverseFactor = 1 - factor;
    return (that.data[smallIndex] * inverseFactor) + (that.data[bigIndex] * factor);
  };

  return that;
};

var NoiseOsc = function() {
  var that = {};
  that.at = function(periodPos) {
    return (Math.random() * 2) - 1;
  };
  return that;
};

function InterPol(init, smoothness) {
  var val = init;
  var target = init;
  var count = 0;
  var delta;
  that = {};
  that.get = function() {
    if (count >0) {
      val += delta;
      count--;
    }
    return val;
  };
  that.set = function(newVal) {
    target = newVal;
    var diff = newVal - val;
    delta = diff / smoothness;
    count = smoothness;
  };
  return that;
};

var noteToFreq = function(note) {
    return Music.notes[note];
    // return 440.0 * ( Math.pow(2.0,((note - 69.0) / 12)));
};

var SVF = function() {
  var that = {};
  var in1=0, in2=0, in3=0, in4=0;
  var out1=0, out2=0, out3=0, out4=0;
  that.process = function(input, fc, res) {
    var f = fc * 1.16;
    var fb = res * (1.0 - 0.15 * f * f);
    input -= out4 * fb;
    input *= 0.35013 * (f*f)*(f*f);
    out1 = input + 0.3 * in1 + (1 - f) * out1; // Pole 1
    in1  = input;
    out2 = out1 + 0.3 * in2 + (1 - f) * out2; // Pole 2
    in2  = out1;
    out3 = out2 + 0.3 * in3 + (1 - f) * out3;  // Pole 3
    in3  = out2;
    out4 = out3 + 0.3 * in4 + (1 - f) * out4;  // Pole 4
    in4  = out3;
    return out4;
  };
  return that;
};

var Track = function(name, osc) {
  var that = {
    name: name,
    currentNotePos: -1,
    currentNote: 0,
    posInNote: 0,
    filter: SVF(),
    filterInterpol: InterPol(1,20),
    qInterpol: InterPol(0,20),
    volInterpol: InterPol(0,20),
    noteInterpol: InterPol(0,20),
    env: ADEnv(0.2, 0.5, 0.3),
    pitchEnv: Decay(0.8),
    pitchEnvAmount: 0.9,
    vol: 1,
    osc: osc
  };
  return that;
};

var sequencer = function() {
  var that = {};
  that.tempo = 120;
  that.debug = false;

  var echo = Echo(44.1 * 500, 0.3);
  var absoluteBufferPos = 0;
  var tracks = [Track('l', TableOsc()),Track('r', TableOsc()),Track('s', TableOsc()), Track('n', NoiseOsc())];
  var indicatorNotePos = -1;
  
  // if 
  // var canvas = document.getElementById('debug').getContext("2d");

  // var osc = TableOsc();

  that.update = function(bufferSize, bufferPos) {
    var startTime = new Date().getTime();
    var beatFreq = that.tempo / 60.0;
    var patternLengthInSamples = 4 * 44100 / beatFreq;
    var noteLengthInSamples = patternLengthInSamples / 16;    
    
    var numTracks = tracks.length;
    
    for(var i=0;i<bufferSize;i++) {
      var mixer = [];
      var posInPattern = (absoluteBufferPos + i) % patternLengthInSamples;
      var noteInPattern = Math.floor(posInPattern / (noteLengthInSamples));
      if (posInPattern === 0) {
        indicatorNotePos = -1;
      }
      if (noteInPattern > indicatorNotePos) {
        pe.highlightStep(noteInPattern);
        indicatorNotePos = noteInPattern;
      } 
      for (var tr = 0; tr < numTracks; tr++) {
        var track = tracks[tr];
        if (posInPattern == 0) {
         track.currentNotePos = -1;
        }
        if (pe.patternData.get(track.name, 'trg', noteInPattern) && (noteInPattern > track.currentNotePos)) {
         
         track.currentNotePos = noteInPattern;
         var not = pe.patternData.get(track.name, 'not', noteInPattern);
         track.currentNote = (not.x * 12) + not.y;
         var mod = pe.patternData.get(track.name, 'mod', noteInPattern);
         if (mod) {
           var llen = (mod.x / 16);
           track.pitchEnv = Decay(llen);
           track.pitchEnvAmount = (mod.y - 8)/ 8;
         }
         var env = pe.patternData.get(track.name, 'env', noteInPattern);
         if (env) {
           var nlen = env.x / 16;
           track.env = ADEnv(0,0,nlen);
           track.vol = env.y / 16;
         }
         var snd = pe.patternData.get(track.name, 'snd', noteInPattern);
         if (snd) {
           var fnew = snd.y / 16;
           track.filterInterpol.set(fnew + 0.05);
           track.qInterpol.set(snd.x / 16 * 3);
         }
         track.posInNote = 0;
        }
        var envVal = track.env.at(track.posInNote / (noteLengthInSamples * 4));
        
        if (envVal > 0) {
          
         var noteFreq = noteToFreq(track.currentNote);
        
         
         var oldFreq = noteFreq;
         var pEnv = track.pitchEnv.at(track.posInNote / (noteLengthInSamples * 2));
         var pFactor = (1 + (2* Math.abs(track.pitchEnvAmount) * pEnv));


         if (track.pitchEnvAmount >= 0) {
           noteFreq *= pFactor;
         } else if (track.pitchEnvAmount < 0) {
           noteFreq /= Math.abs(pFactor);
         }


         // noteFreq += noteFreq * pitchEnvAmount * pitchEnv.at(posInNote / noteLengthInSamples);
         notePeriod = 44100.0 / noteFreq;
         var periodPos = (track.posInNote % notePeriod) / notePeriod;

         

         // if (currentNotePos === 0) {
         //   if (track.posInNote === 0)
         //    //canvas.clearRect(0,0,400,200);
         //  
         //   var envPos = track.posInNote / (noteLengthInSamples * 4);
         //   // canvas.globalAlpha = 0.5;
         //   // canvas.fillStyle = "#000";
         //   // canvas.fillRect(posInNote / 50, noteFreq, 1, 1);           
         //   // canvas.fillStyle = "#f00";
         //   // canvas.fillRect(posInNote / 50, periodPos * 200, 1, 1);           
         // }



         //sound = periodPos;
         sound = track.osc.at(periodPos);
         sound = track.filter.process(sound, track.filterInterpol.get() + 0.01, track.qInterpol.get());
         track.volInterpol.set(envVal * track.vol);
         sound *= track.volInterpol.get();

        } else {
         sound = 0;
         track.filter.process(sound, track.filterInterpol.get(), track.qInterpol.get()); // keeping the filter up to date
        }

        //sound += echo.process(sound);

        // debugging buffer restart issues:
        // if (that.debug && i<100) {
        //  sound += Math.random() * 0.2;
        // }
        track.posInNote++;
        mixer.push(sound);
        
        
      }
      var mixerLen = mixer.length;
      var mixerValue = 0.0;
      for(t=0;t<mixerLen;t++) {
        mixerValue += (mixer[t] * (1/mixerLen));
      }
      
      soundbridge.addToBuffer(mixerValue);
      //soundbridge.addToBuffer(mixerValue);
      
    }
    absoluteBufferPos += bufferSize;
    var endTime = new Date().getTime();
    if (that.debug) console.log("update: " + (endTime-startTime) + " ms");
  };

  return that;
};


function genSound(bufferSize, bufferPos) {
  return seq.update(bufferSize, bufferPos);
}

$(function() {
  var seq = sequencer();

  window.setTimeout(function() {
    soundbridge = SoundBridge();
    soundbridge.setCallback(seq.update);
    var playing = false;
    $('#playButton').click(function(e) {
      if (playing) {
        soundbridge.stop();
        $(this).html("play");
        playing = false;
      } else {
        soundbridge.play();
        $(this).html("stop");
        playing = true;
      }
      return false;
    });
  }, 200);


});
