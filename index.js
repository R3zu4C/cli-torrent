import bencode from 'bencode';
import getPeers from './src/tracker.js';
import { open } from './src/torrent-parser.js';

const torrent = await bencode.decode(open('sr.torrent'));

getPeers(torrent, (peers) => console.log(peers));
