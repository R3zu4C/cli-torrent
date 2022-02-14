import tp from './torrent-parser.js';

export default class {
  #requested;

  #received;

  constructor(torrent) {
    const buildPieceArray = () => {
      const nPieces = torrent.info.pieces.length / 20; // torrent.info.pieces contains the 20 Byte SHA-1 hash of each piece, hence total length divided by 20.
      const arr = Array(nPieces).fill().map((_, i) => Array(tp.blocksPerPiece(torrent, i)).fill(false));
      return arr;
    };

    this.#requested = buildPieceArray();
    this.#received = buildPieceArray();
  }

  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.index / tp.BLOCK_LEN;
    this.#requested[pieceBlock.index][blockIndex] = true;
  }

  addReceived(pieceBlock) {
    const blockIndex = pieceBlock.index / tp.BLOCK_LEN;
    this.#received[pieceBlock.index][blockIndex] = true;
  }

  isRequired(pieceBlock) {
    if (this.#requested.every((blocks) => blocks.every((i) => i === true))) {
      this.#requested = this.#received.map((blocks) => blocks.slice());
    }

    const blockIndex = pieceBlock.index / tp.BLOCK_LEN;
    return !(this.#requested[pieceBlock.index][blockIndex]);
  }

  isDone() {
    return this.#requested.every((blocks) => blocks.every((i) => i === true));
  }

  printPercentDone() {
    const downloaded = this.#received.reduce((totalBlocks, blocks) => blocks.filter((i) => i).length + totalBlocks, 0);

    const total = this.#received.reduce((totalBlocks, blocks) => blocks.length + totalBlocks, 0);

    const percent = Math.floor((downloaded / total) * 100);

    process.stdout.write(`progress: ${percent}%\r`);
  }
}
