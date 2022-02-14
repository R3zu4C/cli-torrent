export default class {
  constructor(size) {
    this.requested = new Array(size).fill(false);
    this.recieved = new Array(size).fill(false);
  }

  addRequested(pieceIndex) {
    this.requested[pieceIndex] = true;
  }

  addRecieved(pieceIndex) {
    this.recieved[pieceIndex] = true;
  }

  isRequireed(pieceIndex) {
    if (this.requested.every((pi) => pi === true)) this.requested = this.recieved.slice();

    return !(this.requested[pieceIndex]);
  }

  isDone() {
    return this.requested.every((pi) => pi === true);
  }
}
