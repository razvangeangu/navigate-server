const bleno = require('bleno');
const Wireless = require('wireless');
const exec = require('child_process').exec;

const wireless = new Wireless({
  iface: 'wlan0',
});

wireless.enable(function (err) {
  wireless.start();
});

// Once bleno starts, begin advertising our BLE address
bleno.on('stateChange', (state) => {
  console.log(`State changed: ${state}`);
  if (state === 'poweredOn') {
    bleno.startAdvertising('Wi-Fi-Pi', ['12ab']);
  } else {
    bleno.stopAdvertising();
  }
});

// Notify the console that we accepted a connection
bleno.on('accept', (clientAddress) => {
  console.log(`Accepted connection from address: ${clientAddress}`);
});

// Notify the console that we have disconnected from a client
bleno.on('disconnect', (clientAddress) => {
  console.log(`Disconnected from address: ${clientAddress}`);
});

// When we begin advertising, create a new service and characteristic
bleno.on('advertisingStart', (error) => {
  if (error) {
    console.log(`Advertising start error: ${error}`);
  } else {
    console.log('Advertising start success');
    bleno.setServices([
      new bleno.PrimaryService({
        uuid: '12ab',
        characteristics: [
          new bleno.Characteristic({
            value: null,
            uuid: '34cd',
            properties: ['read', 'write', 'notify'],
            onWriteRequest: (data, offset, withoutResponse, callback) => {
              const command = data.toString('utf8');
              exec(command, (error, stdout, stderr) => {
                if (error !== null) {
                  console.log(error);
                  console.error(error);
                  callback(this.RESULT_FAILURE);
                } else {
                  console.log(`[SUCCESSFUL RECEIVED COMMAND]: ${command}`);
                  callback(this.RESULT_SUCCESS);
                }
              });
            },
            onSubscribe: (maxValueSize, updateValueCallback) => {
              console.log('Device subscribed');
              this.intervalId = setInterval(() => {
                console.log('Sending: Wireless data!');
                const wirelessData = Buffer.from(JSON.stringify(getData()) + '#');
                const byteSize = Math.round(wirelessData.byteLength / maxValueSize);
                const dataChunks = chunks(wirelessData, byteSize);
                for (chunk of dataChunks) {
                  updateValueCallback(chunk);
                }
              }, 2 * 1000);
            },
            onUnsubscribe: () => {
              console.log('Device unsubscribed');
              clearInterval(this.intervalId);
            },
          }),
        ],
      }),
    ]);
  }
});

var getData = () => {
  const list = wireless.list();
  const filteredList = [];
  for (e in list) {
    const filteredElement = [
      list[e].address,
      parseInt(list[e].strength),
    ]
    filteredList.push(filteredElement);
  }
  return filteredList;
}

var chunks = (buffer, size) => {
  const result = [];
  let i = 0;

  while (i < buffer.length) {
    result.push(buffer.slice(i, i += size));
  }

  return result;
}