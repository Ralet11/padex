const test = require('node:test');
const assert = require('node:assert/strict');
const { registerChatMessages } = require('../src/services/chatMessages');
function setup(userId = 1, status = 'accepted', fail = false) {
  let handler; const writes = [], events = [], queries = [];
  const socket = {user: {id:userId}, on: (name, fn) => handler = fn};
  const Connection = { findOne: async ({where}) => { queries.push(where); return where.id === 7 && where.status === status ? {id:7,requester_id:1,addressee_id:2} : null; } };
  const Message = { create: async values => { if (fail) throw Error('db'); writes.push(values); return {id:9}; }, findOne: async () => ({id:9,content:'hello'}) };
  const io = {to: room => ({emit: (name,data) => events.push({room,name,data})})};
  registerChatMessages(socket,{Connection,Message,User:{},io,userSockets:new Map([[2,'socket-two']])},{error(){}});
  return {send:(...args)=>handler(...args),writes,events,queries};
}
test('participant sends trimmed message to canonical room and online partner', async () => {
  const s=setup(); let ack; await s.send({connection_id:'7',content:' hello '},r=>ack=r);
  assert.deepEqual(s.writes,[{connection_id:7,sender_id:1,content:'hello'}]);
  assert.deepEqual(s.events.map(e=>e.room),['conn_7','socket-two']); assert.deepEqual(ack,{ok:true});
});
for (const status of ['pending','rejected']) test(`${status} connection cannot send`, async () => {
  const s=setup(1,status); await s.send({connection_id:7,content:'hello'}); assert.equal(s.writes.length,0); assert.equal(s.events.length,0);
});
test('outsider cannot persist or broadcast a message',async()=>{
  const s=setup(3); let ack; await s.send({connection_id:7,content:'hello'},r=>ack=r);
  assert.equal(s.writes.length,0);assert.equal(s.events.length,0);assert.deepEqual(ack,{ok:false});
});
test('malformed and empty payloads cannot query or write',async()=>{
  const s=setup(); for(const payload of [null,undefined,{}, {content:9}, {content:'  '}, {connection_id:[7],content:'hello'}]) await s.send(payload);
  assert.equal(s.queries.length,0);assert.equal(s.writes.length,0);assert.equal(s.events.length,0);
});
test('database failure is acknowledged without emitting success',async()=>{
  const s=setup(1,'accepted',true);let ack;await s.send({connection_id:7,content:'hello'},r=>ack=r);
  assert.equal(s.events.length,0);assert.deepEqual(ack,{ok:false});
});
