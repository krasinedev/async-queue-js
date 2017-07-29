var Promise = require('bluebird')
Promise.config({
  cancellation: true
})

function AsyncQueue (options) {
  this._queue = []
  this.options = {timeout: 60000}
  if (options) {
    for (var key in options) {
      this.options[key] = options[key]
    }
  }

  this.enqueue = enqueue.bind(this)
  this._dequeue = dequeue.bind(this)
  this.start = start.bind(this)
  this.stop = stop.bind(this)
  this.peek = peek.bind(this)
  this.on = on.bind(this)
}

function enqueue (func) {
  var that = this
  if (that.enqueueEvent) {
    that.enqueueEvent(func, that)
  }

  if (typeof func !== 'function') {
    throw new Error('AsyncQueue accepts only functions')
  }

  that._queue.push(func)
  that.length = that._queue.length

  return new Promise(function (resolve, reject) {
    func.resolve = resolve
    func.reject = reject
    func.pending = true

    that._dequeue()
  })
}

function dequeue () {
  if (this._stopped) {
    return
  }

  var that = this
  var func = that._queue[0]

  if (func && that.dequeueEvent) {
    that.dequeueEvent(func, that)
  }

  if (func && func.pending) {
    func.pending = false
    Promise.resolve(func())
    .timeout(that.options.timeout)
    .then(function (res) {
      that._queue.shift()
      that.length = that._queue.length
      return func.resolve(res)
    })
    .catch(function (err) {
      that._queue.shift()
      that.length = that._queue.length
      return func.reject(err)
    })
    .finally(function () {
      if (!that.length && that.emptyEvent) {
        that.emptyEvent()
      } else if (that.length) {
        that._dequeue()
      }
    })
  }
}

function peek (index) {
  return this._queue[index]
}

function stop () {
  this._stopped = true
  if (this.stopEvent) {
    this.stopEvent(this)
  }
}

function start () {
  this._stopped = false
  if (this.startEvent) {
    this.startEvent(this)
  }
  this._dequeue()
}

function on (event, cb) {
  this[event + 'Event'] = cb
}

module.exports = AsyncQueue
