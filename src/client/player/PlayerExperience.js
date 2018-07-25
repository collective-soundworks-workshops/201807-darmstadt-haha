import * as soundworks from 'soundworks/client';
import PlayerRenderer from './PlayerRenderer';

const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audio = soundworks.audio;

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top">
      <button id="0" class="btn record">0</button>
      <button id="1" class="btn record">1</button>
      <button id="2" class="btn record">2</button>
      <button id="3" class="btn record">3</button>
    </div>
    <div class="section-center">
      <pre>lat: <%= latitude %></pre>
      <pre>lng: <%= longitude %></pre>
      <br />
      <pre>distance: <%= distance %></pre>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

const model = {
  title: `ok`,
  latitude: 0,
  longitude: 0,
  distance: '',
};

const destination = [49.8614944, 8.6505726];
const source = [49.8624312, 8.6526182];
const a = destination[0] - source[0];
const b = destination[1] - source[1];
const distanceUnit = Math.sqrt(a * a + b * b);

class MovingAverage {
  constructor(order) {
    this.order = order;
    this.stack = [];
    this.index = 0;
  }

  process(value) {
    this.stack[this.index] = value;
    let sum = 0;

    this.stack.forEach(value => sum += value);
    const mean = sum / this.order;

    this.index = (this.index + 1) % this.order;

    return mean;
  }
}

class GranularEngine extends audio.GranularEngine {
  constructor(syncTimeline) {
    super();

    this.syncTimeline = syncTimeline;
  }

  trigger(syncTime) {
    const audioTime = this.syncTimeline.audioTime;
    return super.trigger(audioTime);
  }
}

function createScale(domain, range) {
  const a = (range[1] - range[0]) / (domain[1] - domain[0]);
  const b = range[0] - a * domain[0];

  return x => a * x + b;
}

class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: {
        // bach: 'sounds/gould-bach-first-prelude.wav',
        haha: 'sounds/take-on-me.mp3',
      },
    });

    this.geolocation = this.require('geolocation', {});
    this.syncTimeline = this.require('sync-timeline');
    this.sharedParams = this.require('shared-params');

    this.onGeoSuccess = this.onGeoSuccess.bind(this);
    this.onGeoError = this.onGeoError.bind(this);
  }

  start() {


    this.view = new soundworks.CanvasView(template, model, {
      'click .record': (e) => {
        const id = e.target.id;
        this.send('coords', { id, coordinates: this.coordinates });
      }
    }, {
      id: this.id,
      preservePixelRatio: true,
    });

    this.show().then(() => {
      this.granular = new GranularEngine(this.syncTimeline);
      this.granular.buffer = this.audioBufferManager.data.haha;
      this.granular.connect(audioContext.destination);

      this.syncTimeline.add(this.granular);

      this.positionVarScale = createScale([0, distanceUnit], [0, 0.121]);
      this.periodScale = createScale([0, distanceUnit], [0.052, 0.174]);
      this.resamplingScale = createScale([0, distanceUnit], [0, -1140]);
      this.resamplingVarScale = createScale([0, distanceUnit], [0, 824]);
      this.movingAverage = new MovingAverage(20);

      setInterval(() => {
        navigator.geolocation.getCurrentPosition(this.onGeoSuccess, this.onGeoError)
      }, 200);

      this.sharedParams.addParamListener('distanceMock', value => {
        const dist = value * distanceUnit;
        const positionVar = this.positionVarScale(dist);
        const period = this.periodScale(dist);
        const resampling = this.resamplingScale(dist);
        const resamplingVar = this.resamplingVarScale(dist);

        console.log(positionVar);
        console.log(period);
        console.log(resampling);
        console.log(resamplingVar);
      });

      this.renderer = new PlayerRenderer();
      this.view.addRenderer(this.renderer);
      this.view.setPreRender(function(ctx, dt, canvasWidth, canvasHeight) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      });
    });
  }

  onGeoSuccess(geo) {
    const lat = geo.coords.latitude;
    const lng = geo.coords.longitude;
    this.coordinates = [lat, lng];

    const a = destination[0] - lat;
    const b = destination[1] - lng;
    const distance = Math.sqrt(a * a + b * b);

    const avg = this.movingAverage.process(distance);
    console.log(avg);

    const positionVar = this.positionVarScale(distance);
    const period = this.periodScale(distance);
    const resampling = this.resamplingScale(distance);
    const resamplingVar = this.resamplingVarScale(distance);

    this.granular.positionVar = positionVar;
    this.granular.period = period;
    this.granular.resampling = resampling;
    this.granular.resamplingVar = resamplingVar;

    this.view.model.latitude = lat;
    this.view.model.longitude = lng;
    this.view.model.distance = distance / distanceUnit;

    this.view.render();
  }

  onGeoError(err) {
    console.log(err);
  }
}

export default PlayerExperience;
