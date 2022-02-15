import tp from './torrent-parser.js';

export default class {
  constructor(torrent) {
    const buildPieceArray = () => {
      const nPieces = torrent.info.pieces.length / 20; // torrent.info.pieces contains the 20 Byte SHA-1 hash of each piece, hence total length divided by 20.
      const arr = new Array(nPieces).fill(null);
      return arr.map((_, i) => new Array(tp.blocksPerPiece(torrent, i)).fill(false));
    };

    this._requested = buildPieceArray();
    this._received = buildPieceArray();
  }

  addRequested(pieceBlock) {
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    this._requested[pieceBlock.index][blockIndex] = true;
  }

  addReceived(pieceBlock) {
    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    this._received[pieceBlock.index][blockIndex] = true;
  }

  isRequired(pieceBlock) {
    if (this._requested.every((blocks) => blocks.every((i) => i === true))) {
      this._requested = this._received.map((blocks) => blocks.slice());
    }

    const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
    return !(this._requested[pieceBlock.index][blockIndex]);
  }

  isDone() {
    return this._requested.every((blocks) => blocks.every((i) => i === true));
  }

  printPercentDone() {
    const downloaded = this._received.reduce((totalBlocks, blocks) => blocks.filter((i) => i).length + totalBlocks, 0);

    const total = this._received.reduce((totalBlocks, blocks) => blocks.length + totalBlocks, 0);

    const percent = Math.floor((downloaded / total) * 100);

    process.stdout.write(`progress: ${downloaded}%\r`);
  }
}
