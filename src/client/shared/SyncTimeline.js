import { serviceManager, Service } from 'soundworks/client';
import * as audio from 'waves-audio';

const SERVICE_ID = 'service:sync-timeline';


class SyncPlayControl extends Service {
  constructor() {
    super(SERVICE_ID);

    this._syncScheduler = this.require('sync-scheduler');
    this._sync = this.require('sync');

    this._playControl = null;
    this._transport = null;
  }

  start() {
    super.start();

    this._playControl = new audio.PlayControl();
    this._playControl.__scheduler = this._syncScheduler;
    this._transport = this.createTransport();
    this._playControl.__setEngine(this._transport);

    this.receive('acknowledge:start', (eventTime, position) => {
      const syncTime = this._sync.getSyncTime();
      const dt = syncTime - eventTime;
      const adjustedPosition = position + dt;

      this._playControl.seek(adjustedPosition);
      this._playControl.start();
    });

    this.receive('acknowledge:pause', eventTime => {
      this._playControl.pause();
    });

    this.receive('acknowledge:stop', eventTime => {
      this._playControl.stop();
    });

    this.receive('acknowledge:seek', (eventTime, position) => {
      const syncTime = this._sync.getSyncTime();
      const dt = syncTime - eventTime;
      const adjustedPosition = position + dt;

      this._playControl.seek(adjustedPosition);
    });

    this.ready();
  }

  stop() {
    this.start = this._start.bind(this);
    this.pause = this._pause.bind(this);
    this.stop = this._stop.bind(this);

    super.stop();
  }

  // factory moethod to create synchronized transports
  createTransport() {
    const transport = new audio.Transport();
    transport.__scheduler.remove(transport.__schedulerHook);
    transport.__scheduler.remove(transport.__schedulingQueue);
    transport.__scheduler = this._syncScheduler;
    transport.__scheduler.add(transport.__schedulerHook, +Infinity);
    transport.__scheduler.add(transport.__schedulingQueue, +Infinity);

    return transport;
  }

  // play control interface
  _start() {
    this.send('request:start');
  }

  _pause() {
    this.send('request:pause');
  }

  _stop() {
    this.send('request:stop');
  }

  seek(position) {
    this.send('request:seek', position);
  }

  // transport interface
  add(engine, startPosition = 0, endPosition = Infinity, offsetPosition = 0) {
    this._transport.add(engine, startPosition, endPosition, offsetPosition);
  }

  remove(engineOrTransported) {
    this._transport.remove(engineOrTransported);
  }

  resetEnginePosition(transported, position = undefined) {
    this._transport.resetEnginePosition(transported, position);
  }

  clear() {
    this._transport.clear();
  }

  // time utilities
  get audioTime() {
    return this._syncScheduler.audioTime;
  }

  get syncTime() {
    return this._syncScheduler.syncTime;
  }

  // alias for syncTime
  get currentTime() {
    return this._syncScheduler.currentTime;
  }

  getSyncTimeAtAudioTime(audioTime) {
    return this._syncScheduler.getSyncTimeAtAudioTime(audioTime);
  }

  getAudioTimeAtSyncTime(syncTime) {
    return this._syncScheduler.getAudioTimeAtSyncTime(syncTime);
  }

}

serviceManager.register(SERVICE_ID, SyncPlayControl);
