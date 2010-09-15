var pe;

$(function() {

var PatternData = function() {
  var that = {};
  var patternData = [];
  var defaultValues = {
    not: {x:2, y:0},
    snd: {x:8, y:8},
    env: {x:5, y:5},
    mod: {x:8, y:8}
  };
  
  $.each(['l', 'r', 's', 'n'], function(trk) {
    patternData[trk] = {};
    $.each(['not', 'snd', 'env', 'mod'], function(key, value) {
      patternData[trk][key] = [];
      for(var i=0;i<15;i++) {
        patternData[trk][key].push(defaultValues[key]);
      }
    });
    patternData[trk].trg = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
  });
  
  var defaultData = function(track, type, num) {
    if (typeof (patternData[track]) === 'undefined') patternData[track] = {};
    if (typeof (patternData[track][type]) === 'undefined')
      patternData[track][type] = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
    if (typeof patternData[track].trg === 'undefined')
      patternData[track].trg = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
    if (typeof (patternData[track][type][num]) === 'undefined' || patternData[track][type][num] === null) {
      if (type == 'trg') {
        patternData[track][type][num] = false;
      } else {
        if (patternData[track].trg[num] === true) {
          patternData[track][type][num] = defaultValues[type];
        }
      }
    }
  };
  
  that.dump = function() {
    // console.log(patternData);
  };
  
  that.at = function(track, num) {
    if(!patternData[track].trg[num]) return null;
    return {
      // not: patternData[track].not[num],
      // snd: patternData[track].snd[num],
      // mod: patternData[track].mod[num],
      // env: patternData[track].env[num]
      not: patternData[track].not[num] || defaultValues.not,
      snd: patternData[track].snd[num] || defaultValues.snd,
      mod: patternData[track].mod[num] || defaultValues.mod,
      env: patternData[track].env[num] || defaultValues.env
    };
  };
  
  that.get = function(track, type, num) { 
    defaultData(track, type, num);
    if (patternData[track].trg[num]) {
      return patternData[track][type][num];  
    } else {
      return null;
    }
    
  };
  
  that.set = function(room, track, type, num, data, callback) {
    defaultData(track, type, num);
    patternData[track][type][num] = data;
    patternData[track].trg[num] = true;
    $.post('/edit/' + room + "/" + track + "/" + type + "/" + num, data, function(data) {
      if(typeof callback !== 'undefined') callback();
    }, 'json');
    
  };
  that.clr = function(room, track, type, num, callback) {
    defaultData(track, type, num);
    patternData[track][type][num] = null;
    patternData[track].trg[num] = false;
    $.post('/edit/' + room + "/" + track + "/" + type + "/" + num, {clear: true}, function(data) {
      if(typeof callback !== 'undefined') callback();
    }, 'json');
    
  };
  
  that.clearRow = function(room, track, type, callback) {
    if (!patternData[track]) patternData[track] = {};
    patternData[track].trg = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
    $.post('/clear/' + room + "/" + track + "/" + type, null, function(data) {
      if(typeof callback !== 'undefined') callback();
    }, 'json');
  };
  
  that.updateFromRemote = function(room, callback) {
    $.get('/update/' + room, {}, function(data) {
      patternData = data;
      if (typeof callback !== 'undefined') callback();
    }, 'json');
  };
  return that;
};


var patternEditor = function(selectah) {

  var roomId = $(selectah).attr('data-room-id');

  var that = {};

  that.patternData = PatternData();
  that.currentType = 'not';
  that.currentTrack = 'l';
  
  that.highlightStep = function(num) {
    $('.pattern-element').removeClass('active');
    $('#pattern-element-' + num).addClass('active');
  };


  var drawStep = function(id, type, xy, color, clear) {
    var ctx = $(id).get(0).getContext('2d');
    ctx.fillStyle = color; ctx.strokeStyle = color;


    if(clear) ctx.clearRect(0, 0, 32, 32);
    if (!xy) return; // null guard

    if (type == 'not') {
      ctx.strokeRect(0, 28 - (xy[1] * 2),32,4);
      ctx.fillRect(xy[0] * 2,0,2,2);
    }
    if (type == 'snd') {
      ctx.strokeRect(xy[0] * 2, 28 - (xy[1] * 2),4,4);
    }
    if (type == 'env') {
      ctx.strokeRect(0, 28 - (xy[1] * 2),4,4);
      ctx.strokeRect(xy[0] * 2, 28,4,4);
    }
    if (type == 'mod') {
      ctx.strokeRect(10, 15, 12, 4);
      ctx.strokeRect(xy[0], 28 - xy[1] * 2, 12, 4);
    }
  };


  var xyFromCurrentPattern = function(num) {
    var data = that.patternData.get(that.currentTrack, that.currentType, num);
    if (data) {
      return [data.x, data.y];
    } else {
      return null;
    }
    
  };

  var drawStepFromPattern = function(num) {
    var xy = xyFromCurrentPattern(num);
    drawStep($('#pattern-element-' + num), that.currentType, xy, '#000', true);
  };

  var drawEditStep = function(num, x, y) {
    var xy = xyFromCurrentPattern(num);
    drawStep('#detail-layer', that.currentType, xy, '#000', true);
    drawStep('#detail-layer', that.currentType, [x, y], '#FF0');

  };

  var checkRange = function (x,y, type) {

    if (type == 'not') {
      if (x<0) x = 0;
      if (y<0) y = 0;
      if (x > 7) x = 7;
      if (y > 10) y = 10;
    }

    if (type == 'snd') {
      if (x<0) x = 0;
      if (y<0) y = 0;
      if (x > 15) x = 15;
      if (y > 15) y = 15;
    }

    if (type == 'mod') {
      if (x<0) x = 0;
      if (y<0) y = 0;
      if (x > 15) x = 15;
      if (y > 15) y = 15;
    }
    return [x,y];
  };

  var redraw = function() {
    for(var i=0;i<16;i++) drawStepFromPattern(i);
  };

  var updateButtons = function() {
    $('#toolbar li a').removeClass('selected');
    $('#toolbar li a#button-' + that.currentType).addClass('selected');
  };

  var reloadPattern = function() {
    that.patternData.updateFromRemote(roomId, redraw);
  };

  var setPatternData = function(num, x, y) {
    that.patternData.set(roomId, that.currentTrack, that.currentType, num, {x: x, y: y}, redraw);
  };
  var clearPatternData = function(num) {
    that.patternData.clr(roomId, that.currentTrack, that.currentType, num, redraw);
  };
  
  var clearRow = function() {
    that.patternData.clearRow(roomId, that.currentTrack, that.currentType, redraw);
  };

  function openDetail(element) {
    var idMatch = $(element).get(0).id.match(/pattern-element-(\d+)$/);
    var id = idMatch[1];

    var detailLayer = $('#detail-layer').get(0);
    if (!detailLayer) {
     $('body').append("<canvas id='detail-layer' width='32' height='32' style='display:hidden'></canvas>");
     $('body').append("<a href='#' class='button-delete' id='button-delete' style='display:hidden'>x</a>");
     detailLayer = $('#detail-layer').get(0);
    } else {
      $('#detail-layer').unbind();
    }

    var xy = xyFromCurrentPattern(id);
    drawStep($(detailLayer), that.currentType, xy, '#000', true);

    var offset = $(element).offset();
    $('#detail-layer').css({top: "" + (offset.top - 80) + "px", left: "" + (offset.left - 80) + "px"}).show('fast').click(function(e) {
      var offset = $('#detail-layer').offset();
      var x = Math.floor((e.clientX - offset.left) / 10);
      var y = 16 - Math.ceil((e.clientY - offset.top) / 10);
      var xy = checkRange(x,y,that.currentType);
      x = xy[0]; y = xy[1];
      var pData = setPatternData(id, x, y);

      xy = xyFromCurrentPattern(id);
      drawStep($(this), that.currentType, xy, '#000', true);
      drawStepFromPattern(id);

      $(this).unbind().hide('slow');
      $('#button-delete').hide('slow').unbind();

    }).mousemove(function(e) {
      var offset = $('#detail-layer').offset();
      var x = Math.floor((e.clientX - offset.left) / 10);
      var y = 16-Math.ceil((e.clientY - offset.top) / 10);
      var xy = checkRange(x,y,that.currentType);
      x = xy[0]; y = xy[1];
      drawEditStep(id, x, y);
    });
    $('#button-delete').css({top: offset.top - 80, left: offset.left + 80}).show('fast').click(function(e) {
      $(this).unbind().hide('slow');
      $('#detail-layer').hide('slow').unbind();
      clearPatternData(id);
    });

  };

  for(var row=0;row<4;row++) {
    var rowContent = "";
    for(var col=0;col<4;col++) {
      rowContent += "<canvas width='32' height='32' class=\"pattern-element\" id=\"pattern-element-" + ((row * 4) + col ) + "\"></canvas>";
    }
    rowContent = "<div class='row'>" + rowContent + "</div>";
    $('#pattern').append(rowContent);
  }

  for(var i=0;i<16;i++) {
    $("#pattern-element-" + i).click(function(e) {
      openDetail(this);
    });
  }

  $.each(['env','not','snd', 'mod'], function() {
    var cur = this;
    $('#button-' + cur).click(function() {
      that.currentType = cur;
      updateButtons();
      redraw();
    });
  });
  
  $("#channels li a").click(function() {
    var channel = this.id.match(/channel\-(\w{1})/)[1];
    that.currentTrack = channel;
    $("#channels li a").removeClass('active');
    $(this).addClass("active");
    redraw();
    return false;
  });
  
  $("#button-clear").click(function() {
    var row = that.patternData.clearRow(roomId, that.currentTrack, that.currentType, redraw);
    return false;
  });
  
  $("#channel-l").addClass("active");

  redraw();
  reloadPattern();
  updateButtons();
  window.setInterval( function() {
    reloadPattern();
  }, 2000);

  return that;
};

pe = patternEditor('#edit-area');
window.setInterval(function() {
  pe.patternData.dump();
}, 2000);
});
