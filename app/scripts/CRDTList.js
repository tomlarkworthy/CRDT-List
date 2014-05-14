'use strict';
console.log("loading CRDTList.js");

var LOCK_KEY = "dS73j5z2zzwr6uFc";


function CRDTList(firebaseRef) {
    this.listeners = {
        'value':[]
    };

    if(firebaseRef){
        this.ref = firebaseRef;
        this.ref.on('child_added', this._disambiguator_added, function(){}, this);
    }
    this.lock = false;
    this.root = new ListNode();
}

CRDTList.prototype._fire = function(label) {
    //retrieve parameters defined after the label
    var args = Array.prototype.slice.call(arguments).shift();
    for (var i = 0; i < this.listeners[label].length; i++) {
        this.listeners[label][i].call(args);
    }
};

CRDTList.prototype.on = function(label, listener) {
    this.listeners[label].push(listener);
};

/**
 * if a < b returns -1
 * if a ==b returns  0
 * if a > b returns  1
 */
CRDTList.prototype._compare = function(a, b) {
    for(var i=0; i< Math.min(a.length, b.length); i++){
        if(a[i] < b[i]) return -1;
        if(a[i] > b[i]) return  1;
    }
    var key_a = a[a.length-1];
    var key_b = b[b.length-1];

    if(b.length < a.length){ //a in longer
        return a[b.length-1] <= key_b? -1: 1;
    }
    if(a.length < b.length){ //b is longer
        return b[a.length-1] <= key_a?  1:-1;
    }
    return 0;
};

/**
 * returns a key before this one, assumes A-Za-z ary tree encoding
 * always increases the key length
 */
CRDTList.prototype._before = function(a) {
    return a+"y";
};
/**
 * returns a key after this one, assumes A-Za-z ary tree encoding
 * tries not to increase the key length
 */
CRDTList.prototype._after = function(a) {
    if(a[a.length-1] == "y"){ //last possible key
        return a.substring(0, a.length-1) + "za";
    }
    if(a[a.length-1] == "Z"){ //gap in ASCII table
        return a.substring(0, a.length-1) + "a";
    }
    //bump key
    var last_key = String.fromCharCode(a.charCodeAt(a.length-1) + 1);
    return a.substring(0, a.length-1) + last_key
};

/**
 * returns a key that is between a and b keys
 */
CRDTList.prototype._between = function(a, b) {
    if(this._compare(a,b) > 0){var tmp = a;a = b;b = tmp; } //flip so a < b
    //do after preferentially so as not to increase the key length
    if(this._compare(this._after (a), b) == -1) return this._after(a);
    if(this._compare(this._before(b), a) ==  1) return this._before(b);
    throw new Error("Logical flaw on CRDTList._between " + a + " " + b + "|" + this._after (a) + " " + this._before(b));
};


CRDTList.prototype._disambiguator_added = function(snapshot){
    if(snapshot.name() == LOCK_KEY){
        console.log("_lock_added", snapshot.name());
        snapshot.ref().on('value', this._lock_change, function(){}, this);
    }else{
        console.log("_disambiguator_added", snapshot.name());
        snapshot.ref().on('child_added', this._treepath_added, function(){}, this);
        snapshot.ref().on('child_removed', this._treepath_removed, function(){}, this);
    }

};

CRDTList.prototype._treepath_added = function(snapshot){
    console.log("_treepath_added", snapshot.name());

    this.root.insert(snapshot.name(), snapshot.ref().parent().name(), snapshot.val())
};
CRDTList.prototype._treepath_removed = function(snapshot){
    console.log("_treepath_removed", snapshot.name());

    this.root.remove(snapshot.name(), snapshot.ref().parent().name())
};
CRDTList.prototype._lock_change = function(snapshot){
    console.log("_lock_change", snapshot.val());
    this.lock = snapshot.val();
};

CRDTList.prototype._set_lock = function(value, cb){
    var change = {};
    change[LOCK_KEY] = value;
    this.ref.update(change, cb);
};

/**
 * inserts into the list between two other elements identified by their key, returning a {key:key, disambiguator:disambiguator} object
 * disambiguator should be unique for each connected client (e.g. username, although a random string is very likely to work)
 * disambiguator must be insertable as a key into a firebase, see firebase key restrictions (e.g. no ']' or '$')
 * callback is called when the server accepts the change
 */
CRDTList.prototype.insertBetween = function(keyInfront, keyBehind, value, disambiguator, cb) {
    //console.log('insert', keyInfront, keyBehind, value, disambiguator);

    if (keyInfront == null && keyBehind == null) { //also fires if params are undefined
        var key = "Z"; //in the middle
    }else if(keyInfront == null){
        var key = this._before(keyBehind);
    }else if(keyBehind == null){
        var key = this._after(keyInfront);
    }else{
        var key = this._between(keyInfront, keyBehind);
    }
    return this.insertByKey(key, value, disambiguator, cb)
};
/**
 * inserts into the list, returning a {key:key, disambiguator:disambiguator} object
 * disambiguator should be unique for each connected client (e.g. username, although a random string is very likely to work)
 * disambiguator must be insertable as a key into a firebase, see firebase key restrictions (e.g. no ']' or '$')
 * callback is called when the server accepts the change
 */
CRDTList.prototype.insertByKey = function(key, value, disambiguator, cb) {
    //insert remotely
    this.ref.child(disambiguator).child(key).set(value, cb);

    //insert locally (remote will overwrite local identically)
    //NOT needed as local insert into Firebase cache is applied synchronously
    //this.root.insert(key, disambiguator, value);

    return {key:key, disambiguator:disambiguator};
};


CRDTList.prototype.remove = function(key, disambiguator, cb) {
    this.ref.child(disambiguator).child(key).remove(cb);
};

/**
 * Rebalances the data structure. This obtains a lock first, then performs rearrangements.
 * Should be done sparingly and in low traffic situations by a privileged process
 */
CRDTList.prototype.rebalance = function(cb) {
    this._set_lock(true);
    //now locked, other users cannot insert

    var elements   = [];
    var keys       = [];
    this.root.visit(function(key, value, disambiguator){
        keys.push(key);
        elements.push({
            key:key,
            value:value,
            disambiguator:disambiguator
        });
    });

    //elements.length is the number of items we are distributing
    //calculate the required key depth to hold all these elements
    for( var depth=0;
         this.root.key_combinations(depth) < elements.length;
         depth++){}

    var combinations = this.root.key_combinations(depth);

    //now evenly distribute keys of the required depth through the space of keys of that depth
    var newList = {};
    for(var element_id=0 ; element_id < elements.length; element_id++){
        var element = elements[element_id];

        var newKey = this.root.index_to_key(element_id * Math.floor(combinations/ elements.length), depth);

        if(!newList[element.disambiguator]) newList[element.disambiguator] = {};

        newList[element.disambiguator][newKey] = element.value;
    }

    //clear the local cache
    this.root = new ListNode();
    //write the new values (clearing lock in process)
    this.ref.set(newList, cb);
};

/**
 * in order traversal of nodes, calls the cb with {key, value, disambiguator}
 */
CRDTList.prototype.visit = function(visitor_fn) {
    this.root.visit(visitor_fn)
};


function ListNode() {
    this.indeces  = new Array(51); //an array of {disambiguator -> value} key_node entries, lazily created
    this.children = new Array(52); //an child ListNodes
}

ListNode.prototype.code_to_index = function(character_code) {
    if(character_code < 91) return character_code - 65;
    return character_code - 97 + 26;
};

ListNode.prototype.bit_to_str = function(bit_int) {
    if(bit_int > 25) return String.fromCharCode('a'.charCodeAt(0) + bit_int- 26);
    return String.fromCharCode('A'.charCodeAt(0) + bit_int)
};

ListNode.prototype.key_combinations = function(tree_depth) {
    return Math.pow(52, tree_depth-1) * 51;
};

ListNode.prototype.index_to_key = function(index, tree_depth) {
    //calculating a path for a given index is a bit like a counter but with a different base for the LSB
    var key = "";
    for(var position=0; position<tree_depth;position++){
        var base = position==0?51:52;
        //console.log("remainder", index);
        var bit       = index % base;
        index         = Math.floor(index / base);

        key = this.bit_to_str(bit) + key; //build up key right-to-left
    }

    return key;
};

ListNode.prototype.insert = function(key, disambiguator, value) {
    console.log("insert: ", key, disambiguator, value);

    this._insert_recursive(0, key, disambiguator, value)

};

ListNode.prototype._insert_recursive = function(level, key, disambiguator, value) {
    var index = this.code_to_index(key.charCodeAt(level));

    if(level === key.length -1){ //at correct level for insertion into tree
        if(!this.indeces[index]) this.indeces[index] = {}; //lazy create key_node object
        var key_node = this.indeces[index];
        key_node[disambiguator] = {value:value, key:key, disambiguator:disambiguator}; //insert into tree
    }else{ //at a higher level for insertion into tree, so recurse to a child
        if(!this.children[index]) this.children[index] = new ListNode(); //lazy create child node

        var child_node = this.children[index];
        child_node._insert_recursive(level + 1, key, disambiguator, value)
    }
};

ListNode.prototype.remove = function(key, disambiguator) {
    console.log("remove: ", key, disambiguator);

    this._remove_recursive(0, key, disambiguator)

};

ListNode.prototype._remove_recursive = function(level, key, disambiguator) {
    var index = this.code_to_index(key.charCodeAt(level));

    if(level === key.length -1){ //at correct level for insertion into tree
        if(this.indeces[index]){
            var key_node = this.indeces[index];
            delete key_node[disambiguator];
        }
    }else{ //at a higher level for removal into tree, so recurse to a child
        if(this.children[index]){
            var child_node = this.children[index];
            child_node._remove_recursive(level + 1, key, disambiguator)
        }
    }
};

/**
 * in order traversal of nodes, calls the cb with (key, value, disambiguator)
 * @param cb
 */
ListNode.prototype.visit = function(cb) {
    //there are n+1 children and n key nodes to visits
    //in order traversal alternates between children and keys
    for(var i=0;i<this.indeces.length;i++){
        if(this.children[i]) this.children[i].visit(cb);
        if(this.indeces[i])  this._visit_key_node(this.indeces[i], cb);
    }

    //visit last child node
    if(this.children[this.children.length-1]){
        this.children[this.children.length-1].visit(cb);
    }
};

ListNode.prototype._visit_key_node = function(key_node, cb) {
    for(var disambiguator in key_node){
        cb(key_node[disambiguator].key, key_node[disambiguator].value, key_node[disambiguator].disambiguator)
    }
};


