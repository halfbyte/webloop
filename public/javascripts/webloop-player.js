
var soundbridge;

var Music = {notes: /* 0 */ [ 16.35,    17.32,    18.35,    19.45,    20.6,     21.83,    23.12,    24.5,     25.96,    27.5,  29.14,    30.87,
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

  if (a == 0) a = 0.000001; // no div/0 errors
  if (d == 0) d = 0.000001;

  that.at = function(pos) {
    if (pos <= a) {
      return pos/a;
    } else if (pos <= (a + h) ) {
      return 1;
    } else if (pos <= (a + h + d) ) {
      return(1 - ((pos - (a + h))/d));
    }
    return 0;
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
  }
  that.set = function(newVal) {
    target = newVal;
    var diff = newVal - val;
    delta = diff / smoothness;
    count = smoothness;
  }
  return that;
}

function noteToFreq(note) {
    return Music.notes[note];
    // return 440.0 * ( Math.pow(2.0,((note - 69.0) / 12)));
}

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
}

// function PatternMachine = {
//   var that = {};
//   var that.volEnv = ADEnv(0,0,2);
//   var that
//   return that;
// }
var currentNotePos = -1;
var currentNote = 0;
var posInNote = 0;
var filter = SVF();
var filterInterpol = InterPol(1,20);
var qInterpol = InterPol(0,20);
var volInterpol = InterPol(0,100);
var noteInterpol = InterPol(0,20);
var noteInPattern=0;
var posInPatttern=0;

function genSound(bufferSize, bufferPos) {
  var startTime = new Date().getTime();
  var BPM = 120;
  var beatFreq = BPM / 60.0;

  var patternLengthInSamples = 4 * 44100 / beatFreq;
  var noteLengthInSamples = patternLengthInSamples / 16;


  var buffer = "";
  var env = ADEnv(0.2, 0.5, 0.3);
  var pitchEnv = ADEnv(0, 0, 0.2);
  var vol = 1;

  for(var i=0;i<bufferSize*2;i++) {
     posInPattern = (bufferPos + i) % patternLengthInSamples;
     noteInPattern = Math.floor(posInPattern / (noteLengthInSamples));
     if (posInPattern == 0) {
       currentNotePos = -1;
     }
     if (pe.patternData.not[noteInPattern] != null && (noteInPattern > currentNotePos)) {
       console.log(pe.patternData.not[noteInPattern]);
       currentNotePos = noteInPattern;
       currentNote = (pe.patternData.not[noteInPattern].x * 12) + pe.patternData.not[noteInPattern].y;
       if (pe.patternData.env[noteInPattern]) {
         var len = pe.patternData.env[noteInPattern].x / 16;
         env = ADEnv(0,0,len);
         vol = pe.patternData.env[noteInPattern].y / 16;
       }
       if (pe.patternData.snd[noteInPattern]) {
         var fnew = pe.patternData.snd[noteInPattern].y / 16;
         filterInterpol.set(fnew);
         qInterpol.set(pe.patternData.snd[noteInPattern].x / 16 * 3);
       }
       posInNote = 0;
     }
     var envVal = env.at(posInNote / (noteLengthInSamples));
     if (envVal > 0) {
       var noteFreq = noteToFreq(currentNote);
       notePeriod = 44100.0 / noteFreq;
       var periodPos = ((i + bufferPos) % notePeriod) / notePeriod;
       //var sound = Math.sin(2 * Math.PI * periodPos);
       var sound = (periodPos > 0.5) ? 1.0 : -1.0;

       // sound = 1 - (periodPos * 2);
       //sound = filter.process(sound, filterInterpol.get() + 0.1, qInterpol.get());
       volInterpol.set(envVal * vol);
       sound *= volInterpol.get();

     } else {
       sound = 0;
       filter.process(sound, filterInterpol.get(), qInterpol.get()); // keeping the filter up to date
     }
     var word = Math.round((sound * 32768.0 * 0.3) + 32768.0);
     // if (word > 65536) console.log(word);
     buffer += soundbridge.encodeHex(word);
     posInNote++;
  }
  var endTime = new Date().getTime();
  console.log(endTime-startTime);
  return buffer;

}

$(function() {


  window.setTimeout(function() {
    soundbridge = SoundBridge('soundbridge');
    soundbridge.setCallback('genSound');
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
