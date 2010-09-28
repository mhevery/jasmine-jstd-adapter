/**
 * @fileoverview Jasmine JsTestDriver Adapter.
 * @author ibolmo@gmail.com (Olmo Maldonado)
 * @author misko@hevery.com (Misko Hevery)
 */

(function() {

  function bind(_this, _function){
    return function(){
      return _function.call(_this);
    };
  }

  var rootFrame = frame(null, null),
      currentFrame = rootFrame,
      /** flag that indicates if a picky mode is on, in this mode only 'iit's are executed */
      pickyMode = false;

  function frame(parent, name){
    var caseName = (parent && parent.caseName ? parent.caseName + " " : '') + (name ? name : '');
    var frame = {
      name: name,
      caseName: caseName,
      parent: parent,
      children: [],
      testCase: TestCase(caseName),
      before: [],
      after: [],
      runBefore: function(){
        if (parent) parent.runBefore.apply(this);
        for ( var i = 0; i < frame.before.length; i++) {
          frame.before[i].apply(this);
        }
      },
      runAfter: function(){
        for ( var i = 0; i < frame.after.length; i++) {
          frame.after[i].apply(this);
        }
        if (parent) parent.runAfter.apply(this);
      }
    };

    if (parent) {
      parent.children.push(frame);
    }

    return frame;
  }

  jasmine.Env.prototype.describe = (function(describe){
    return function(description){
      currentFrame = frame(currentFrame, description);
      var val = describe.apply(this, arguments);
      currentFrame = currentFrame.parent;
      return val;
    };

  })(jasmine.Env.prototype.describe);

  var id = 0,
      jasmineIt = jasmine.Env.prototype.it;

  jasmine.Env.prototype.it = (function(it){
    return function(desc, itFn){
      if (pickyMode) return undefined;

      var self = this;
      var spec = it.apply(this, arguments);
      var currentSpec = this.currentSpec;
      if (!currentSpec.$id) {
        currentSpec.$id = id++;
      }
      var frame = this.jstdFrame = currentFrame;
      var name = 'test that it ' + desc;
      if (this.jstdFrame.testCase.prototype[name])
        throw "Spec with name '" + desc + "' already exists.";
      this.jstdFrame.testCase.prototype[name] = function(){
        jasmine.getEnv().currentSpec = currentSpec;
        frame.runBefore.apply(currentSpec);
        try {
          currentSpec.queue.start();
        } finally {
          frame.runAfter.apply(currentSpec);
        }
      };
      return spec;
    };

  })(jasmineIt);


  /**
   * special spec definition function that will turn on the picky mode (if not on already), which
   * means that only 'iit' specs will be run (and all regular 'it' specs will be ignored)
   */
  jasmine.Env.prototype.iit = (function(it){
    return function(desc, itFn){
      if (!pickyMode) {
        silenceExistingSpecs(rootFrame);
        pickyMode = true;
      }

      var self = this;
      var spec = it.apply(this, arguments);
      var currentSpec = this.currentSpec;
      if (!currentSpec.$id) {
        currentSpec.$id = id++;
      }
      var frame = this.jstdFrame = currentFrame;
      var name = 'test that it ' + desc;
      if (this.jstdFrame.testCase.prototype[name])
        throw "Spec with name '" + desc + "' already exists.";
      this.jstdFrame.testCase.prototype[name] = function(){
        //reset pickyMode to OFF for future parse runs
        pickyMode = false;
        jasmine.getEnv().currentSpec = currentSpec;
        frame.runBefore.apply(currentSpec);
        try {
          currentSpec.queue.start();
        } finally {
          frame.runAfter.apply(currentSpec);
        }
      };
      return spec;
    };

  })(jasmineIt);


  jasmine.Env.prototype.beforeEach = (function(beforeEach){
    return function(beforeEachFunction) {
      beforeEach.apply(this, arguments);
      currentFrame.before.push(beforeEachFunction);
    };

  })(jasmine.Env.prototype.beforeEach);


  jasmine.Env.prototype.afterEach = (function(afterEach){
    return function(afterEachFunction) {
      afterEach.apply(this, arguments);
      currentFrame.after.push(afterEachFunction);
    };

  })(jasmine.Env.prototype.afterEach);


  jasmine.NestedResults.prototype.addResult = (function(addResult){
    return function(result) {
      addResult.call(this, result);
      if (result.type != 'MessageResult' && !result.passed()) fail(result.message);
    };

  })(jasmine.NestedResults.prototype.addResult);

  // Reset environment with overriden methods.
  jasmine.currentEnv_ = null;
  jasmine.getEnv();


  /** recursively walks all frames starting at the {frame} and removes existing specs ('it's) */
  function silenceExistingSpecs(frame) {
    for (var i=0; i<frame.children.length; i++) {
      silenceExistingSpecs(frame.children[i]);
    }

    for (var specName in frame.testCase.prototype) {
      delete frame.testCase.prototype[specName];
    }
  }

})();


/** iit exported into the global namespace */
var iit = function(desc, fn) {
  return jasmine.getEnv().iit(desc, fn);
};