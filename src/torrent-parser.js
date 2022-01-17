import fs from 'fs';
import bencode from 'bencode';
import crypto from 'crypto';
import bignum from 'bignum';

const open = (filepath) => fs.readFileSync(filepath);

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

export { open, infoHash, size };
