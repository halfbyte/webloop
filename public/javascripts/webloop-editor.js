var pe;

$(function() {

function patternEditor() {

  var that = {};

  that.patternData = {
    not: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    snd: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    env: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
  };

  that.emptyPattern = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

  that.currentType = 'not';

  var drawStep = function(id, type, xy, color, clear) {
    var ctx = $(id).get(0).getContext('2d');
    ctx.fillStyle = color; ctx.strokeStyle = color;

    // console.log("drawStep for: " + type)

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
  };

  var xyFromPattern = function(num, type) {
    if (!that.patternData[type]) return null;
    if (!that.patternData[type][num]) return null;
    x = that.patternData[type][num].x;
    y = that.patternData[type][num].y;
    return [x,y]
  };

  var drawStepFromPattern = function(num) {
    var xy = xyFromPattern(num, that.currentType);
    drawStep($('#pattern-element-' + num), that.currentType, xy, '#000', true)
  };

  var drawEditStep = function(num, x, y) {
    var xy = xyFromPattern(num, that.currentType);
    drawStep('#detail-layer', that.currentType, xy, '#000', true);
    drawStep('#detail-layer', that.currentType, [x, y], '#FF0');

  }

  var checkRange = function (x,y, type) {

    if (type == 'not') {
      if (x<0) x = 0;
      if (y<0) y = 0;
      if (x > 8) x = 8;
      if (y > 10) y = 10;
    }

    if (type == 'snd') {
      if (x<0) x = 0;
      if (y<0) y = 0;
      if (x > 15) x = 15;
      if (y > 15) y = 15;
    }

    // console.log("x, y" + x + ", " + y)
    return [x,y];
  };

  var redraw = function() {
    // console.log('redraw!');
    for(var i=0;i<16;i++) drawStepFromPattern(i);
  }

  var updateButtons = function() {
    $('#toolbar li a').removeClass('selected');
    $('#toolbar li a#button-' + that.currentType).addClass('selected');
  }

  var reloadPattern = function() {
    $.get('/update', {}, function(data) {
      that.patternData = data;
      redraw();
    }, 'json');
  }

  var setPatternData = function(num, x, y) {
    if (!that.patternData[that.currentType]) that.patternData[that.currentType] = that.emptyPattern;
    if (!that.patternData[that.currentType][num]) that.patternData[that.currentType][num] = {x:0,y:0};
    that.patternData[that.currentType][num].x = x;
    that.patternData[that.currentType][num].y = y;

    $.post('/edit/' + that.currentType + "/" + num, {x: x, y: y}, function(data) {
      redraw();
    }, 'json');
  }
  var clearPatternData = function(num) {
    that.patternData[that.currentType][num] = null;
    $.post('/edit/' + that.currentType + "/" + num, {clear: true}, function(data) {
      redraw();
    }, 'json');

  }

  function openDetail(element) {
    var idMatch = $(element).get(0).id.match(/pattern-element-(\d+)$/)
    var id = idMatch[1];

    var detailLayer = $('#detail-layer').get(0);
    if (!detailLayer) {
     $('body').append("<canvas id='detail-layer' width='32' height='32' style='display:hidden'></canvas>");
     $('body').append("<a href='#' class='button-delete' id='button-delete' style='display:hidden'>x</a>")
     detailLayer = $('#detail-layer').get(0);
    } else {
      $('#detail-layer').unbind();
    }

    var xy = xyFromPattern(id, that.currentType);
    drawStep($(detailLayer), that.currentType, xy, '#000', true);

    var offset = $(element).offset();
    $('#detail-layer').css({top: "" + (offset.top - 80) + "px", left: "" + (offset.left - 80) + "px"}).show('fast').click(function(e) {
      var offset = $('#detail-layer').offset();
      var x = Math.floor((e.clientX - offset.left) / 10);
      var y = 16 - Math.ceil((e.clientY - offset.top) / 10);
      var xy = checkRange(x,y,that.currentType);
      x = xy[0]; y = xy[1];
      var pData = setPatternData(id, x, y);

      var xy = xyFromPattern(id, that.currentType);
      drawStep($(this), that.currentType, xy, '#000', true);
      drawStepFromPattern(id, that.currentType);

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

  }

  for(var row=0;row<4;row++) {
    var rowContent = "";
    for(var col=0;col<4;col++) {
      rowContent += "<canvas width='32' height='32' class=\"pattern-element\" id=\"pattern-element-" + ((row * 4) + col ) + "\"></canvas>";
    }
    rowContent = "<div class='row'>" + rowContent + "</div>";
    $('#pattern').append(rowContent)
  }

  for(var i=0;i<16;i++) {
    $("#pattern-element-" + i).click(function(e) {
      openDetail(this);
    })
  }

  $.each(['env','not','snd'], function() {
    var cur = this;
    $('#button-' + cur).click(function() {
      // console.log('switching to ' + cur);
      that.currentType = cur;
      updateButtons();
      redraw();
    })
  })

  redraw();
  reloadPattern();
  updateButtons();
  window.setInterval( function() {
    reloadPattern();
  }, 2000);

  return that;
}

pe = patternEditor();

});
