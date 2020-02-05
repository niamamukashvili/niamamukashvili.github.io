"use strict";

(function () {
  /**
   *
   * @param degPerSec
   * @returns {function(...[*]=)}
   */
  var autorotate = function autorotate(degPerSec) {
    return function (planet) {
      var lastTick = null;
      var paused = false;
      planet.plugins.autorotate = {
        pause: function pause() {
          paused = true;
        },
        resume: function resume() {
          paused = false;
        }
      };
      planet.onDraw(function () {
        if (paused || !lastTick) {
          lastTick = new Date();
        } else {
          var now = new Date();
          var delta = now - lastTick;
          var rotation = planet.projection.rotate();
          rotation[0] += degPerSec * delta / 1000;
          if (rotation[0] >= 180) rotation[0] -= 360;
          planet.projection.rotate(rotation);
          lastTick = now;
        }
      });
    };
  };
  /**
   *
   * @param options
   * @returns {function(...[*]=)}
   */


  function autocenter(options) {
    options = options || {};
    var needsCentering = false;
    var globe = null;

    var resize = function resize() {
      var width = window.innerWidth + (options.extraWidth || 0);
      var height = window.innerHeight + (options.extraHeight || 0);
      globe.canvas.width = width;
      globe.canvas.height = height;
      globe.projection.translate([width / 2, height / 2]);
    };

    return function (planet) {
      globe = planet;
      planet.onInit(function () {
        needsCentering = true;
        d3.select(window).on('resize', function () {
          needsCentering = true;
        });
      });
      planet.onDraw(function () {
        if (needsCentering) {
          resize();
          needsCentering = false;
        }
      });
    };
  }
  /**
   *
   * @param options
   * @returns {function(...[*]=)}
   */


  function autoscale(options) {
    options = options || {};
    return function (planet) {
      planet.onInit(function () {
        var width = window.innerWidth + (options.extraWidth || 0);
        var height = window.innerHeight + (options.extraHeight || 0);
        planet.projection.scale(Math.min(width, height) / 2);
      });
    };
  }

  var canvas = document.getElementById('eventCanvas');
  var planet = planetaryjs.planet();
  planet.loadPlugin(autocenter({
    extraHeight: -120
  }));
  planet.loadPlugin(autoscale({
    extraHeight: -120
  }));
  planet.loadPlugin(planetaryjs.plugins.earth({
    topojson: {
      file: '/json/continents.json'
    },
    oceans: {
      fill: '#001320'
    },
    land: {
      fill: '#06304e'
    },
    borders: {
      stroke: '#001320'
    }
  }));
  planet.loadPlugin(planetaryjs.plugins.pings());
  planet.loadPlugin(planetaryjs.plugins.zoom({
    scaleExtent: [50, 5000]
  }));
  planet.loadPlugin(planetaryjs.plugins.drag({
    onDragStart: function onDragStart() {
      this.plugins.autorotate.pause();
    },
    onDragEnd: function onDragEnd() {
      this.plugins.autorotate.resume();
    }
  }));
  planet.loadPlugin(autorotate(5));
  planet.projection.rotate([100, -10, 0]);
  planet.draw(canvas);
  var colors = d3.scale.pow().exponent(3).domain([2, 4, 6, 8, 10]).range(['white', 'yellow', 'orange', 'red', 'purple']);
  var angles = d3.scale.pow().exponent(3).domain([2.5, 10]).range([0.5, 15]);
  var ttls = d3.scale.pow().exponent(3).domain([2.5, 10]).range([5000, 8000]);
  d3.json('/json/events.json', function (err, data) {
    if (err) {
      alert("Problem loading the events data.");
      return;
    }

    var start = parseInt(data[0].time, 10);
    var end = parseInt(data[data.length - 1].time, 10);
    var currentTime = start;
    var lastTick = new Date().getTime();

    var updateDate = function updateDate() {
      d3.select('#date').text(moment(currentTime).utc().format("MMM DD YYYY HH:mm UTC"));
    };

    var percentToDate = d3.scale.linear().domain([0, 100]).range([start, end]);
    var realToData = d3.scale.linear().domain([0, 1000 * 60 * 12]).range([0, end - start]);
    var paused = false;
    d3.select('#slider').on('change', function () {
      currentTime = percentToDate(d3.event.target.value);
      updateDate();
    }).call(d3.behavior.drag().on('dragstart', function () {
      paused = true;
    }).on('dragend', function () {
      paused = false;
    }));
    d3.timer(function () {
      var now = new Date().getTime();

      if (paused) {
        lastTick = now;
        return;
      }

      var realDelta = now - lastTick;
      if (realDelta > 500) realDelta = 500;
      var dataDelta = realToData(realDelta);
      var toPing = data.filter(function (d) {
        return d.time > currentTime && d.time <= currentTime + dataDelta;
      });

      for (var i = 0; i < toPing.length; i++) {
        var ping = toPing[i];
        planet.plugins.pings.add(ping.lng, ping.lat, {
          angle: angles(ping.mag),
          color: colors(ping.mag),
          ttl: ttls(ping.mag)
        });
      }

      currentTime += dataDelta;
      if (currentTime > end) currentTime = start;
      updateDate();
      d3.select('#slider').property('value', percentToDate.invert(currentTime));
      lastTick = now;
    });
  });
})();
//# sourceMappingURL=gaia.js.map