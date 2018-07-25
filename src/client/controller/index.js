// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import ControllerExperience from './ControllerExperience';
import serviceViews from '../shared/serviceViews';
import SyncTimeline from '../shared/SyncTimeline';

function bootstrap() {

  document.body.classList.remove('loading');


  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);
  soundworks.client.init(config.clientType, config);

  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  const controller = new ControllerExperience(config.assetsDomain);
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
