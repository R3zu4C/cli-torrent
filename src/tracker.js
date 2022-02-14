import dgram from 'dgram';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import tp from './torrent-parser.js';

const buildConnReq = () => {
  const buf = Buffer.alloc(8 + 4 + 4);

  // connection id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  // action
  buf.writeUInt32BE(0, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);

  return buf;
};

const parseConnResp = (resp) => {
  if (resp.length < 16) throw new Error('Wrong response length getting connection id');
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8),
  };
};

const buildAnnounceReq = async (connId, torrent, port = 6881) => {
  const buf = Buffer.alloc(8 + 4 + 4 + 20 + 20 + 8 + 8 + 8 + 4 + 4 + 4 + 4 + 2);

  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  const hash = await tp.infoHash(torrent);
  hash.copy(buf, 16);
  // peer id
  crypto.randomBytes(20).copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  tp.size(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);

  return buf;
};

const parseAnnounceResp = (resp) => {
  const group = (buf) => {
    const groups = [];
    for (let i = 0; i < buf.length; i += 6) {
      groups.push(buf.slice(i, i + 6));
    }
    return groups;
  };

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20)).map((address) => ({
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

const getPeers = async (torrent, cb) => {
  const trackers = [];

  trackers.push(torrent.announce.toString('utf8'));
  torrent['announce-list'].forEach((urlBuffer) => {
    trackers.push(urlBuffer.toString('utf8'));
  });

  let socketIdx = 0;
  let trackerIdx = 0;
  const sockets = [];
  const conn = setInterval(async () => {
    const tracker = new URL(trackers[trackerIdx]);
    try {
      if (tracker.protocol === 'udp:') {
        console.log(`Sending connection request to - ${tracker.hostname}`);
        const socket = dgram.createSocket('udp4');
        sockets.push(socket);
        const msg = buildConnReq();
        socket.send(msg, 0, msg.length, tracker.port, tracker.hostname, () => {});
        socket.on('message', async (response) => {
          if (respType(response) === 'connect') {
            const connResp = parseConnResp(response);
            const announceReq = await buildAnnounceReq(connResp.connectionId, torrent);
            socket.send(announceReq, 0, announceReq.length, tracker.port, tracker.hostname, () => {});
          } else if (respType(response) === 'announce') {
            const announceResp = parseAnnounceResp(response);
            clearInterval(conn);
            cb(announceResp.peers);
          } else if (respType(response) === 'scrape') {
            // TODO
          } else if (respType(response) === 'error') {
            const error = response.readUIntBE(8, 1);
            throw new Error(`Error while trying to get a response: ${error}`);
          }
        });
        if (socketIdx > 0) sockets[socketIdx - 1].close();
        socketIdx = (socketIdx + 1) % (trackers.length);
      } else if (tracker.protocol === 'http:') {
        // TODO
      }
      trackerIdx = (trackerIdx + 1) % trackers.length;
    } catch (err) {
      console.log(`Connection to ${tracker.hostname} failed: ${err}`);
    }
  }, 2000);
};

export default { getPeers };
