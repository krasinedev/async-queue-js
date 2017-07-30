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

  var args = Array.prototype.slice.call(arguments, 1)
  var funcWrap = function () {
    return func.apply(func, args)
  }

  that._queue.push(funcWrap)
  that.length = that._queue.length

  return new Promise(function (resolve, reject) {
    funcWrap.resolve = resolve
    funcWrap.reject = reject
    that._dequeue()
  })
}

function dequeue () {
  if (this._stopped || this._processing) {
    return
  }

  var funcWrap = this._queue[0]
  if (!funcWrap) {
    return
  }

  this._processing = true
  this._queue.shift()
  this.length = this._queue.length

  var that = this
  Promise.resolve(funcWrap())
  .timeout(that.options.timeout)
  .then(function (res) {
    return funcWrap.resolve(res)
  })
  .catch(function (err) {
    return funcWrap.reject(err)
  })
  .finally(function () {
    that._processing = false
    if (!that.length && that.emptyEvent) {
      that.emptyEvent()
    } else if (that.length) {
      that._dequeue()
    }
  })

  if (that.dequeueEvent) {
    that.dequeueEvent(funcWrap, that)
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
