(function() {

  describe('bunch of its in a separate file', function() {
    it('an it in a separate file that should not run', function() {
      fail('this it was not supposed to run!');
    });

    iit('an iit in a separate file that should run', function() {
      //can't realy test this
    });
  });

})();
