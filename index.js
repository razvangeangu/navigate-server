var bleno = require('bleno');
var Wireless = require('wireless');

var wireless = new Wireless({
    iface: 'wlan0',
    updateFrequency: 10, // Optional, seconds to scan for networks 
    connectionSpyFrequency: 2, // Optional, seconds to scan if connected 
    vanishThreshold: 2 // Optional, how many scans before network considered gone 
});
 
wireless.enable(function(err) {
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
                        properties: ['notify'],
                        onSubscribe: (maxValueSize, updateValueCallback) => {
                            console.log('Device subscribed');
                            this.intervalId = setInterval(() => {
                                console.log('Sending: Wireless data!');
                                const wirelessData = Buffer.from(JSON.stringify(getData()) + '#done');
                                const byteSize = Math.round(wirelessData.byteLength / maxValueSize);
                                const dataChunks = chunks(wirelessData, byteSize);
                                for (chunk of dataChunks) {
                                    updateValueCallback(chunk);
                                }
                                // updateValueCallback(wirelessData);
                            }, 3 * 1000); // 3 seconds
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
        result.push(buffer.slice(i, i+= size));
    }

    return result;
}