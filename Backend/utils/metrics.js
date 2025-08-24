'use strict';
// In-memory metrics (can be swapped for Prometheus or other backend later)
const counters = Object.create(null);

function inc(name, labels = {}) {
  const key = name + JSON.stringify(labels);
  counters[key] = (counters[key] || 0) + 1;
}

function snapshot() {
  const arr = [];
  for (const k of Object.keys(counters)) {
    arr.push({ key: k, count: counters[k] });
  }
  return arr;
}

module.exports = { inc, snapshot };
