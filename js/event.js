const bgSound = new SoundScape();

/**
 *
 * @param degPerSec
 * @returns {function(...[*]=)}
 */
const autorotate = function (degPerSec) {
    return function (planet) {
        let lastTick = null;
        let paused = false;
        planet.plugins.autorotate = {
            pause: function () {
                paused = true;
            },
            resume: function () {
                paused = false;
            }
        };
        planet.onDraw(function () {
            if (paused || !lastTick) {
                lastTick = new Date();
            } else {
                const now = new Date();
                const delta = now - lastTick;
                const rotation = planet.projection.rotate();
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
    let needsCentering = false;
    let globe = null;

    const resize = function () {
        const width = window.innerWidth + (options.extraWidth || 0);
        const height = window.innerHeight + (options.extraHeight || 0);
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
            const width = window.innerWidth + (options.extraWidth || 0);
            const height = window.innerHeight + (options.extraHeight || 0);
            planet.projection.scale(Math.min(width, height) / 2);
        });
    };
}

const canvas = document.getElementById('eventCanvas');

const planet = planetaryjs.planet();
planet.loadPlugin(autocenter({extraHeight: -120}));
planet.loadPlugin(autoscale({extraHeight: -120}));
planet.loadPlugin(planetaryjs.plugins.earth({
    topojson: {file: '/json/continents.json'},
    oceans: {fill: '#015C9C '},
    land: {fill: '#5DABE1 '},
    borders: {stroke: '#ABEEFB '}
}));
planet.loadPlugin(planetaryjs.plugins.pings());
planet.loadPlugin(planetaryjs.plugins.zoom({
    scaleExtent: [50, 5000]
}));
planet.loadPlugin(planetaryjs.plugins.drag({
    
    onDragStart: function () {
        this.plugins.autorotate.pause();
    },
    onDragEnd: function () {
        this.plugins.autorotate.resume();
    }
}));
planet.loadPlugin(autorotate(5));
planet.projection.rotate([100, -10, 0]);
planet.draw(canvas);

const colors = d3.scale.pow()
    .exponent(3)
    .domain([3, 2])
    .range(['red', 'yellow',]);
const angles = d3.scale.pow()
    .exponent(3)
    .domain([2.5, 10])
    .range([0.5, 15]);
const ttls = d3.scale.pow()
    .exponent(3)
    .domain([2.5, 10])
    .range([5000, 8000]);

d3.json('/json/events.json', function (err, data) {
    if (err) {
        alert("Problem loading the events data.");
        return;
    }
  for (let i = 0; i<data.length;i++){
      data[i].date =  Date.parse(data[i].date);
      console.log(data[i].date);
    }
    const start = parseInt(data[0].time, 10);
    const end = parseInt(data[data.length - 1].time, 10);
    let currentTime = start;
    let lastTick = new Date().getTime();

    const updateDate = function () {
        d3.select('#date').text(moment(currentTime).utc().format("MMM DD YYYY HH:mm UTC"));
    };

    const percentToDate = d3.scale.linear()
        .domain([0, 100])
        .range([start, end]);

    const realToData = d3.scale.linear()
        .domain([0, 1000 * 60 * 12])
        .range([0, end - start]);

    let paused = false;

    d3.select('#slider')
        .on('change', function () {
            currentTime = percentToDate(d3.event.target.value);
            updateDate();
        })
        .call(d3.behavior.drag()
            .on('dragstart', function () {
                paused = true;
            })
            .on('dragend', function () {
                paused = false;
            })
        );

    d3.timer(function () {
        const now = new Date().getTime();

        if (paused) {
            lastTick = now;
            return;
        }

        let realDelta = now - lastTick;
        if (realDelta > 500) realDelta = 500;
        const dataDelta = realToData(realDelta);

        const toPing = data.filter(function (d) {
            return d.time > currentTime && d.time <= currentTime + dataDelta;
        });

        for (let i = 0; i < toPing.length; i++) {
            const ping = toPing[i];
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

    bgSound.play();

});

