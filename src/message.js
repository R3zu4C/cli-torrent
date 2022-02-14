import crypto from 'crypto';
import { Buffer } from 'buffer';
import tp from './torrent-parser.js';

const buildHandshake = async (torrent) => {
  const buf = Buffer.alloc(20 + 8 + 20 + 20);

  // pstrlen
  buf.writeUInt8(19, 0);
  // pstr
  buf.write('BitTorrent protocol', 1);
  // reserved
  buf.writeUInt32BE(0, 20);
  buf.writeUInt32BE(0, 24);
  // info hash
  const hash = await tp.infoHash(torrent);
  hash.copy(buf, 28);
  // peer id
  crypto.randomBytes(20).copy(buf, 48);

  return buf;
};

const buildKeepAlive = () => Buffer.alloc(4);

const buildChoke = () => {
  const buf = Buffer.alloc(4 + 1);

  // len
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(0, 4);

  return buf;
};

const buildUnchoke = () => {
  const buf = Buffer.alloc(4 + 1);

  // len
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(1, 4);

  return buf;
};

const buildInterested = () => {
  const buf = Buffer.alloc(4 + 1);

  // len
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(2, 4);

  return buf;
};

const buildNotInterested = () => {
  const buf = Buffer.alloc(4 + 1);

  // len
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(3, 4);

  return buf;
};

// TODO: Implement HAVE suppression
const buildHave = (pieceIndex) => {
  const buf = Buffer.alloc(4 + 1 + 4);

  // len
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(4, 4);
  // piece index
  buf.writeUInt32BE(pieceIndex, 5);

  return buf;
};

const buildBitfield = (bitfield) => {
  const buf = Buffer.alloc(4 + 1 + bitfield.length);

  // len
  buf.writeUInt32BE(5 + bitfield.length, 0);
  // id
  buf.writeUInt8(5, 4);
  // bitfield
  bitfield.copy(buf, 5);

  return buf;
};

const buildRequest = (piece) => {
  const buf = Buffer.alloc(4 + 1 + 4 + 4 + 4);

  // len
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(6, 4);
  // piece index
  buf.writeUInt32BE(piece.index, 5);
  // piece block begin
  buf.writeUInt32BE(piece.begin, 9);
  // piece block length
  buf.writeUInt32BE(piece.length, 13);

  return buf;
};

const buildPiece = (piece) => {
  const buf = Buffer.alloc(4 + 1 + 4 + 4 + piece.block.length);

  // len
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(7, 4);
  // piece index
  buf.writeUInt32BE(piece.index, 5);
  // piece block begin
  buf.writeUInt32BE(piece.begin, 9);
  // piece block
  piece.block.copy(buf, 13);

  return buf;
};

const buildCancel = (piece) => {
  const buf = Buffer.alloc(4 + 1 + 4 + 4 + 4);

  // len
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(8, 4);
  // piece index
  buf.writeUInt32BE(piece.index, 5);
  // piece begin
  buf.writeUInt32BE(piece.begin, 9);
  // piece length
  buf.writeUInt32BE(piece.length, 13);

  return buf;
};

const buildPort = (port) => {
  const buf = Buffer.alloc(4 + 1 + 2);

  // len
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(9, 4);
  // port
  buf.writeUInt16BE(port, 5);

  return buf;
};

const msgParse = (msgBuf) => {
  const size = msgBuf.readUInt32BE(0);
  const id = msgBuf.length > 4 ? msgBuf.readInt8(4) : null;
  const payloadBuf = msgBuf.length > 5 ? msgBuf.slice(5) : null;
  const payload = payloadBuf;
  if (id === 6 || id === 7 || id === 8) {
    payload.index = payloadBuf.readUInt32BE(0);
    payload.begin = payloadBuf.readUInt32BE(4);
    if (id === 7) payload.block = payloadBuf.slice(8);
    else payload.length = payloadBuf.slice(8);
  }

  return { size, id, payload };
};

export default {
  buildBitfield,
  buildCancel,
  buildChoke,
  buildHandshake,
  buildHave,
  buildInterested,
  buildKeepAlive,
  buildNotInterested,
  buildPiece,
  buildPort,
  buildRequest,
  buildUnchoke,
  msgParse,
};
