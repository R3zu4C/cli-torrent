import download from './src/download.js';
import tp from './src/torrent-parser.js';

const torrent = await tp.open(process.argv[2]);
// console.log(torrent.info.name.toString('utf8'));

download(torrent, torrent.info.name);
