# async-queue-js
A generic async queue with a single dependency on bluebird  
It's very useful for making transactions to API's that don't support simultaneous requests  

# Installation
#### npm 
`npm install async-queue-js`  
#### yarn
`yarn add async-queue-js`

# Example Usage
#### Creating a queue
```javascript
const AsyncQueue = require('async-queue-js')
const queue = new AsyncQueue()
```

#### Setting timeout (default is 60000ms)
```javascript
const AsyncQueue = require('async-queue-js')
const queue = new AsyncQueue({timeout: 10000})
```
The timeout will be applied to each separate operation in the queue  
#### Enqueuing a function
```javascript
const queue = new AsyncQueue()

function simple() {
  return 'Just a normal function'
}

queue.enqueue(simple)
```
#### Enqueuing an async function
```javascript
const queue = new AsyncQueue()

function asyncOperation() {
  return new Promise((resolve) => {
    resolve('Promises are cooler though')
  })
}

queue.enqueue(asyncOperation)
```
Once an operation is enqueued its execution starts immediately  
Any subsequent enqueued operations wait for its completion in order to start

You can register handlers to the enqueue method
```javascript
queue.enqueue(asyncOperation)
.then(res => {
  // do something with the result
  return res
})
.catch(error => {
  // handle errors
  throw error
})
```
Functions are automatically promisified

#### A more realistic usage
This example uses an express instance and assumes that it is already up and running  
*transact returns a function which makes a payment to some provider that accepts only one request at a time
```javascript
const app = require('./app')

const AsyncQueue = require('async-queue-js')
const queue = new AsyncQueue()

const transact = require('./transact')

app.post('/transact', (req, res) => {
  // validate the request
  queue.enqueue(transact(req.body))
  .then(resp => {
    return res.json({message: 'Your payment was successful', amount: resp.amount})
  })
  .catch(error => {
    return res.json({error: error.message})
  })
})
```
### Start/stop the continuous drain
To stop the continuous drain
```javascript
const queue = new AsyncQueue()
queue.stop()
```
While the drain is stopped you can still enqueue operations  
Once you call
```javascript
queue.start()
```
It will continue

### Events
```javascript
const queue = new AsyncQueue()

queue.on('enqueue', (operation) => {
  console.log('An operation has been enqueued and will begin its execution once its first in the queue')
})

queue.on('dequeue', (operation) => {
  console.log('An operation has been dequeued and will begin its execution immediately')
})

queue.on('empty', () => {
  console.log('The queue is drained. Once a new operation is enqueued it will continue')
})

queue.on('stop', () => {
  console.log('The drain is stopped')
})

queue.on('start', () => {
  console.log('The drain is started')
})
```
# License
[MIT](https://github.com/KrasiNedew/async-queue-js/blob/master/LICENSE)