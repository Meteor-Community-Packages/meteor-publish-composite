DocumentRefCounter = function(observer) {
    this.heap = {};
    this.observer = observer;
};

DocumentRefCounter.prototype.increment = function(collectionName, docId) {
    var key = collectionName + ":" + docId.valueOf();
    if (!this.heap[key]) {
        this.heap[key] = 0;
    }
    this.heap[key]++;
};

DocumentRefCounter.prototype.decrement = function(collectionName, docId) {
    var key = collectionName + ":" + docId.valueOf();
    if (this.heap[key]) {
        this.heap[key]--;

        this.observer.onChange(collectionName, docId, this.heap[key]);
    }
};
