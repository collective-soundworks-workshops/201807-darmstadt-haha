import { Experience, View } from 'soundworks/client';
import SharedParamsComponent from './SharedParamsComponent';
import LogComponent from './LogComponent';

const template = `
  <div id="shared-params"></div>
  <div id="log"></div>
`;

class ControllerExperience extends Experience {
  constructor(options = {}) {
    super();

    this.sharedParams = this.require('shared-params');
    this.syncTimeline = this.require('sync-timeline');

    this.sharedParamsComponent = new SharedParamsComponent(this, this.sharedParams);
    this.logComponent = new LogComponent(this);

    this.setGuiOptions('numPlayers', { readonly: true });
    this.setGuiOptions('control', { type: 'buttons' });
    this.setGuiOptions('seek', { type: 'slider', size: 'large' });
    this.setGuiOptions('distanceMock', { type: 'slider', size: 'large' });

    if (options.auth)
      this.auth = this.require('auth');
  }

  start() {
    super.start();

    this.view = new View(template, {}, {}, { id: 'controller' });

    this.sharedParams.addParamListener('control', value => {
      this.syncTimeline[value]();
    });

    this.sharedParams.addParamListener('seek', value => {
      this.syncTimeline.seek(value);
    });

    this.show().then(() => {
      this.sharedParamsComponent.enter();
      this.logComponent.enter();

      this.receive('log', (type, ...args) => {
        switch (type) {
          case 'error':
            this.logComponent.error(...args);
            break;
        }
      });

    });
  }

  setGuiOptions(name, options) {
    this.sharedParamsComponent.setGuiOptions(name, options);
  }
}

export default ControllerExperience;
