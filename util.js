const { deferred } = require("promise-callbacks");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.connect = async function connect(reader) {
  const connect = deferred({ variadic: true });

  reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, connect.defer());

  const [protocol, err] = await connect;

  if (err) throw Error(err);

  return protocol;
};

module.exports.disconnect = async function disconnect(reader) {
  const disconnect = deferred({ variadic: true });

  reader.disconnect(disconnect.defer());

  const [err] = await disconnect;

  if (err) throw Error(err);

  return;
};

module.exports.approve = async function approve(reader) {
  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x29, 0x01, 0b10]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x28, 0x01, 2]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  await sleep(150);

  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x29, 0x01, 0b00]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  await sleep(50);
};

module.exports.reject = async function reject(reader) {
  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x29, 0x01, 0b01]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x28, 0x01, 2]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  await sleep(200);

  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x28, 0x01, 5]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  await sleep(50);

  reader.control(
    Buffer.from([0xe0, 0x00, 0x00, 0x29, 0x01, 0b00]),
    0x42000000 + 3500,
    6,
    () => {}
  );

  await sleep(50);
};
