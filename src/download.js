import net from 'net';
import { Buffer } from 'buffer';
import message from './message.js';
import getPeers from './tracker.js';

import Pieces from './Pieces.js';
import Queue from './Queue.js';

const getWholeMsg = (socket, cb) => {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', (recvBuf) => {
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    const msgLen = () => {
      if (handshake) return savedBuf.readUInt8(0) + 49;
      return savedBuf.readUInt8(0) + 4;
    };

    if (savedBuf.length >= msgLen()) {
      cb(savedBuf.slice(0, msgLen()));
      savedBuf.slice(msgLen());
      handshake = false;
    }
  });
};

const requestPiece = (socket, pieces, queue) => {
  if (queue.choked) return null;

  while (queue.length()) {
    const pieceBlock = queue.dequeue();
  }
}

const chokeHandler = (socket) => {
  socket.end();
};

const unchokeHandler = (socket, pieces, queue) => {
  /* eslint no-param-reassign: ["error", { "props": false }] */
  queue.choked = false;
  requestPiece(socket, pieces, queue);
};

const haveHandler = (payload) => {};

const bitfieldHandler = (payload) => {};

const pieceHandler = (payload) => {};

const isHandshake = (msg) => msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';

const msgHandler = (socket, msg, pieces, queue) => {
  if (isHandshake(msg)) socket.write(message.buildInterested());
  else {
    const m = message.msgParse(msg);

    if (m.id === 0) chokeHandler(socket);
    if (m.id === 1) unchokeHandler();
    if (m.id === 4) haveHandler(m.payload);
    if (m.id === 5) bitfieldHandler(m.payload);
    if (m.id === 7) pieceHandler(m.payload);
  }
};

const download = (peer, torrent, pieces) => {
  const socket = new net.Socket();

  socket.on('error', console.log);

  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });

  const queue = new Queue(torrent);
  getWholeMsg(socket, (msg) => msgHandler(socket, msg, pieces, queue));
};

export default (torrent) => {
  getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent);
    peers.forEach((peer) => download(peer, torrent, pieces));
  });
};
