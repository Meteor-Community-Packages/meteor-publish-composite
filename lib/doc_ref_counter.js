class DocumentRefCounter {
    constructor(observer) {
        this.heap = {};
        this.observer = observer;
    }

    increment(collectionName, docId) {
        const key = `${collectionName}:${docId.valueOf()}`;
        if (!this.heap[key]) {
            this.heap[key] = 0;
        }
        this.heap[key] += 1;
    }

    decrement(collectionName, docId) {
        const key = `${collectionName}:${docId.valueOf()}`;
        if (this.heap[key]) {
            this.heap[key] -= 1;

            this.observer.onChange(collectionName, docId, this.heap[key]);
        }
    }
}

export default DocumentRefCounter;
