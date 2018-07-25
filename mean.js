
// 49.8614944,8.6505726 -> 0
// 49.8624312,8.6526182 -> 1

const measures = {
  0: [
    [49.8617273, 8.6521731],
    [49.8617365, 8.6511621],
    [49.8617757, 8.6523245],
    [49.8618335, 8.6522885],
  ],
  1: [
    [49.861656 , 8.6518949],
    [49.86167  , 8.6517868],
    [49.8615428, 8.6519211],
    [49.8613662, 8.6521784],
  ],
  2: [
    [49.8615879, 8.6515949],
    [49.8615443, 8.6517039],
    [49.8616281, 8.6520869],
    [49.8615474, 8.6517474],
  ],
  3: [
    [49.8614459, 8.6522738],
    [49.8615142, 8.6522121],
    [49.8613646, 8.6522629],
    [49.8614473, 8.6523611],
  ],
}

for (let id in measures) {
  const samples = measures[id];

  // do mean on lat lnt
  let sumLat = 0;
  let sumLng = 0;

  samples.forEach(sample => {
    sumLat += sample[0];
    sumLng += sample[1];
  });

  const meanLat = sumLat / samples.length;
  const meanLng = sumLng / samples.length;

  console.log(`mean ${id}:`);
  console.log(`- lat ${meanLat}`);
  console.log(`- lng ${meanLng}`);
  console.log(``);

  measures[id].meanLat = meanLat;
  measures[id].meanLng = meanLng;
}

for (let id in measures) {
  const centerLat = measures[0].meanLat;
  const centerLng = measures[0].meanLng;

  const currentLat = measures[id].meanLat;
  const currentLng = measures[id].meanLng;

  const a = centerLat - currentLat;
  const b = centerLng - currentLng;
  const dist = Math.sqrt(a * a + b * b);

  console.log(`distance to ${id}: ${dist}`);
}
