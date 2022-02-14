import tp from './torrent-parser.js';

export default class {
  #requested;

  #recieved;

  constructor(torrent) {
    const buildPieceArray = () => {
      const nPieces = torrent.info.length / 20; // torrent.info.pieces contains the 20 Byte SHA-1 hash of each piece, hence total length divided by 20.
      const arr = Array(nPieces).fill().map((_, i) => Array(tp.blocksPerPiece(torrent, i)).fill(false));
      return arr;
    };

    this.#requested = buildPieceArray();
    this.#recieved = buildPieceArray();
  }

  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.index / tp.BLOCK_LEN;
    this.#requested[pieceBlock.index][blockIndex] = true;
  }

  addRecieved(pieceBlock) {
    const blockIndex = pieceBlock.index / tp.BLOCK_LEN;
    this.#recieved[pieceBlock.index][blockIndex] = true;
  }

  isRequired(pieceBlock) {
    if (this.#requested.every((blocks) => blocks.every((i) => i === true))) {
      this.#requested = this.#recieved.map((blocks) => blocks.slice());
    }

    const blockIndex = pieceBlock.index / tp.BLOCK_LEN;
    return !(this.#requested[pieceBlock.index][blockIndex]);
  }

  isDone() {
    return this.#requested.every((blocks) => blocks.every((i) => i === true));
  }
}
