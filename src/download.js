import net from 'net';
import fs from 'fs';
import { Buffer } from 'buffer';
import message from './message.js';
import tracker from './tracker.js';

import Pieces from './Pieces.js';
import Queue from './Queue.js';

const getWholeMsg = (socket, cb) => {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', (recvBuf) => {
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    const msgLen = () => {
      if (handshake) return savedBuf.readUInt8(0) + 49;
      return savedBuf.readInt32BE(0) + 4;
    };

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      cb(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
};

const requestPiece = (socket, pieces, queue) => {
  if (queue.choked) return null;

  while (queue.length()) {
    const pieceBlock = queue.dequeue();
    if (pieces.isRequired(pieceBlock)) {
      socket.write(message.buildRequest(pieceBlock));
      pieces.addRequested(pieceBlock);
      break;
    }
  }
};

const chokeHandler = (socket) => {
  socket.end();
};

const unchokeHandler = (socket, pieces, queue) => {
  queue.choked = false;
  requestPiece(socket, pieces, queue);
};

const haveHandler = (socket, pieces, queue, payload) => {
  const requestFlag = queue.length === 0;
  const pieceIndex = payload.readUInt32BE(0);
  queue.queue(pieceIndex);
  if (requestFlag) requestPiece(socket, pieces, queue);
};

const bitfieldHandler = (socket, pieces, queue, payload) => {
  const requestFlag = queue.length === 0;
  payload.forEach((byte, i) => {
    for (let j = 0; j < 8; j += 1) {
      if (byte % 2) queue.queue((i * 8) + (7 - j));
      byte = Math.floor(byte / 2);
    }
  });
  if (requestFlag) requestPiece(socket, pieces, queue);
};

const pieceHandler = (socket, pieces, queue, torrent, file, payload) => {
  pieces.printPercentDone();
  pieces.addReceived(payload);

  const offset = payload.index * torrent.info['piece length'] + payload.begin;
  fs.write(file, payload.block, 0, payload.block.length, offset, () => {});

  if (pieces.isDone()) {
    console.log('DONE!');
    socket.end();
    fs.closeSync(file);
  } else {
    requestPiece(socket, pieces, queue);
  }
};

const isHandshake = (msg) => msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1, 20) === 'BitTorrent protocol';

const msgHandler = (socket, msg, pieces, queue, torrent, file) => {
  console.log(queue.peek());
  if (isHandshake(msg)) socket.write(message.buildInterested());
  else {
    const m = message.msgParse(msg);

    if (m.id === 0) chokeHandler(socket);
    if (m.id === 1) unchokeHandler(socket, pieces, queue);
    if (m.id === 4) haveHandler(socket, pieces, queue, m.payload);
    if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    if (m.id === 7) pieceHandler(socket, pieces, queue, torrent, file, m.payload);
  }
};

const download = (peer, torrent, pieces, file) => {
  const socket = new net.Socket();

  socket.on('error', console.log);

  socket.connect(peer.port, peer.ip, async () => {
    const handshake = await message.buildHandshake(torrent);
    socket.write(handshake);
  });

  const queue = new Queue(torrent);
  getWholeMsg(socket, (msg) => msgHandler(socket, msg, pieces, queue, torrent, file));
};

export default (torrent, path) => {
  tracker.getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent);
    const file = fs.openSync(path, 'w');
    peers.forEach((peer) => download(peer, torrent, pieces, file));
  });
};
