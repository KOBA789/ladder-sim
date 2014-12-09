var assert = require('assert');

function parseMnemonic (mnemonic) {
  return mnemonic.split('\n').map(function (row, i) {
    return [row.trim(), i+1];
  }).filter(function (row) {
    return row[0].length > 0;
  }).map(function (row) {
    var matches = row[0].match(/^([A-Z]+)(?:\s+([A-Z])([0-9A-Fa-f]+))?$/);
    if (matches === null) {
      throw new Error('Syntax Error [Line: ' + row[1].toString() + ']');
    }
    return {
      code: matches[1],
      arg: {
        type: (matches[2] === undefined) ? null : matches[2],
        value: (matches[3] === undefined) ? null : parseInt(matches[3], 16)
      },
      line: row[1]
    };
  });
}

function LadderSim (mnemonic) {
  this.pc = 0;
  this.opcodes = parseMnemonic(mnemonic);
  this.size = 0x100;
  this.stack = [];
  this.memA = new Uint8Array(this.size);
  this.memB = new Uint8Array(this.size);
  this.mode = false;
}

LadderSim.prototype.read = function (i) {
  if (this.mode) {
    return this.memB[i];
  } else {
    return this.memA[i];
  }  
};

LadderSim.prototype.write = function (i, d) {
  if (this.mode) {
    this.memA[i] = d;
  } else {
    this.memB[i] = d;
  }
};

LadderSim.prototype.step = function () {
  var op = this.opcodes[this.pc],
      reg = 0;

  this.pc = (this.pc + 1) % this.opcodes.length;
  
  switch (op.code) {
  case 'END':
    assert(op.arg.type === null);
    this.pc = 0;
    break;
  case 'OUT':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);
    assert(this.stack.length === 1);

    this.write(op.arg.value, this.stack.pop());

    break;
  case 'LD':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);

    this.stack.push(this.read(op.arg.value));
    
    break;
  case 'LDNOT':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);

    this.stack.push(~~!this.read(op.arg.value));
    
    break;
  case 'OR':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);
    assert(this.stack.length >= 1);

    this.stack.push(this.stack.pop() | this.read(op.arg.value));
    
    break;
  case 'ORNOT':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);
    assert(this.stack.length >= 1);
    
    this.stack.push(~~!(this.stack.pop() | this.read(op.arg.value)));
    
    break;
  case 'AND':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);
    assert(this.stack.length >= 1);
    
    this.stack.push(this.stack.pop() & this.read(op.arg.value));
    
    break;
  case 'ANDNOT':
    assert(op.arg.type === 'M');
    assert(op.arg.value >= 0x00);
    assert(op.arg.value <= this.size);
    assert(this.stack.length >= 1);
    
    this.stack.push(~~!(this.stack.pop() & this.read(op.arg.value)));
    
    break;
  case 'ORSTACK':
    assert(op.arg.type === null);
    assert(this.stack.length >= 2);

    this.stack.push(this.stack.pop() | this.stack.pop());
    
    break;    
    
  case 'ANDSTACK':
    assert(op.arg.type === null);
    assert(this.stack.length >= 2);

    this.stack.push(this.stack.pop() & this.stack.pop());
    
    break;
  }

  this.mode = !this.mode;
};

LadderSim.prototype.scan = function () {
  do {
    this.step();
  } while (this.pc !== 0)
};

if (!module.parent) {
  var nm1 =
        'LD M000\n' +
        'OUT M001\n' +
        'LDNOT M000\n' +
        'OUT M000';
  
  var nm2 =
        "LD M000\n" +
        "ANDNOT M001\n" +
        "LD M010\n" +
        "AND M011\n" +
        "ORSTACK\n" +
        "LDNOT M002\n" +
        "AND M003\n" +
        "LDNOT M012\n" +
        "AND M013\n" +
        "LD M022\n" +
        "AND M023\n" +
        "ORSTACK\n" +
        "ORSTACK\n" +
        "ANDSTACK\n" +
        "AND M004\n" +
        "OUT M100\n";

  var sim = new LadderSim(nm1);

  function dump (sim) {
    var i = 0, j = 0, row = [];
    for (i = 0; i < sim.size; i+=16) {
      row = [
        ('00'+i.toString(16).toUpperCase()).slice(-2),
        '-',
        ('00'+(i+15).toString(16).toUpperCase()).slice(-2),
        ': '
      ];
      for (j = i; j < sim.size && j < i+4; j++) {
        row.push(sim.read(j).toString());
      }
      row.push(' ');
      for (j = i+4; j < sim.size && j < i+8; j++) {
        row.push(sim.read(j).toString());
      }
      row.push(' ');
      for (j = i+8; j < sim.size && j < i+12; j++) {
        row.push(sim.read(j).toString());
      }
      row.push(' ');
      for (j = i+12; j < sim.size && j < i+16; j++) {
        row.push(sim.read(j).toString());
      }
      console.log(row.join(''));
    }
  }

  setInterval(function () {
    sim.scan();
    dump(sim);
    console.log('------------------------------');
  }, 1000);
}
