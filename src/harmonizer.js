var ANIMATION_STOPPED = 0;
var ANIMATION_RUNNING = 1;
var ANIMATION_PAUSED = 2;

function Harmonizer(context) {
  EventEmitter.call(this);

  this._context = context || exports.defaultContext;

  this._parent = null;
  this._children = [];

  this._animationState = ANIMATION_STOPPED;
  this._animationStartTime = 0;
  this._animationSkipTime = 0;
}

Harmonizer.prototype = Object.create(EventEmitter.prototype);
Harmonizer.prototype.constructor = Harmonizer;

Harmonizer.prototype.start = function() {
  switch (this._animationState) {
  case ANIMATION_RUNNING:
    return;
  case ANIMATION_STOPPED:
  case ANIMATION_PAUSED:
    this._animationState = ANIMATION_RUNNING;
    this._animationStartTime = getCurrentTime();
    this._context._addAnimatingHarmonizer(this);
    break;
  }
};

Harmonizer.prototype.stop = function() {
  switch (this._animationState) {
  case ANIMATION_STOPPED:
    break;
  case ANIMATION_PAUSED:
    this._animationSkipTime = 0;
    this._animationState = ANIMATION_STOPPED;
    break;
  case ANIMATION_RUNNING:
    this._animationSkipTime = 0;
    this._animationState = ANIMATION_STOPPED;
    this._context._removeAnimatingHarmonizer(this);
    break;
  }
};

Harmonizer.prototype.pause = function() {
  switch (this._animationState) {
  case ANIMATION_PAUSED:
  case ANIMATION_STOPPED:
    break;
  case ANIMATION_RUNNING:
    this._animationSkipTime += getCurrentTime() - this._animationStartTime;
    this._animationState = ANIMATION_PAUSED;
    this._context._removeAnimatingHarmonizer(this);
    break;
  }
};

Harmonizer.prototype.requestPaint = function() {
  var root = this._rootHarmonizer();
  if (this._context._inAnimationFrame()) {
    this._context._addPaintHarmonizer(root);
  } else {
    root._paint();
  }
};

Harmonizer.prototype.appendChild = function(child) {
  assert(this._children.indexOf(child) < 0);
  assert(child._context === this._context);
  this._children.push(child);
  child._parent = this;
};

Harmonizer.prototype.removeChild = function(child) {
  var idx = this._children.indexOf(child);
  assert(idx >= 0);
  this._children.splice(idx, 1);
  child._parent = null;
};

Harmonizer.prototype.getParent = function() {
  return this._parent;
};

Harmonizer.prototype.spawnChild = function() {
  var res = new Harmonizer(this._context);
  this.appendChild(res);
  return res;
};

Harmonizer.prototype.makeSingleShot = function() {
  this.on('animationFrame', function() {
    this.stop();
    this.requestPaint();
  }.bind(this));
};

Harmonizer.prototype._handleFrame = function(time) {
  assert(this._animationState === ANIMATION_RUNNING);
  this.emit('animationFrame', time-this._animationStartTime+this._animationSkipTime);
};

Harmonizer.prototype._paint = function() {
  this.emit('paint');
};

Harmonizer.prototype._rootHarmonizer = function() {
  var root = this;
  while (root._parent !== null) {
    root = root._parent;
  }
  return root;
};

exports.Harmonizer = Harmonizer;
