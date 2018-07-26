import * as soundworks from 'soundworks/client';
import PlayerRenderer from './PlayerRenderer';

const client = soundworks.client;
const audioContext = soundworks.audioContext;
const audio = soundworks.audio;

const template = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-top"></div>
    <div class="section-center flex-center">
      <p>
        Please come to the<br />
        <b>Mornewegschule</b>
      </p>
    </div>
    <div class="section-bottom">
      <!--
      <pre>center lat: <%= center[0] %></pre>
      <pre>center lng: <%= center[1] %></pre>
      -->
      <pre>lat: <%= latitude %></pre>
      <pre>lng: <%= longitude %></pre>
      <pre>NormDistance: <%= normDistance %></pre>
      <!--
      <br />
      <pre>distance: <%= distance %></pre>
      <pre>minDist: <%= minDist %></pre>
      <pre>maxDist: <%= maxDist %></pre>
      -->
    </div>
  </div>
`;

const center = [49.8617273,8.6521731];
const minRadius = [49.861529, 8.651291];
const maxRadius = [49.860145, 8.648228];

const minA = center[0] - minRadius[0];
const minB = center[1] - minRadius[1];
const minDist = Math.sqrt(minA * minA + minB * minB);

const maxA = center[0] - maxRadius[0];
const maxB = center[1] - maxRadius[1];
const maxDist = Math.sqrt(maxA * maxA + maxB * maxB);
console.log('minDist:', minDist);
console.log('maxDist:', maxDist);


const model = {
  center: center,
  // title: `ok`,
  latitude: 0,
  longitude: 0,
  distance: '',
  normDistance: '',
  minDist: minDist,
  maxDist: maxDist,
};

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

    this.platform = this.require('platform', {
      features: ['web-audio', 'wake-lock', 'geolocation'],
    });
    this.checkin = this.require('checkin', { showDialog: false });
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: {
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
      this.syncTimeline._playControl.setLoopBoundaries(0, this.audioBufferManager.data.haha.duration);
      this.syncTimeline._playControl.loop = true;

      this.positionVarScale = createScale([0, 1], [0, 0.121]);
      this.periodScale = createScale([0, 1], [0.052, 0.174]);
      this.resamplingScale = createScale([0, 1], [0, -1140]);
      this.resamplingVarScale = createScale([0, 1], [0, 824]);
      this.movingAverage = new MovingAverage(20);

      setInterval(() => {
        navigator.geolocation.getCurrentPosition(this.onGeoSuccess, this.onGeoError);
      }, 200);

      this.sharedParams.addParamListener('distanceMock', distance => {
        // this.updateSynth(distance);
      });

      this.renderer = new PlayerRenderer();
      this.view.addRenderer(this.renderer);
      this.view.setPreRender(function(ctx, dt, canvasWidth, canvasHeight) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      });

      // console.log('test');
      // this.onGeoSuccess({ coords: { latitude: 49.8617544, longitude:8.6495363 }});
      // this.onGeoSuccess({ coords: { latitude: 49.861540, longitude:8.650513 }});
      // this.onGeoSuccess({ coords: { latitude: 49.859386, longitude:8.646998 }});
      // console.log('real value');
      // this.onGeoSuccess({ coords: { latitude: 49.8617273, longitude:8.6521731 }});
    });
  }

  updateSynth(distance) {
    distance = Math.min(1, Math.max(0, distance));

    this.view.model.normDistance = distance;

    const positionVar = this.positionVarScale(distance);
    const period = this.periodScale(distance);
    const resampling = this.resamplingScale(distance);
    const resamplingVar = this.resamplingVarScale(distance);

    this.granular.positionVar = positionVar;
    this.granular.period = period;
    this.granular.resampling = resampling;
    this.granular.resamplingVar = resamplingVar;

    this.view.render();
  }

  onGeoSuccess(geo) {
    const lat = geo.coords.latitude;
    const lng = geo.coords.longitude;
    this.coordinates = [lat, lng];

    const a = center[0] - lat;
    const b = center[1] - lng;
    let distance = Math.sqrt(a * a + b * b);

    this.view.model.distance = distance;

    // console.log(a);
    // console.log(b);
    // console.log(distance);

    distance -= minDist;
    distance /= (maxDist - minDist);
    distance = Math.min(1, Math.max(0, distance));

    this.view.model.latitude = lat;
    this.view.model.longitude = lng;

    this.updateSynth(distance);
  }

  onGeoError(err) {
    console.log(err);
  }
}

export default PlayerExperience;
