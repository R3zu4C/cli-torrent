import fs from 'fs';
import bencode from 'bencode';
import crypto from 'crypto';
import bignum from 'bignum';

const BLOCK_LEN = 2 ** 14;

const open = (filepath) => bencode.decode(fs.readFileSync(filepath));

const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash('sha1').update(info).digest();
};

const size = (torrent) => {
  let torrentSize = 0;
  if (torrent.info.files) {
    torrent.info.files.forEach((file) => {
      torrentSize += file.length;
    });
  } else {
    torrentSize = torrent.info.length;
  }

  return bignum.toBuffer(torrentSize, { endian: 'big', size: 8 });
};

const pieceLen = (torrent, pieceIndex) => {
  const totalLength = bignum.fromBuffer(size(torrent)).toNumber();
  const pieceLength = torrent.info['piece length'];

  const lastPieceLength = totalLength % pieceLength;
  const lastPieceIndex = Math.floor(totalLength / pieceLength);

  if (lastPieceIndex === pieceIndex) return lastPieceLength;
  return pieceLength;
};

const blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  return Math.ceil(pieceLength / BLOCK_LEN);
};

const blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);

  const lastBlockLength = pieceLength % BLOCK_LEN;
  const lastBlockIndex = Math.floor(pieceLength / BLOCK_LEN);

  if (blockIndex === lastBlockIndex) return lastBlockLength;
  return BLOCK_LEN;
};

export default {
  BLOCK_LEN, open, infoHash, size, pieceLen, blocksPerPiece, blockLen,
};
