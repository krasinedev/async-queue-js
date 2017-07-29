var Promise = require('bluebird')
Promise.config({
  cancellation: true
})

function AsyncQueue () {
  this._queue = Array.isArray(arguments[0]) ? arguments[0] : []
  this.options = {timeout: 60000}
  var passedOptions = (this._queue.length || arguments[1] ? arguments[1] : arguments[0]) || []
  for (var key in passedOptions) {
    this.options[key] = passedOptions[key]
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

  return new Promise(function (resolve, reject) {
    if (typeof func !== 'function') {
      return reject(new Error('AsyncQueue accepts only functions'))
    }

    func.resolve = resolve
    func.reject = reject
    func.pending = true

    that._queue.push(func)
    that.length = that._queue.length
    that._dequeue()
  })
}

function dequeue () {
  if (this._stopped) {
    return
  }

  var that = this
  var func = that._queue[0]

  if (this.dequeueEvent) {
    this.dequeueEvent(func, that)
  }

  if (func && func.pending) {
    func.pending = false
    Promise.resolve(func())
    .timeout(that.options.timeout)
    .then(function (res) {
      that._queue.shift()
      that.length = that._queue.length
      that._dequeue()
      func.resolve(res)
    })
    .catch(function (err) {
      that._queue.shift()
      that.length = that._queue.length
      that._dequeue()
      func.reject(err)
    })
  } else if (!func && that.emptyEvent) {
    that.emptyEvent(that)
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
