//http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
    ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

(function () {
    'use strict';
    /*
    describe('Key ordering tests --', function () {
        this.timeout(10000);
        var list = new CRDTList(null);

        //aaa < aa < aba < ab < aca < a < baa < ba < bba < bb < bca < b < caa < ca < cba < cb < cca
        var order = [
            "aaa", "aa", "aba", "ab", "aca", "a",
            "baa","ba", "bba", "bb", "bca", "b",
            "caa", "ca", "cba", "cb", "cca"];

        it('check ordering', function () {
            for(var i=0;i<order.length; i++){
                for(var j=0;j<order.length; j++){
                    if(i < j) assert.equal(list._compare(order[i], order[j]), -1, order[i] + "," + order[j]);
                    if(i== j) assert.equal(list._compare(order[i], order[j]),  0, order[i] + "," + order[j]);
                    if(i > j) assert.equal(list._compare(order[i], order[j]),  1, order[i] + "," + order[j]);
                }
            }
        });

        it('before', function () {
            for(var i=0;i<order.length; i++){
                var before = list._before(order[i]);
                assert.equal(list._compare(before, order[i]), -1, before + "," + order[i]);
            }
        });

        it('after', function () {
            for(var i=0;i<order.length; i++){
                var after = list._after(order[i]);
                assert.equal(list._compare(after, order[i]),  1, after + "," + order[i]);
            }
        });

        it('between', function () {
            var base = ["a", "A", "y", "z", "Z", ""];
            var cases = []; //generate difficult up to three letter cases
            for(var i=0; i<base.length; i++){
                for(var j=0; j<base.length; j++){
                    for(var k=0; k<base.length; k++){
                        var key = base[i] + base[j] + base[k];
                        if(key[key.length-1] == "z") continue; //not allowed z as a key
                        cases.push(key);
                    }
                }
            }

            for(var i=0;i<cases.length; i++){
                for(var j=0;j<cases.length; j++){
                    if(cases[i] == cases[j]) continue; //can't generate between identical keys
                    var between = list._between(cases[i], cases[j]);
                    if(list._compare(cases[i], cases[j])<0){
                        assert.equal(list._compare(cases[i], between), -1, cases[i] + "," + between);
                        assert.equal(list._compare(between, cases[j]), -1, between + "," + cases[j]);
                    }else{
                        assert.equal(list._compare(cases[i], between),  1, cases[i] + "," + between);
                        assert.equal(list._compare(between, cases[j]),  1, between + "," + cases[j]);
                    }
                }
            }
        });
    });


    describe('List tests --', function () {

        this.timeout(10000);
        it('test indeces', function () {
            var node = new ListNode();
            var order = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            for(var i=0;i<order.length; i++){
                assert.equal(node.code_to_index(order.charCodeAt(i)), i);
            }
        });


        it("test insert", function(){
            var ref = new Firebase('https://crdtlist.firebaseIO.com/list');

            ref.set({});

            var list = new CRDTList(ref);

            var base = ["a", "A", "y", "z", "Z", ""];
            var cases = []; //generate difficult up to three letter cases
            for(var i=0; i<base.length; i++){
                for(var j=0; j<base.length; j++){
                    for(var k=0; k<base.length; k++){
                        var key = base[i] + base[j] + base[k];
                        if(key[key.length-1] == "z") continue; //not allowed z as a key
                        if(key.length == 0) continue;
                        if(cases.indexOf(key) != -1) continue; //remove repatition
                        cases.push(key);
                    }
                }
            }
            //cases = shuffle(cases);
            var insertions = 0;

            for(var i =1; i< cases.length; i++){
                insertions+=1;
                list.insertByKey(cases[i], cases[i], "none");
            }

            var last_key = null;
            var last_value = null;
            var visitations = 0;
            list.visit(function(key, value, disambiguator){
                if(last_key != null){
                    assert.equal(list._compare(last_key, key), -1);
                    //assert.equal(list._compare(last_value, value), -1);
                }

                last_key = key;
                last_value = value;
                visitations++;
            });
            assert.equal(visitations, insertions);

        });

        it("test delete", function(){
            var ref = new Firebase('https://crdtlist.firebaseIO.com/list');

            ref.set({});

            var list = new CRDTList(ref);

            var base = ["a", "A", "y", "z", "Z", ""];
            var cases = []; //generate difficult up to three letter cases
            for(var i=0; i<base.length; i++){
                for(var j=0; j<base.length; j++){
                    for(var k=0; k<base.length; k++){
                        var key = base[i] + base[j] + base[k];
                        if(key[key.length-1] == "z") continue; //not allowed z as a key
                        if(key.length == 0) continue;
                        if(cases.indexOf(key) != -1) continue; //remove repatition
                        cases.push(key);
                    }
                }
            }
            //cases = shuffle(cases);
            var insertions = 0;

            for(var i =1; i< cases.length; i++){
                list.insertByKey(cases[i], cases[i], "none");
            }

            for(var i =1; i< cases.length; i++){
                list.remove(cases[i], "none");
            }

            var last_key = null;
            var last_value = null;
            var visitations = 0;
            list.visit(function(key, value, disambiguator){
                assert.equal(true, false);
            });
        });
    });


    describe('Locked list tests --', function () {
        this.timeout(10000);

        it("test lock", function(done){
            var ref = new Firebase('https://crdtlist.firebaseIO.com/locked_list');

            var list = new CRDTList(ref);
            list._set_lock(false, function(err){
                assert.notOk(err, "could not remove lock");
                list.insertByKey("A", "accepted", "none", function(err){
                    assert.notOk(err, "could not insert into list");
                    list._set_lock(true, function(err){
                        assert.notOk(err, "could not set lock");
                        list.insertByKey("B", "rejected", "none", function(err){
                            assert.ok(err, "lock did not prevent write");
                            done();
                        });
                    })
                });
            });
        });
    });*/

    describe('Balance --', function () {
        this.timeout(10000);

        it("combinations", function(){
            var ref = new Firebase('https://crdtlist.firebaseIO.com/locked_list');

            var list = new CRDTList(ref);

            assert.equal(list.root.key_combinations(1), 51);
            assert.equal(list.root.key_combinations(2), 52*51);
            assert.equal(list.root.key_combinations(3), 52*52*51);
            assert.equal(list.root.key_combinations(4), 52*52*52*51);
            assert.equal(list.root.key_combinations(5), 52*52*52*52*51);
            assert.equal(list.root.key_combinations(6), 52*52*52*52*52*51);
            assert.equal(list.root.key_combinations(7), 52*52*52*52*52*52*51);
            assert.equal(list.root.key_combinations(8), 52*52*52*52*52*52*52*51);
            assert.equal(list.root.key_combinations(9), 52*52*52*52*52*52*52*52*51);
        });

        it("int to key", function(){
            var ref = new Firebase('https://crdtlist.firebaseIO.com/locked_list');
            var list = new CRDTList(ref);

            var keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxy";
            var children = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

            //we exhaustively generate all 1, 2 and 3 length keys through concatenation, in order
            //and check the numbers match observed calculated values

            for(var bit3 = 0; bit3 < children.length; bit3++){
                for(var bit2 = 0; bit2 < children.length; bit2++){
                    for (var bit1 = 0; bit1 < keys.length; bit1++){
                        var bit1char = keys[bit1];
                        var tree1key = list.root.index_to_key(bit1, 1);
                        assert.equal(tree1key, bit1char);

                        var bit2char = children[bit2];
                        var tree2key = list.root.index_to_key(bit2*51 + bit1, 2);
                        assert.equal(tree2key, bit2char + bit1char);

                        var bit3char = children[bit3];
                        var tree3key = list.root.index_to_key(bit3*52*51 + bit2*51 + bit1, 3);
                        assert.equal(tree3key, bit3char + bit2char + bit1char);
                    }
                }
            }
        });


        it("rebalance", function(done){
            var ref = new Firebase('https://crdtlist.firebaseIO.com/locked_list');

            var list = new CRDTList(ref);

            var last_key = null;
            for(var i=0; i < 75; i++){
                last_key = list.insertBetween(last_key, null, i, "test").key;
            }

            list.rebalance(done);
        });
    });

})();
