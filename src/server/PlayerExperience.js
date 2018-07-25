import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.geolocation = this.require('geolocation');
    this.syncTimeline = this.require('sync-timeline');
  }

  start() {

  }

  enter(client) {
    super.enter(client);

    this.receive(client, 'coords', this.onClientCoords(client));

    this.sharedParams.update('numPlayers', this.clients.length);
  }

  exit(client) {
    super.exit(client);

    this.sharedParams.update('numPlayers', this.clients.length);
  }

  onClientCoords(client) {
    return (payload) => {
      console.log(`${client.index} -\t ${payload.id}: ${payload.coordinates[0]}, ${payload.coordinates[1]}`);
    }
  }
}


// 0 -  0: 49.8617273, 49.8617273
// 0 -  1: 49.8615395, 49.8615395
// 0 -  2: 49.861707, 49.861707
// 0 -  3: 49.8614756, 49.8614756

// 0 -  0: 49.8617365, 8.6511621
// 0 -  1: 49.8613662, 8.6521784
// 0 -  2: 49.8616281, 8.6520869
// 0 -  3: 49.8614473, 8.6523611
