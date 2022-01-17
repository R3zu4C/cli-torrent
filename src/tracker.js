import dgram from 'dgram';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import * as tp from './torrent-parser.js';

const udpSend = (socket, message, rawUrl) => {
  const url = new URL(rawUrl);
  if (url.protocol === 'udp:') socket.send(message, 0, message.length, url.port, url.hostname, () => {});
};

const buildConnReq = () => {
  const buf = Buffer.alloc(16); // 2

  // connection id
  buf.writeUInt32BE(0x417, 0); // 3
  buf.writeUInt32BE(0x27101980, 4);
  // action
  buf.writeUInt32BE(0, 8); // 4
  // transaction id
  crypto.randomBytes(4).copy(buf, 12); // 5

  return buf;
};

const parseConnResp = (resp) => ({
  action: resp.readUInt32BE(0),
  transactionId: resp.readUInt32BE(4),
  connectionId: resp.slice(8),
});

const buildAnnounceReq = (connId, torrent, port = 6881) => {
  const buf = Buffer.alloc(98);

  connId.copy(buf, 0);

  buf.writeUInt32BE(1, 8);

  crypto.randomBytes(4).copy(buf, 12);

  tp.infoHash(torrent).copy(buf, 16);

  const peerId = crypto.randomBytes(20);
  Buffer.from('-RZ0001-').copy(peerId);
  peerId.copy(buf, 36);

  Buffer.alloc(8).copy(buf, 56);

  tp.size(torrent).copy(buf, 64);

  Buffer.alloc(8).copy(buf, 72);

  buf.writeUInt32BE(0, 80);

  buf.writeUInt32BE(0, 84);

  crypto.randomBytes(4).copy(buf, 88);

  buf.writeInt32BE(-1, 92);

  buf.writeUInt16BE(port, 96);

  return buf;
};

const parseAnnounceResp = (resp) => {
  function group(iterable, groupSize) {
    const groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map((address) => ({
      ip: address.slice(0, 4).join('.'),
      port: address.readUInt16BE(4),
    })),
  };
};

const respType = (resp) => {
  const action = resp.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
  if (action === 2) return 'scrape';
  return 'error';
};

export default async (torrent, cb) => {
  const socket = dgram.createSocket('udp4');
  const urls = [];
  urls.push(torrent.announce.toString('utf8'));
  torrent['announce-list'].forEach((urlBuffer) => {
    urls.push(urlBuffer.toString('utf8'));
  });
  // 1. send connect request
  const msg = buildConnReq();
  udpSend(socket, msg, urls[2]);

  socket.on('message', (response) => {
    if (respType(response) === 'connect') {
      const connResp = parseConnResp(response);
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      udpSend(socket, announceReq, urls[2]);
    } else if (respType(response) === 'announce') {
      const announceResp = parseAnnounceResp(response);
      cb(announceResp.peers);
    }
  });
};
