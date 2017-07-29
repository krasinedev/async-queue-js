var Promise = require('bluebird')
Promise.config({
  cancellation: true
})

var chai = require('chai')
var assert = chai.assert

var AsyncQueue = require('./index')
var queue

describe('Async Queue', function () {
  beforeEach(function () {
    queue = new AsyncQueue()
  })

  it('Should add element to queue', function () {
    var el = function () {}
    queue.enqueue(el)
    queue.enqueue(el)
    assert.equal(queue.length, 2)
  })

  it('Should throw error that element is not a function', function (done) {
    var el = 'Not a function'
    queue.enqueue(el)
      .then(function () {
        done(new Error('Expected rejection'))
      })
      .catch(function (err) {
        assert.isDefined(err)
        done()
      })
  })

  it('Should have correct length', function (done) {
    var el = function () { return 5 }
    queue.enqueue(el)
    queue.enqueue(el)
    queue.enqueue(el)
    .then(function (res) {
      assert.equal(queue.length, 0)
      done()
    })
    .catch(function (err) {
      done(err)
    })
  })

  it('Should call stop event', function (done) {
    queue.on('stop', function () {
      done()
    })
    queue.stop()
  })

  it('Should call start event', function (done) {
    queue.on('start', function () {
      done()
    })
    queue.start()
  })

  it('Should call enqueue event', function (done) {
    queue.on('enqueue', function () {
      done()
    })
    queue.enqueue(function () {})
  })

  it('Should call dequeue event', function (done) {
    var calls = 0
    queue.on('dequeue', function () {
      calls++
      if (calls < 2) {
        done()
      }
    })
    queue.enqueue(function () {})
  })

  it('Should call empty event', function (done) {
    queue.on('empty', function () {
      done()
    })
    queue.enqueue(function () {})
  })

  it('Should start execution of enqueued functions', function (done) {
    var expectedResult = 'executed'
    var el = function () { return expectedResult }
    queue.stop()
    queue.enqueue(el)
      .then(function (res) {
        assert.equal(res, expectedResult)
        done()
      })
      .catch(function (err) {
        done(err)
      })
    queue.start()
  })

  it('Should execute enqueued functions in correct order and resolve correct results', function (done) {
    var el = function (i) { return function () { return i } }
    var responses = []
    queue.start()
    for (var i = 0; i < 3; i++) {
      queue.enqueue(el(i))
        .then(function (res) {
          responses.push(res)
          if (queue.length === 0) {
            assert.deepEqual(responses, [0, 1, 2])
            done()
          }
        })
        .catch(function (err) {
          done(err)
        })
    }
  })

  it('Should timeout when operation takes more than configured time to complete', function (done) {
    queue.options.timeout = 1
    queue.enqueue(function () {
      return Promise.delay(200)
      .then(function (resolve, reject) {
        resolve(true)
      })
    })
    .then(function (res) {
      done(new Error('Expected to timeout'))
    })
    .catch(function (err) {
      assert.isDefined(err)
      done()
    })

    queue.start()
  })

  it('Should continuously drain the queue', function (done) {
    function asyncOperation (i) {
      return function () {
        return new Promise(function (resolve, reject) {
          return resolve(i)
        })
      }
    }
    var repetitions = 0
    for (var i = 0; i < 10; i++) {
      queue.enqueue(asyncOperation(i))
    }

    queue.on('empty', function () {
      if (repetitions >= 3) {
        return done()
      }

      repetitions++
      for (var i = 0; i < 10; i++) {
        queue.enqueue(asyncOperation(i))
      }
    })
  })
})
