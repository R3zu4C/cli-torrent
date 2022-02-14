import tp from './torrent-parser.js';

export default class {
  #torrent;

  #queue;

  constructor(torrent) {
    this.#torrent = torrent;
    this.#queue = [];
    this.choked = true;
  }

  queue(pieceIndex) {
    const nBlocks = tp.blocksPerPiece(this.#torrent, pieceIndex);
    for (let i = 0; i < nBlocks; i += 1) {
      const pieceBlock = {
        index: pieceIndex,
        begin: i * tp.BLOCK_LEN,
        length: tp.blockLen(this.#torrent, pieceIndex, i),
      };

      this.#queue.push(pieceBlock);
    }
  }

  dequeue() {
    return this.#queue.shift();
  }

  peek() {
    return this.#queue[0];
  }

  length() {
    return this.#queue.length;
  }
}
