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
  var decay = d;
  var that = {};
  that.d = function(d) {
    decay = d;
  };
  that.at = function(pos) {
    if (decay > 0 && pos < decay) {
      return Math.abs(1 - (pos / decay));
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

// var SVF = function() {
//   var that = {};
//   var in1=0, in2=0, in3=0, in4=0;
//   var out1=0, out2=0, out3=0, out4=0;
//   that.process = function(input, fc, res) {
//     var f = fc * 1.16;
//     var fb = res * (1.0 - 0.15 * f * f);
//     input -= out4 * fb;
//     input *= 0.35013 * (f*f)*(f*f);
//     out1 = input + 0.3 * in1 + (1 - f) * out1; // Pole 1
//     in1  = input;
//     out2 = out1 + 0.3 * in2 + (1 - f) * out2; // Pole 2
//     in2  = out1;
//     return out2;
//     // out3 = out2 + 0.3 * in3 + (1 - f) * out3;  // Pole 3
//     // in3  = out2;
//     // out4 = out3 + 0.3 * in4 + (1 - f) * out4;  // Pole 4
//     // in4  = out3;
//     // return out4;
//   };
//   return that;
// };

var SVF = function() {
  var that = {};
  var buf0 = 0;
  var buf1 = 0;
  that.process = function(input, f, q) {
    //set feedback amount given f and q between 0 and 1
    var fb = q + q/(1.0 - f);

    //for each sample...
    buf0 = buf0 + f * (input - buf0 + fb * (buf0 - buf1));
    buf1 = buf1 + f * (buf0 - buf1);
    out = buf1;
    return out;
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
    qInterpol: InterPol(0,10),
    volInterpol: InterPol(0,10),
    noteInterpol: InterPol(0,10),
    envD: 0,
    pitchEnvD: 0,
    pitchEnvAmount: 0.9,
    vol: 1,
    osc: osc
  };
  return that;
};

var sequencer = function() {
  var that = {};
  that.tempo = 120;
  that.debug = true;

  var echo = Echo(44.1 * 500, 0.3);
  var absoluteBufferPos = 0;
  var tracks = [Track('l', 1),Track('r', 1),Track('s', 2), Track('n', 3)];
  var indicatorNotePos = -1;
  var beatFreq = that.tempo / 60.0;
  var patternLengthInSamples = 4 * 44100 / beatFreq;
  var noteLengthInSamples = patternLengthInSamples / 16;    
  
  //var timestamp = function() { return new Date().getTime(); };
  
  that.update = function(bufferSize, bufferPos) {
    var numTracks = tracks.length;
    for(var i=0;i<bufferSize;i++) {
      var posInPattern = (absoluteBufferPos + i) % patternLengthInSamples;
      var noteInPattern = Math.floor(posInPattern / (noteLengthInSamples));
      // commented out for performance reasons. I disapprove.
      // if (posInPattern === 0) {
      //   indicatorNotePos = -1;
      // }
      // if (noteInPattern > indicatorNotePos) {
      //   //pe.highlightStep(noteInPattern);
      //   indicatorNotePos = noteInPattern;
      // } 
      var mixerValue = 0;
      for (var tr = 0; tr < numTracks; tr++) {
        var track = tracks[tr];
        if (posInPattern == 0) {
         track.currentNotePos = -1;
        }
        var trackData = null;
        if ((noteInPattern > track.currentNotePos) && (trackData = pe.patternData.at(track.name, noteInPattern))) {
         track.currentNotePos = noteInPattern;
         track.currentNote = (trackData.not.x * 12) + trackData.not.y;

         var modLen = 0;
         var modVal = 0;
         if (trackData.mod) {
           track.pitchEnvD = (trackData.mod.x / 16);
           track.pitchEnvAmount = (trackData.mod.y - 8)/ 8;
         }
         if (trackData.env) {
           track.envD = (trackData.env.x / 16);
           track.vol = trackData.env.y / 16;
         }
         if (trackData.snd) {
           track.filterInterpol.set((trackData.snd.y / 16 + 0.02));
           track.qInterpol.set(trackData.snd.x / 16 );
         }
         track.posInNote = 0;
        }
        var envPos= track.posInNote / (noteLengthInSamples * 2);
        var envPosDouble = envPos / 2;
        
        var envVal = 0;
        if (envPosDouble < track.envD) {
          envVal = 1 - (envPosDouble / track.envD);
          var noteFreq = noteToFreq(track.currentNote);
          if (envPos < track.pitchEnvD) {
            var pEnv = 1 - (envPos/track.pitchEnvD);
            var pFactor = (1 + (2* Math.abs(track.pitchEnvAmount) * pEnv));
            if (track.pitchEnvAmount >= 0) {
             noteFreq *= pFactor;
            } else if (track.pitchEnvAmount < 0) {
             noteFreq /= Math.abs(pFactor);
            }           
          }
          notePeriod = 44100.0 / noteFreq;
          var periodPos = (track.posInNote % notePeriod) / notePeriod;

          if (track.osc === 1) {
            sound = periodPos > 0.5 ? 1.0 : -1.0;
          } else if (track.osc === 2) {
            sound = 2 * (1- periodPos) - 1;
          } else if (track.osc === 3) {
            sound = Math.random() * 2 - 1;
          }

          track.volInterpol.set(envVal * track.vol);
          sound = track.filter.process(sound, track.filterInterpol.get(), track.qInterpol.get());
          sound *= track.volInterpol.get();

        } else {
         sound = 0;
         track.filter.process(sound, track.filterInterpol.get(), track.qInterpol.get()); // keeping the filter up to date
        }
        track.posInNote++;
        mixerValue += sound;
      }
      soundbridge.addToBuffer(mixerValue / numTracks);      
    }
    absoluteBufferPos += bufferSize;
    return;
  };
  
  

  return that;
};

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
