const pcsclite = require("@pokusew/pcsclite");
const { deferred } = require("promise-callbacks");
const util = require("./util");

const express = require("express");
const app = express();
const http = require("http");
const crypto = require("crypto");
require("dotenv").config();

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" },
});

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const devTags = ["8b2a1345", "4bf41145", "00000000"];

if (process.env.MODE !== "dev" && process.env.MODE !== "prod") {
  console.error("No mode found in env. Exiting...");
  process.exit(1);
}

function isDev(command) {
  if (process.env.MODE === "dev") {
    command;
  } else {
    console.log("Prod mode active");
  }
}

isDev(
  console.log("Dev mode active"),
  rl.on("line", () => {
    const randomTag = devTags[Math.floor(Math.random() * devTags.length)]; // Select a random tag
    io.emit("tag", randomTag); // Emit the random tag to all connected clients
    console.log(`Sent tag: ${randomTag}`);
  })
);

const pcsc = pcsclite();

let currentReader;

pcsc.on("reader", (reader) => {
  currentReader = reader;

  reader.on("status", async (status) => {
    const changes = reader.state ^ status.state;

    if (!changes) {
      return;
    }

    if (
      changes & reader.SCARD_STATE_PRESENT &&
      status.state & reader.SCARD_STATE_PRESENT
    ) {
      const protocol = await util.connect(reader);

      const getUid = deferred({ variadic: true });

      reader.transmit(
        Buffer.from([0xff, 0xca, 0x00, 0x00, 0x00]),
        6,
        protocol,
        getUid.defer()
      );

      const [uidData, uidErr] = await getUid;

      if (uidErr) return console.log(uidErr);

      const uid = uidData.subarray(0, -2).toString("hex");

      io.emit("tag", uid);
      console.log("tag", uid);

      await util.disconnect(reader);
    }
  });

  reader.on("end", () => {
    currentReader = null;
  });
});

io.use((socket, next) => {
  if (
    !crypto.timingSafeEqual(
      Buffer.from(socket.handshake.auth.passphrase),
      Buffer.from(process.env.SOCKETIO_PASSPHRASE)
    )
  ) {
    const err = new Error("Unauthorized");

    return next(err);
  }

  next();
});

io.on("connection", (socket) => {
  isDev(console.log("Frontend has connected"));
  socket.on("approve", async () => {
    await util.connect(currentReader);

    await util.approve(currentReader);

    await util.disconnect(currentReader);
  });

  socket.on("reject", async () => {
    await util.connect(currentReader);

    await util.reject(currentReader);

    await util.disconnect(currentReader);
  });
});

server.listen(27471);
