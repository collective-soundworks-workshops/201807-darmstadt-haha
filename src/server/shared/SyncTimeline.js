import { serviceManager, Service } from 'soundworks/server';

const SERVICE_ID = 'service:sync-timeline';

class SyncPlayControl extends Service {
  constructor() {
    super(SERVICE_ID);

    this._state = 'stop';
    this._position = 0;
    this._startTime = null;

    this.syncScheduler = this.require('sync-scheduler');

    this.setState = this.setState.bind(this);
  }

  configure(options) {
    super.configure(options);
  }

  start() {
    super.start();

    this.ready();
  }

  setState(state) {
    if (this._state !== state) {
      this._state = state;

      const syncTime = this.syncScheduler.currentTime;

      switch (this._state) {
        case 'start':
          this._position = this._position;
          this._startTime = syncTime;
          this.broadcast(null, null, `acknowledge:start`, syncTime, this._position);
          break;
        case 'pause':
          if (!this._startTime)
            this._startTime = syncTime;

          this._position += (syncTime - this._startTime);
          this.broadcast(null, null, `acknowledge:pause`, syncTime);
          break;
        case 'stop':
          this._position = 0;
          this.broadcast(null, null, `acknowledge:stop`, syncTime);
          break;
      }
    }
  }

  connect(client) {
    super.connect(client);

    // need a syncTime
    this.receive(client, 'request:start', () => this.setState('start'));
    this.receive(client, 'request:pause', () => this.setState('pause'));
    this.receive(client, 'request:stop', () => this.setState('stop'));

    this.receive(client, 'request:seek', position => {
      const syncTime = this.syncScheduler.currentTime;
      this._position = position;

      this.broadcast(null, null, 'acknowledge:seek', syncTime, this._position);
    });
  }

  disconnect(client) {
    super.disconnect(client);
  }
}

serviceManager.register(SERVICE_ID, SyncPlayControl);
